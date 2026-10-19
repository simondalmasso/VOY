import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('fixture module is removed from normal boot graph and imported only on explicit opt-in', async () => {
  const app = await read('public/app.js');
  assert.doesNotMatch(app, /import\s*\{[^}]*fixture[^}]*\}\s*from\s*['"]\.\/tracker\/fixtures\.js/);
  assert.match(app, /if\(urlParams\.get\('fixture'\)==='realtime'\)\s*\{\s*const fixtures=await import\('\.\/tracker\/fixtures\.js\?v=__BUILD_ID__'\)/);
  assert.match(app, /!interpolating&&!state\.fixtureOn\)return/);
});

test('service-worker install precaches only boot-critical assets; large optional data remains cache-on-demand', async () => {
  const sw = await read('public/sw.js');
  assert.doesNotMatch(sw, /\/tracker\/fixtures\.js/);
  assert.doesNotMatch(sw, /\/transit\/santa-fe-lines\.json/);
  assert.doesNotMatch(sw, /\/icons\/bus-transport-icons8\.svg/);
  assert.match(sw, /if\(response\.ok&&response\.status===200\)[\s\S]*?\.put\(req,response\.clone\(\)\)/);
  assert.match(sw, /if\(url\.pathname\.startsWith\('\/api\/'\)\)\s*\{\s*event\.respondWith\(fetch\(req\)\)/);
});

test('first-party cache headers revalidate HTML metadata while keeping stable code immutable', async () => {
  const headers = await read('public/_headers');
  assert.match(headers, /\/icons\/\*[\s\S]*?max-age=604800/);
  assert.match(headers, /\/manifest\.json[\s\S]*?max-age=86400/);
  assert.match(headers, /\/offline\.html[\s\S]*?max-age=604800/);
  assert.match(headers, /\/app\.js[\s\S]*?max-age=31536000, immutable/);
});

test('map tile preconnect hints are declared early with correct CORS mode', async () => {
  const html = await read('public/index.html');
  assert.match(html, /<link rel="preconnect" href="https:\/\/tile\.openstreetmap\.org">/);
  assert.match(html, /<link rel="preconnect" href="https:\/\/tiles\.openfreemap\.org" crossorigin>/);
});
