# Browser checks

Two scripts that click through the real app in a headless Chrome, against the real backend. They are not unit
tests: they need everything running. They check the whole flow end to end, the access rules and the dashboards.

| Script | What it checks | Checks |
| --- | --- | --- |
| `journey.mjs` | A claim from report to payment across all three roles, the cover-limit error, reassigning, the role guards, privacy between claimants, and the Kafka notifications showing on screen | 21 |
| `drilldown.mjs` | The manager drill-down: workload to an officer's claims, exposure to who holds it, officer names, the "All open claims" page and who can see it | 15 |

## Run them

1. Start the backend (`docker compose up --build` in the project folder) and the web app
   (`npm start` in `frontend`, then open http://localhost:4200 to check it loads).
2. In this folder:

   ```
   npm install
   npm test
   ```

   `npm test` runs `journey.mjs` and then `drilldown.mjs`. Run them in that order, because the drill-down expects
   the open claims the journey leaves behind. To run one: `npm run journey` or `npm run drilldown`.

Each check prints `PASS` or `FAIL`, and the exit code is non-zero if any fail. Screenshots go in `screenshots/`
(ignored by git), or in a folder you pass as the first argument.

## Things to know

- **Chrome must be installed.** On macOS it uses `/Applications/Google Chrome.app`. Elsewhere set `CHROME_PATH`
  to your Chrome, or Playwright looks for an installed Chrome. If the app is not on port 4200, set `APP_URL`.
- **They add claims to the running backend** (two per run, marked "browser test" or "cover limit"). To start from
  clean demo data: `docker compose down -v`, then `docker compose up --build`.
- **They are not part of `ng test`.** Those are the 21 unit tests. These need the running system.
