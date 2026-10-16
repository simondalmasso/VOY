import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const substrate = await readFile(new URL('../public/map/substrate.js', import.meta.url), 'utf8');
const urban3d = await readFile(new URL('../public/3d/voy3d.js', import.meta.url), 'utf8');

test('2D static bus network uses a blue stroke with a dark casing in raster and vector modes', () => {
  assert.match(substrate, /cssClass === 'transit-network-overlay'/);
  assert.match(substrate, /color: '#10263f', width: Math\.max\(6, strokeWidth \+ 3\)/);
  assert.match(substrate, /color: '#267dff'/);
  assert.match(substrate, /voy-bus-network-casing-layer/);
  assert.match(substrate, /'line-color':'#267dff'/);
  assert.doesNotMatch(substrate, /voy-bus-network-layer[^\n]*'line-color':'#ffd42a'/);
});

test('selected route is cyan with a dark outline in raster and vector modes', () => {
  assert.match(substrate, /color: '#00d7ff', width: 5\.5/);
  assert.match(substrate, /voy-route-casing-layer/);
  assert.match(substrate, /'line-color': color/);
});

test('3D bus network and selected route use distinct outlined colors away from yellow roads', () => {
  assert.match(urban3d, /voy-3d-bus-network-casing/);
  assert.match(urban3d, /'line-color':'#267dff'/);
  assert.match(urban3d, /voy-3d-selected-route-casing/);
  assert.match(urban3d, /'line-color':'#00d7ff'/);
  assert.match(urban3d, /color:0x00d7ff/);
  assert.doesNotMatch(urban3d, /'line-color':'#fbd342'/);
  assert.doesNotMatch(urban3d, /'line-color':'#fae96b'/);
});
