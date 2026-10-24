import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const text=async path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const json=async path=>JSON.parse(await text(path));
const sha256=value=>createHash('sha256').update(value).digest('hex');

test('ORDER073 topology manifest pins the raw input SHA',async()=>{
  const raw=await text('order071/source/santa-fe-osm-snapshot.json');
  const manifest=await json('public/3d/topology/manifest.json');
  assert.match(manifest.geometry_source.raw_input_sha256,/^[a-f0-9]{64}$/);
  assert.equal(manifest.geometry_source.raw_input_sha256,sha256(raw));
});

test('ORDER073 replaces the 3D quality selector with a lightweight isometric mode',async()=>{
  const [html,app,substrate]=await Promise.all([text('public/index.html'),text('public/app.js'),text('public/map/substrate.js')]);
  assert.doesNotMatch(html,/id="map-3d-quality"|data-map-mode="3d"/);
  assert.match(html,/data-map-mode="iso"[^>]*>Iso</);
  assert.match(app,/button\.dataset\.mapMode==='iso'\?activateIso\(\):activate2D\(\)/);
  assert.match(app,/substrate\.setCameraMode\('isometric'\)/);
  assert.match(substrate,/pitch: isometric \? 55 : 0/);
});
test('ORDER073 renderer keeps predicted markers visually distinct from realtime',async()=>{
  const renderer=await text('public/3d/voy3d.js');
  assert.match(renderer,/realtimeMaterial/);
  assert.match(renderer,/predictedMaterial/);
  assert.match(renderer,/realtimeVehicles/);
  assert.match(renderer,/predictedVehicles/);
  assert.match(renderer,/visual_state==='predicted'/);
});

test('ORDER073 renderer applies explicit movement limits and reduced-motion policy',async()=>{
  const [app,renderer]=await Promise.all([text('public/app.js'),text('public/3d/voy3d.js')]);
  assert.match(renderer,/maxSpeedMps:/);
  assert.match(renderer,/maxSnapMeters:/);
  assert.match(renderer,/reducedMotion:/);
  assert.match(app,/prefers-reduced-motion:\s*reduce/);
});

test('ORDER075 desktop keeps the map full-bleed with a bounded side sheet (map-first)',async()=>{
  const css=await text('public/styles.css');
  assert.match(css,/ORDER075 MAP-FIRST/);
  assert.match(css,/\.map-shell\.voy-map-stage\{[^}]*position:absolute[^}]*inset:0/s);
  assert.match(css,/@media \(min-width:960px\)\{[\s\S]*?\.voy-sheet\{[^}]*position:absolute[^}]*right:12px[^}]*width:min\(430px,38vw\)/s);
  assert.doesNotMatch(css,/[.\w-]+\{[^}]*width:min\(100%[^\)]*\)\}[^@]*@media \(min-width:960px\)\{[\s\S]*?\.map-shell[^}]*position:sticky/s);
});
