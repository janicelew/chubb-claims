# AI working journal

A running log of what I asked the AI, what I accepted, what I challenged and what I overrode, with short
reasons. I used AI for the slow parts: explaining the domain, writing code and tests, and reviewing the
result. I made the decisions and I'm responsible for every line.

Every entry uses the same labels: **Asked**, **Accepted**, **Challenged**, **Overrode**, **Why**. A label is
left out when it didn't apply.

---

### 1. Learning the brief
- **Asked:** Explain the brief slowly: claimants vs claims staff, the claim lifecycle, and what "reserve" and
  "liability exposure" mean.
- **Challenged:** I didn't understand the Kafka part, so I asked again. The second answer worked: Kafka is for
  things that can happen a moment later (like notifying the claimant), and anything the user is waiting on
  uses REST.
- **Why:** I'm new to insurance claims and to Kafka. I wanted to understand it before designing, because I
  have to be able to explain it.

### 2. Choosing the stack
- **Asked:** For the options and trade-offs.
- **Accepted:** Java and Spring Boot. It's the common pairing with Kafka and closer to what I've used.
- **Overrode:** The AI's sandbox couldn't download Maven libraries, so it could not compile the code. I allowed
  Maven Central instead of accepting code that was never built.
- **Why:** I'd rather have tested code than code nobody has run.

### 3. Design decisions
- **Asked:** For a design, with a reason for each choice. The full reasons are in [DECISIONS.md](DECISIONS.md).
- **Accepted** all of these, because the reasons held up:
  - One modular service, not microservices: too much cost for a 2–3 hour build.
  - Claim history saved in the same database transaction as the claim, so the two can never disagree.
  - Kafka only for claimant notifications, the one thing that can wait. Everything else is REST.
  - Events sent after the commit, with the outbox left as a known gap: simple now, written down for later.
  - Header-based demo identity: a shortcut I know is not secure, kept in one class.
  - Reserve as the liability measure: the standard way insurers measure money still to be paid out.
  - Backend first, frontend after: the brief says a good backend beats a rushed attempt at both.

### 4. Building the backend
- **Asked:** For the claim model and lifecycle rules, the REST API for claimants and staff, Kafka
  notifications, the workload and exposure dashboards, and tests, including one full submit-to-settle journey.
  I required the tests so the AI's code was checked and not just trusted. There are 9 backend tests: 5
  lifecycle unit tests and 4 integration tests that run against a real embedded Kafka.
- **Why:** Writing this much by hand wouldn't fit the time limit, so the tests are what let me trust the result.

### 5. Mistakes in the AI's work that were caught
- **Challenged:**
  - A pointless placeholder file. The AI removed it.
  - `@Version long` should be `Long`, or every new claim is treated as an existing row.
  - A test expected 6 notifications but the design sends 5. The code was right, so I fixed the test.
  - A `sed` edit broke compilation and was redone properly.

### 6. Checking the repo against the brief
- **Asked:** To compare the repo with the brief's deliverables, and then to check whether we had answered the
  brief's questions about how the system is split into parts and how those parts relate.
- **Accepted:** The findings. The journal had placeholders, `chubb-claims.tgz` needed ignoring, and two
  questions were only partly answered. I added entity relationships and a description of what officers and
  managers see. I kept the brief `.docx` out of the repo because it's Chubb's material.
- **Accepted** a real bug the review found: an officer could take over another officer's open claim, because
  `assign` only checked that they were assigning it to themselves. Now an officer can only pick up an
  unassigned claim (or one already theirs), and moving a claim between officers is a manager action. The new
  test fails on the old code (403 expected, 200 returned) and passes with the fix.

### 7. Understanding one service vs many
- **Asked:** Why one service and not microservices, and how I would split it later if the interviewer asks.
- **Challenged:** I said I didn't understand the first answer and asked for it in plain language, twice. The
  version that worked: things that must be saved together stay together, and everything
  else talks through messages. If it had to be split, notifications go first (they already run only from
  Kafka messages), then dashboards. I would add the outbox before splitting.
- **Why:** I have to defend this decision out loud, so I need to understand it and not just repeat it.

### 8. Building the Angular frontend
- **Asked:** For the frontend: claimant screens (my claims, report an incident, claim detail with the
  officer's questions and history, notifications), officer screens (queue with pick up, my claims, claim
  detail with the action buttons, workload) and manager screens (exposure, assign).
- **Accepted:** A thin slice that shows one claim going from report to payment across all three roles: plain
  CSS, no UI library, polling instead of push. Reasons and limits are in [DECISIONS.md](DECISIONS.md)
  section 11.
- **Why:** The brief expects both user types in one Angular app, and the time limit doesn't allow more.
- **Checked:** 21 frontend unit tests pass. The AI also drove the real app in a headless Chrome against the
  real backend running in Docker: 21 checks, from a claimant reporting an incident to the officer settling it,
  the manager's dashboards, and the Kafka notifications appearing on screen. The first run showed weaknesses in
  the browser script itself (one check passed on the wrong text) and noise in the history display
  ("Under review → Under review"). Both were fixed and the run repeated.
- **Not covered:** The browser script is not in the repo, and the individual pages have no component tests.
  Angular officially supports Node 22 and 24. This machine has Node 25, which works but gives a warning.

### 9. Trying the app and pushing back on the manager screens
- **Challenged:** I clicked through the app myself and said the exposure page was too brief, didn't say who
  was holding the exposure, and that clicking an officer should show their claims. I also asked whether the
  total reserve and "oldest open" figures were correct.
- **AI did:** Checked the figures against each officer's real claims in the running backend. They were
  correct, but misleading: a claim nobody has assessed adds nothing to "reserved", so "0.00" looked like "no
  risk" while 71,000 was claimed, and "0 days" didn't say "today". It then added a "claimed, not yet assessed"
  column, "Today" instead of 0, exposure broken down by officer, a staff-only list of open claims (filterable
  by officer, market and type) with links from every dashboard number, and officer names instead of bare IDs.
- **Accepted:** The diagnosis. My challenge also exposed a gap the AI had missed: a manager had no way to reach
  a claim that was already assigned, because no list showed it. The new "All open claims" page closes that.
- **Checked:** 9 backend tests and 21 frontend tests pass. A new browser script clicked through the drill-down
  against the rebuilt backend (15 checks), after the earlier full journey was re-run to check nothing broke.

### 10. Commits and GitHub history
- **Asked:** To commit in small pieces as it worked, so the history shows the steps.
- **Overrode:** The AI's default of adding itself as a co-author in commit messages. I told it not to. The
  commits are my work, and the AI's part is recorded here instead.
- **Challenged:** I noticed the commits showed a different author name from mine, and that GitHub's Contributors
  box still listed the AI. The AI first said this was probably a stale cache. I pushed back, and GitHub's own
  activity log showed my first push had carried those co-author lines. I corrected the author name on every
  commit and recreated the repository with a clean history.
- **Why:** The history should show my work under my name, and I should check the AI's explanation against
  evidence before accepting it.

---

Known gaps are listed in [DECISIONS.md](DECISIONS.md) section 12.
