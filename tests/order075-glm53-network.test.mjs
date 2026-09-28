import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=async p=>readFile(new URL('../'+p,import.meta.url),'utf8');

test('ORDER075 GLM53 map pan adds zero VOY Worker calls (substrate is network-silent to self API)',async()=>{
  const src=await read('public/map/substrate.js');
  assert.doesNotMatch(src,/\/api\//,'substrate must never call the VOY Worker');
  assert.doesNotMatch(src,/apiJson|fetch\(\s*['"]\/api/);
  // the only network the substrate may perform is the vector module/style/tiles themselves
  const fetches=[...src.matchAll(/fetch\(([^)]{0,80})\)/g)].map(m=>m[1]);
  for(const arg of fetches)assert.ok(!arg.includes('self.origin')&&!arg.includes(location?.origin||'x'),'unexpected self-origin fetch');
});

test('ORDER075 GLM53 TrackerView idle adds zero VOY Worker calls (tracker is pure)',async()=>{
  const sources=await Promise.all(['public/tracker/store.js','public/tracker/observations.js','public/tracker/fixtures.js'].map(read));
  for(const src of sources){
    assert.doesNotMatch(src,/\/api\//);
    assert.doesNotMatch(src,/fetch\(/);
    assert.doesNotMatch(src,/XMLHttpRequest|WebSocket|EventSource/);
  }
});

test('ORDER075 GLM53 3D visual path adds zero dynamic VOY Worker calls',async()=>{
  const app=await read('public/app.js');
  // 3D activation must not add any new fetch family: only the existing lazy module + topology assets
  assert.match(app,/activate3D/);
  const threeBlock=app.slice(app.indexOf('async function activate3D'),app.indexOf('restart3DForRenderPolicy'));
  assert.doesNotMatch(threeBlock,/\/api\//,'3D activation must not call the Worker');
  const renderer=await read('public/3d/voy3d.js');
  assert.doesNotMatch(renderer,/\/api\//);
  const temporal=await read('public/3d/temporal.js');
  assert.doesNotMatch(temporal,/\/api\//);
});

test('ORDER075 GLM53 scrub/follow/truth-pill perform zero Worker calls by wiring',async()=>{
  const app=await read('public/app.js');
  for(const hook of ['scrubTo','returnToNow','userPanSuspend','resumeFollow','updateTruthPill']){
    assert.ok(app.includes(hook),`app must wire ${hook}`);
  }
  // the TrackerView wiring region (store→fixtures) and the sheet region must be fetch-free
  const trackerStart=app.indexOf('---------- TrackerView ----------');
  const trackerEnd=app.indexOf('---------- deterministic fixtures ----------');
  assert.ok(trackerStart>0&&trackerEnd>trackerStart,'tracker wiring region must exist');
  const trackerRegion=app.slice(trackerStart,trackerEnd);
  const sheetStart=app.indexOf('---------- bottom sheet ----------');
  const sheetEnd=app.indexOf('---------- vector upgrade');
  assert.ok(sheetStart>0&&sheetEnd>sheetStart,'sheet wiring region must exist');
  const sheetRegion=app.slice(sheetStart,sheetEnd);
  const pillStart=app.indexOf('function updateTruthPill');
  const pillEnd=app.indexOf('// ---------- map stage + substrate ----------');
  const pillRegion=app.slice(pillStart,pillEnd);
  for(const region of [trackerRegion,sheetRegion,pillRegion]){
    assert.doesNotMatch(region,/apiJson\(/,'tracker/sheet region must be fetch-free');
    assert.doesNotMatch(region,/\/api\//,'tracker/sheet region must not reference Worker endpoints');
  }
});

test('ORDER075 GLM53 no tracker persistence, telemetry or new storage',async()=>{
  const sources=await Promise.all(['public/tracker/store.js','public/tracker/fixtures.js','public/map/substrate.js','public/app.js'].map(read));
  for(const src of sources){
    assert.doesNotMatch(src,/localStorage(?!.*voy-theme)/,'tracker must not persist (theme pref is the only legacy exception)');
    assert.doesNotMatch(src,/indexedDB|caches\.open|navigator\.storage/);
    assert.doesNotMatch(src,/\/api\/telemetry/);
    assert.doesNotMatch(src,/submitTelemetry\(/);
  }
  const sw=await read('public/sw.js');
  // the sw runtime handler keeps /api network-only by design; the precache CORE stays static-shell
  assert.match(sw,/url\.pathname\.startsWith\('\/api\/'\)/);
  const core=sw.slice(sw.indexOf('CORE=['),sw.indexOf(']',sw.indexOf('CORE=[')));
  assert.doesNotMatch(core,/\/api\//);
});

test('ORDER075 GLM53 baseline 2D keeps zero Three/topology fetches before opt-in',async()=>{
  const [html,app,sw]=await Promise.all([read('public/index.html'),read('public/app.js'),read('public/sw.js')]);
  assert.doesNotMatch(html,/<script[^>]+(?:three|voy3d)/i);
  assert.doesNotMatch(html,/<link[^>]+(?:three|3d\/topology)/i);
  assert.match(app,/import\(['"]\.\/3d\/voy3d\.js/);
  assert.doesNotMatch(sw,/\/3d\//);
  // substrate lazy import must be maplibre only, never three
  const substrate=await read('public/map/substrate.js');
  assert.doesNotMatch(substrate,/three/i);
});

test('ORDER075 GLM53 request budget: fixture stream performs no network IO',async()=>{
  const fixtures=await read('public/tracker/fixtures.js');
  assert.doesNotMatch(fixtures,/fetch\(|XMLHttpRequest|WebSocket|EventSource|navigator\.sendBeacon/);
});
