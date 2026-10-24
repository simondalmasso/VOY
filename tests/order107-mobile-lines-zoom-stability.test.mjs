import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('live vehicle marker selection is stable across zoom focal-center movement', async () => {
  const app = await read('public/app.js');
  assert.match(app, /function trackerMarkerModels\(\)\{[\s\S]*?trackerStore\.nearby\(center,\{limit:24,radiusMeters:20000/);
  assert.match(app, /Keep live vehicles stable while pinch-zoom changes the map's effective center/);
});

test('mobile Lines picker escapes dashboard clipping and remains touch-sized within viewport', async () => {
  const css = await read('public/styles.css');
  assert.match(css, /\.voy-sheet:has\(#bus-line-control:not\(\[hidden\]\)\)\{z-index:1000\}/);
  assert.match(css, /\.sheet-body:has\(#bus-line-control:not\(\[hidden\]\)\)\{overflow:visible\}/);
  assert.match(css, /\.bus-line-control\{\s*position:fixed;left:12px;right:12px;top:auto;bottom:calc\(var\(--sheet-collapsed-max\) \+ 20px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /\.bus-line-control select\{min-height:48px;font-size:16px/);
  assert.ok(css.lastIndexOf('position:fixed;left:12px;right:12px') > css.lastIndexOf('width:min(190px'), 'final mobile override must supersede the legacy 190px rule');
});

test('Lines popover keeps semantic expanded state and controls associated with the action', async () => {
  const html = await read('public/index.html');
  const app = await read('public/app.js');
  assert.match(html, /id="quick-lines"[^>]*aria-expanded="false"[^>]*aria-controls="bus-line-control"/);
  assert.match(html, /id="bus-line-control"[^>]*hidden/);
  assert.match(app, /quickLines\.addEventListener\('click'/);
  assert.match(app, /busLineControl\.hidden=!open/);
});
