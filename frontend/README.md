# Claims web app (Angular)

A small Angular app for claimants, claims officers and the manager. It talks to the backend in `../backend`.
Design notes: [../docs/DECISIONS.md](../docs/DECISIONS.md) section 11.

```bash
npm install
npm start      # http://localhost:4200  (start the backend first, on port 8080)
npm test       # unit tests
npm run build  # production build into dist/
```

`ng serve` forwards `/api` to `http://localhost:8080` (see `proxy.conf.json`). There is no login: choose a demo
user from the dropdown in the top bar. Use Node.js 22 or 24 (LTS).

## Where things are

| File | What it does |
|---|---|
| `src/app/api.ts` | every backend call, one method per endpoint |
| `src/app/identity.ts`, `identity-interceptor.ts` | the demo user, and the headers sent with every call |
| `src/app/poll.ts` | loads data and refreshes it every 30 seconds and after actions |
| `src/app/claim-actions.ts` | which buttons a user sees on a claim (unit tested) |
| `src/app/pages/` | one component per screen |
