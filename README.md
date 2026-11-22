# Chubb APAC Claims Platform

A claims platform for motor and property claims. **Claimants** report an incident, track it and answer the
officer's questions. **Claims officers** pick up, assess, approve or reject, and settle claims. **Managers** see
the team's workload and how much money is at risk.

**What is in this repository**

- A **Spring Boot backend** (Java 17, Postgres, Kafka): the claim lifecycle, REST API, Kafka notifications,
  dashboards and tests. This is the main part of the work.
- A small **Angular web app** that covers the whole journey for all three kinds of user.
- The reasoning: [docs/DECISIONS.md](docs/DECISIONS.md) (design choices, trade-offs, what was left out) and
  [docs/AI_JOURNAL.md](docs/AI_JOURNAL.md) (how AI was used: asked, accepted, challenged, overrode).

---

## Run it on your computer

The app starts locally, in two terminals. You need:

- **Docker Desktop**, running. It starts the database, Kafka and the backend.
- **Node.js 22 or 24** (LTS), for the web app. Node 25 also works but prints a warning.

**1. Start the backend** (first terminal, from the project folder). The first build downloads dependencies, so
it takes a while.

```bash
docker compose up --build
```

It is ready when http://localhost:8080/actuator/health shows `{"status":"UP"}`. Leave this terminal running.

**2. Start the web app** (second terminal).

```bash
cd frontend
npm install
npm start
```

**3. Open the app: http://localhost:4200**

There is no login. Use the **Demo user** dropdown in the top right to switch between a claimant, an officer and
the manager (see [Demo users](#demo-users)). You start as claimant C-1001.

To stop: press Ctrl+C in the web app terminal, then run `docker compose down`.

To run the backend from your terminal instead of inside Docker (needs Java 17), start only the infrastructure and
then the backend:

```bash
docker compose up postgres kafka
cd backend && ./mvnw spring-boot:run
```

If something does not work:

| You see | Do this |
|---|---|
| "Cannot reach the server" in the app | The backend is not ready yet. Check the health address above, or run `docker compose up -d` again. |
| A blank page on port 4200 | The web app is not running. Run `npm start` in the `frontend` folder. |
| "Port is already in use" | Something else is using 8080 or 4200. Stop it and start again. |
| A yellow Node.js version warning | Harmless. Angular officially supports Node 22 and 24. |

The backend's API documentation (Swagger UI) is at http://localhost:8080/swagger-ui.html.

---

## Try it in 3 minutes

Follow one claim from report to payment. Switch user with the dropdown at each step.

| Step | As | Do | You should see |
|---|---|---|---|
| 1 | **C-1001** (claimant) | **Report an incident**: policy `POL-MY-M-0001`, a date in the last few days, any description, amount `6000` | The new claim with status **SUBMITTED** |
| 2 | **O-01** (officer) | **Queue**, then **Pick up**. Open it from **My claims**, then **Start review**, **Set reserve** `5000`, **Ask the claimant a question** | Status **INFO REQUESTED** |
| 3 | **C-1001** | Open the claim and answer the question | Status goes back to **UNDER REVIEW** by itself |
| 4 | **O-01** | **Approve** `4500` with a reason, then **Mark as settled** | Status **SETTLED**, and no more action buttons |
| 5 | **C-1001** | **Notifications** | Messages about the claim, delivered through Kafka |
| 6 | **M-01** (manager) | **Workload**, then **Exposure**. Click an officer or **View claims** to see the claims behind a number. **All open claims** lists everything and shows each claim's **Age**. | Who holds the liability and where it is |
| 7 | **C-1002** (another claimant) | Copy the claim's address from your browser in step 1, switch to C-1002 and open that address | "Not found": claimants cannot see each other's claims |

The buttons change with the claim's status and the user's role. The backend checks every step as well, so a
screen cannot skip one.

---

## Demo users

There is no login screen. Each request says who you are with two headers, `X-User-Id` and `X-User-Role`. The web
app sends them for you, and in Swagger UI they are fields on every endpoint. This is a deliberate shortcut
(see [DECISIONS.md](docs/DECISIONS.md), section 8): it is not secure, and it is kept in one class so real sign-in
can replace it.

| X-User-Id | X-User-Role | Who | Policies |
|---|---|---|---|
| C-1001 | CLAIMANT | Claimant (Malaysia) | POL-MY-M-0001 (motor), POL-MY-P-0002 (property) |
| C-1002 | CLAIMANT | Claimant (Singapore) | POL-SG-M-0003 (motor) |
| C-1003 | CLAIMANT | Claimant (Hong Kong) | POL-HK-P-0004 (property) |
| O-01 | OFFICER | Mei Ling Tan | |
| O-02 | OFFICER | Raj Kumar | |
| O-03 | OFFICER | Tom Wong | |
| M-01 | MANAGER | Sarah Lim | |

---

## Tests

| What | Command | What it covers |
|---|---|---|
| Backend (9 tests) | `cd backend && ./mvnw test` | The lifecycle rules, and a full claim from submission to settlement over HTTP, with the Kafka notifications arriving. Uses an in-memory database and an embedded Kafka. Needs Java 17. |
| Frontend (36 tests) | `cd frontend && npm test` | Which buttons each role sees, the demo-user headers, error messages, names and ages, the claim table and the Team workload page. |
| Browser checks (39 checks) | `cd frontend/e2e && npm install && npm test` | A headless Chrome clicks through the whole running app. The backend and web app must be running. See [frontend/e2e/README.md](frontend/e2e/README.md). |

---

## Main design decisions

Each one is explained with its trade-offs in [DECISIONS.md](docs/DECISIONS.md).

- **One modular service, not microservices.** A claim's status and its audit history must be saved together, so
  they live in one service. The code is split into sections, so notifications can be split out later.
- **REST for what the user waits for, Kafka for what can happen a moment later.** Submitting and approving are
  REST. Telling the claimant is Kafka, so a slow notification can never block an approval.
- **The claim lifecycle is a state machine** in one place (`ClaimStatus`). A wrong move returns `409`.
- **Reserve is the liability measure.** What claimants asked for but no officer has assessed yet is shown
  separately, never added to the liability.

**Left out on purpose** (full list in [DECISIONS.md](docs/DECISIONS.md), section 12):

- No real login (the header shortcut above).
- No transactional outbox: if the app crashes between saving a change and sending its Kafka message, that
  message is lost.
- No currency handling (all amounts are one currency) and no pagination.
- The web app refreshes by polling every 30 seconds, not by push.
- Database tables are created by Hibernate. A real deployment would use migrations (Flyway).

---

## A claim end to end (curl)

The same journey without the web app.

```bash
API=localhost:8080/api
C='-H X-User-Id:C-1001 -H X-User-Role:CLAIMANT -H Content-Type:application/json'
O='-H X-User-Id:O-01 -H X-User-Role:OFFICER -H Content-Type:application/json'
M='-H X-User-Id:M-01 -H X-User-Role:MANAGER'

# Claimant reports an incident -> copy the "id" from the response
curl -s $C -X POST $API/claimant/claims -d '{"policyNumber":"POL-MY-M-0001","incidentDate":"2026-11-15","description":"Rear-ended at a traffic light","claimedAmount":6000}'
ID=<paste id>

curl -s $O -X POST $API/staff/claims/$ID/assign -d '{"officerId":"O-01"}'   # officer picks it up
curl -s $O -X POST $API/staff/claims/$ID/start-review
curl -s $O -X PUT  $API/staff/claims/$ID/reserve -d '{"amount":5000}'          # estimate liability
curl -s $M $API/dashboard/exposure                                             # manager sees it
curl -s $O -X POST $API/staff/claims/$ID/approve -d '{"amount":4500,"reason":"Third party at fault"}'
curl -s $O -X POST $API/staff/claims/$ID/settle
curl -s $C $API/claimant/notifications                                         # arrived via Kafka
curl -s $C $API/claims/$ID/history                                             # full audit trail
```

## API overview

| Who | Method & path | What |
|---|---|---|
| Claimant | `GET /api/claimant/policies` | my policies |
| Claimant | `GET/POST /api/claimant/claims` | my claims / report an incident |
| Claimant | `POST /api/claimant/claims/{id}/info-requests/{rid}/response` | answer an officer's question |
| Claimant | `GET /api/claimant/notifications` | updates (written by the Kafka listener) |
| Both | `GET /api/claims/{id}`, `/history`, `/info-requests` | claim detail, audit trail, questions |
| Staff | `GET /api/staff/queue` | unassigned claims, oldest first |
| Staff | `GET /api/staff/my-claims` | my open claims |
| Staff | `GET /api/staff/open-claims` | all open claims; optional `officerId`, `market`, `type` filters |
| Staff | `POST /api/staff/claims/{id}/assign` | pick up an unassigned claim (officer) / assign or reassign (manager) |
| Staff | `POST .../start-review`, `PUT .../reserve`, `POST .../info-requests` | assess |
| Staff | `POST .../approve`, `.../reject`, `.../settle` | decide and pay |
| Staff | `GET /api/dashboard/workload` | open claims per officer, backlog age |
| Manager | `GET /api/dashboard/exposure` | outstanding liability by market and type |

## Repository layout

```
frontend/                    Angular app (claimant, officer and manager screens)
  src/app/                   api.ts (all backend calls), identity (demo user), poll.ts (30s refresh),
                             claim-actions.ts (which buttons to show), pages/ (one component per screen)
  e2e/                       browser checks that click through the running app (run by hand)
backend/                     Spring Boot service (Java 17)
  src/main/java/com/chubb/claims/
    claim/domain/            entities + lifecycle rules (ClaimStatus is the state machine)
    claim/service/           use-cases, one transaction each
    claim/api/               REST controllers and request/response DTOs
    events/                  ClaimEvent + Kafka publisher
    notification/            Kafka listener -> claimant notifications
    dashboard/               workload + exposure
    security/                demo identity (headers)
docs/DECISIONS.md            architecture decisions and trade-offs
docs/AI_JOURNAL.md           how AI was used: asked / accepted / challenged / overrode
docker-compose.yml           Postgres + Kafka + backend
```
