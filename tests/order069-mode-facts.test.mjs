import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {computeMobilityComputation} from '../src/worker.template.js';
import {normalizeMobilityComputation} from '../public/contracts.js';

const origin={label:'Origen',territory_verified:true,coordinates:{lat:-31.6412,lon:-60.7042},province:{id:'82',name:'Santa Fe'},locality:{id:'820147',name:'Santa Fe',slug:'santa-fe'}};
const destination={label:'Puente Colgante',territory_verified:true,coordinates:{lat:-31.6219,lon:-60.6811},province:{id:'82',name:'Santa Fe'},locality:{id:'820147',name:'Santa Fe',slug:'santa-fe'}};

function routeResponse(distance=1234){return new Response(JSON.stringify({code:'Ok',routes:[{distance,geometry:{type:'LineString',coordinates:[[-60.7042,-31.6412],[-60.6900,-31.6300],[-60.6811,-31.6219]]}}]}),{status:200,headers:{'content-type':'application/json'}})}
function mockRoutingFetch(url){
  const s=String(url);
  if(s.includes('/routed-foot/')) return Promise.resolve(routeResponse(3100));
  if(s.includes('/routed-bike/')) return Promise.resolve(routeResponse(3300));
  if(s.includes('/routed-car/')) return Promise.resolve(routeResponse(4100));
  throw new Error('unexpected '+s);
}

test('ORDER069 auto routed-car is actionable with provider distance and unknown price',async()=>{
  const c=await computeMobilityComputation({origin,destination},mockRoutingFetch,Date.parse('2026-09-22T18:20:00Z'));
  const auto=c.mode_options.find(x=>x.mode==='auto');
  assert.equal(auto.selectable,true);
  assert.equal(auto.route_available,true);
  assert.equal(auto.distance_m,4100);
  assert.equal(auto.price_state,'unknown');
  assert.equal(auto.price,null);
  assert.match(auto.route.attribution,/OpenStreetMap/);
});

test('ORDER069 auto failure stays visible and preserves walking/bicycle',async()=>{
  const fetchImpl=async url=>String(url).includes('/routed-car/')?new Response('down',{status:503}):mockRoutingFetch(url);
  const c=await computeMobilityComputation({origin,destination},fetchImpl,Date.parse('2026-09-22T18:20:00Z'));
  const auto=c.mode_options.find(x=>x.mode==='auto');
  assert.equal(auto.selectable,false);
  assert.equal(auto.availability_state,'unavailable');
  assert.equal(auto.price_state,'unknown');
  assert.equal(c.mode_options.find(x=>x.mode==='walking').selectable,true);
  assert.equal(c.mode_options.find(x=>x.mode==='bicycle').selectable,true);
});

test('ORDER069 Santa Fe bus is informational/partial with current official fare facts',async()=>{
  const c=await computeMobilityComputation({origin,destination},mockRoutingFetch,Date.parse('2026-09-22T18:20:00Z'));
  const bus=c.mode_options.find(x=>x.mode==='bus');
  assert.equal(bus.selectable,false);
  assert.equal(bus.availability_state,'partial');
  assert.equal(bus.route_available,false);
  assert.equal(bus.fare.state,'current');
  assert.equal(bus.fare.primary.amount,2111.11);
  assert.equal(bus.fare.frequent.amount,1900);
  assert.equal(bus.fare.source.id,'src_santa_fe_fare_20260515');
  assert.match(bus.fare.source.canonical_url,/decreto-00048-2026/);
  assert.ok(bus.fare.frequent.eligibility.some(x=>/SUBE registrada/i.test(x)));
  assert.ok(bus.fare.frequent.eligibility.some(x=>/domicilio/i.test(x)));
  assert.equal(bus.eta_state,'not_integrated');
  assert.equal(bus.realtime_state,'unavailable');
  assert.equal('eta' in bus,false);
  assert.equal('live_position' in bus,false);
});

test('ORDER069 stale fare fails closed while bus and official actions survive',async()=>{
  const c=await computeMobilityComputation({origin,destination},mockRoutingFetch,Date.parse('2026-11-30T18:20:00Z'));
  const bus=c.mode_options.find(x=>x.mode==='bus');
  assert.equal(bus.fare.state,'unverified');
  assert.equal(bus.fare.primary,null);
  assert.equal(bus.fare.frequent,null);
  assert.equal(bus.price_state,'unknown');
  assert.equal(bus.actions.length,2);
});

test('ORDER069 official Cuándo Pasa and deviations handoffs are allowlisted',async()=>{
  const c=await computeMobilityComputation({origin,destination},mockRoutingFetch,Date.parse('2026-09-22T18:20:00Z'));
  const bus=c.mode_options.find(x=>x.mode==='bus');
  assert.ok(bus.actions.some(x=>x.id==='santa_fe_when_arrives'&&x.url.includes('/colectivos/')));
  assert.ok(bus.actions.some(x=>x.id==='santa_fe_deviations'&&x.url==='https://santafeciudad.gov.ar/desvios/'));
});

test('ORDER069 missing rideshare pricing can never leak into Auto price',async()=>{
  const c=await computeMobilityComputation({origin,destination},mockRoutingFetch,Date.parse('2026-09-22T18:20:00Z'));
  const auto=c.mode_options.find(x=>x.mode==='auto');
  assert.equal(auto.price,null);
  assert.equal(auto.price_state,'unknown');
  assert.equal(JSON.stringify(auto).toLowerCase().includes('uber'),false);
  assert.equal(JSON.stringify(auto).toLowerCase().includes('didi'),false);
});

test('ORDER069 frontend removes binary hide copy and renders four independent modes',async()=>{
  const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  assert.doesNotMatch(app,/No mostramos Auto, Colectivo/);
  for(const literal of ["'A pie'","'Bici'","'Auto'","'Colectivo'"]) assert.ok(app.includes(literal));
  assert.match(app,/Precio no disponible/);
  assert.match(app,/Cuándo pasa: no integrado/);
  assert.match(app,/Tiempo real no disponible en VOY/);
});

test('ORDER069 mobility normalizer accepts routed Auto with unknown price and partial bus',async()=>{
  const c=await computeMobilityComputation({origin,destination},mockRoutingFetch,Date.parse('2026-09-22T18:20:00Z'));
  const n=normalizeMobilityComputation(c);
  assert.ok(n);
  const auto=n.mode_options.find(x=>x.mode==='auto');
  const bus=n.mode_options.find(x=>x.mode==='bus');
  assert.equal(auto.price_state,'unknown');
  assert.equal(auto.price,null);
  assert.equal(bus.availability_state,'partial');
});

test('ORDER069 Amendment A is map-first on desktop and mobile without new map libs',async()=>{
  const [html,css,app]=await Promise.all([
    readFile(new URL('../public/index.html',import.meta.url),'utf8'),
    readFile(new URL('../public/styles.css',import.meta.url),'utf8'),
    readFile(new URL('../public/app.js',import.meta.url),'utf8')
  ]);
  assert.ok(html.indexOf('id="map-shell"')<html.indexOf('class="planner"'));
  assert.doesNotMatch(html,/id="map-shell"[^>]*hidden/);
  assert.match(css,/ORDER069 AMENDMENT A/);
  assert.match(css,/grid-template-areas:"map planner"/);
  assert.match(css,/grid-template-areas:"map" "planner"/);
  assert.match(app,/renderInitialMap\(\)/);
  assert.match(app,/renderMap\(DEFAULT_MAP_CENTER/);
  assert.doesNotMatch(app,/leaflet|mapbox|openlayers/i);
});
