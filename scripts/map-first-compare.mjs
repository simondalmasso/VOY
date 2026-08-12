import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const beforeUrl = process.env.VOY_BEFORE_URL || 'http://127.0.0.1:8786';
const afterUrl = process.env.VOY_AFTER_URL || 'http://127.0.0.1:8787';
const out = process.env.VOY_MAP_FIRST_EVIDENCE_DIR || 'test-results/map-first-evidence';
const beforeSha = process.env.VOY_BEFORE_SHA || 'bf6c4fd36eafcdab78e7e0ce33f99696541f553c';
const afterSha = process.env.GITHUB_SHA || 'unknown';
const tilePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const cases = [
  { name: 'mobile-360x800', width: 360, height: 800, mobile: true },
  { name: 'mobile-390x844', width: 390, height: 844, mobile: true },
  { name: 'desktop-1280x800', width: 1280, height: 800, mobile: false }
];
const themes = ['light', 'dark'];

await mkdir(join(out, 'before'), { recursive: true });
await mkdir(join(out, 'after'), { recursive: true });
const browser = await chromium.launch({ headless: true });

async function installRoutes(page) {
  await page.route('**/api/geocode?*', async route => {
    const q = new URL(route.request().url()).searchParams.get('q') || '';
    const results = q.includes('Origen evidencia') ? [{ id: 'map-first:evidence-origin', name: 'Plaza 25 de Mayo', display_name: 'Plaza 25 de Mayo, Santa Fe', address: 'Santa Fe', lat: -31.633, lon: -60.706 }] : [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results }) });
  });
  await page.route('**/api/route', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, source: 'osrm_route', distance_km: 3.2, duration_min: 10.5, geometry: [[-60.706,-31.633],[-60.7,-31.64],[-60.700503,-31.643533]] }) }));
  await page.route('https://*.basemaps.cartocdn.com/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: tilePng }));
}

async function createContext(testCase) {
  const context = await browser.newContext({
    viewport: { width: testCase.width, height: testCase.height },
    isMobile: testCase.mobile,
    hasTouch: testCase.mobile,
    serviceWorkers: 'block',
    userAgent: testCase.mobile ? 'Mozilla/5.0 (Linux; Android 13; SM-A225M) AppleWebKit/537.36 Chrome/150 Mobile Safari/537.36' : undefined
  });
  await context.addInitScript(() => {
    window.__voyPerf = { lcp: 0, cls: 0, longTasks: 0, longTaskMax: 0 };
    try { new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__voyPerf.lcp = Math.max(window.__voyPerf.lcp, entry.startTime || 0); }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch {}
    try { new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__voyPerf.cls += entry.value || 0; }).observe({ type: 'layout-shift', buffered: true }); } catch {}
    try { new PerformanceObserver(list => { for (const entry of list.getEntries()) { window.__voyPerf.longTasks += 1; window.__voyPerf.longTaskMax = Math.max(window.__voyPerf.longTaskMax, entry.duration || 0); } }).observe({ type: 'longtask', buffered: true }); } catch {}
  });
  return context;
}

async function assertAfterInitialOriginContract(page) {
  if (await page.getByTestId('origin-input').count() !== 0) throw new Error('after_initial_origin_input_must_be_absent');
  if (await page.getByTestId('origin-apply').count() !== 0) throw new Error('after_initial_origin_apply_must_be_absent');
  await page.getByTestId('origin-manual-trigger').waitFor({ state: 'visible' });
}

async function planTrip(page, stage) {
  if (stage === 'after') {
    await page.getByTestId('origin-manual-trigger').click();
    const input = page.getByTestId('origin-input');
    await input.waitFor({ state: 'visible' });
    await input.fill('Origen evidencia');
    await input.press('Enter');
  } else {
    await page.getByTestId('origin-input').fill('Origen evidencia');
    await page.getByTestId('origin-apply').click();
  }
  await page.waitForFunction(() => document.querySelector('[data-testid="origin-control"]')?.getAttribute('data-selected') === 'true', null, { timeout: 8_000 });
  await page.getByTestId('destination-input').fill('Terminal');
  const result = page.getByTestId('destination-result-verified').first();
  await result.waitFor({ state: 'visible' });
  await result.click();
  await page.getByTestId('trip-sheet').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('[data-testid="map-shell"]')?.getAttribute('data-overlay-ready') === 'true', null, { timeout: 8_000 });
}

async function metrics(page) {
  return page.evaluate(() => {
    const resourceEntries = performance.getEntriesByType('resource').map(entry => ({ name: entry.name, transferSize: entry.transferSize || 0, duration: entry.duration || 0 }));
    const js = resourceEntries.filter(entry => /\.js(?:\?|$)/.test(entry.name));
    const css = resourceEntries.filter(entry => /\.css(?:\?|$)/.test(entry.name));
    const events = performance.getEntriesByType('event').filter(entry => typeof entry.duration === 'number');
    const map = document.querySelector('[data-testid="map-shell"]');
    const mapRect = map instanceof HTMLElement ? map.getBoundingClientRect() : null;
    const sheet = document.querySelector('[data-testid="trip-sheet"]');
    const sheetRect = sheet instanceof HTMLElement ? sheet.getBoundingClientRect() : null;
    const planner = document.querySelector('.planner');
    const plannerRect = planner instanceof HTMLElement ? planner.getBoundingClientRect() : null;
    return {
      transfer: {
        jsBytes: js.reduce((sum, entry) => sum + entry.transferSize, 0),
        cssBytes: css.reduce((sum, entry) => sum + entry.transferSize, 0),
        jsRequests: js.length,
        cssRequests: css.length
      },
      lcpMs: window.__voyPerf?.lcp || 0,
      cls: window.__voyPerf?.cls || 0,
      longTasks: window.__voyPerf?.longTasks || 0,
      longTaskMaxMs: window.__voyPerf?.longTaskMax || 0,
      inpObservedMs: events.length ? Math.max(...events.map(entry => entry.duration || 0)) : 0,
      map: mapRect ? { x: mapRect.x, y: mapRect.y, width: mapRect.width, height: mapRect.height, right: mapRect.right, bottom: mapRect.bottom } : null,
      sheet: sheetRect ? { x: sheetRect.x, y: sheetRect.y, width: sheetRect.width, height: sheetRect.height, right: sheetRect.right, bottom: sheetRect.bottom } : null,
      planner: plannerRect ? { x: plannerRect.x, y: plannerRect.y, width: plannerRect.width, height: plannerRect.height, right: plannerRect.right, bottom: plannerRect.bottom } : null,
      mapState: map instanceof HTMLElement ? map.dataset.mapState || null : null,
      overlayReady: map instanceof HTMLElement ? map.dataset.overlayReady || null : null,
      interactionState: document.querySelector('[data-testid="map-first-layout"]')?.getAttribute('data-interaction-state') || null,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });
}

async function capture(baseURL, stage, testCase, theme) {
  const context = await createContext(testCase);
  const page = await context.newPage();
  await installRoutes(page);
  const started = Date.now();
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('destination-search').waitFor({ state: 'visible' });
  await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
  await page.waitForFunction(() => document.querySelector('[data-testid="map-shell"]')?.getAttribute('data-map-state') !== 'loading', null, { timeout: 12_000 }).catch(() => undefined);
  const mapUsableMs = Date.now() - started;
  await page.waitForTimeout(120);
  if (stage === 'after') await assertAfterInitialOriginContract(page);
  const initial = await metrics(page);
  await page.screenshot({ path: join(out, stage, `${testCase.name}-${theme}-initial.png`), fullPage: true });
  await planTrip(page, stage);
  await page.waitForTimeout(120);
  const trip = await metrics(page);
  await page.screenshot({ path: join(out, stage, `${testCase.name}-${theme}-trip.png`), fullPage: true });
  await context.close();
  return { mapUsableMs, initial, trip };
}

const evidence = { beforeSha, afterSha, generatedAt: new Date().toISOString(), cases: [], checks: {} };
let failed = false;
const failures = [];

for (const testCase of cases) {
  for (const theme of themes) {
    const before = await capture(beforeUrl, 'before', testCase, theme);
    const after = await capture(afterUrl, 'after', testCase, theme);
    const checks = {
      noHorizontalOverflow: after.initial.overflowX <= 1 && after.trip.overflowX <= 1,
      mapRendered: after.initial.mapState !== 'fallback' && after.trip.overlayReady === 'true',
      noRecurrentLongTask: after.trip.longTasks <= Math.max(3, before.trip.longTasks + 2),
      clsControlled: after.trip.cls <= Math.max(.1, before.trip.cls + .05),
      criticalJsTransferControlled: after.trip.transfer.jsBytes <= Math.max(before.trip.transfer.jsBytes * 1.12, before.trip.transfer.jsBytes + 8_192)
    };
    for (const [name, ok] of Object.entries(checks)) if (!ok) { failed = true; failures.push(`${testCase.name}/${theme}:${name}`); }
    evidence.cases.push({ name: testCase.name, theme, before, after, checks });
  }
}

evidence.checks = { result: failed ? 'FAIL' : 'PASS', failures };
await browser.close();
await writeFile(join(out, 'comparison.json'), `${JSON.stringify(evidence, null, 2)}\n`);
await writeFile(join(out, 'summary.txt'), [
  `RESULT=${failed ? 'FAIL' : 'PASS'}`,
  `BEFORE_SHA=${beforeSha}`,
  `AFTER_SHA=${afterSha}`,
  `CASES=${evidence.cases.length}`,
  `FAILURES=${failures.length ? failures.join(',') : 'NONE'}`
].join('\n') + '\n');

if (failed) {
  console.error(`MAP_FIRST_BEFORE_AFTER=FAIL ${failures.join(',')}`);
  process.exit(1);
}
console.log('MAP_FIRST_BEFORE_AFTER=PASS');
for (const item of evidence.cases) {
  console.log(`${item.name}/${item.theme} BEFORE_JS=${item.before.trip.transfer.jsBytes} AFTER_JS=${item.after.trip.transfer.jsBytes} BEFORE_LCP=${item.before.trip.lcpMs.toFixed(1)} AFTER_LCP=${item.after.trip.lcpMs.toFixed(1)} AFTER_CLS=${item.after.trip.cls.toFixed(4)} AFTER_LONG_TASKS=${item.after.trip.longTasks} MAP_USABLE_MS=${item.after.mapUsableMs}`);
}
