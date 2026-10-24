import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('vector map owns the initial paint; raster starts hidden and remains fallback-only', async () => {
  const [html, substrate] = await Promise.all([
    read('public/index.html'),
    read('public/map/substrate.js')
  ]);
  assert.match(html, /<div id="map-tiles" class="map-tiles" aria-hidden="true" hidden><\/div>/);
  assert.match(substrate, /Strategy: vector-first map startup/);
  assert.match(substrate, /Raster tiles are created only after the vector path has failed/);
});

test('a missing GPS bearing preserves the last valid normalized heading on the marker sprite', async () => {
  const [substrate, css] = await Promise.all([
    read('public/map/substrate.js'),
    read('public/styles.css')
  ]);
  assert.match(substrate, /const normalizedBearing = \(\(Number\(model\.bearing\) % 360\) \+ 360\) % 360/);
  assert.match(substrate, /setProperty\('--gps-bearing', String\(normalizedBearing\) \+ 'deg'\)/);
  assert.doesNotMatch(substrate, /else\s+entry\.element\.style\.removeProperty\('--gps-bearing'\)/);
  assert.match(css, /\.tracker-marker\.is-gps-bus::before\{[^}]*transform:rotate\(var\(--gps-bearing,0deg\)\)/);
  assert.match(css, /\.tracker-marker\.is-gps-train::before\{[^}]*background-image:url\('\/transit\/markers\/train-top\.png/);
});
