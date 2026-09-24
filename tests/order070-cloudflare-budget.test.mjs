import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  NominatimCoordinator,
  computeMobilityComputation,
  createRequestHandler,
  trainRadarCoverageSupported
} from '../src/worker.template.js';

const origin={label:'Origen',territory_verified:true,coordinates:{lat:-31.6412,lon:-60.7042},province:{id:'82',name:'Santa Fe'},locality:{id:'820147',name:'Santa Fe',slug:'santa-fe'}};
const destination={label:'Puente Colgante',territory_verified:true,coordinates:{lat:-31.6219,lon:-60.6811},province:{id:'82',name:'Santa Fe'},locality:{id:'820147',name:'Santa Fe',slug:'santa-fe'}};

function routeValue(distance=1200){
  return {geometry:{type:'LineString',coordinates:[[-60.7042,-31.6412],[-60.69,-31.63],[-60.6811,-31.6219]]},distance_m:distance,source:'routing_openstreetmap_de',source_class:'network_route',observed_at:'2026-09-24T12:00:00.000Z',attribution:'© OpenStreetMap contributors',cache_hit:false};
}
function routeResponse(distance=1200){
  return new Response(JSON.stringify({code:'Ok',routes:[{distance,geometry:routeValue(distance).geometry}]}),{status:200,headers:{'content-type':'application/json'}});
}

test('ORDER070 browser release emits no dedicated telemetry requests and uses bounded suggest debounce/cache',async()=>{
  const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  assert.doesNotMatch(app,/fetch\(['"]\/api\/telemetry/);
  assert.doesNotMatch(app,/submitTelemetry\(/);
  const debounce=app.match(/SUGGEST_DEBOUNCE_MS\s*=\s*(\d+)/);
  assert.ok(debounce,'client must expose a bounded destination debounce constant');
  assert.ok(Number(debounce[1])>=350&&Number(debounce[1])<=500);
  const maxEntries=app.match(/SUGGEST_CACHE_MAX\s*=\s*(\d+)/);
  const ttl=app.match(/SUGGEST_CACHE_TTL_MS\s*=\s*(\d+)/);
  assert.equal(Number(maxEntries?.[1]),20);
  assert.ok(Number(ttl?.[1])>0&&Number(ttl?.[1])<=60000);
  assert.doesNotMatch(app,/localStorage[^\n]*suggest/i);
});

test('ORDER070 client has bounded F1 radar coverage and excludes Santa Fe Capital',async()=>{
  assert.equal(trainRadarCoverageSupported({lat:-31.6333,lon:-60.7000}),false);
  assert.equal(trainRadarCoverageSupported({lat:-34.60828,lon:-58.40752}),true);
  assert.equal(trainRadarCoverageSupported({lat:-34.64448,lon:-58.59195}),true);
  assert.equal(trainRadarCoverageSupported({lat:-34.65055,lon:-58.78970}),true);
});

test('ORDER070 radar endpoint fails cheap outside F1 coverage before reading source',async()=>{
  let reads=0;
  const handler=createRequestHandler({
    trainServiceAdapter:{read:async()=>{reads++;return {available:false,reason:'should_not_be_called',observation:null,cache_hit:false}}}
  });
  const res=await handler(new Request('https://voy.test/api/radar/trains/nearby',{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({coordinates:{lat:-31.6333,lon:-60.7000}})
  }),{});
  assert.equal(res.status,200);
  const body=await res.json();
  assert.equal(reads,0);
  assert.equal(body.radar.source_status,'unsupported');
  assert.deepEqual(body.radar.stations,[]);
});

test('ORDER070 supported radar origin reads source exactly once',async()=>{
  let reads=0;
  const handler=createRequestHandler({
    trainServiceAdapter:{read:async()=>{reads++;return {available:false,reason:'source_unavailable',observation:null,cache_hit:false}}}
  });
  const res=await handler(new Request('https://voy.test/api/radar/trains/nearby',{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({coordinates:{lat:-34.60828,lon:-58.40752}})
  }),{});
  assert.equal(res.status,200);
  assert.equal(reads,1);
});

test('ORDER070 production mobility uses one DO request with three bounded modes',async()=>{
  const calls=[];
  const fakeStub={fetch:async(url,init)=>{
    calls.push({url:String(url),body:JSON.parse(init.body)});
    return new Response(JSON.stringify({ok:true,routes:{
      walking:routeValue(1100),bicycle:routeValue(1250),auto:routeValue(1400)
    },errors:{}}),{status:200,headers:{'content-type':'application/json'}});
  }};
  const env={ROUTING_COORDINATOR:{idFromName:name=>{assert.equal(name,'global');return 'global-id'},get:id=>{assert.equal(id,'global-id');return fakeStub}}};
  const c=await computeMobilityComputation({origin,destination},fetch,Date.parse('2026-09-24T12:00:00Z'),env);
  assert.equal(calls.length,1);
  assert.deepEqual(calls[0].body.modes,['walking','bicycle','auto']);
  assert.equal(c.mode_options.find(x=>x.mode==='walking').distance_m,1100);
  assert.equal(c.mode_options.find(x=>x.mode==='bicycle').distance_m,1250);
  assert.equal(c.mode_options.find(x=>x.mode==='auto').distance_m,1400);
});

test('ORDER070 routing coordinator batch uses zero Durable Object storage rows and memory cache only',async()=>{
  const storageCalls=[];
  const storage=new Proxy({}, {get(_t,prop){if(typeof prop==='string')return async()=>{storageCalls.push(prop);throw new Error('durable_storage_forbidden')};}});
  const coordinator=new NominatimCoordinator({storage},{});
  const originalFetch=globalThis.fetch;
  let upstreamCalls=0;
  globalThis.fetch=async url=>{
    upstreamCalls++;
    const s=String(url);
    if(s.includes('/routed-foot/'))return routeResponse(1100);
    if(s.includes('/routed-bike/'))return routeResponse(1250);
    if(s.includes('/routed-car/'))return routeResponse(1400);
    throw new Error('unexpected '+s);
  };
  const payload={modes:['walking','bicycle','auto'],origin:{lat:-31.6412,lon:-60.7042},destination:{lat:-31.6219,lon:-60.6811}};
  const make=()=>new Request('https://voy.internal/routes',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  try{
    const first=await coordinator.fetch(make());
    assert.equal(first.status,200);
    const firstBody=await first.json();
    assert.deepEqual(Object.keys(firstBody.routes).sort(),['auto','bicycle','walking']);
    assert.equal(storageCalls.length,0);
    assert.equal(upstreamCalls,3);
    const second=await coordinator.fetch(make());
    assert.equal(second.status,200);
    const secondBody=await second.json();
    assert.equal(secondBody.routes.walking.cache_hit,true);
    assert.equal(secondBody.routes.bicycle.cache_hit,true);
    assert.equal(secondBody.routes.auto.cache_hit,true);
    assert.equal(upstreamCalls,3,'second identical batch must be fully served from DO memory cache');
    assert.equal(storageCalls.length,0);
  }finally{globalThis.fetch=originalFetch;}
});

test('ORDER070 routing coordinator rejects duplicate unknown and unbounded batch modes',async()=>{
  const coordinator=new NominatimCoordinator({storage:new Proxy({}, {get(){return async()=>{throw new Error('storage_forbidden')}}})},{});
  const base={origin:{lat:-31.64,lon:-60.70},destination:{lat:-31.63,lon:-60.69}};
  const bodies=[
    {...base,modes:['walking','walking']},
    {...base,modes:['walking','hovercraft']},
    {...base,modes:['walking','bicycle','auto','rail']}
  ];
  for(const body of bodies){
    const res=await coordinator.fetch(new Request('https://voy.internal/routes',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));
    assert.equal(res.status,400);
  }
});
