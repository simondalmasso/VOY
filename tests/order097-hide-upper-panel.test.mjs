import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('ORDER097 removes the top brand/status bar without hiding map controls', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  assert.match(html, /class="topbar voy-topbar"/);
  assert.match(html, /class="map-hud"/);
  assert.match(css, /\.topbar\.voy-topbar\{display:none!important\}/);
  assert.match(html, /id="map-shell"/);
  assert.match(html, /id="voy-sheet"/);
});
