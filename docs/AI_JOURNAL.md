# AI working journal

Tool: Claude (Opus 5.5), one chat session, 20 Nov 2026.
Format per entry: **Asked**, **AI did**, **My call** (accepted / challenged / overrode) and why.

---

### 1. Understanding the brief (≈20 min)

- **Asked:** Attached the brief, then "explain to me slowly first".
- **AI did:** Explained the problem in plain terms (claimant vs staff, the claim lifecycle as a
  state machine, what "liability exposure" and "reserve" mean), then backend vs frontend, then REST vs
  Kafka.
- **My call:** Accepted the overall framing.
- **Challenged:** I told it "I don't understand the Kafka" part. It re-explained using a different
  angle: what goes wrong *without* Kafka (the approve button doing email, dashboard and logging itself
  and failing if one is down), then Kafka as a group chat that other parts read in their own time.
  That version made sense. The rule I'll defend: *if the user is waiting for the answer, REST;
  if it's a side effect that can happen a moment later, Kafka.*

### 2. Stack and where to build (≈10 min)

- **Asked:** The AI asked me to choose the backend language and where to build.
- **My call:** Java/Spring Boot (the more common Kafka pairing, and closer to what I've used);
  build into a real folder on my machine so the git history is mine.
- **Blocker:** The AI's sandbox couldn't download Maven libraries. Rather than let it write code it
  couldn't compile, I changed my Claude network settings to allow Maven Central so it could build
  *and run tests*. I chose tested code over speed.

### 3. Architecture choices proposed by the AI (to review)

The AI proposed these, and I have to be able to defend each. Status reflects my review:

| Proposal | My call | Reason |
|---|---|---|
| Modular monolith, not microservices | _accept / challenge_ | |
| History written in the same DB transaction, not via Kafka | _accept / challenge_ | |
| Kafka only for claimant notifications (for now) | _accept / challenge_ | |
| Publish after commit, outbox left as documented gap | _accept / challenge_ | |
| Header-based demo identity instead of real login | _accept / challenge_ | |
| Reserve on each claim as the exposure measure | _accept / challenge_ | |
| Skip the Angular frontend, spend time on tested backend | _accept / challenge_ | |

### 4. Things the AI got wrong and corrected (observed during the build)

- First draft had a placeholder `Repositories.java` file with no purpose. The AI deleted it itself.
- `@Version long` (primitive) would make Spring Data treat every new claim as an existing row
  (a wasted SELECT and merge). Changed to `Long`, so `null` means "new".
- The end-to-end test expected **6** claimant notifications but the design sends **5**
  (submitted, assigned, info requested, approved, settled; review/reserve steps are internal).
  The code was right and the test's expectation was wrong, so the test was fixed, not the code.
- A `sed` edit put a comment before a semicolon and broke compilation; fixed by a proper edit.

### 5. My review notes (fill in as I read the code)

<!-- Add entries like:
- Read ClaimService.assign: questioned why officers can't assign to others -> kept, because ...
- Overrode: changed X to Y because ...
-->
