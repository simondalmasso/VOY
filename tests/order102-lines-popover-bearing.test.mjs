import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('Lines panel is a child popover of the Lines action, not a dashboard/HUD sibling', async () => {
  const html = await read('public/index.html');
  const start = html.indexOf('<div class="map-quick-lines-wrap">');
  const button = html.indexOf('id="quick-lines"', start);
  const panel = html.indexOf('id="bus-line-control"', start);
  const wrapperEnd = html.indexOf('</div>', panel);
  const sheet = html.indexOf('<div class="sheet-collapsed">');
  assert.ok(start >= 0 && button > start && panel > button && wrapperEnd < sheet);
  assert.doesNotMatch(html.slice(sheet), /id="bus-line-control"/);
  assert.equal((html.match(/id="bus-line-control"/g) || []).length, 1);
});

test('mobile Lines popover has a bounded viewport, usable touch target and stacking order above the dashboard', async () => {
  const css = await read('public/styles.css');
  assert.match(css, /\.map-quick-lines-wrap\{position:relative/);
  assert.match(css, /\.map-quick-lines-wrap:has\(\.bus-line-control:not\(\[hidden\]\)\)\{z-index:1001\}/);
  assert.match(css, /\.bus-line-control\{position:absolute;top:calc\(100% \+ 8px\)/);
  assert.match(css, /max-height:42svh/);
  assert.match(css, /\.bus-line-control select\{[^}]*min-height:44px/);
});

test('GPS bus artwork is rotated along the GPS course without rotating the map anchor', async () => {
  const css = await read('public/styles.css');
  const substrate = await read('public/map/substrate.js');
  assert.match(css, /\.tracker-marker\.is-gps-bus::before\{[^}]*transform:rotate\(calc\(var\(--gps-bearing,0deg\) - 90deg\)\)/);
  assert.match(substrate, /entry\.element\.style\.setProperty\('--gps-bearing', String\(normalizedBearing\) \+ 'deg'\)/);
  assert.doesNotMatch(substrate, /else entry\.element\.style\.removeProperty\('--gps-bearing'\)/);
});
