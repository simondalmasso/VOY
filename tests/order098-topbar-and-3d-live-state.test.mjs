import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('ORDER098 removes the top bar while retaining map mode controls', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  assert.match(html, /class="topbar voy-topbar"/);
  assert.match(html, /data-map-mode="3d"/);
  assert.match(css, /\.topbar\.voy-topbar\{display:none!important\}/);
  assert.match(css, /\.map-hud\{top:10px!important\}/);
});

test('ORDER098 3D status explicitly distinguishes verified live vehicles from route-only map data', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(app, /classifyObservation\(entity\.observation,now\)\.state==='realtime'/);
  assert.match(app, /GPS EN VIVO/);
  assert.match(app, /sin posiciones actuales confirmadas/);
  assert.match(app, /Sin posiciones GPS en vivo · recorridos publicados/);
});
