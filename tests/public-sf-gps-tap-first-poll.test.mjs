import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = async path => readFile(new URL(path, import.meta.url), 'utf8');
test('collapsed transit sheet passes pointer events to map pins but preserves controls', async () => {
  const css = await read('../public/styles.css');
  assert.match(css, /\.voy-sheet\[data-pane="collapsed"\]\{max-height:var\(--sheet-collapsed-max\);pointer-events:none\}/);
  assert.match(css, /\.voy-sheet\[data-pane="collapsed"\] \.sheet-handle,/);
  assert.match(css, /\.voy-sheet\[data-pane="collapsed"\] \.sheet-body button,/);
  assert.match(css, /\.voy-sheet\[data-pane="collapsed"\] \.sheet-body a,/);
  assert.match(css, /\.voy-sheet\[data-pane="collapsed"\] \.sheet-body select,/);
  assert.match(css, /\.voy-sheet\[data-pane="collapsed"\] \.sheet-body input\{pointer-events:auto\}/);
  assert.doesNotMatch(css, /\.voy-sheet\[data-pane="expanded"\]\{[^}]*pointer-events:none/);
});
test('first explicit line selection polls immediately without weakening real not_integrated fail-closed', async () => {
  const app = await read('../public/app.js');
  assert.match(app, /if\(busLinePicker\.value&&sfGpsEnabled\)pollSantaFeGps\(\);/);
  assert.doesNotMatch(app, /if\(busLinePicker\.value&&sfGpsEnabled&&!state\.gpsStatus\.includes\('not_integrated'\)\)pollSantaFeGps\(\);/);
  assert.match(app, /if\(payload\?\.status==='not_integrated'\)\{sfGpsEnabled=false;state\.gpsStatus='not_integrated'\}/);
  assert.match(app, /if\(!sfGpsEnabled\|\|sfGpsPolling\|\|state\.fixtureOn\|\|document\.hidden\|\|!String\(busLinePicker\.value\|\|''\)\.trim\(\)\)return;/);
});