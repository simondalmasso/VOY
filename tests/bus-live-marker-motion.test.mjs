import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('Gemini side-view bus art stays transparent, compact and aligned to GPS bearing', async () => {
  const [css, substrate, store, app] = await Promise.all([
    read('../public/styles.css'), read('../public/map/substrate.js'),
    read('../public/tracker/store.js'), read('../public/app.js')
  ]);
  assert.match(css, /bus-side-gemini\.png/);
  assert.match(css, /is-gps-bus::before\{width:24px;height:8px/);
  assert.match(css, /rotate\(calc\(var\(--gps-bearing,0deg\) - 90deg\)\)/);
  assert.match(css, /transform-origin:50% 50%/);
  assert.match(substrate, /style\.setProperty\('--gps-bearing'/);
  assert.match(substrate, /new MarkerClass\(\{ element: entry\.element, anchor: 'center' \}\)/);
  assert.match(store, /bearing=\(Math\.atan2/);
  assert.match(app, /bearing:frame\.bearing/);
  const metadata = await sharp(fileURLToPath(new URL('../public/transit/markers/bus-side-gemini.png', import.meta.url))).metadata();
  assert.ok(metadata.width <= 120 && metadata.width >= 80);
  assert.ok(metadata.height <= 36);
  assert.equal(metadata.hasAlpha, true);
});
