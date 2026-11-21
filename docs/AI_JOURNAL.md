# AI working journal

## Why I used AI

The brief says AI is the main way to work and that I'm judged on how I direct it. So I used AI to do the
slow parts: explaining the domain, writing code and tests, and reviewing the result. I made the
decisions and I'm responsible for every line.

---

## What we did, and why

### 1. Understood the brief
- **What:** Asked the AI to explain the brief slowly: claimants vs claims staff, the claim lifecycle,
  what "reserve" and "liability exposure" mean.
- **Why AI:** I'm new to insurance claims. It was the fastest way to learn the domain before designing.
- **My call:** I didn't understand the Kafka part, so I asked again. The second explanation worked: Kafka
  is for things that can happen a moment later (like notifying the claimant), while anything the user is
  waiting on uses REST.

### 2. Chose the stack
- **What:** Picked Java/Spring Boot, built in a real folder on my machine so the history is mine.
- **Why AI:** It listed the options and trade-offs, so I could choose quickly.
- **My call:** Java, because it's the common pairing with Kafka and closer to what I've used. The AI's
  sandbox couldn't download Maven libraries, so I allowed Maven Central. I'd rather have tested code than
  code that was never compiled.

### 3. Made the design decisions
The AI proposed these, I accepted each, and the reasons are in [DECISIONS.md](DECISIONS.md):
- **One modular service, not microservices:** too much cost for a 2–3 hour build.
- **Claim history saved in the same DB transaction:** it must never disagree with the claim.
- **Kafka only for claimant notifications:** the one thing that can wait. Everything else is REST.
- **Events sent after commit; outbox left as a known gap:** simple now, written down for later.
- **Header-based demo identity:** a shortcut that I know is not secure, kept in one class.
- **Reserve as the liability measure:** the standard way insurers measure outstanding exposure.
- **Backend first, no Angular yet:** the brief says a good backend beats a rushed attempt at both.

### 4. Built the backend
- **What:** Claim model and lifecycle rules, REST API for claimants and staff, Kafka notifications,
  workload and exposure dashboards, and tests (including a full submit-to-settle journey test).
- **Why AI:** Writing this much code by hand would not fit the time limit.
- **My call:** Required tests so the AI's code was checked, not just trusted.

### 5. Caught mistakes the AI made
- A pointless placeholder file (the AI removed it).
- `@Version long` should be `Long`, or every new claim is treated as an existing row.
- The test expected 6 notifications but the design sends 5. The code was right, so I fixed the test.
- A `sed` edit broke compilation and was redone properly.

### 6. Checked the repo against the brief
- **What:** Asked the AI to compare the repo with the brief's deliverables.
- **Why AI:** A fast, structured checklist check.
- **Found and did:** The journal had placeholders (now filled in). `chubb-claims.tgz` is now in
  `.gitignore`, and I kept the brief `.docx` out of the repo because it's Chubb's material.
- **Bug found and fixed:** An officer could take over another officer's open claim, because `assign` only
  checked that they assign to themselves. Now an officer can only pick up an unassigned claim (or one
  that is already theirs), and moving a claim between officers is a manager action. I checked the new
  test fails on the old code (403 expected, 200 returned) and passes with the fix.

### 7. Built the Angular frontend
- **What:** Asked the AI to build the frontend: claimant screens (my claims, report an incident, claim detail
  with the officer's questions and history, notifications), officer screens (queue with pick up, my claims,
  claim detail with the action buttons, workload) and manager screens (exposure, assign).
- **Why AI:** The brief expects both user types in one Angular app, and writing it by hand would not fit the
  time limit.
- **My call:** I wanted a thin slice that shows one claim going from report to payment across all three roles:
  plain CSS, no UI library, polling instead of push. Reasons and limits are in [DECISIONS.md](DECISIONS.md)
  section 11.
- **Checked:** 16 unit tests pass. The AI also drove the real app in a headless Chrome against the real backend
  running in Docker: 21 checks from a claimant reporting an incident to the officer settling it, the manager's
  dashboards, and the Kafka notifications appearing on screen. The first run showed weaknesses in the browser
  script itself (one check passed on the wrong text) and some noise in the history display
  ("Under review → Under review"). Both were fixed and the run repeated.
- **Not covered:** The browser script is not in the repo, and the individual pages have no component tests.
  Angular officially supports Node 22 and 24; this machine has Node 25, which works but gives a warning.

### 8. Tried the app and pushed back on the manager screens
- **What:** I clicked through the app myself and said the exposure page was too brief, didn't say who was
  holding the exposure, and that clicking an officer should show their claims. I also asked whether the total
  reserve and "oldest open" figures were correct.
- **AI did:** Checked the figures against each officer's real claims in the running backend. They were correct,
  but misleading: a claim nobody has assessed adds nothing to "reserved", so "0.00" looked like "no risk" while
  71,000 was claimed, and "0 days" didn't say "today". It then added a "claimed, not yet assessed" column, "Today"
  instead of 0, exposure broken down by officer, a staff-only list of open claims (filterable by officer, market
  and type) with links from every dashboard number, and officer names instead of bare IDs.
- **My call:** Accepted the diagnosis. My challenge also exposed a gap the AI had missed: a manager had no way to
  reach a claim that was already assigned, because no list showed it. The new "All open claims" page closes that.
- **Checked:** 9 backend tests and 21 frontend tests pass, and a new browser script clicked through the drill-down
  against the rebuilt backend (15 checks), after the earlier full journey was re-run to check nothing broke.

