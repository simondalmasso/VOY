import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('3D transport with a measured bearing uses compact first-party bus and train PNG sprites', async () => {
  const renderer = await readFile(new URL('../public/3d/voy3d.js', import.meta.url), 'utf8');
  assert.match(renderer, /bus-side\.png/);
  assert.match(renderer, /train-side\.png/);
  assert.match(renderer, /map\.addImage\(imageId,image,\{pixelRatio:2\}\)/);
  assert.match(renderer, /id:'voy-3d-transport-icons',type:'symbol'/);
  assert.match(renderer, /'icon-image':'voy-bus-3d'/);
  assert.match(renderer, /id:'voy-3d-train-icons',type:'symbol'/);
  assert.match(renderer, /'icon-image':'voy-train-3d'/);
  assert.match(renderer, /'icon-rotation-alignment':'map'/);
  assert.match(renderer, /'icon-pitch-alignment':'viewport'/);
  assert.match(renderer, /Number\.isFinite\(entry\.displayFrame\?\.bearing\)/);
  assert.match(renderer, /bearing:entry\.displayFrame\.bearing/);
  for (const name of ['bus-side.png', 'train-side.png']) {
    const image = await readFile(new URL('../public/transit/markers/' + name, import.meta.url));
    assert.deepEqual([...image.subarray(0, 8)], [137,80,78,71,13,10,26,10]);
    assert.ok(image.byteLength < 5 * 1024);
  }
});

test('3D transport without a measured bearing keeps the truthful circle fallback', async () => {
  const renderer = await readFile(new URL('../public/3d/voy3d.js', import.meta.url), 'utf8');
  assert.match(renderer, /const fallbackFilters=\[\['!', \['has','bearing'\]\],\['==',\['get','vehicle_type'\],'unknown'\]\]/);
  assert.match(renderer, /if\(!hasBusSprite\)fallbackFilters\.push/);
  assert.match(renderer, /if\(!hasTrainSprite\)fallbackFilters\.push/);
  assert.match(renderer, /'circle-color':\['match',\['get','temporal_state'\]/);
});

test('2D live bus glyph shares the black-and-yellow VOY visual language', async () => {
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.tracker-bus-icon\{[^}]*background:#111820;/);
  assert.match(css, /\.tracker-marker\.is-gps-bus::before\{[^}]*background:#ffe600;/);
});
