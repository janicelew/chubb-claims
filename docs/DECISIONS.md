# Design decisions

Short notes on each decision: what was chosen, why, and what would change in production.

## 1. Time allocation: backend first, then a thin frontend

The brief weights the backend most and says a solid backend beats a rushed attempt at both.
I spent most of the time on a tested backend that covers the whole claim lifecycle, Kafka messaging and the
manager views. The API is documented with OpenAPI (Swagger). On top of it I built a deliberately small Angular
app that shows one claim going from report to payment across all three roles (section 11).

## 2. Core entities

| Entity | Why it exists |
|---|---|
| **Policy** | A claim is always made against a policy. The policy gives the market, claim type, cover limit and cover period, which are used to check the claim. Seeded; policy admin is out of scope. |
| **Claim** | The central record: who, what, when, how much was claimed, the reserve, the decision, the status and the assigned officer. |
| **ClaimHistory** | Audit trail: one row per action, with who did it and when. Insurers need this for disputes and regulators. |
| **InfoRequest** | An officer's question to the claimant and the answer. A claim can have several. |
| **Notification** | A message to the claimant, created by the Kafka listener. |
| **StaffMember** | Officers and managers, used for assignment checks and the workload view. |

**How they relate.** `1 ──< n` means "one to many".

```
Policy 1 ──< Claim 1 ──< ClaimHistory     one row per action: who, what, from/to status, when
                   1 ──< InfoRequest      an officer's question and the claimant's answer
StaffMember 1 ──< Claim                   the assigned officer (empty until someone picks it up)
Claim 1 ──< Notification                  one per update the claimant is told about
```

Only `Claim -> Policy` is a database foreign key. The other links are plain ID columns, and
a `Notification` holds just the claim ID and number, so the notification module reads nothing from the
claim tables (see section 4). A claimant is not a table: the claimant ID comes from the demo identity
header and is stored as text on the policy (holder) and the claim. A real system would have a customer record.

**Reserve.** Insurers call the estimate of what they'll pay on a claim the *reserve*. Liability exposure
is the sum of reserves on open claims. The officer sets the reserve during assessment. It becomes the
approved amount on approval and drops to 0 on settlement or rejection. Claims nobody has assessed yet
show the claimant's *claimed* amount in a separate column, because that's the claimant's number, not
Chubb's estimate.

## 3. Lifecycle as a state machine

```
SUBMITTED -> ASSIGNED -> UNDER_REVIEW <-> INFO_REQUESTED
                              |-> APPROVED -> SETTLED
                              |-> REJECTED
```

The allowed transitions are defined in one place (`ClaimStatus.allowedNext()`). The only way to change
a status is through methods on `Claim`, so no endpoint can skip a step (e.g. settle an unapproved claim).
An illegal move returns **409 Conflict**. Each action has its own endpoint (`/approve`, `/reject`, ...)
instead of a generic "set status", so each step validates its own inputs (approve needs an amount within
the cover limit; reject needs a reason).

## 4. One service or several? A modular monolith

There's one deployable Spring Boot service with clear internal modules: `claim`, `notification`,
`dashboard`. Reasons:

- In a 2–3 hour build, splitting into microservices adds cost (separate databases, deployments,
  distributed failure handling) without adding value yet.
- The **notification** module already talks to the claim module **only through Kafka events**.
  It reads nothing from the claim tables. So it can be moved into its own service later without
  changing the claims code. That's the natural first split.
- The claim lifecycle, history and info requests stay together because they must change in the
  **same database transaction**.

## 5. REST vs Kafka

**Rule: if the user is waiting for the result, use REST. If it's a side effect that can happen a moment
later, use a Kafka event.**

| Uses REST (synchronous) | Uses Kafka (asynchronous) |
|---|---|
| Submit a claim (the claimant needs the claim number now) | Notify the claimant of each step |
| Assign, review, reserve, approve, reject, settle (the officer needs to know it worked, or why not) | (Future) email/SMS, payments, fraud scoring, reporting |
| All reads: claim lists, detail, history, dashboards | |

- **Why the history isn't on Kafka:** it must never disagree with the claim, so it's written in the
  same transaction.
- **Events are sent only after the commit** (`@TransactionalEventListener(AFTER_COMMIT)`), so we
  never announce a change that was rolled back.
- **Key = claimId**, so all events for one claim land on the same partition and are read in order.
- **Idempotent consumer:** Kafka delivers *at least once*, so the listener ignores an `eventId` it
  has already seen (a unique column on `notifications`).
- **Known gap:** if the app crashes between the DB commit and the Kafka send, that event is lost.
  The production fix is a **transactional outbox**: write the event to an `outbox` table in the same
  transaction, and have a relay publish it to Kafka. I left it out for time and documented it here.

## 6. Frontend–backend contract

The backend owns the contract. It's generated from the code with springdoc and published at
`/v3/api-docs` (Swagger UI at `/swagger-ui.html`). Request/response DTOs are separate from the
database entities, so the DB can change without breaking the frontend. Errors always use the same
JSON shape (RFC 7807 problem details) with meaningful status codes: 400 validation, 401 no identity,
403 not allowed, 404 not found, 409 wrong state or concurrent edit, 422 business rule.

**Async on the frontend:** the screens load claim status and notifications over REST and ask again every
30 seconds, after any action, and when the demo user changes (`pollResource` in `frontend/src/app/poll.ts`).
The next step would be server-sent events or WebSocket pushes, driven by the same Kafka events.

## 7. Concurrency

`Claim` has a `@Version` column (optimistic locking). If two officers change the same claim at the same
time, the second save gets 409 "changed by someone else" instead of silently overwriting.

## 8. Security: deliberate shortcut

Identity comes from `X-User-Id` / `X-User-Role` headers. This is **not secure** and is clearly marked
as a demo stand-in. It's isolated in `CurrentUserResolver`, so swapping in real OAuth2/JWT (Spring
Security resource server) changes that one class. The authorisation rules are real and tested:

- claimants only see their own claims (404 for others, so IDs can't be probed)
- officers only act on claims assigned to them, and can only pick up claims nobody else has; moving a claim from one officer to another is a manager action
- only managers see exposure

## 9. Data and infrastructure

- **Postgres** for the running app, **H2 in-memory** for tests, so tests need no Docker.
- **Embedded Kafka** in tests, so the async path is genuinely tested, not mocked.
- **Schema:** Hibernate `ddl-auto=update` to save time. Production would use **Flyway** migrations.
- **Dashboards** aggregate open claims in Java on request: simple and always current. At real volume:
  SQL `GROUP BY`, or a read model updated by a Kafka listener.
- **Six markets** aren't named in the brief. I assumed MY, SG, HK, AU, TH, ID. Currency is ignored
  (amounts are treated as one currency), which is a real gap for cross-market exposure. Production
  needs a currency per policy and FX conversion for the totals.

## 10. What staff and managers see

The question was what an officer needs to manage their workload. The answer built is five things: what to
pick up next, what is mine and going stale, how loaded everyone is, how big the work is, and a way to look
behind any dashboard number at the claims that make it up.

| View | Endpoint | Shows | Why |
|---|---|---|---|
| Unassigned queue | `GET /api/staff/queue` | Submitted claims nobody has, oldest first | The claim that has waited longest is the one most at risk of a broken promise to the claimant. First come, first served is also the easiest rule to explain. |
| My claims | `GET /api/staff/my-claims` | My open claims (anything not settled or rejected), least recently touched first | Stale work rises to the top, such as a claim waiting on the claimant, or one approved but not yet paid. |
| Claim detail | `GET /api/claims/{id}`, `/history`, `/info-requests` | One claim, its audit trail and its open questions | What an officer needs to assess and decide. |
| Workload | `GET /api/dashboard/workload` | Per officer: open claims, count by status, reserved, claimed but not yet assessed, age of the oldest open claim. Plus how many claims are unassigned and how old. | A bare count hides problems. The status split shows a pile-up (for example many claims waiting for information), the reserve shows the size of the work, and the age of the oldest claim is a simple warning for slow claims. "Claimed, not yet assessed" sits beside the reserve because a claim nobody has assessed adds nothing to the reserve, and "0.00 reserved" must not be read as "nothing at stake". |
| Exposure by officer | `GET /api/dashboard/exposure` (`byOfficer`) | The same exposure figures grouped by who holds the claim, plus a line for claims nobody has picked up | A total says how much, not who is holding it. |
| All open claims | `GET /api/staff/open-claims?officerId=&market=&type=` | Every open claim, oldest first, optionally narrowed to one officer, market or type | The drill-down behind the dashboards: click an officer on Workload, or a row on Exposure, and see the claims that make up the number. It also lets a manager reach a claim that is already assigned, which no other list shows. |

Queue, my claims, workload and all open claims are open to any staff member, so officers can see colleagues'
load and claims; that was the simple choice and could be limited to managers. Exposure (section 2) is
manager-only.

**Limits.** "Age" is calendar days since the claim was created, not working days or time since the last
action. There are no SLA targets or alerts, no priority or severity, no filter by team and no
pagination (all in section 12). The filters on the open-claims list are applied in Java after loading the open
claims, like the dashboards (section 9); at real volume they would be SQL conditions. The figures are computed on request (section 9).

## 11. The frontend

A small Angular app in `frontend/` (standalone components, signals, plain CSS, no UI library or state library).

| Role | Screens |
|---|---|
| Claimant | my claims, report an incident, claim detail (history, the officer's questions with an answer box), notifications |
| Officer | unassigned queue with "Pick up", my open claims, all open claims, claim detail with the action buttons, team workload (click an officer for their claims) |
| Manager | everything above, plus liability exposure (who holds it, where it is, with links to the claims behind each number) and assigning or reassigning any open claim |

**Choices**
- **Dev proxy, not CORS.** `ng serve` forwards `/api` to the backend, so the app uses relative URLs and needs no
  cross-origin setup. (The backend still allows `localhost:4200`, which is not needed.)
- **A demo-user dropdown instead of a login**, matching the backend shortcut (section 8). An HTTP interceptor adds
  `X-User-Id` and `X-User-Role` to every call. Real sign-in would replace the `Identity` class and that interceptor only.
- **Async by polling** (section 6): one helper, `pollResource`, loads data, refreshes it every 30 seconds and after
  each action, and ignores a slow reply that has been overtaken by a newer one.
- **One function decides the buttons** (`allowedActions`, unit tested). It mirrors the backend lifecycle and assignment
  rules so the screen only offers things that can work. Hiding a button is a convenience, not security: the server
  checks everything, and if a call is refused the server's own message is shown (for example, approving above the
  policy's cover limit).
- **Role guards** send a user away from pages that are not theirs. The same is enforced again by the server.
- **Plain forms** that read their fields when submitted, with no form library: fewer moving parts to explain.
- **Names, not just IDs.** The backend sends IDs; the screens show "Raj Kumar (O-02)" using the same demo staff
  list as the backend seed data. Customers are shown by ID. A real system would return the name.
- **Same detail page for everyone**: a claimant gets the answer box, staff get the actions. A claimant opening someone
  else's claim gets the backend's "not found".

**Checked.** 21 frontend unit tests (button rules, identity headers, error messages, role menus, names and
ages), and 9 backend tests. The app was also driven by a headless Chrome against the real backend running in
Docker: 36 checks, in two scripts in [`frontend/e2e/`](../frontend/e2e/README.md). One goes from a claimant
reporting an incident through pick-up, reserve, a question and its answer, approval, settlement and a manager's
reassignment, to the manager dashboards and the claimant's Kafka-driven notifications appearing on screen (21
checks). The other clicks through the manager drill-down: workload to an officer's claims, exposure to who holds
it and the claims behind each number (15 checks). They need the whole system running and Chrome installed, so
they are run by hand with `npm test` in that folder and are not part of `ng test`.

**Limits.** No real login, no pagination, polling rather than push, amounts shown without a currency, and no
component tests for the individual pages (the browser checks cover the screens instead, but only when run by
hand). Angular supports Node 22 and 24 (LTS); Node 25 works but prints a warning.

## 12. Left out (in priority order for next steps)

1. Transactional outbox for guaranteed event delivery
2. Real authentication (OAuth2/JWT) and per-market teams
3. Document upload (photos, police reports) to object storage
4. Flyway migrations, currency/FX, pagination on lists
5. SLA tracking (e.g. alert when a claim waits more than X days), push updates to the UI instead of polling
6. Frontend: browser end-to-end tests kept in the repo, and tests for the individual pages
