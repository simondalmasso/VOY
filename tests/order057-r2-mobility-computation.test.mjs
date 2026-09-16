import test from 'node:test';
import assert from 'node:assert/strict';
import { NominatimCoordinator, computeMobilityComputation, createRequestHandler } from '../src/worker.template.js';

const origin={label:'Origen',territory_verified:true,coordinates:{lat:-31.6412,lon:-60.7042},province:{id:'82',name:'Santa Fe'},locality:{id:'820147',name:'Santa Fe',slug:'santa-fe'}};
const destination={label:'Plaza Constituyentes',territory_verified:true,coordinates:{lat:-31.6333,lon:-60.7000},province:{id:'82',name:'Santa Fe'},locality:{id:'820147',name:'Santa Fe',slug:'santa-fe'}};

function routeResponse(distance=1234){return new Response(JSON.stringify({code:'Ok',routes:[{distance,geometry:{type:'LineString',coordinates:[[-60.7042,-31.6412],[-60.702,-31.637],[-60.7000,-31.6333]]}}]}),{status:200,headers:{'content-type':'application/json'}})}
function mockRoutingFetch(url){
  const s=String(url);
  if(s.includes('/routed-foot/')) return Promise.resolve(routeResponse(1180));
  if(s.includes('/routed-bike/')) return Promise.resolve(routeResponse(1310));
  if(s.includes('/routed-car/')) return Promise.resolve(routeResponse(1420));
  throw new Error('unexpected '+s);
}

function assertSelectableContract(option){
  assert.equal(option.selectable,true);
  assert.ok(option.route?.geometry?.type==='LineString');
  assert.ok(option.route.geometry.coordinates.length>=2);
  assert.ok(Number.isFinite(option.distance_m)&&option.distance_m>0);
  assert.equal(option.price?.currency,'ARS');
  assert.ok(Number.isFinite(option.price?.amount));
}

test('R2 computes truthful walking and bicycle network routes with explicit ARS 0 prices',async()=>{
  const c=await computeMobilityComputation({origin,destination},mockRoutingFetch,Date.parse('2026-09-06T20:00:00Z'));
  assert.equal(c.server_authoritative,true);
  const walk=c.mode_options.find(x=>x.mode==='walking');
  const bike=c.mode_options.find(x=>x.mode==='bicycle');
  assertSelectableContract(walk); assertSelectableContract(bike);
  assert.equal(walk.distance_m,1180); assert.equal(bike.distance_m,1310);
  assert.equal(walk.price.amount,0); assert.equal(walk.price.kind,'free');
  assert.equal(bike.price.amount,0); assert.equal(bike.price.kind,'free');
  assert.equal(c.mode_options.some(x=>x.mode==='auto'&&x.selectable),false,'auto must not appear without truthful price input');
  assert.equal(c.mode_options.some(x=>x.mode==='bus'&&x.selectable),false,'official handoff/fare metadata alone cannot become a bus trip');
});

test('R2 routed distance is provider distance, not straight-line approximation',async()=>{
  const c=await computeMobilityComputation({origin,destination},mockRoutingFetch);
  assert.equal(c.mode_options.find(x=>x.mode==='walking').distance_m,1180);
  assert.equal(c.mode_options.find(x=>x.mode==='bicycle').distance_m,1310);
});

test('R2 provider failure fails one mode closed and preserves other truthful modes',async()=>{
  const fetchImpl=async(url)=>String(url).includes('/routed-foot/')?new Response('down',{status:503}):routeResponse(1500);
  const c=await computeMobilityComputation({origin,destination},fetchImpl);
  assert.equal(c.mode_options.some(x=>x.mode==='walking'&&x.selectable),false);
  const bike=c.mode_options.find(x=>x.mode==='bicycle'); assertSelectableContract(bike); assert.equal(bike.price.amount,0);
});

test('R2 rejects malformed geometry instead of fabricating route/distance',async()=>{
  const bad=async()=>new Response(JSON.stringify({code:'Ok',routes:[{distance:999,geometry:{type:'LineString',coordinates:[[-999,999]]}}]}),{status:200});
  const c=await computeMobilityComputation({origin,destination},bad);
  assert.equal(c.mode_options.filter(x=>x.selectable).length,0);
  assert.equal(c.fabricated_claims,0);
});

test('R2 HTTP compute endpoint is server-authoritative and does not coerce missing paid prices to zero',async()=>{
  const handler=createRequestHandler({upstreamFetch:mockRoutingFetch});
  const req=new Request('https://voy.test/api/mobility/compute',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({origin,destination})});
  const res=await handler(req,{}); assert.equal(res.status,200);
  const payload=await res.json(); assert.equal(payload.ok,true); assert.equal(payload.computation.server_authoritative,true);
  for(const option of payload.computation.mode_options.filter(x=>x.selectable)) assertSelectableContract(option);
  assert.equal(payload.computation.mode_options.some(x=>x.selectable&&x.price==null),false);
});


test('R2 production routing is globally coordinated before calling public upstream',async()=>{

  const calls=[];

  const fakeStub={fetch:async(url,init)=>{calls.push({url:String(url),body:JSON.parse(init.body)});return new Response(JSON.stringify({ok:true,route:{geometry:{type:'LineString',coordinates:[[-60.7042,-31.6412],[-60.7,-31.6333]]},distance_m:1200,source:'routing_openstreetmap_de',source_class:'network_route',observed_at:'2026-09-07T00:00:00Z',attribution:'© OpenStreetMap contributors',cache_hit:false}}),{status:200});}};

  const env={ROUTING_COORDINATOR:{idFromName:(name)=>{assert.equal(name,'global');return 'global-id'},get:(id)=>{assert.equal(id,'global-id');return fakeStub}}};

  const c=await computeMobilityComputation({origin,destination},fetch,Date.parse('2026-09-07T00:00:00Z'),env);

  assert.equal(c.mode_options.filter(x=>x.selectable).length,2);

  assert.equal(calls.length,2);

  assert.deepEqual(calls.map(x=>x.body.mode),['walking','bicycle']);

});


function fakeStorage(seed=[]){
  const map=new Map(seed);
  return {
    map,
    get:async k=>map.get(k),
    put:async(k,v)=>{map.set(k,v)},
    delete:async k=>{map.delete(k)},
    list:async({prefix='',startAfter='',limit=1000}={})=>new Map([...map.entries()]
      .filter(([k])=>String(k).startsWith(prefix)&&(!startAfter||String(k)>String(startAfter)))
      .sort(([a],[b])=>String(a).localeCompare(String(b))).slice(0,limit))
  };
}

test('R2 global public-router coordinator fails closed when bounded queue is full',async()=>{
  const storage=fakeStorage();
  const coordinator=new NominatimCoordinator({storage},{});
  let release; const gate=new Promise(r=>{release=r});
  coordinator.route=async()=>{await gate;return {ok:true,route:{distance_m:1}}};
  const makeReq=()=>new Request('https://voy.internal/route',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode:'walking',origin:{lat:-31.64,lon:-60.70},destination:{lat:-31.63,lon:-60.69}})});
  const pending=Array.from({length:33},()=>coordinator.fetch(makeReq()));
  await new Promise(r=>setTimeout(r,15));
  release();
  const responses=await Promise.all(pending);
  const statuses=responses.map(r=>r.status);
  assert.ok(statuses.includes(503),'queue overflow must return 503 instead of unbounded accumulation');
  const overflow=responses.find(r=>r.status===503);
  assert.equal((await overflow.json()).error,'router_queue_full');
  assert.equal(coordinator.pendingAdmissions,0,'queue admission count must drain to zero');
  assert.equal((await coordinator.fetch(makeReq())).status,200,'coordinator must accept work again after drain');
});

test('R2 durable routing cache evicts persistently and stays bounded',async()=>{
  const now=Date.now();
  const seed=[];
  for(let i=0;i<96;i++) seed.push([`cache:old-${i}`,{stored_at:now-1000,value:{distance_m:100+i}}]);
  const storage=fakeStorage(seed);
  const coordinator=new NominatimCoordinator({storage},{});
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>routeResponse(1777);
  try{
    const out=await coordinator.route({mode:'walking',origin:{lat:-31.64,lon:-60.70},destination:{lat:-31.62,lon:-60.68}});
    assert.equal(out.ok,true);
    let cacheKeys=[...storage.map.keys()].filter(k=>String(k).startsWith('cache:'));
    assert.ok(cacheKeys.length<=96,`persistent route cache must be <=96 entries, got ${cacheKeys.length}`);
    const restarted=new NominatimCoordinator({storage},{});
    await restarted.route({mode:'bicycle',origin:{lat:-31.65,lon:-60.71},destination:{lat:-31.61,lon:-60.67}});
    cacheKeys=[...storage.map.keys()].filter(k=>String(k).startsWith('cache:'));
    assert.ok(cacheKeys.length<=96,`restart reconstruction must preserve <=96 entries, got ${cacheKeys.length}`);
  }finally{globalThis.fetch=originalFetch;}
});

test('R2 durable routing cache preserves cache hits and TTL expiry',async()=>{
  const storage=fakeStorage();
  const coordinator=new NominatimCoordinator({storage},{});
  const originalFetch=globalThis.fetch; let calls=0;
  globalThis.fetch=async()=>{calls++;return routeResponse(1666)};
  const payload={mode:'walking',origin:{lat:-31.64,lon:-60.70},destination:{lat:-31.63,lon:-60.68}};
  try{
    const first=await coordinator.route(payload); const second=await coordinator.route(payload);
    assert.equal(first.ok,true); assert.equal(second.route.cache_hit,true); assert.equal(calls,1);
    const key=[...storage.map.keys()].find(k=>String(k).startsWith('cache:'));
    const record=storage.map.get(key); storage.map.set(key,{...record,stored_at:Date.now()-121000});
    storage.map.set('last_fetch_at',0);
    const third=await coordinator.route(payload);
    assert.equal(third.ok,true); assert.equal(third.route.cache_hit,false); assert.equal(calls,2);
  }finally{globalThis.fetch=originalFetch;}
});