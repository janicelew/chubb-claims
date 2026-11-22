// Shared setup for the browser checks: where the app is, where screenshots go, and how Chrome is started.
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';

export const APP = process.env.APP_URL ?? 'http://localhost:4200';

// Screenshots go in e2e/screenshots (ignored by git) unless a folder is given as the first argument.
export const OUT = process.argv[2] ?? new URL('./screenshots', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export function launch() {
  // CHROME_PATH wins; otherwise Chrome on macOS; otherwise Playwright looks for an installed Chrome.
  const executablePath = process.env.CHROME_PATH ?? (existsSync(MAC_CHROME) ? MAC_CHROME : undefined);
  return chromium.launch(executablePath ? { executablePath, headless: true } : { channel: 'chrome', headless: true });
}
