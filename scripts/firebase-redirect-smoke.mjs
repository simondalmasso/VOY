import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const sourceOrigin = 'https://voy-ar.web.app';
const destinationOrigin = 'https://voy-app.simondalmasso44.workers.dev';
const outDir = process.env.VOY_FIREBASE_EVIDENCE_DIR || 'test-results/firebase-voy-ar';
const cases = [
  { name: 'desktop-1280x800', width: 1280, height: 800, mobile: false },
  { name: 'mobile-390x844', width: 390, height: 844, mobile: true },
  { name: 'mobile-360x800', width: 360, height: 800, mobile: true }
];
const probes = [
  { name: 'root', path: '/', expectedPath: '/', expectedSearch: '' },
  {
    name: 'path-query',
    path: '/__voy_firebase_smoke__/nested?source=firebase-smoke&case=path-query',
    expectedPath: '/__voy_firebase_smoke__/nested',
    expectedSearch: '?source=firebase-smoke&case=path-query'
  }
];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = {
  sourceOrigin,
  destinationOrigin,
  generatedAt: new Date().toISOString(),
  results: []
};
let failed = false;

for (const device of cases) {
  const context = await browser.newContext({
    viewport: { width: device.width, height: device.height },
    isMobile: device.mobile,
    hasTouch: device.mobile,
    serviceWorkers: 'block',
    userAgent: device.mobile
      ? 'Mozilla/5.0 (Linux; Android 13; SM-A225M) AppleWebKit/537.36 Chrome/150 Mobile Safari/537.36'
      : undefined
  });

  for (const probe of probes) {
    const page = await context.newPage();
    const sourceResponses = [];
    const consoleErrors = [];
    const pageErrors = [];
    page.on('response', response => {
      try {
        if (new URL(response.url()).origin === sourceOrigin) {
          sourceResponses.push({
            url: response.url(),
            status: response.status(),
            location: response.headers()['location'] || null
          });
        }
      } catch {}
    });
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', error => pageErrors.push(String(error)));

    const requested = `${sourceOrigin}${probe.path}`;
    const response = await page.goto(requested, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.locator('[data-testid="destination-search"]').waitFor({ state: 'visible', timeout: 20_000 });
    await page.waitForTimeout(250);

    const finalUrl = new URL(page.url());
    const rootRedirect = sourceResponses.find(item => item.status === 302) || null;
    const checks = {
      sourceReturned302: Boolean(rootRedirect),
      finalOriginMatchesCloudflare: finalUrl.origin === destinationOrigin,
      pathPreserved: finalUrl.pathname === probe.expectedPath,
      queryPreserved: finalUrl.search === probe.expectedSearch,
      finalHttpOk: Boolean(response && response.ok()),
      appMounted: await page.locator('[data-testid="destination-search"]').isVisible(),
      noHorizontalOverflow: await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1),
      noPageErrors: pageErrors.length === 0
    };
    if (!Object.values(checks).every(Boolean)) failed = true;

    if (probe.name === 'root') {
      await page.screenshot({ path: join(outDir, `${device.name}-root.png`), fullPage: true });
    }

    report.results.push({
      device: device.name,
      probe: probe.name,
      requested,
      finalUrl: finalUrl.toString(),
      sourceResponses,
      finalStatus: response?.status() ?? null,
      checks,
      pageErrors,
      consoleErrors: consoleErrors.slice(0, 20)
    });
    await page.close();
  }

  await context.close();
}

await browser.close();
report.result = failed ? 'FAIL' : 'PASS';
await writeFile(join(outDir, 'browser-smoke.json'), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(join(outDir, 'summary.txt'), [
  `RESULT=${report.result}`,
  `SOURCE=${sourceOrigin}`,
  `DESTINATION=${destinationOrigin}/`,
  `DEVICES=${cases.map(item => item.name).join(',')}`,
  'CLOUDFLARE_TOUCH=0',
  'FRONTEND_MOVE=0',
  'PROXY=0'
].join('\n') + '\n');

if (failed) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('FIREBASE_BROWSER_SMOKE=PASS');
for (const item of report.results) {
  console.log(`${item.device}/${item.probe} 302=${item.checks.sourceReturned302} FINAL=${item.finalUrl}`);
}
