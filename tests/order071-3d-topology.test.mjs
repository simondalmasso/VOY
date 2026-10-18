import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const text=async(path)=>readFile(new URL('../'+path,import.meta.url),'utf8');
const json=async(path)=>JSON.parse(await text(path));
const sha256=value=>createHash('sha256').update(value.replace(/\r\n/g,'\n')).digest('hex');

test('ORDER071 urban 3D stays opt-in after a reliable 2D first paint',async()=>{
  const [index,app,sw]=await Promise.all([text('public/index.html'),text('public/app.js'),text('public/sw.js')]);
  assert.match(index,/data-map-mode="2d"[^>]*aria-pressed="true"/);
  assert.doesNotMatch(app,/setTimeout\(\(\)=>activate3D\(\),180\)/);
  assert.match(app,/activate2D\(\);/);
  assert.match(app,/if\(!controller\?\.ok\)\{state\.threeController=null;activate2D/);
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
    assert.equal(chunk.sha256,sha256(await text('public/3d/topology/'+chunk.url.slice(2))));
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

test('ORDER071 3D source only calls bounded first-party APIs; GPS is same-origin',async()=>{
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
  assert.equal(pkg.dependencies.three,'0.186.0');
  assert.equal(pkg.devDependencies.three,undefined);
  assert.match(renderer,/THREE\?\?=await import\('\/vendor\/three\.module\.js\?v=__BUILD_ID__'\)/);
  assert.doesNotMatch(renderer,/cdn\.jsdelivr|unpkg|esm\.sh/i);
  assert.match(build,/three\\build\\three\.module\.js/);
  assert.match(build,/three\\build\\three\.core\.js/);
  assert.match(build,/maplibre-gl-worker\.mjs/);
  assert.match(build,/maplibreWorker|worker_module/);
  assert.match(build,/maplibre-gl-shared\.mjs\?v=/);
  assert.doesNotMatch(renderer,/fetch\(['"]\/api\//);
});


test('ORDER071 app and renderer share a live update contract and fail closed to 2D',async()=>{
  const [app,renderer]=await Promise.all([text('public/app.js'),text('public/3d/voy3d.js')]);
  assert.match(app,/threeController\.update\(\{routeGeometry:/);
  assert.match(renderer,/function update\(\{routeGeometry:nextRoute=null,transportEntities=\[\]\}=\{\}\)/);
  assert.match(renderer,/return\{ok:true,[^\n]*update,/);
  assert.match(app,/if\(!controller\?\.ok\)\{state\.threeController=null;activate2D/);
  assert.doesNotMatch(app,/threeController\?\?=await mod\.activateVoy3D/);
});

test('ORDER071 urban 3D uses city-wide vector buildings instead of a raster-only basemap',async()=>{
  const renderer=await text('public/3d/voy3d.js');
  assert.ok(renderer.includes('https://tiles.openfreemap.org/styles/liberty'));
  assert.match(renderer,/style:styleUrl/);
  assert.match(renderer,/citywide_vector_buildings:true/);
  assert.ok(!renderer.includes('tile.openstreetmap.org/{z}/{x}/{y}.png'));
  const style=await fetch('https://tiles.openfreemap.org/styles/liberty').then(r=>r.json());
  assert.ok(style.layers.some(layer=>layer.id==='building-3d'&&layer.type==='fill-extrusion'));
});


test('ORDER088 keeps the legacy Three renderer off the default urban-map startup path',async()=>{
  const [app,renderer]=await Promise.all([text('public/app.js'),text('public/3d/voy3d.js')]);
  assert.doesNotMatch(renderer,/^import\s+\* as THREE from ['"]\/vendor\/three\.module\.js/m);
  const fallbackStart=renderer.indexOf('export async function activateVoy3D(');
  const urbanStart=renderer.indexOf('export async function activateVoyUrbanMap3D(',fallbackStart);
  assert.ok(fallbackStart>=0&&urbanStart>fallbackStart);
  assert.match(renderer.slice(fallbackStart,urbanStart),/THREE\s*\?\?=\s*await import\(['"]\/vendor\/three\.module\.js\?v=__BUILD_ID__['"]\)/);
  assert.match(renderer,/getExtension\('WEBGL_lose_context'\)\?\.loseContext\(\)/);
  const substrate=await text('public/map/substrate.js');
  assert.match(substrate,/getExtension\('WEBGL_lose_context'\)\?\.loseContext\(\)/);
  assert.doesNotMatch(app,/^\s*scheduleVectorUpgrade\(\);\s*$/m);
  assert.doesNotMatch(app,/await startVectorUpgradeOnce\(\);/);
  assert.match(app,/function activate2D\([\s\S]*?startVectorUpgradeOnce\(\)/);
});


test('ORDER088 service worker uses versioned cache keys and bypasses APIs and byte ranges',async()=>{
  const sw=await text('public/sw.js');
  assert.match(sw,/'\/app\.js\?v='\+BUILD_ID/);
  assert.match(sw,/if\(url\.pathname\.startsWith\('\/api\/'\)\)/);
  assert.match(sw,/if\(req\.headers\.has\('range'\)\)\s*return/);
  assert.match(sw,/const cached=await caches\.match\(req\)/);
  assert.doesNotMatch(sw,/three\.module\.js|three\.core\.js/);
});


test('ORDER088 registers PMTiles on the MapLibre namespace before adding vector sources',async()=>{
  const [pmtiles,renderer]=await Promise.all([text('public/3d/pmtiles-source.js'),text('public/3d/voy3d.js')]);
  assert.match(pmtiles,/maplibre\.addProtocol\('pmtiles',activeProtocol\.tile\)/);
  assert.ok(renderer.includes("const maplibre=await import('/vendor/maplibre-gl.mjs?v=__BUILD_ID__')"));
  assert.match(renderer,/addVoyPmtilesSources\(maplibre,/);
});


test('ORDER088 caches build-addressed static assets immutably and invalidates disposed 3D state',async()=>{
  const [headers,buildPs,buildSh,renderer,pmtiles]=await Promise.all([
    text('public/_headers'),text('scripts/build.ps1'),
    text('scripts/build.sh'),text('public/3d/voy3d.js'),
    text('public/3d/pmtiles-source.js')
  ]);
  assert.ok(headers.includes('Cache-Control: public, max-age=31536000, immutable'));
  for(const path of ['/app.js','/styles.css','/vendor/*','/3d/*','/map/*','/tracker/*','/transit/*']){
    const start=headers.indexOf(path);
    assert.ok(start>=0&&headers.slice(start,start+160).includes('Cache-Control: public, max-age=31536000, immutable'), 'immutable cache rule missing for '+path);
  }
  assert.ok(buildPs.includes("$maplibreWorkerPath=Join-Path"));
  assert.ok(buildPs.includes("maplibre-gl-worker.mjs?v="));
  assert.ok(buildPs.includes(".Replace('maplibre-gl-worker.mjs',") && buildPs.includes('maplibre-gl-worker.mjs?v='));
  assert.ok(buildSh.includes("maplibre-gl-worker.mjs?v={build_id}"));
  assert.ok(renderer.includes("delete mount.dataset[key]"));
  assert.ok(renderer.includes("'citywide3d'"));
  assert.ok(pmtiles.includes("/vendor/pmtiles.mjs?v=__BUILD_ID__"));
});


test('ORDER089 starts the citywide 3D layers on style load instead of waiting for all visible map tiles',async()=>{
  const renderer=await text('public/3d/voy3d.js');
  assert.ok(renderer.includes("map.once('style.load',async()=>{"));
  assert.ok(!renderer.includes("map.once('load',async()=>{"));
  assert.ok(renderer.includes("urban_map_timeout"));
});


test('ORDER088 avoids repeated 3D GeoJSON renders when GPS frames do not change',async()=>{
  const [renderer,app]=await Promise.all([text('public/3d/voy3d.js'),text('public/app.js')]);
  assert.ok(renderer.includes('let displayedRouteType=initialRoute?.type||null'));
  assert.ok(renderer.includes('let displayedRouteCoordinates=initialRoute?.coordinates||null'));
  assert.ok(renderer.includes('let displayedTransportKey=JSON.stringify(transportData(transport).features)'));
  assert.ok(renderer.includes('if(nextRouteType!==displayedRouteType||nextRouteCoordinates!==displayedRouteCoordinates)'));
  assert.ok(renderer.includes('if(nextTransportKey!==displayedTransportKey)'));
  assert.ok(app.includes('if(map3dStatus.textContent!==copy)map3dStatus.textContent=copy'));
});
