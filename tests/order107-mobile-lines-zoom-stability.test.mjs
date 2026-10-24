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

test('choosing a bus line closes the Lines panel so the map is no longer covered', async () => {
  const app = await read('public/app.js');
  const start = app.indexOf("busLinePicker.addEventListener('change',()=>{");
  assert.ok(start >= 0, 'line selection must have a change handler');
  const end = app.indexOf("\n});", start);
  assert.ok(end > start, 'line selection handler must be bounded');
  const handler = app.slice(start, end);
  assert.match(handler, /closeBusLineControl\(\)/, 'selection closes the picker panel through the shared close handler');
  const closeHandler = app.slice(app.indexOf('function closeBusLineControl(){'), app.indexOf('\nfunction toggleBusLineControl(){'));
  assert.match(closeHandler, /busLineControl\.hidden=true/);
  assert.match(closeHandler, /quickLines\.setAttribute\('aria-expanded','false'\)/, 'accessibility state reports the panel closed');
});

test('GPS HUD is a dot only: colors reflect realtime, predicted, and unavailable states', async () => {
  const html = await read('public/index.html');
  const app = await read('public/app.js');
  const css = await read('public/styles.css');
  assert.match(html, /id="truth-pill"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(app, /truthIcon\.textContent\s*=\s*['"]●['"]/);
  assert.match(app, /truthLabel\.hidden\s*=\s*true/);
  assert.match(app, /truthPill\.querySelector\('\.truth-copy'\)\.hidden\s*=\s*true/);
  assert.match(css, /\.truth-pill\{[^}]*width:\s*12px[^}]*height:\s*12px/s);
  assert.match(css, /\.truth-copy\s*\{[^}]*display:\s*none\s*!important/s);
  assert.match(css, /\.truth-pill\[data-state="realtime"\] \.truth-icon\s*\{\s*color:\s*#[0-9a-f]{6}\s*\}/i);
  assert.doesNotMatch(css, /\.truth-pill:not\(\[data-state="realtime"\]\) \.truth-icon/);
  assert.match(css, /\.truth-pill\[data-state="stale"\] \.truth-icon\s*\{\s*color:\s*var\(--danger\)\s*\}/);
  assert.match(css, /\.truth-pill\[data-state="source_unavailable"\] \.truth-icon\s*\{\s*color:\s*var\(--danger\)\s*\}/);
});


test('vector PNG markers have an explicit zero-origin anchor independent of stylesheet load order', async () => {
  const css = await read('public/styles.css');
  assert.match(css, /\.tracker-marker\.is-vector[^{}]*\{[^}]*top:0;left:0;[^}]*margin:0/s);
});
