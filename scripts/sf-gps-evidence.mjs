#!/usr/bin/env node
// Santa Fe native GPS — end-to-end browser evidence (local server + real upstream).
// Serves dist/client and routes /api/* to the built worker handler with the
// documented maintainer env (real Cuándo Pasa source). Captures:
//   - mobile 390x844 and desktop 1440x900 screenshots with live GPS markers
//   - DOM evidence: truth pill state, tracker markers, line filter
// Usage: node scripts/sf-gps-evidence.mjs
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = new URL('..', import.meta.url).pathname;
const CLIENT = join(ROOT, 'dist/client');
const ENV = {
  VOY_SF_GPS_REUSE_APPROVED: 'YES',
  VOY_SF_GPS_FEED_URL: 'https://api.cuandopasa.com.ar',
  VOY_SF_GPS_APPROVED_HOST: 'api.cuandopasa.com.ar',
  VOY_SF_GPS_SOURCE_ID: 'sf_gps_cuandopasa',
  VOY_SF_GPS_LICENSE_URL: 'https://cuandopasa.app/'
};
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon'
};

const worker = await import(join(ROOT, 'dist/worker.js'));
const handler = worker.default.fetch;

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      const request = new Request(url, { method: req.method, headers: req.headers });
      const response = await handler(request, ENV);
      const body = await response.arrayBuffer();
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(body));
      return;
    }
    let path = url.pathname === '/' ? '/index.html' : url.pathname;
    let file = join(CLIENT, path);
    try {
      const stat = await readFile(file).catch(() => null);
      if (!stat || path.endsWith('/')) throw new Error('dir');
    } catch { file = join(CLIENT, path + '.html'); }
    const content = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
});
await new Promise(resolve => server.listen(4173, '127.0.0.1', resolve));
console.log('local server: http://127.0.0.1:4173 (worker env: real Cuándo Pasa source)');

const CANDIDATES = [
  process.env.CHROMIUM_PATH,
  `${process.env.HOME}/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`,
  `${process.env.HOME}/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome`
].filter(Boolean);
let browser = null;
for (const executablePath of CANDIDATES) {
  try { browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] }); break; } catch {}
}
if (!browser) { console.log('NO_BROWSER'); process.exit(1); }

async function runViewport(width, height, label) {
  const page = await browser.newPage({ viewport: { width, height } });
  const apiLog = [];
  page.on('response', response => {
    if (response.url().includes('/api/transit/santa-fe/vehicles')) {
      apiLog.push(`${response.status()} ${response.url().replace('http://127.0.0.1:4173', '')}`);
    }
  });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  // Wait for the static bus network to load and the first GPS poll to land.
  await page.waitForFunction(() => document.querySelectorAll('#bus-line-picker option').length > 5, { timeout: 20000 });
  await page.selectOption('#bus-line-picker', '9');
  await page.waitForFunction(() => {
    const pill = document.querySelector('#truth-pill');
    return pill && pill.dataset.state && pill.dataset.state !== 'no_coverage';
  }, { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(4000);
  const dom = await page.evaluate(() => {
    const pill = document.querySelector('#truth-pill');
    const markers = [...document.querySelectorAll('[data-tracker-id], .tracker-marker, .voy-marker')];
    const pillText = pill ? (pill.textContent || '').replace(/\s+/g, ' ').trim() : '';
    const sheet = document.querySelector('#sheet-summary, [data-sheet-summary]');
    return {
      truth_state: pill?.dataset.state ?? null,
      truth_label: document.querySelector('#truth-label')?.textContent ?? null,
      truth_meta: document.querySelector('#truth-meta')?.textContent ?? null,
      marker_count: markers.length,
      pill_text: pillText,
      sheet_text: sheet ? sheet.textContent.replace(/\s+/g, ' ').trim() : null,
      bus_line_meta: document.querySelector('#bus-line-meta')?.textContent ?? null,
      map3d_status: document.querySelector('#map-3d-status')?.textContent ?? null
    };
  });
  const shot = join(ROOT, `artifacts-live/evidence-${label}.png`);
  await page.screenshot({ path: shot });
  console.log(`\n=== ${label} (${width}x${height}) ===`);
  console.log('  DOM:', JSON.stringify(dom));
  console.log('  API calls observed:', apiLog.length ? apiLog.join(' | ') : 'none');
  console.log('  screenshot:', shot);
  // ---- zoom/pan persistence: markers must survive viewport interaction ----
  const markersBefore = await page.evaluate(() => document.querySelectorAll('[data-tracker-id], .tracker-marker, .voy-marker').length);
  await page.mouse.move(width / 2, height / 2);
  await page.mouse.wheel(0, -600); // zoom in
  await page.waitForTimeout(900);
  await page.mouse.move(width / 2, height / 2);
  await page.mouse.wheel(0, 900); // zoom out
  await page.waitForTimeout(900);
  const markersAfterZoom = await page.evaluate(() => document.querySelectorAll('[data-tracker-id], .tracker-marker, .voy-marker').length);
  const shotZoom = join(ROOT, `artifacts-live/evidence-${label}-afterzoom.png`);
  await page.screenshot({ path: shotZoom });
  console.log(`  zoom persistence: markers ${markersBefore} -> ${markersAfterZoom} (screenshot ${shotZoom})`);
  // ---- 3D mode attempt (three.js lazy layer) ----
  try {
    const button3d = page.locator('[data-map-mode="3d"]').first();
    if (await button3d.count()) {
      await button3d.click();
      await page.waitForTimeout(3500);
      const status3d = await page.evaluate(() => document.querySelector('#map-3d-status')?.textContent ?? '');
      const shot3d = join(ROOT, `artifacts-live/evidence-${label}-3d.png`);
      await page.screenshot({ path: shot3d });
      console.log(`  3D mode status: ${status3d} (screenshot ${shot3d})`);
    }
  } catch (error) { console.log('  3D attempt skipped:', String(error).slice(0, 80)); }
  await page.close();
  return { ...dom, markersBefore, markersAfterZoom };
}

const mobile = await runViewport(390, 844, 'mobile-390x844-livegps');
const desktop = await runViewport(1440, 900, 'desktop-1440x900-livegps');

await browser.close();
server.close();

const verdict = (mobile.truth_state === 'realtime' || desktop.truth_state === 'realtime') ||
  (mobile.marker_count > 0 || desktop.marker_count > 0);
console.log(`\nE2E VERDICT: ${verdict ? 'LIVE GPS RENDERED IN BROWSER' : 'NOT RENDERED — check DOM evidence above'}`);
process.exit(verdict ? 0 : 1);
