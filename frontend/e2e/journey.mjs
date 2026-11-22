// Drives the real Angular app against the real backend, through a whole claim:
// report -> pick up -> review -> question -> answer -> approve -> settle, then the manager views,
// the access rules and the Kafka notifications. Run this one first: it creates the claims the drill-down uses.
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
const switchUser = async (id, urlGlob) => {
  await page.selectOption('select[aria-label="Demo user"]', id);
  await page.waitForURL(urlGlob);
};
const see = (text, timeout = 15000) => page.getByText(text, { exact: false }).first().waitFor({ timeout });
const status = (s, timeout = 15000) => page.locator('app-status-badge', { hasText: s }).first().waitFor({ timeout });
const pad = (n) => String(n).padStart(2, '0');
const d = new Date(Date.now() - 3 * 86400000);
const incidentDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

try {
  // 1. claimant home
  await page.goto(APP);
  await page.evaluate(() => localStorage.clear());
  await page.goto(APP);
  await page.waitForURL('**/claims');
  await see('My claims');
  check('claimant lands on My claims', true);
  await shot('01-claimant-home-empty');

  // 2. report an incident
  await page.locator('nav a', { hasText: 'Report an incident' }).click();
  await see('What happened?');
  await page.selectOption('form select', 'POL-MY-M-0001');
  await page.fill('input[type=date]', incidentDate);
  await page.fill('textarea', 'Rear-ended at a traffic light in Klang (browser test)');
  await page.fill('input[type=number]', '6000');
  await shot('02-report-form');
  await page.getByRole('button', { name: 'Submit claim' }).click();
  await page.waitForURL(/\/claims\/[0-9a-f-]{36}$/);
  const claimUrl = page.url();
  const number = (await page.locator('h1').innerText()).trim();
  check('claim submitted, number shown: ' + number, /^CLM-MY-/.test(number));
  check('status is SUBMITTED', (await page.locator('app-status-badge').first().innerText()).trim() === 'SUBMITTED');
  await shot('03-claimant-claim-submitted');

  // 3. officer picks it up from the queue
  await switchUser('O-01', '**/queue');
  await see(number);
  check('claim appears in the officer queue', true);
  await shot('04-officer-queue');
  await page.locator('tr', { hasText: number }).getByRole('button', { name: 'Pick up' }).click();
  await page.locator('tr', { hasText: number }).waitFor({ state: 'detached', timeout: 10000 });
  check('picked-up claim leaves the queue', true);

  await page.locator('nav a', { hasText: 'My claims' }).click();
  await page.locator('a', { hasText: number }).click();
  await status('ASSIGNED');
  check('officer sees ASSIGNED', true);

  await page.getByRole('button', { name: 'Start review' }).click();
  await status('UNDER REVIEW');
  check('start review moves to UNDER REVIEW', true);

  await page.getByRole('button', { name: 'Set reserve' }).click();
  await page.fill('input[type=number]', '5000');
  await page.getByRole('button', { name: 'Save reserve' }).click();
  await see('5,000.00');
  check('reserve saved (5,000.00)', true);

  await page.getByRole('button', { name: 'Ask the claimant a question' }).click();
  await page.fill('textarea', 'Please upload the police report number.');
  await page.getByRole('button', { name: 'Send question' }).click();
  await status('INFO REQUESTED');
  check('asking a question moves to INFO REQUESTED', true);
  await shot('05-officer-detail-info-requested');

  // 4. claimant answers
  await switchUser('C-1001', '**/claims');
  await page.locator('a', { hasText: number }).click();
  await see('Please upload the police report number.');
  await page.fill('textarea', 'Police report KLG/1234/26');
  await shot('06-claimant-answer-box');
  await page.getByRole('button', { name: 'Send answer' }).click();
  await status('UNDER REVIEW');
  check('claimant answer sends the claim back to UNDER REVIEW', true);

  // 5. officer approves and settles
  await switchUser('O-01', '**/queue');
  await page.locator('nav a', { hasText: 'My claims' }).click();
  await page.locator('a', { hasText: number }).click();
  await page.getByRole('button', { name: 'Approve', exact: true }).click();
  await page.fill('input[type=number]', '4500');
  await page.fill('textarea', 'Third party at fault');
  await page.getByRole('button', { name: 'Approve claim' }).click();
  await status('APPROVED');
  check('approve works', true);
  await page.getByRole('button', { name: 'Mark as settled' }).click();
  await status('SETTLED');
  check('settle works', true);
  await shot('07-officer-settled');
  check('no action buttons once settled', (await page.getByRole('button', { name: 'Approve', exact: true }).count()) === 0);

  // 6. a server-side rule shows up as a readable message: approving above the cover limit
  // (use a second claim so this one stays settled)
  await switchUser('C-1002', '**/claims');
  await page.locator('nav a', { hasText: 'Report an incident' }).click();
  await see('What happened?');
  await page.selectOption('form select', 'POL-SG-M-0003');
  await page.fill('input[type=date]', incidentDate);
  await page.fill('textarea', 'Large claim to test the cover limit');
  await page.fill('input[type=number]', '70000');
  await page.getByRole('button', { name: 'Submit claim' }).click();
  await page.waitForURL(/\/claims\/[0-9a-f-]{36}$/);
  const bigUrl = page.url();
  await switchUser('O-02', '**/queue');
  await page.goto(bigUrl);
  await page.getByRole('button', { name: 'Pick up this claim' }).click();
  await status('ASSIGNED');
  await page.getByRole('button', { name: 'Start review' }).click();
  await status('UNDER REVIEW');
  await page.getByRole('button', { name: 'Approve', exact: true }).click();
  await page.fill('input[type=number]', '70000');
  await page.fill('textarea', 'test');
  await page.getByRole('button', { name: 'Approve claim' }).click();
  await page.locator('p.error', { hasText: 'cover limit' }).waitFor({ timeout: 15000 });
  check('approving above the cover limit shows the backend message', true);
  await shot('08-cover-limit-error');

  // 7. manager views
  await switchUser('M-01', '**/queue');
  await page.locator('nav a', { hasText: 'Exposure' }).click();
  await see('Liability exposure');
  await see('reserved on open claims');
  check('manager sees Exposure', true);
  await shot('09-manager-exposure');
  await page.locator('nav a', { hasText: 'Workload' }).click();
  await see('Team workload');
  await see('unassigned claims');
  await shot('10-workload');
  await page.goto(bigUrl);
  await page.getByRole('button', { name: 'Assign / reassign' }).click();
  await page.selectOption('form select', 'O-03');
  await page.getByRole('button', { name: 'Assign', exact: true }).click();
  await page.locator('dd', { hasText: 'O-03' }).first().waitFor({ timeout: 15000 });
  check('manager can reassign an open claim to O-03', true);
  await shot('11-manager-reassigned');

  // 8. guards and privacy
  await switchUser('O-01', '**/queue');
  await page.goto(APP + '/exposure');
  await page.waitForURL('**/queue');
  check('an officer opening /exposure is sent back to the queue', true);
  await switchUser('C-1001', '**/claims');
  await page.goto(APP + '/queue');
  await page.waitForURL('**/claims');
  check('a claimant opening /queue is sent back to My claims', true);
  await switchUser('C-1003', '**/claims');
  await page.goto(claimUrl);
  await see('not found');
  check("another claimant cannot open someone else's claim (shows 'not found')", true);
  await shot('12-other-claimant-not-found');

  // 9. notifications arrive asynchronously through Kafka
  await switchUser('C-1001', '**/claims');
  await page.locator('nav a', { hasText: 'Notifications' }).click();
  let ok = false;
  for (let i = 0; i < 12 && !ok; i++) {
    await page.reload();
    await see('Notifications');
    const text = await page.locator('main').innerText();
    ok = text.includes('has been approved') && text.includes('Payment for claim');
    if (!ok) await page.waitForTimeout(1500);
  }
  check('claimant notifications (via Kafka) show approved + payment messages', ok);
  await shot('13-claimant-notifications');
} catch (e) {
  check('journey completed without an unexpected error', false, String(e).split('\n')[0]);
  await shot('99-failure').catch(() => {});
}

check('no browser console errors or uncaught exceptions', consoleProblems.length === 0, consoleProblems.slice(0, 3).join(' | '));
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
