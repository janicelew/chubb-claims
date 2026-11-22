# Chubb APAC Claims Platform (take-home)

A claims platform for motor and property claims. Claimants report incidents, track them and answer
questions; claims staff pick up, assess, approve/reject and settle claims; managers see team workload
and outstanding liability exposure.

**Scope:** the brief said to start with the backend and treat the frontend as optional. This submission
is a tested Spring Boot backend plus a small Angular app covering the whole journey for claimants, officers
and managers; see [docs/DECISIONS.md](docs/DECISIONS.md) for what was built, what was left out and why.

## Run it

You need **Docker Desktop**, **Java 17+** (only to run the backend or tests outside Docker) and
**Node.js 22 or 24** (LTS, only for the web app).

```bash
# Everything (Postgres, Kafka, backend) in containers:
docker compose up --build
```

Then open **http://localhost:8080/swagger-ui.html** to try every endpoint in the browser.

Alternative: run only the infrastructure in Docker and the backend from your IDE / terminal:

```bash
docker compose up postgres kafka
cd backend && ./mvnw spring-boot:run
```

### The web app

With the backend running, in a second terminal:

```bash
cd frontend
npm install
npm start          # http://localhost:4200
```

There is no login. Use the **Demo user** dropdown (top right) to switch between claimants, officers and
the manager. `ng serve` forwards `/api` to the backend on port 8080, so no extra setup is needed.
Frontend tests (36): `npm test`. With everything running, `frontend/e2e` has 39 browser checks that click
through the app (see [frontend/e2e/README.md](frontend/e2e/README.md)).

### Run the tests (no Docker needed)

```bash
cd backend && ./mvnw test
```

Tests use an in-memory H2 database and an embedded Kafka broker. `ClaimJourneyIntegrationTest`
drives a full claim from submission to settlement over HTTP and checks that the Kafka-driven
notifications arrive.

## Demo users

There's no login screen. Each request says who you are with two headers (a deliberate shortcut, see
DECISIONS.md). In Swagger UI these are fields on every endpoint.

| X-User-Id | X-User-Role | Who | Policies |
|---|---|---|---|
| C-1001 | CLAIMANT | claimant (MY) | POL-MY-M-0001 (motor), POL-MY-P-0002 (property) |
| C-1002 | CLAIMANT | claimant (SG) | POL-SG-M-0003 (motor) |
| C-1003 | CLAIMANT | claimant (HK) | POL-HK-P-0004 (property) |
| O-01, O-02, O-03 | OFFICER | claims officers | |
| M-01 | MANAGER | claims manager | |

## A claim end to end (curl)

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
