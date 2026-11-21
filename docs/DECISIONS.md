# Design decisions

Short notes on each decision: what was chosen, why, and what would change in production.

## 1. Time allocation: backend first, frontend left out

The brief weights the backend most and says a solid backend beats a rushed attempt at both.
I spent the time on a tested backend that covers the whole claim lifecycle, Kafka messaging and the
manager views. The API is documented with OpenAPI (Swagger), so an Angular client can be built directly
against it. The frontend is the first item under "Next steps".

## 2. Core entities

| Entity | Why it exists |
|---|---|
| **Policy** | A claim is always made against a policy. The policy gives the market, claim type, cover limit and cover period, which are used to check the claim. Seeded; policy admin is out of scope. |
| **Claim** | The central record: who, what, when, how much was claimed, the reserve, the decision, the status and the assigned officer. |
| **ClaimHistory** | Audit trail: one row per action, with who did it and when. Insurers need this for disputes and regulators. |
| **InfoRequest** | An officer's question to the claimant and the answer. A claim can have several. |
| **Notification** | A message to the claimant, created by the Kafka listener. |
| **StaffMember** | Officers and managers, used for assignment checks and the workload view. |

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

**Async on the frontend:** the claimant's screen would load the claim status and notifications over REST
and poll every 30s or so. The next step would be server-sent events or WebSocket pushes, driven by the
same Kafka events.

## 7. Concurrency

`Claim` has a `@Version` column (optimistic locking). If two officers change the same claim at the same
time, the second save gets 409 "changed by someone else" instead of silently overwriting.

## 8. Security: deliberate shortcut

Identity comes from `X-User-Id` / `X-User-Role` headers. This is **not secure** and is clearly marked
as a demo stand-in. It's isolated in `CurrentUserResolver`, so swapping in real OAuth2/JWT (Spring
Security resource server) changes that one class. The authorisation rules are real and tested:

- claimants only see their own claims (404 for others, so IDs can't be probed)
- officers only act on claims assigned to them
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

## 10. Left out (in priority order for next steps)

1. Angular frontend: claimant view (submit, track, answer) and officer view (queue, my claims, actions, dashboards)
2. Transactional outbox for guaranteed event delivery
3. Real authentication (OAuth2/JWT) and per-market teams
4. Document upload (photos, police reports) to object storage
5. Flyway migrations, currency/FX, pagination on lists
6. SLA tracking (e.g. alert when a claim waits more than X days), push updates to the UI
