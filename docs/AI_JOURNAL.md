# AI working journal

Format per entry: **Asked**, **AI did**, **My call** (accepted / challenged / overrode) and why.

| When | Tool | Used for |
|---|---|---|
| 20 Nov 2026 | Claude chat (Opus 5.5) | Understanding the brief, design decisions, first build of the backend and its tests |
| 21 Nov 2026 | Claude Code in VS Code (Sonnet 5.5) | Checking the repo against the brief, repo tidy-up, this journal |

**A note on the git history.** The first five commits (scaffold, claim service and API, Kafka, dashboards,
docs) were created on 21 Nov from the code produced in the 20 Nov chat session, so they share one
timestamp and are split by layer, not by when I wrote them. Everything after those five is committed
as it happens.

---

### 1. Understanding the brief (≈20 min)

- **Asked:** Attached the brief, then "explain to me slowly first".
- **AI did:** Explained the problem in plain terms: claimant vs staff, the claim lifecycle as a state
  machine, what "liability exposure" and "reserve" mean, then backend vs frontend, then REST vs Kafka.
- **My call:** Accepted the overall framing.
- **Challenged:** I told it "I don't understand the Kafka" part. It re-explained from a different
  angle: what goes wrong *without* Kafka (the approve button doing email, dashboard and logging itself
  and failing if one is down), then Kafka as a group chat that other parts read in their own time.
  That version made sense. The rule I use and can defend: *if the user is waiting for the answer, REST;
  if it's a side effect that can happen a moment later, Kafka.*

### 2. Stack and where to build (≈10 min)

- **Asked:** The AI asked me to choose the backend language and where to build.
- **My call:** Java/Spring Boot (the more common Kafka pairing, and closer to what I've used); build
  into a real folder on my machine so the git history is mine.
- **Overrode (blocker):** The AI's sandbox couldn't download Maven libraries. Rather than let it write
  code it couldn't compile, I changed my Claude network settings to allow Maven Central so it could build
  *and run tests*. I chose tested code over speed.

### 3. Architecture proposals from the AI, and my decision on each

I reviewed each proposal against the alternative. All seven are accepted; the last column is the cost I
knowingly took on. Full reasoning is in [DECISIONS.md](DECISIONS.md).

| Proposal | My call | Why (and the alternative I rejected) | Cost I accepted |
|---|---|---|---|
| Modular monolith, not microservices | Accepted | A 2–3 hour sprint can't pay for separate databases and distributed failures. Claim, history and info requests must change in one transaction. The notification module only talks to claims through Kafka, so it is the first thing to split out. | Single deployable; scaling and ownership boundaries are only logical. |
| History written in the same DB transaction, not via Kafka | Accepted | An audit trail must never disagree with the claim. A consumer could lag or fail and leave gaps. | History writes are on the request path. |
| Kafka only for claimant notifications (for now) | Accepted | It is the one place with a side effect that can wait. Submit, assign, approve etc. stay REST because the officer needs to know immediately whether it worked. Email/SMS, payments and fraud scoring are listed as future consumers. | Kafka covers one flow, so its value is only partly shown. |
| Publish after commit; transactional outbox left as a documented gap | Accepted knowingly | `AFTER_COMMIT` means we never announce a change that rolled back. The outbox is the right fix but costs a table and a relay. | If the app crashes between commit and send, that event is lost. Written up in DECISIONS.md §5. |
| Header-based demo identity instead of real login | Accepted as a demo shortcut only | Real OAuth2/JWT would eat the time budget. Identity is isolated in `CurrentUserResolver`, so replacing it touches one class. The authorisation rules (claimants see only their own claims, officers act only on their claims, managers see exposure) are real. | Not secure. Must not ship as is. |
| Reserve on each claim as the exposure measure | Accepted | It is the insurance-standard way to measure liability: sum of reserves on open claims. The claimant's *claimed* amount is shown separately because it is their number, not Chubb's estimate. | Needs an officer to set a reserve before a claim counts in exposure. No currency/FX across the six markets. |
| Skip the Angular frontend; spend the time on a tested backend | Accepted | The brief says a well-built backend with a partial frontend outscores a rushed attempt at both. The OpenAPI contract and Swagger UI let a client be built directly. | The brief expects both user types in one Angular app, and this submission doesn't have it yet. |

### 4. Things the AI got wrong and corrected during the build

- First draft had a placeholder `Repositories.java` file with no purpose. The AI deleted it itself.
- `@Version long` (primitive) would make Spring Data treat every new claim as an existing row
  (a wasted SELECT and merge). Changed to `Long`, so `null` means "new".
- The end-to-end test expected **6** claimant notifications but the design sends **5**
  (submitted, assigned, info requested, approved, settled; review/reserve steps are internal).
  The code was right and the test's expectation was wrong, so I fixed the test, not the code.
- A `sed` edit put a comment before a semicolon and broke compilation; fixed with a proper edit.

### 5. Checking the repo against the brief (21 Nov, Claude Code)

- **Asked:** Read the assessment brief and tell me the next step.
- **AI did:** Compared the repo with the brief's deliverables and found four gaps: the journal still had
  placeholders, all five commits carry the same timestamp, `chubb-claims.tgz` and the brief `.docx`
  were untracked, and there is no frontend. It proposed this order: verify the app starts, fix the
  journal, tidy the repo, then a thin Angular slice only if time remains.
- **My call:** Accepted the order and the gaps.
- **Decisions on the tidy-up:**
  - `chubb-claims.tgz` goes in `.gitignore` instead of being deleted, because it is my only copy of the
    20 Nov snapshot outside git.
  - The brief `.docx` stays out of the repo. It is the employer's material, not a deliverable, and the
    README already summarises the task.
  - The history note at the top of this file exists because the panel will compare this journal with
    `git log`, and I would rather explain the timestamps than have them found.
- **Reading the code:** While going through `ClaimService`, the AI noted that `assign` only checks that
  an officer assigns to *themselves*. It doesn't check that the claim is unassigned, and
  `Claim.assignTo` allows reassigning any open claim. So officer O-02 can take over O-01's claim
  mid-review. The tests only cover reassigning a *closed* claim. I haven't decided how to handle this
  yet; the outcome goes in the next entry.
