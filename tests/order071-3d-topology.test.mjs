import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const text=async(path)=>readFile(new URL('../'+path,import.meta.url),'utf8');
const json=async(path)=>JSON.parse(await text(path));

test('ORDER071 3D is opt-in lazy and the 2D shell has no eager 3D asset',async()=>{
  const [index,app,sw]=await Promise.all([text('public/index.html'),text('public/app.js'),text('public/sw.js')]);
  assert.match(index,/data-map-mode="2d"/);
  assert.doesNotMatch(index,/<script[^>]+(?:three|voy3d)/i);
  assert.doesNotMatch(index,/<link[^>]+(?:three|3d\/topology)/i);
  assert.match(app,/import\(['"]\.\/3d\/voy3d\.js/);
  assert.doesNotMatch(sw,/\/3d\//);
});

test('ORDER071 topology manifest is bounded and fully static',async()=>{
  const manifest=await json('public/3d/topology/manifest.json');
  assert.equal(manifest.schema_version,1);
  assert.equal(manifest.lru_max,16);
  assert.ok(manifest.initial_chunks.length>0&&manifest.initial_chunks.length<=8);
  assert.equal(manifest.geometry_source.runtime_queries,false);
  assert.equal(manifest.geometry_source.license,'ODbL-1.0');
  assert.equal(manifest.height_policy.missing_height_class,'generic_inferred');
  assert.ok(manifest.geometry_source.snapshot_at);
  for(const chunk of manifest.initial_chunks){
    assert.match(chunk.url,/^\.\/chunk-[a-z0-9-]+\.json$/);
    const payload=await json('public/3d/topology/'+chunk.url.slice(2));
    assert.equal(payload.schema_version,1);
    assert.ok(Array.isArray(payload.buildings));
    assert.ok(Array.isArray(payload.roads));
    assert.ok(payload.draw_groups.buildings<=2);
    assert.ok(payload.draw_groups.roads<=1);
  }
});

test('ORDER071 renderer contract keeps DPR capped, LRU bounded and no Worker API calls',async()=>{
  const renderer=await text('public/3d/voy3d.js');
  assert.match(renderer,/DPR_CAP\s*=\s*1\.5/);
  assert.match(renderer,/LRU_MAX\s*=\s*16/);
  assert.match(renderer,/InstancedMesh/);
  assert.match(renderer,/frustumCulled/);
  assert.match(renderer,/THREE\.LOD|lod/i);
  assert.doesNotMatch(renderer,/fetch\(['"]\/api\//);
  assert.doesNotMatch(renderer,/apiJson\(/);
});

test('ORDER071 temporal presentation never invents movement or mutates observations',async()=>{
  const mod=await import('../public/3d/temporal.js');
  const prev=Object.freeze({mode:'bus',temporal_state:'realtime',observed_at:'2026-09-24T14:00:00.000Z',id:'b1',lat:-31.65,lon:-60.71,source_id:'verified'});
  const next=Object.freeze({mode:'bus',temporal_state:'realtime',observed_at:'2026-09-24T14:00:10.000Z',id:'b1',lat:-31.64,lon:-60.70,source_id:'verified'});
  const geometry=Object.freeze([Object.freeze([-60.71,-31.65]),Object.freeze([-60.70,-31.64])]);
  const live=mod.presentTransportEntity(prev,next,Date.parse('2026-09-24T14:00:05.000Z'),{freshnessMs:20000,verifiedGeometry:geometry});
  assert.equal(live.render,true);
  assert.equal(live.animated,true);
  assert.equal(live.temporal_state,'realtime');
  assert.equal(prev.lat,-31.65);
  assert.equal(next.lat,-31.64);

  for(const temporal_state of ['scheduled','unknown']){
    const item=Object.freeze({...next,temporal_state});
    const out=mod.presentTransportEntity(item,item,Date.parse('2026-09-24T14:00:11.000Z'),{freshnessMs:20000,verifiedGeometry:geometry});
    assert.equal(out.animated,false);
    if(temporal_state==='unknown')assert.equal(out.render,false);
  }
});

test('ORDER071 realtime interpolation fails closed when stale or verified geometry is missing',async()=>{
  const {presentTransportEntity}=await import('../public/3d/temporal.js');
  const a={mode:'bus',temporal_state:'realtime',observed_at:'2026-09-24T14:00:00.000Z',id:'b1',lat:-31.65,lon:-60.71,source_id:'verified'};
  const b={...a,observed_at:'2026-09-24T14:00:10.000Z',lat:-31.64,lon:-60.70};
  const stale=presentTransportEntity(a,b,Date.parse('2026-09-24T14:01:00.000Z'),{freshnessMs:20000,verifiedGeometry:[[-60.71,-31.65],[-60.70,-31.64]]});
  assert.equal(stale.render,false);
  assert.equal(stale.reason,'stale_observation');
  const missing=presentTransportEntity(a,b,Date.parse('2026-09-24T14:00:11.000Z'),{freshnessMs:20000,verifiedGeometry:null});
  assert.equal(missing.render,false);
  assert.equal(missing.reason,'verified_geometry_missing');
});

test('ORDER071 current Santa Fe explicitly has no live bus source and no scheduled vehicle animation',async()=>{
  const contract=await json('public/3d/transport-contract.json');
  assert.equal(contract.santa_fe_live_bus,false);
  assert.equal(contract.realtime_source_present,false);
  assert.equal(contract.scheduled_vehicle_animation,0);
  assert.equal(contract.layers.scheduled.vehicle_marker,false);
  assert.equal(contract.layers.unknown.vehicle_marker,false);
});

test('ORDER071 build source pins provenance and never requires runtime Overpass',async()=>{
  const source=await json('order071/source/santa-fe-osm-snapshot.json');
  assert.equal(source.provenance.license,'ODbL-1.0');
  assert.equal(source.provenance.attribution,'© OpenStreetMap contributors');
  assert.equal(source.provenance.acquisition_phase,'build-time');
  assert.equal(source.provenance.runtime_queries,false);
  assert.ok(source.provenance.osm_base_timestamp);
  assert.ok(source.elements.some(x=>x.kind==='building'));
});

test('ORDER071 3D source does not expand the dynamic Worker API surface',async()=>{
  const [app,renderer,temporal]=await Promise.all([text('public/app.js'),text('public/3d/voy3d.js'),text('public/3d/temporal.js')]);
  const apiPaths=s=>new Set([...s.matchAll(/['"](\/api\/[a-z0-9_\/-]+)['"]/gi)].map(m=>m[1]));
  const appPaths=apiPaths(app);
  assert.equal(apiPaths(renderer).size,0);
  assert.equal(apiPaths(temporal).size,0);
  const expected=new Set(['/api/destinations/suggest','/api/radar/trains/nearby','/api/destinations/resolve','/api/origin/resolve','/api/location/reverse','/api/mobility/compute']);
  assert.deepEqual(appPaths,expected);
});

test('ORDER071 renderer exposes an immediate 2D fallback when WebGL2 is unsupported',async()=>{
  const renderer=await text('public/3d/voy3d.js');
  assert.match(renderer,/getContext\(['"]webgl2['"]/);
  assert.match(renderer,/fallbackTo2D|unsupported_webgl2/);
});

test('ORDER071 pins Three locally and avoids CDN/runtime Worker coupling',async()=>{
  const [pkg,renderer,build]=await Promise.all([json('package.json'),text('public/3d/voy3d.js'),text('scripts/build.ps1')]);
  assert.equal(pkg.devDependencies.three,'0.186.0');
  assert.match(renderer,/from '\/vendor\/three\.module\.js'/);
  assert.doesNotMatch(renderer,/cdn\.jsdelivr|unpkg|esm\.sh/i);
  assert.match(build,/three\\build\\three\.module\.js/);
  assert.match(build,/three\\build\\three\.core\.js/);
  assert.doesNotMatch(renderer,/fetch\(['"]\/api\//);
});
