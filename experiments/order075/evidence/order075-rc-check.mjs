// ORDER-075 canonical RC — local browser evidence (Chrome/Edge headless).
// Deterministic: local server, mocked /api payloads, routed map hosts.
// Serves the BUILT dist/client (exact BUILD_ID) — never touches production.
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';

const sourceDir = path.resolve(process.env.SOURCE_DIR || process.cwd());
const outDir = path.resolve(sourceDir, 'experiments/order075/evidence');
await mkdir(outDir, { recursive: true });

const executable = process.env.CHROMIUM_PATH || (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : `${process.env.HOME}/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`);
const { chromium } = await import('playwright-core').then(m => m.default ?? m);
const buildManifest = JSON.parse(await readFile(path.join(sourceDir, 'dist', 'BUILD_MANIFEST.json'), 'utf8'));
const buildId = buildManifest.build_id;
const onlyFollow = process.env.ONLY_FOLLOW === '1';
const onlyCheck = process.env.ONLY_CHECK || '';
const realVector = process.env.REAL_VECTOR === '1';
const evidenceTag = process.env.EVIDENCE_TAG || '';

// ---- mocked VOY Worker payloads (same model as order074 evidence) ----
const worker = await import(pathToFileUrl(path.join(sourceDir, 'src', 'worker.template.js')));
const origin = { label: 'Bulevar Gálvez 1150', territory_verified: true, coordinates: { lat: -31.6412, lon: -60.7042 }, province: { id: '82', name: 'Santa Fe' }, locality: { id: '820147', name: 'Santa Fe', slug: 'santa-fe' } };
const destination = { label: 'Puente Colgante', territory_verified: true, coordinates: { lat: -31.6219, lon: -60.6811 }, province: { id: '82', name: 'Santa Fe' }, locality: { id: '820147', name: 'Santa Fe', slug: 'santa-fe' } };
const fixedNow = Date.parse('2026-09-26T03:30:00Z');
function routeResponse(distance) { return new Response(JSON.stringify({ code: 'Ok', routes: [{ distance, geometry: { type: 'LineString', coordinates: [[-60.7042, -31.6412], [-60.692, -31.632], [-60.6811, -31.6219]] } }] }), { status: 200, headers: { 'content-type': 'application/json' } }); }
async function routingFetch(url) { const s = String(url); if (s.includes('/routed-foot/')) return routeResponse(3100); if (s.includes('/routed-bike/')) return routeResponse(3300); if (s.includes('/routed-car/')) return routeResponse(4100); throw new Error('unexpected_routing_url:' + s); }
const computation = await worker.computeMobilityComputation({ origin, destination }, routingFetch, fixedNow, {});
const mobilityDecision = worker.buildMobilityDecision(destination, fixedNow);
const suggestion = { display_primary: 'Puente Colgante', display_secondary: 'Santa Fe, Santa Fe', candidate_ref: 'order075-puente-colgante', provider: 'order075-fixture', coordinates: destination.coordinates, distance_meters: 3500 };
function apiPayload(p) {
  if (p === '/api/origin/resolve') return { ok: true, result_class: 'resolved', candidates: [origin] };
  if (p === '/api/destinations/suggest') return { ok: true, suggestions: [suggestion], requires_national_expansion: false };
  if (p === '/api/destinations/resolve') return { ok: true, destination, mobility_decision: mobilityDecision };
  if (p === '/api/mobility/compute') return { ok: true, computation };
  if (p === '/api/radar/trains/nearby') return { ok: true, radar: { source_status: 'unsupported', stations: [], source: null } };
  return { ok: false, error: 'not_found' };
}

// ---- local static server over dist/client ----
const requestLog = [];
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8' };
const root = path.resolve(sourceDir, 'dist', 'client');
const server = createServer(async (req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');
  requestLog.push({ method: req.method, path: u.pathname, search: u.search, ts: Date.now() });
  try {
    if (u.pathname.startsWith('/api/')) { const body = JSON.stringify(apiPayload(u.pathname)); res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(body); return; }
    let rel = decodeURIComponent(u.pathname); if (rel === '/' || rel === '') rel = '/index.html';
    const target = path.resolve(root, '.' + rel);
    if (!target.startsWith(root + path.sep) && target !== root) throw new Error('path_escape');
    const s = await stat(target); if (!s.isFile()) throw new Error('not_file');
    const body = await readFile(target);
    res.writeHead(200, { 'content-type': mime[path.extname(target)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

// ---- browser ----
const browser = await chromium.launch({ executablePath: executable, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
import zlib from 'node:zlib';
function makeTilePng() {
  // valid 256x256 solid PNG: raster sources must decode real tiles
  const w = 256, h = 256;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = 0x8a; raw[o + 1] = 0xb5; raw[o + 2] = 0xc9; } }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  function crc32(buf) { let c, crc = 0xffffffff; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = c ^ (crc >>> 8); } return (crc ^ 0xffffffff) >>> 0; }
  function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const t = Buffer.from(type); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, crc]); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const transparentPng = makeTilePng();
// local deterministic "vector substrate": maplibre + local style whose raster tiles are routed
const localVectorStyle = JSON.stringify({
  version: 8,
  name: 'voy-evidence-local',
  sources: { ofm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' } },
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#d7d6cf' } }, { id: 'ofm', type: 'raster', source: 'ofm' }]
});

const evidence = { build_id: buildId, chrome: executable, only_follow: onlyFollow, real_vector: realVector, evidence_tag: evidenceTag, checks: {}, requests: {} };
const results = [];
function check(name, fn) { return async (...a) => { if ((onlyFollow && name !== 'TRACKERVIEW_FIXTURE_REALTIME_FOLLOW') || (onlyCheck && name !== onlyCheck)) return; try { const detail = await fn(...a); results.push({ name, status: 'PASS', detail }); console.log(`${name}=PASS`); } catch (error) { const detail = String(error.stack || error.message || error); results.push({ name, status: 'FAIL', error: detail }); console.log(`${name}=FAIL ${detail.slice(0, 1400)}`); } }; }
function pageErrorsOf(ctx) { return ctx.errors || []; }

async function freshContext({ viewport = { width: 1440, height: 900 }, reducedMotion = 'no-preference', routeVector = true, fixture = false } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, serviceWorkers: 'allow', reducedMotion });
  await context.route('https://tile.openstreetmap.org/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: transparentPng }));
  if (routeVector && !realVector) {
    // single handler with URL discrimination: last-registered routes win in
    // playwright, so a catch-all must NOT shadow the style route
    await context.route('https://tiles.openfreemap.org/**', route => {
      const url = route.request().url();
      if (url.includes('/styles/liberty')) route.fulfill({ status: 200, contentType: 'application/json', body: localVectorStyle });
      else route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
  }
  const page = await context.newPage();
  const errors = [];
  const externalResponses = [];
  page.on('pageerror', e => errors.push('page:' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console:' + m.text()); });
  page.on('response', response => { const url = response.url(); if (/openfreemap\.org|openstreetmap\.org/.test(url)) externalResponses.push({ url, status: response.status(), contentType: response.headers()['content-type'] || '' }); });
  const start = requestLog.length;
  const url = baseUrl + (fixture ? '/?fixture=realtime&fixtureTickMs=1200' : '/');
  await page.goto(url, { waitUntil: 'load' });
  return { context, page, start, errors, externalResponses };
}
const segment = start => requestLog.slice(start);
const apiCalls = rows => rows.filter(r => r.path.startsWith('/api/')).length;
const lazy3D = rows => rows.filter(r => /^\/(?:3d\/|vendor\/three)/.test(r.path)).length;

async function waitTrail(page, min) {
  await page.waitForFunction(min => Number(document.querySelector('#time-rail')?.max || 0) >= min, min, { timeout: 30000 });
}
// markers legitimately move with fresh realtime observations (4Hz): a real
// pointer click races element stability, so select via the DOM event path.
// Pointer-level interactivity is covered by the keyboard check and the drag test.
async function clickMarker(page, id) {
  await page.locator(`[data-entity-id="${id}"]`).dispatchEvent('click');
}

// ===== 1. mobile first paint is MAP-FIRST =====
await check('MAP_FIRST_MOBILE_390x844', async () => {
  const { context, page, start, errors } = await freshContext({ viewport: { width: 390, height: 844 } });
  try {
    await page.waitForSelector('#map-tiles .map-tile', { timeout: 10000 });
    const m = await page.evaluate(() => {
      const map = document.querySelector('#map-shell').getBoundingClientRect();
      const sheet = document.querySelector('#voy-sheet').getBoundingClientRect();
      const pill = document.querySelector('#truth-pill').getBoundingClientRect();
      const toggle = document.querySelector('#map-mode-toggle').getBoundingClientRect();
      const collapsedSheetHeight = sheet.height;
      return {
        innerWidth, innerHeight,
        map: { x: map.x, y: map.y, w: map.width, h: map.height },
        mapShare: (map.width * map.height) / (innerWidth * innerHeight),
        sheetHeightOverMap: collapsedSheetHeight / map.height,
        pillVisible: pill.width > 0 && pill.height > 0,
        toggleVisible: toggle.width > 0 && toggle.height > 0,
        heroAbsent: !document.querySelector('.destination-hero'),
        destinationInSheet: Boolean(document.querySelector('#destination')?.closest('#voy-sheet')),
        docOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        bodyOverflow: document.body.scrollWidth > document.body.clientWidth + 1
      };
    });
    assert.ok(m.mapShare >= 0.70, `map share ${m.mapShare}`);
    assert.ok(m.map.w >= innerWidthCheck(m) - 2, 'map fills width');
    assert.ok(m.sheetHeightOverMap <= 0.30, `sheet covers ${(m.sheetHeightOverMap * 100).toFixed(1)}% of map (<=30)`);
    assert.ok(m.pillVisible, 'truth pill visible');
    assert.ok(m.toggleVisible, '2D/3D control visible');
    assert.ok(m.heroAbsent, 'no destination hero');
    assert.ok(m.destinationInSheet, 'search inside sheet');
    assert.equal(m.docOverflow, false); assert.equal(m.bodyOverflow, false);
    assert.equal(apiCalls(segment(start)), 0, 'boot made zero Worker calls');
    await page.screenshot({ path: path.join(outDir, 'mobile-390x844-mapfirst.png') });
    return m;
  } finally { await context.close(); }
})();

function innerWidthCheck(m) { return m.innerWidth; }

// ===== 2. Santa Fe truthful no-live (production default) =====
await check('NO_LIVE_SANTA_FE_TRUTHFUL', async () => {
  const { context, page, start, errors } = await freshContext({ viewport: { width: 390, height: 844 } });
  try {
    await page.waitForFunction(() => document.querySelector('#truth-label')?.textContent?.length > 0, null, { timeout: 10000 });
    const truth = await page.textContent('#truth-label');
    assert.match(truth, /Tiempo real no disponible en esta cobertura/);
    const summary = await page.textContent('#sheet-summary');
    assert.match(summary, /sin fuente de tiempo real autorizada/i);
    const markers = await page.locator('.tracker-marker').count();
    assert.equal(markers, 0, 'no vehicle markers without a real source');
    assert.equal(apiCalls(segment(start)), 0, 'no Worker calls by default');
    const fixtureBannerHidden = await page.locator('#fixture-banner').isHidden();
    assert.equal(fixtureBannerHidden, true, 'fixture banner must stay hidden in production surface');
    await page.screenshot({ path: path.join(outDir, 'no-live-santa-fe.png') });
    return { truth };
  } finally { await context.close(); }
})();

// ===== 3. search is secondary (chip + sheet) =====
await check('SEARCH_SECONDARY_SHEET', async () => {
  const { context, page } = await freshContext({ viewport: { width: 390, height: 844 } });
  try {
    await page.click('#search-chip');
    await page.waitForSelector('#sheet-body .sheet-expanded:not([hidden])');
    const focused = await page.evaluate(() => document.activeElement?.id);
    assert.equal(focused, 'destination', 'chip expands sheet and focuses destination');
    assert.ok(await page.evaluate(() => Boolean(document.querySelector('#destination')?.closest('#voy-sheet'))));
    await page.screenshot({ path: path.join(outDir, 'mobile-sheet-search.png') });
    await page.click('#sheet-toggle');
    const collapsed = await page.evaluate(() => document.querySelector('#voy-sheet')?.dataset.pane);
    assert.equal(collapsed, 'collapsed');
    return { ok: true };
  } finally { await context.close(); }
})();

// ===== 4. fixtures: realtime entities selectable, facts truthful, follow/pan/resume =====
await check('TRACKERVIEW_FIXTURE_REALTIME_FOLLOW', async () => {
  const { context, page, start, errors } = await freshContext({ viewport: { width: 390, height: 844 }, fixture: true });
  try {
    await page.waitForSelector('.tracker-marker', { timeout: 20000 });
    await page.waitForFunction(() => document.querySelectorAll('.tracker-marker').length >= 5, null, { timeout: 20000 });
    const markerCount = await page.locator('.tracker-marker').count();
    assert.ok(markerCount >= 5, `expected several fixture markers, got ${markerCount}`);
    // scheduled entity must never produce a vehicle marker
    const scheduledMarker = await page.locator('[data-entity-id="fix-svc-01"]').count();
    assert.equal(scheduledMarker, 0, 'scheduled fixture renders no vehicle');
    // select a realtime entity first: the time rail belongs to the selected entity
    await clickMarker(page, 'fix-bus-01');
    await page.waitForSelector('#tracker-facts:not([hidden])');
    await waitTrail(page, 1);
    const factsText = await page.textContent('#facts-rows');
    assert.match(factsText, /L\u00ednea 15|fix-bus-01/);
    assert.match(factsText, /En vivo/);
    assert.match(factsText, /synthetic fixture/);
    const banner = await page.textContent('#fixture-banner');
    assert.match(banner, /FIXTURE DEMO/);
    const truth = await page.textContent('#truth-label');
    assert.match(truth, /En vivo/);
    // follow
    await page.click('#follow-button');
    try {
      await page.waitForFunction(() => document.querySelector('#follow-button')?.textContent?.includes('Siguiendo'), null, { timeout: 8000 });
    } catch (error) {
      const text = await page.textContent('#follow-button');
      const debugState = await page.evaluate(() => ({ follow: window.__voyDebug?.store?.follow?.(), selected: window.__voyDebug?.store?.selected?.()?.id, pill: document.querySelector('#truth-label')?.textContent, pane: document.querySelector('#voy-sheet')?.dataset.pane }));
      throw new Error(`follow did not stick: text=${text} state=${JSON.stringify(debugState)}`);
    }
    const beforePanApi = apiCalls(segment(start));
    // pan the vector map: user interaction must suspend follow immediately.
    // drag in the upper map area: the expanded sheet covers the lower half.
    // wait for the vector substrate to be interactive first: a drag issued
    // while MapLibre is still booting would be silently skipped and the
    // follow-suspension wait would race (observed flake).
    await page.waitForFunction(() => window.__voyDebug?.substrate?.maplibreReady === true, null, { timeout: 20000 });
    const canvas = page.locator('#map-canvas canvas').first();
    assert.ok((await canvas.count()) > 0, 'vector canvas present after readiness');
    {
      const box = await canvas.boundingBox();
      const dragX = box.x + box.width / 2;
      const dragY = box.y + Math.min(90, box.height / 3);
      await page.mouse.move(dragX, dragY);
      await page.mouse.down();
      await page.mouse.move(dragX + 120, dragY + 40, { steps: 8 });
      await page.mouse.up();
    }
    await page.waitForFunction(() => document.querySelector('#follow-button')?.textContent?.includes('Reanudar seguimiento'), null, { timeout: 10000 });
    assert.equal(apiCalls(segment(start)), beforePanApi, 'pan added zero Worker calls');
    await page.screenshot({ path: path.join(outDir, 'focus-state.png') });
    // resume
    await page.click('#follow-button');
    await page.waitForFunction(() => document.querySelector('#follow-button')?.textContent?.includes('Siguiendo'), null, { timeout: 10000 });
    assert.equal(apiCalls(segment(start)), beforePanApi, 'follow/resume added zero Worker calls');
    // trail + time rail with >=3 observations
    await waitTrail(page, 3);
    const rail = await page.getAttribute('#time-rail', 'max');
    assert.ok(Number(rail) >= 3, `time rail max ${rail}`);
    const apiBeforeScrub = apiCalls(segment(start));
    // scrub to the oldest observation: zero fetch + historical label + marker relocation
    await page.fill('#time-rail', '0');
    await page.dispatchEvent('#time-rail', 'input');
    await page.waitForFunction(() => !document.querySelector('#return-to-now')?.hidden, null, { timeout: 10000 });
    const factsScrub = await page.textContent('#facts-rows');
    assert.match(factsScrub, /Hist\u00f3rico de esta sesi\u00f3n/);
    // return to now
    await page.click('#return-to-now');
    await page.waitForFunction(() => document.querySelector('#return-to-now')?.hidden, null, { timeout: 10000 });
    const factsNow = await page.textContent('#facts-rows');
    assert.doesNotMatch(factsNow, /Hist\u00f3rico de esta sesi\u00f3n/);
    assert.equal(apiCalls(segment(start)), apiBeforeScrub, 'scrub + return added zero Worker calls');
    await page.screenshot({ path: path.join(outDir, 'session-trail-time-rail.png') });
    await page.screenshot({ path: path.join(outDir, 'follow-active.png') });
    return { markerCount, rail, followApiDelta: apiCalls(segment(start)) - beforePanApi };
  } finally { await context.close(); }
})();

// ===== 5. selection survives 2D -> 3D -> 2D; lazy 3D; zero Worker delta =====
await check('SELECTION_SURVIVES_2D_3D', async () => {
  const { context, page, start, errors } = await freshContext({ viewport: { width: 1440, height: 900 }, fixture: true });
  try {
    await page.waitForSelector('.tracker-marker', { timeout: 20000 });
    const apiBefore = apiCalls(segment(start));
    // zero THREE / voy3d / topology assets before explicit 3D
    // (the pure temporal engine may lazy-load when realtime entities exist; it is logic, not a 3D asset)
    const lazyBefore = requestLog.slice(start).filter(r => /^\/(?:vendor\/three|3d\/voy3d|3d\/topology)/.test(r.path)).length;
    assert.equal(lazyBefore, 0, 'no three/topology fetch before explicit 3D');
    await clickMarker(page, 'fix-bus-01');
    await page.waitForSelector('#tracker-facts:not([hidden])');
    await page.click('[data-map-mode="3d"]');
    await page.waitForSelector('.voy-3d-canvas', { timeout: 20000 });
    await page.waitForFunction(() => document.querySelector('.voy-3d-canvas')?.dataset.renderCalls, null, { timeout: 20000 });
    const stillSelected = await page.evaluate(() => !document.querySelector('#tracker-facts')?.hidden && document.querySelector('#facts-line')?.textContent?.includes('fix-bus-01'));
    assert.ok(stillSelected, 'facts survive 3D activation');
    const routeActive = await page.getAttribute('.voy-3d-canvas', 'data-route-active');
    assert.equal(routeActive, 'true', 'selected tracker geometry drives the 3D route');
    const calls = await page.getAttribute('.voy-3d-canvas', 'data-render-calls');
    assert.ok(Number(calls) > 0 && Number(calls) < 50, `per-render draw calls ${calls}`);
    await page.screenshot({ path: path.join(outDir, '3d-selected-entity.png') });
    await page.click('[data-map-mode="2d"]');
    await page.waitForFunction(() => document.querySelector('[data-map-mode="2d"]')?.getAttribute('aria-pressed') === 'true', null, { timeout: 10000 });
    const afterBack = await page.evaluate(() => !document.querySelector('#tracker-facts')?.hidden && document.querySelectorAll('.tracker-marker').length > 0);
    assert.ok(afterBack, 'selection + markers survive return to 2D');
    assert.equal(apiCalls(segment(start)), apiBefore, '3D round-trip added zero Worker calls');
    return { renderCalls: Number(calls), workerDelta: apiCalls(segment(start)) - apiBefore };
  } finally { await context.close(); }
})();

// ===== 6. stale transition stops motion truthfully =====
await check('STALE_TRANSITION_ZERO_MOVEMENT', async () => {
  const { context, page } = await freshContext({ viewport: { width: 390, height: 844 }, fixture: true });
  try {
    await page.waitForSelector('[data-entity-id="fix-bus-05"]', { timeout: 20000 });
    await clickMarker(page, 'fix-bus-05');
    await page.waitForSelector('#tracker-facts:not([hidden])');
    const truthBefore = await page.textContent('#truth-label');
    assert.match(truthBefore, /En vivo/, 'fixture 05 starts live');
    // its stream stops after 4 ticks (~5s at 1200ms); freshness is 20s
    await page.waitForFunction(() => /Sin se\u00f1al/.test(document.querySelector('#truth-label')?.textContent || ''), null, { timeout: 40000 });
    const staleMarker = await page.locator('[data-entity-id="fix-bus-05"]').count();
    assert.equal(staleMarker, 0, 'stale entity marker disappears (zero movement, zero live claim)');
    const facts = await page.textContent('#facts-rows');
    assert.match(facts, /Sin se\u00f1al/);
    await page.screenshot({ path: path.join(outDir, 'stale-truthful.png') });
    return { ok: true };
  } finally { await context.close(); }
})();

// ===== 7. desktop 1440x900 map full-bleed + side sheet =====
await check('DESKTOP_1440x900_MAP_CANVAS', async () => {
  const { context, page, start } = await freshContext({ viewport: { width: 1440, height: 900 } });
  try {
    await page.waitForSelector('#map-tiles .map-tile', { timeout: 10000 });
    const m = await page.evaluate(() => {
      const map = document.querySelector('#map-shell').getBoundingClientRect();
      const sheet = document.querySelector('#voy-sheet').getBoundingClientRect();
      return { map, sheet, innerWidth, innerHeight };
    });
    assert.ok(m.map.width >= 900 && m.map.height >= 700, `map canvas ${m.map.width}x${m.map.height} remains dominant`);
    assert.ok(m.sheet.width <= 460, `side sheet bounded (${m.sheet.width}px)`);
    assert.ok(m.sheet.right <= m.innerWidth + 1, 'sheet inside viewport');
    assert.equal(apiCalls(segment(start)), 0);
    await page.screenshot({ path: path.join(outDir, 'desktop-1440x900.png') });
    return { map: `${m.map.width}x${m.map.height}`, sheet: `${m.sheet.width}x${m.sheet.height}` };
  } finally { await context.close(); }
})();

// ===== 8. 200% text zoom: no horizontal overflow =====
await check('ZOOM_200_NO_OVERFLOW_390x844', async () => {
  const { context, page } = await freshContext({ viewport: { width: 390, height: 844 }, fixture: true });
  try {
    await page.waitForSelector('.tracker-marker', { timeout: 20000 });
    // select an entity and wait for >=2 observations so the tracker surface
    // (facts, time rail, follow) is measurable at 200%; the sheet is already expanded
    await clickMarker(page, 'fix-bus-01');
    await page.waitForSelector('#tracker-facts:not([hidden])');
    await waitTrail(page, 2);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await page.waitForTimeout(200);
    const m = await page.evaluate(() => {
      const sels = ['#destination', '[data-map-mode="2d"]', '#map-3d-quality', '#truth-pill', '#time-rail', '#follow-button', '#sheet-toggle'];
      const items = sels.map(sel => { const el = document.querySelector(sel); if (!el) return { sel, missing: true }; const r = el.getBoundingClientRect(); return { sel, hidden: !el.getClientRects().length, clip: r.left < -1 || r.right > innerWidth + 1 }; });
      const roots = ['html', 'body', '.app-shell', '.planner'].map(sel => { const el = sel === 'html' ? document.documentElement : sel === 'body' ? document.body : document.querySelector(sel); return { sel, overflow: el ? el.scrollWidth > el.clientWidth + 1 : null }; });
      return { items, roots, innerWidth };
    });
    assert.ok(m.items.every(x => !x.missing && !x.hidden && !x.clip), JSON.stringify(m.items.filter(x => x.missing || x.hidden || x.clip)));
    assert.ok(m.roots.every(x => !x.overflow), JSON.stringify(m.roots));
    await page.screenshot({ path: path.join(outDir, 'zoom200-390x844.png') });
    return { overflow: m.roots };
  } finally { await context.close(); }
})();

// ===== 9. keyboard reaches map controls, sheet, time rail, follow =====
await check('KEYBOARD_REACHES_TRACKERVIEW', async () => {
  const { context, page } = await freshContext({ viewport: { width: 390, height: 844 }, fixture: true });
  try {
    await page.waitForSelector('.tracker-marker', { timeout: 20000 });
    await page.waitForFunction(() => document.querySelectorAll('.tracker-marker').length >= 5, null, { timeout: 20000 });
    const reached = [];
    async function tabTo(sel, max = 120) {
      for (let i = 0; i < max; i++) {
        await page.keyboard.press('Tab');
        if (await page.evaluate(sel => document.activeElement?.matches?.(sel) === true, sel)) return i + 1;
      }
      throw new Error('keyboard_target_not_reached:' + sel);
    }
    reached.push(['2d', await tabTo('[data-map-mode="2d"]')]);
    reached.push(['3d', await tabTo('[data-map-mode="3d"]')]);
    const markerTab = await tabTo('[data-entity-id="fix-bus-01"]');
    reached.push(['marker', markerTab]);
    await page.keyboard.press('Enter');
    await page.waitForSelector('#tracker-facts:not([hidden])', { timeout: 10000 });
    await page.click('#follow-button');
    await waitTrail(page, 2);
    reached.push(['time-rail', await tabTo('#time-rail')]);
    await page.keyboard.press('ArrowLeft');
    const scrubbed = await page.evaluate(() => !document.querySelector('#return-to-now')?.hidden);
    assert.ok(scrubbed, 'keyboard scrub works on the native range input');
    const focusVisible = await page.evaluate(() => { const el = document.activeElement; const cs = getComputedStyle(el); return { id: el?.id, outline: cs.outlineStyle, width: cs.outlineWidth }; });
    assert.notEqual(focusVisible.outline, 'none');
    await page.screenshot({ path: path.join(outDir, 'keyboard-focus.png') });
    return { reached, focusVisible };
  } finally { await context.close(); }
})();

// ===== 10. vector failure falls back to raster with facts preserved =====
await check('VECTOR_FAILURE_FALLBACK_RASTER', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' });
  await context.route('https://tile.openstreetmap.org/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: transparentPng }));
  await context.route('https://tiles.openfreemap.org/**', route => route.abort('failed'));
  const page = await context.newPage();
  const start = requestLog.length;
  try {
    await page.goto(baseUrl + '/?fixture=realtime&fixtureTickMs=1200', { waitUntil: 'load' });
    await page.waitForSelector('.tracker-marker', { timeout: 20000 });
    await page.click('[data-entity-id="fix-bus-01"]');
    await page.waitForSelector('#tracker-facts:not([hidden])');
    // raster tiles remain visible; facts sheet stays; truth pill remains
    await page.waitForSelector('#map-tiles .map-tile', { timeout: 10000 });
    const facts = await page.textContent('#facts-rows');
    assert.match(facts, /fix-bus-01/);
    const truth = await page.textContent('#truth-label');
    assert.match(truth, /En vivo|Tiempo real no disponible/);
    const rasterVisible = await page.evaluate(() => !document.querySelector('#map-tiles').hidden && !document.querySelector('#map-tiles').classList.contains('is-underlay'));
    assert.ok(rasterVisible, 'raster substrate stays active after vector failure');
    await page.screenshot({ path: path.join(outDir, 'raster-fallback.png') });
    return { ok: true };
  } finally { await context.close(); }
})();

evidence.results = results;
evidence.summary = { pass: results.filter(r => r.status === 'PASS').length, fail: results.filter(r => r.status === 'FAIL').length };
evidence.requests.total = requestLog.length;
evidence.requests.api_total = apiCalls(requestLog);
evidence.requests.api_paths = [...new Set(requestLog.filter(r => r.path.startsWith('/api/')).map(r => r.path))];
await writeFile(path.join(outDir, 'order075-rc-evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(`\nORDER075_RC_EVIDENCE pass=${evidence.summary.pass} fail=${evidence.summary.fail}`);
console.log(`BUILD_ID=${buildId}`);
await browser.close();
await new Promise(resolve => server.close(resolve));

function pathToFileUrl(p) { return 'file://' + p.replace(/\\/g, '/'); }
