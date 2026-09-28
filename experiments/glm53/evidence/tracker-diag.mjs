// Focused diagnostic: run the TRACKERVIEW follow/scrub flow with step labels
// and dump page state + console errors at the moment of failure.
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const sourceDir = path.resolve(process.cwd());
const executable = process.env.CHROMIUM_PATH || `${process.env.HOME}/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`;
const { chromium } = await import('playwright-core').then(m => m.default ?? m);
const buildManifest = JSON.parse(await readFile(path.join(sourceDir, 'dist', 'BUILD_MANIFEST.json'), 'utf8'));

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

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8' };
const root = path.resolve(sourceDir, 'dist', 'client');
const server = createServer(async (req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');
  try {
    if (u.pathname.startsWith('/api/')) { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(apiPayload(u.pathname))); return; }
    let rel = decodeURIComponent(u.pathname); if (rel === '/' || rel === '') rel = '/index.html';
    const target = path.resolve(root, '.' + rel);
    if (!target.startsWith(root + path.sep) && target !== root) throw new Error('path_escape');
    const s = await stat(target); if (!s.isFile()) throw new Error('not_file');
    res.writeHead(200, { 'content-type': mime[path.extname(target)] || 'application/octet-stream' }); res.end(await readFile(target));
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: executable, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
import zlib from 'node:zlib';
function makeTilePng() {
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
const localVectorStyle = JSON.stringify({ version: 8, name: 'voy-evidence-local', sources: { ofm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' } }, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#d7d6cf' } }, { id: 'ofm', type: 'raster', source: 'ofm' }] });

const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, serviceWorkers: 'allow', reducedMotion: 'no-preference' });
await context.route('https://tile.openstreetmap.org/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: transparentPng }));
await context.route('https://tiles.openfreemap.org/**', route => {
  const url = route.request().url();
  if (url.includes('/styles/liberty')) route.fulfill({ status: 200, contentType: 'application/json', body: localVectorStyle });
  else route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push('page:' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console:' + m.text()); });
page.on('requestfailed', r => errors.push('reqfail:' + r.url().slice(0, 90)));

const t0 = Date.now();
function log(step) { console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${step}`); }
async function stateDump(label) {
  const s = await page.evaluate(() => ({
    follow: window.__voyDebug?.store?.follow?.(),
    selected: window.__voyDebug?.store?.selected?.()?.id,
    trailLen: window.__voyDebug?.store?.selected?.() ? window.__voyDebug?.store?.trail?.(window.__voyDebug.store.selected().id)?.length : null,
    timeMode: window.__voyDebug?.store?.timeState?.()?.mode,
    substrate: window.__voyDebug?.substrate?.state?.()?.substrate,
    maplibreReady: window.__voyDebug?.substrate?.maplibreReady,
    followText: document.querySelector('#follow-button')?.textContent,
    returnHidden: document.querySelector('#return-to-now')?.hidden,
    railMax: document.querySelector('#time-rail')?.max
  })).catch(e => ({ eval_error: String(e) }));
  console.log(`    STATE ${label}: ${JSON.stringify(s)}`);
  return s;
}

await page.goto(baseUrl + '/?fixture=realtime&fixtureTickMs=1200', { waitUntil: 'load' });
log('loaded');
await page.waitForSelector('.tracker-marker', { timeout: 20000 });
log('markers visible');
log('select fix-bus-01');
await page.locator('[data-entity-id="fix-bus-01"]').dispatchEvent('click');
await page.waitForSelector('#tracker-facts:not([hidden])');
log('facts visible');
await page.waitForFunction(() => Number(document.querySelector('#time-rail')?.max || 0) >= 1, null, { timeout: 30000 });
log('trail>=1');
log('click follow');
await page.click('#follow-button');
try {
  await page.waitForFunction(() => document.querySelector('#follow-button')?.textContent?.includes('Siguiendo'), null, { timeout: 8000 });
  log('follow active');
} catch { await stateDump('follow-fail'); }

await page.waitForFunction(() => window.__voyDebug?.substrate?.maplibreReady === true, null, { timeout: 20000 });
log('maplibre ready');
const canvas = page.locator('#map-canvas canvas').first();
console.log('    canvas count:', await canvas.count());
const box = await canvas.boundingBox();
log(`canvas box ${Math.round(box.x)},${Math.round(box.y)} ${Math.round(box.width)}x${Math.round(box.height)}`);
// instrument: what element is under the drag start point, and which events fire
const dragX = box.x + box.width / 2, dragY = box.y + Math.min(90, box.height / 3);
const under = await page.evaluate(([x, y]) => {
  const el = document.elementFromPoint(x, y);
  const out = [];
  for (const ev of ['mousedown', 'mousemove', 'mouseup', 'pointerdown', 'pointermove', 'wheel', 'dragstart']) {
    document.querySelector('#map-canvas').addEventListener(ev, e => {
      const t = e.target;
      out.push(`${ev}@${(e.target.tagName || '?')}${(t.className && typeof t.className === 'string') ? '.' + t.className.split(' ').slice(0, 2).join('.') : ''}`);
    }, { passive: true, capture: false });
  }
  window.__evtLog = out;
  return el ? { tag: el.tagName, cls: String(el.className).slice(0, 60), id: el.id } : null;
}, [dragX, dragY]);
console.log('    elementFromPoint at drag start:', JSON.stringify(under));
await page.mouse.move(dragX, dragY);
await page.mouse.down();
await page.mouse.move(dragX + 120, dragY + 40, { steps: 8 });
await page.mouse.up();
log('drag done');
const evtLog = await page.evaluate(() => window.__evtLog);
console.log('    canvas container events fired:', JSON.stringify(evtLog.slice(0, 20)));
console.log('    map center before/after:', await page.evaluate(() => { const c = window.__voyDebug?.substrate?.state?.()?.center; return JSON.stringify(c); }));
try {
  await page.waitForFunction(() => document.querySelector('#follow-button')?.textContent?.includes('Reanudar seguimiento'), null, { timeout: 10000 });
  log('follow suspended by drag');
} catch { await stateDump('suspend-fail'); }
log('click resume');
await page.click('#follow-button');
try {
  await page.waitForFunction(() => document.querySelector('#follow-button')?.textContent?.includes('Siguiendo'), null, { timeout: 10000 });
  log('resumed');
} catch { await stateDump('resume-fail'); }
await page.waitForFunction(() => Number(document.querySelector('#time-rail')?.max || 0) >= 3, null, { timeout: 30000 });
log('trail>=3');
await page.fill('#time-rail', '0');
await page.dispatchEvent('#time-rail', 'input');
try {
  await page.waitForFunction(() => !document.querySelector('#return-to-now')?.hidden, null, { timeout: 10000 });
  log('scrub visible');
} catch { await stateDump('scrub-fail'); }
await page.click('#return-to-now');
try {
  await page.waitForFunction(() => document.querySelector('#return-to-now')?.hidden, null, { timeout: 10000 });
  log('returned to now');
} catch { await stateDump('return-fail'); }

console.log('ERRORS:', errors.length ? JSON.stringify(errors.slice(0, 8), null, 1) : 'none');
await browser.close();
await new Promise(resolve => server.close(resolve));
function pathToFileUrl(p) { return 'file://' + p.replace(/\\/g, '/'); }
