import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = async name => readFile(new URL('../' + name, import.meta.url), 'utf8');

test('MAP-FIRST temporal truth is visible and accessible, including empty and unavailable GPS states', async () => {
  const app = await read('public/app.js');
  const html = await read('public/index.html');
  const css = await read('public/styles.css');
  assert.match(html, /id="truth-pill" class="truth-pill"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.doesNotMatch(html, /id="truth-pill" class="truth-pill sr-only"/);
  assert.doesNotMatch(css, /#truth-pill\.sr-only\{/);
  assert.match(app, /truthPill\.setAttribute\('aria-label',\s*accessibleStatus\)/);
  assert.match(app, /truthLabel\.hidden\s*=\s*false/);
  assert.match(app, /truthMeta\.hidden\s*=\s*false/);
  assert.match(app, /no_positions:\{icon:'●',label:'Sin posiciones actuales'\}/);
  assert.match(app, /source_unavailable:\{icon:'●',label:'Fuente no disponible'\}/);
  assert.match(app, /entry=TRUTH_STATES\.no_positions/);
  assert.match(css, /\.truth-pill\[data-state="stale"\] \.truth-icon\s*\{\s*color:\s*var\(--danger\)\s*\}/);
});

test('health identifies the effective vector map provider, not the raster fallback', async () => {
  const worker = await read('src/worker.template.js');
  assert.match(worker, /map_provider:\s*APP_CONFIG\.MAP_VECTOR\.enabled\s*\?\s*APP_CONFIG\.MAP_VECTOR\.id\s*:\s*APP_CONFIG\.MAP_PROVIDER\.id/);
});
