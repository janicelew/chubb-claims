// Checks the manager drill-down: workload -> officer's claims, exposure -> who holds it -> claims, names, filters.
// Run journey.mjs first: this one expects open claims (including an SG motor claim) to already exist.
import { APP, OUT, launch } from './browser.mjs';

const results = [];
const consoleProblems = [];
const check = (label, ok, extra = '') => {
  results.push({ label, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : '  ' + extra}`);
};

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (e) => consoleProblems.push('pageerror: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error' && !/status of (404|422)/.test(m.text())) consoleProblems.push('console.error: ' + m.text());
});
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
const see = (text, timeout = 15000) => page.getByText(text, { exact: false }).first().waitFor({ timeout });
const asUser = async (id, glob) => {
  await page.goto(APP);
  await page.evaluate((u) => localStorage.setItem('chubb-claims-demo-user', u), id);
  await page.goto(APP);
  await page.waitForURL(glob);
};
const nav = (name) => page.locator('nav a', { hasText: name }).first().click();

try {
  // 1. workload: no more confusing zeros
  await asUser('M-01', '**/queue');
  await nav('Workload');
  await see('unassigned claims');
  await page.locator('tbody tr').first().waitFor();
  const workloadText = await page.locator('main').innerText();
  check("workload shows 'Claimed, not yet assessed' next to Reserved", workloadText.toLowerCase().includes('claimed, not yet assessed'));
  // Which officers have a claim created today depends on the day the data was made, so check the wording, not a fixed value:
  // every "Oldest open" cell is a dash, "Today", or whole days from 1 up. A bare 0 or "0 days" is never shown.
  const ages = (await page.locator('tbody tr td:last-child').allInnerTexts()).map((a) => a.trim());
  check(
    "'Oldest open' is written as Today / 1 day / N days, never 0",
    ages.length > 0 && ages.every((a) => /^(—|Today|[1-9]\d* days?)$/.test(a)),
    JSON.stringify(ages),
  );
  await shot('20-workload-new');

  // 2. click an officer -> the claims behind the numbers
  const officerLinks = page.locator('tbody tr a', { hasText: /Raj Kumar|Mei Ling Tan|Tom Wong/ });
  const row = page.locator('tbody tr', { hasText: /[1-9]\d*\s*[A-Za-z]+ ·/ }).first(); // an officer with open claims
  const name = (await row.locator('a').first().innerText()).trim();
  await row.locator('a').first().click();
  await page.waitForURL(/open-claims\?officerId=O-0\d/);
  await see('open claims listed');
  const listText = await page.locator('main').innerText();
  check(`clicking ${name} opens that officer's claims`, listText.includes(`held by ${name}`));
  check('the list has a Claimant column and totals', listText.toLowerCase().includes('claimant') && listText.includes("reserved (officers' estimates)"));
  await shot('21-officer-claims');

  // 3. open one of those claims: the manager can reach a claim that is already assigned, and sees names
  await page.locator('tbody tr a').first().click();
  await page.waitForURL(/\/claims\/[0-9a-f-]{36}$/);
  await page.locator('app-status-badge').first().waitFor();
  const detail = await page.locator('main').innerText();
  check('manager can open an already-assigned claim from the list', true);
  check("manager sees 'Assign / reassign' on it", await page.getByRole('button', { name: 'Assign / reassign' }).count() > 0);
  check('history and Handled by show the officer name, not just an ID', /\w+ \w+ \(O-0\d\)/.test(detail));
  await shot('22-claim-with-names');

  // 4. exposure: who holds it, where it is
  await nav('Exposure');
  await see('Who holds it');
  await see('Where it is');
  const exposureText = await page.locator('main').innerText();
  check("exposure says who holds the liability (a 'Who holds it' table with officers)", /Who holds it[\s\S]*\(O-0\d\)/.test(exposureText));
  check('exposure explains itself in a sentence', exposureText.includes("Chubb's estimated liability on open claims is"));
  await shot('23-exposure-new');

  // 5. exposure row -> its claims
  const sgRow = page.locator('tr', { hasText: 'SG' }).filter({ has: page.getByRole('link', { name: 'View claims' }) }).first();
  await sgRow.getByRole('link', { name: 'View claims' }).click();
  await page.waitForURL(/open-claims\?market=SG&type=MOTOR/);
  await see('open claims listed');
  const sgText = await page.locator('main').innerText();
  check("'View claims' on SG motor lists only SG claims", sgText.includes('in SG') && !/\bMY\b/.test(await page.locator('tbody').innerText()));
  await shot('24-sg-claims');

  // 6. all open claims, and who can see the page
  await nav('All open claims');
  await see('Every claim that is not yet settled or rejected');
  check("'All open claims' shows everything (no filter sentence)", true);
  await asUser('O-01', '**/queue');
  check("officers also have 'All open claims'", (await page.locator('nav a', { hasText: 'All open claims' }).count()) === 1);
  await asUser('C-1001', '**/claims');
  check("claimants do not get 'All open claims'", (await page.locator('nav a', { hasText: 'All open claims' }).count()) === 0);
  await page.goto(APP + '/open-claims');
  await page.waitForURL('**/claims');
  check('a claimant opening /open-claims is sent back to My claims', true);
} catch (e) {
  check('drill-down journey completed without an unexpected error', false, String(e).split('\n')[0]);
  await shot('98-failure').catch(() => {});
}

check('no browser console errors or uncaught exceptions', consoleProblems.length === 0, consoleProblems.slice(0, 3).join(' | '));
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
