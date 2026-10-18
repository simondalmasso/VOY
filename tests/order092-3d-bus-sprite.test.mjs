import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('3D transport with a measured bearing uses the first-party isometric bus sprite', async () => {
  const renderer = await readFile(new URL('../public/3d/voy3d.js', import.meta.url), 'utf8');
  assert.match(renderer, /bus-3d\.svg/);
  assert.match(renderer, /map\.addImage\(['"]voy-bus-3d['"]/);
  assert.match(renderer, /id:'voy-3d-transport-icons',type:'symbol'/);
  assert.match(renderer, /'icon-image':'voy-bus-3d'/);
  assert.match(renderer, /'icon-rotation-alignment':'map'/);
  assert.match(renderer, /'icon-pitch-alignment':'viewport'/);
  assert.match(renderer, /Number\.isFinite\(entry\.displayFrame\?\.bearing\)/);
  assert.match(renderer, /bearing:entry\.displayFrame\.bearing/);
  const sprite = await readFile(new URL('../public/icons/bus-3d.svg', import.meta.url), 'utf8');
  assert.match(sprite, /<svg[^>]+viewBox="0 0 64 64"/);
  assert.match(sprite, /#ffe600|#ffd400/i);
});

test('3D transport without a measured bearing keeps the truthful circle fallback', async () => {
  const renderer = await readFile(new URL('../public/3d/voy3d.js', import.meta.url), 'utf8');
  assert.match(renderer, /if\(hasBusSprite\)transportCircleLayer\.filter=\['!',\s*\['has','bearing'\]\]/);
  assert.match(renderer, /if\(hasBusSprite\)map\.addLayer\(\{id:'voy-3d-transport-icons'/);
  assert.match(renderer, /'circle-color':\['match',\['get','temporal_state'\]/);
});

test('2D live bus glyph shares the black-and-yellow VOY visual language', async () => {
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.tracker-bus-icon\{[^}]*background:#111820;/);
  assert.match(css, /\.tracker-marker\.is-gps-bus::before\{[^}]*background:#ffe600;/);
});
