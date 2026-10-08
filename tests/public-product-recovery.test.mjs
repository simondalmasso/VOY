import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalizeDestinationSuggestion} from '../public/contracts.js';
import {rankDestinationCandidates} from '../src/worker.template.js';

const read=async p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const candidate=(id,coords,providerRank,locality,province)=>({
  candidate_id:id,candidate_ref:id,provider:'fixture',
  display_primary:'Puente Colgante',display_secondary:`${locality} · ${province}`,
  coordinates:coords,locality:{id:'',name:locality,slug:locality.toLowerCase().replaceAll(' ','-')},
  province:{id:province==='Santa Fe'?'82':'14',name:province},
  provider_rank:providerRank,provider_types:['bridge'],confidence_class:'provider',distance_meters:null
});

test('public recovery: null suggestion distance stays unknown instead of becoming 50 m',()=>{
  const value=normalizeDestinationSuggestion(candidate(
    'photon:W:1',{lat:-31.6219,lon:-60.6811},0,'Santa Fe','Santa Fe'
  ));
  assert.ok(value);
  assert.equal(value.distance_meters,null);
});

test('public recovery: visible map center biases local search without fabricating origin distance',()=>{
  const ranked=rankDestinationCandidates([
    candidate('far',{lat:-31.42,lon:-64.19},0,'Córdoba','Córdoba'),
    candidate('near',{lat:-31.6219,lon:-60.6811},1,'Santa Fe','Santa Fe')
  ],{
    query:'Puente Colgante',origin:null,explicit_geography:null,search_scope:'local',
    viewport:{center:{lat:-31.6333,lon:-60.7000},span_km:25}
  });
  assert.equal(ranked[0].candidate_id,'near');
  assert.equal(ranked[0].distance_meters,null);
});
test('public recovery: bundled 3D topology is a meaningful urban scene, not a three-building demo',async()=>{
  const chunk=JSON.parse(await read('public/3d/topology/chunk-santa-fe-centro-0.json'));
  assert.ok(chunk.buildings.length>=100,`expected >=100 buildings, got ${chunk.buildings.length}`);
  assert.ok(chunk.roads.length>=30,`expected >=30 roads, got ${chunk.roads.length}`);
  const xs=[],ys=[];
  for(const b of chunk.buildings)for(const [x,y] of b.footprint_m||[]){xs.push(x);ys.push(y)}
  assert.ok(Math.max(...xs)-Math.min(...xs)>=800,'3D building footprint must span at least 800m east-west');
  assert.ok(Math.max(...ys)-Math.min(...ys)>=800,'3D building footprint must span at least 800m north-south');
});

test('public recovery: 3D can open from verified local topology context without a selected route',async()=>{
  const app=await read('public/app.js');
  assert.match(app,/function hasLocal3DTopologyContext\(/);
  assert.match(app,/function has3DContext\(\)[\s\S]*hasLocal3DTopologyContext\(substrate\.getCenter\(\)\|\|DEFAULT_MAP_CENTER\)/);
  assert.doesNotMatch(app,/if\(!has3DContext\(\)\)\{activate2D\('Seleccioná un servicio o recorrido para abrir 3D\.'/);
  assert.match(app,/3D urbano · Santa Fe/);
});

test('public recovery: client sends visible map center as search viewport when origin is absent',async()=>{
  const app=await read('public/app.js');
  assert.match(app,/function destinationViewport\(/);
  assert.match(app,/const viewport=destinationViewport\(\)/);
  assert.match(app,/return \{search_scope:state\.searchScope,viewport\}/);
  assert.match(app,/substrate\.getCenter\(\)\|\|state\.mapCenter\|\|DEFAULT_MAP_CENTER/);
});

test('public recovery: Santa Fe bus network is bundled from the municipal published map',async()=>{
  const data=JSON.parse(await read('public/transit/santa-fe-lines.json'));
  assert.equal(data.kind,'static_route_geometry');
  assert.equal(data.temporal_state,'unknown');
  assert.match(data.source.page_url,/santafeciudad\.gov\.ar/);
  assert.match(data.source.map_url,/14wBxu5QeCCnlDeeNj3I2r4yoENkt6aU/);
  assert.ok(data.routes.length>=20,`expected published route variants, got ${data.routes.length}`);
  assert.ok(data.routes.reduce((n,r)=>n+r.segments.length,0)>=40);
});

test('public recovery: map renders static bus network independently from realtime availability',async()=>{
  const [app,substrate]=await Promise.all([read('public/app.js'),read('public/map/substrate.js')]);
  assert.match(app,/santa-fe-lines\.json/);
  assert.match(app,/networkGeometries:currentBusNetworkGeometries\(\)/);
  assert.match(substrate,/networkGeometries\s*=\s*\[\]/);
  assert.match(substrate,/voy-bus-network-source/);
  assert.match(substrate,/transit-network-overlay/);
  assert.doesNotMatch(app,/\/api\/.*bus-network/);
});

test('public recovery: Santa Fe bus copy distinguishes route existence from temporal evidence',async()=>{
  const app=await read('public/app.js');
  assert.match(app,/Recorridos publicados: visibles en el mapa/);
  assert.match(app,/Arribos en VOY: no integrados/);
  assert.doesNotMatch(app,/Cuándo pasa: no integrado · Tiempo real no disponible en VOY/);
});

test('public recovery: 3D camera opens as an urban overview, not a macro building crop',async()=>{
  const renderer=await read('public/3d/voy3d.js');
  assert.match(renderer,/distance=800/);
  assert.match(renderer,/Math\.min\(1800,distance\)/);
  assert.match(renderer,/PerspectiveCamera\(48,1,\.1,4000\)/);
  assert.match(renderer,/PlaneGeometry\(2400,2400\)/);
  assert.match(renderer,/MeshLambertMaterial\(\{color:0xb8c4c8\}\)/);
});

test('public recovery: release build ships the pinned static transit geometry',async()=>{
  const [sh,ps1]=await Promise.all([read('scripts/build.sh'),read('scripts/build.ps1')]);
  assert.match(sh,/public\/transit/);
  assert.match(sh,/client\/'transit'/);
  assert.match(ps1,/public\\transit/);
  assert.match(ps1,/dist\\client\\transit/);
});

test('public recovery: bus network sync stays in the map sync scope and survives raster/vector transitions',async()=>{
  const substrate=await read('public/map/substrate.js');
  const syncStart=substrate.indexOf('function sync({');
  const trailStart=substrate.indexOf('function syncTrail(');
  const multiStart=substrate.indexOf('function rasterMultiLine(');
  assert.ok(syncStart>=0&&trailStart>syncStart&&multiStart>trailStart);
  assert.match(substrate.slice(syncStart,trailStart),/syncBusNetwork\(networkGeometries\)/);
  assert.doesNotMatch(substrate.slice(trailStart,multiStart),/networkGeometries/);
  assert.match(substrate,/networkMode/);
});
