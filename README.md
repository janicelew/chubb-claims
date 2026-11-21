# Chubb APAC Claims Platform (take-home)

A claims platform for motor and property claims. Claimants report incidents, track them and answer
questions; claims staff pick up, assess, approve/reject and settle claims; managers see team workload
and outstanding liability exposure.

**Scope:** the brief said to start with the backend and treat the frontend as optional. This submission
is a tested Spring Boot backend; see [docs/DECISIONS.md](docs/DECISIONS.md) for what was built, what was
left out and why.

## Run it

You need **Docker Desktop** and **Java 17+**.

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
| Staff | `POST /api/staff/claims/{id}/assign` | pick up (officer) / assign (manager) |
| Staff | `POST .../start-review`, `PUT .../reserve`, `POST .../info-requests` | assess |
| Staff | `POST .../approve`, `.../reject`, `.../settle` | decide and pay |
| Staff | `GET /api/dashboard/workload` | open claims per officer, backlog age |
| Manager | `GET /api/dashboard/exposure` | outstanding liability by market and type |

## Repository layout

```
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
