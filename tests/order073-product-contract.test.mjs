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

test('ORDER073 exposes only Auto Rendimiento Calidad as compact 3D quality tiers',async()=>{
  const [html,app,renderer]=await Promise.all([text('public/index.html'),text('public/app.js'),text('public/3d/voy3d.js')]);
  assert.match(html,/id="map-3d-quality"/);
  for(const value of ['auto','performance','quality'])assert.match(html,new RegExp('value="'+value+'"'));
  assert.match(app,/map3dQuality\.value/);
  assert.match(renderer,/QUALITY_PROFILES/);
  assert.match(renderer,/performance/);
  assert.match(renderer,/quality/);
  assert.match(renderer,/profile\.dpr/);
  assert.match(renderer,/profile\.antialias/);
  assert.doesNotMatch(renderer,/shadowMap\.enabled\s*=\s*true/);
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

test('ORDER073 desktop map allocation is intentionally widened while mobile stays map-first',async()=>{
  const css=await text('public/styles.css');
  assert.match(css,/ORDER073 MAP-FIRST/);
  assert.match(css,/grid-template-columns:minmax\(0,2(?:\.\d+)?fr\) minmax\(3\d\dpx,/);
  assert.match(css,/grid-template-rows:50svh minmax\(0,1fr\)/);
});
