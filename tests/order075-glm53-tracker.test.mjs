import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createTrackerStore,TRAIL_MAX_OBSERVATIONS,TRAIL_MAX_AGE_MS,MAX_NEARBY_MARKERS,MAX_TRACKER_ENTITIES} from '../public/tracker/store.js';
import {presentTransportEntity} from '../public/3d/temporal.js';
import {fixtureEnabled,createFixtureEngine,FIXTURE_SOURCE_ID} from '../public/tracker/fixtures.js';
import {classifyObservation,normalizeObservation} from '../public/tracker/observations.js';

const FIXED_NOW=Date.parse('2026-09-26T12:00:00.000Z');
const now=()=>FIXED_NOW;
const makeStore=(opts={})=>createTrackerStore({now,presentTransportEntity,...opts});
const GEOMETRY=[[-60.7098,-31.6500],[-60.7098,-31.6503],[-60.7098,-31.6506]];

function realtimeObservation(overrides={}){
  return {
    id:'bus-12',source_id:'src-test',temporal_state:'realtime',
    observed_at:'2026-09-26T11:59:52.000Z',lat:-31.6500,lon:-60.7098,
    route_id:'route-12',line:'12',verified_geometry:GEOMETRY,
    ...overrides
  };
}

test('ORDER075 GLM53 movement invariant: scheduled => zero movement',()=>{
  const store=makeStore();
  store.ingest(realtimeObservation({id:'svc-1',temporal_state:'scheduled',lat:-31.6400,lon:-60.7000,observed_at:'2026-09-26T11:59:00.000Z'}));
  for(let i=0;i<3;i++){
    store.ingest(realtimeObservation({id:'svc-1',temporal_state:'scheduled',lat:-31.6300+i*0.001,lon:-60.6900,observed_at:'2026-09-26T11:59:30.000Z'}));
    const frame=store.displayFrame('svc-1');
    assert.equal(frame.render,false,'scheduled entity must never render a moving vehicle');
    assert.equal(frame.temporal_state,'scheduled');
    assert.equal(frame.animated,false);
  }
});

test('ORDER075 GLM53 movement invariant: unknown => zero movement',()=>{
  const store=makeStore();
  store.ingest(realtimeObservation({id:'x-1',temporal_state:'unknown',observed_at:'2026-09-26T11:59:55.000Z'}));
  const frame=store.displayFrame('x-1');
  assert.equal(frame.render,false);
  assert.equal(frame.temporal_state,'unknown');
});

test('ORDER075 GLM53 movement invariant: stale realtime => zero movement and truthful degradation',()=>{
  const store=makeStore();
  store.ingest(realtimeObservation({observed_at:'2026-09-26T11:58:00.000Z'}));
  store.ingest(realtimeObservation({observed_at:'2026-09-26T11:58:10.000Z',lat:-31.6501,lon:-60.7098}));
  // 110 seconds later than last observation: stale
  const frame=store.displayFrame('bus-12');
  assert.equal(frame.render,false);
  assert.equal(frame.temporal_state,'realtime');
  assert.equal(frame.reason,'stale_observation');
  const cls=classifyObservation(realtimeObservation({observed_at:'2026-09-26T11:58:10.000Z'}),FIXED_NOW);
  assert.equal(cls.state,'unknown');
  assert.equal(cls.reason,'stale_source');
});

test('ORDER075 GLM53 movement invariant: realtime without verified geometry => zero movement',()=>{
  const store=makeStore();
  const raw=realtimeObservation({id:'bus-nogeo'});
  delete raw.verified_geometry;
  store.ingest(raw);
  store.ingest({...raw,observed_at:'2026-09-26T11:59:58.000Z',lat:-31.6502,lon:-60.7098});
  const frame=store.displayFrame('bus-nogeo');
  assert.equal(frame.render,false);
  assert.equal(frame.reason,'verified_geometry_missing');
});

test('ORDER075 GLM53 valid fresh realtime with geometry is renderable',()=>{
  const store=makeStore();
  store.ingest(realtimeObservation({observed_at:'2026-09-26T11:59:40.000Z',lat:-31.6500}));
  store.ingest(realtimeObservation({observed_at:'2026-09-26T11:59:52.000Z',lat:-31.6502}));
  const frame=store.displayFrame('bus-12');
  assert.equal(frame.render,true);
  assert.equal(frame.temporal_state,'realtime');
  assert.ok(Number.isFinite(frame.position.lat)&&Number.isFinite(frame.position.lon));
});

test('ORDER075 GLM53 impossible jump is rejected by the store presentation',()=>{
  const store=makeStore();
  store.ingest(realtimeObservation({observed_at:'2026-09-26T11:59:40.000Z'}));
  // ~12 km in 12 seconds
  store.ingest(realtimeObservation({observed_at:'2026-09-26T11:59:52.000Z',lat:-31.5500,lon:-60.6100}));
  const frame=store.displayFrame('bus-12');
  assert.equal(frame.render,false);
  assert.equal(frame.reason,'impossible_jump');
});

test('ORDER075 GLM53 selection survives mode/follow state changes and is store-owned',()=>{
  const store=makeStore();
  store.ingest(realtimeObservation());
  assert.equal(store.select('bus-12'),true);
  assert.equal(store.selected().id,'bus-12');
  store.setFollow('following');
  store.userPanSuspend();
  assert.equal(store.follow(),'suspended');
  assert.equal(store.selected().id,'bus-12','selection must not be cleared by follow suspension');
  store.resumeFollow();
  assert.equal(store.follow(),'following');
  assert.equal(store.selected().id,'bus-12');
});

test('ORDER075 GLM53 pan suspends follow immediately and only from following',()=>{
  const store=makeStore();
  store.ingest(realtimeObservation());
  store.select('bus-12');
  store.setFollow('following');
  store.userPanSuspend();
  assert.equal(store.follow(),'suspended');
  // pan while suspended keeps suspended (no resurrection, no clearing)
  store.userPanSuspend();
  assert.equal(store.follow(),'suspended');
  // pan with follow off stays off
  store.setFollow('off');
  store.userPanSuspend();
  assert.equal(store.follow(),'off');
});

test('ORDER075 GLM53 resume requires an explicit action and a selection',()=>{
  const store=makeStore();
  assert.equal(store.resumeFollow(),false,'no selection => cannot follow');
  store.ingest(realtimeObservation());
  store.select('bus-12');
  assert.equal(store.resumeFollow(),true);
  assert.equal(store.follow(),'following');
});

test('ORDER075 GLM53 nearby context is bounded and always includes the selection',()=>{
  const store=makeStore();
  for(let i=0;i<MAX_TRACKER_ENTITIES+6;i++){
    store.ingest(realtimeObservation({id:`bus-${i}`,lat:-31.6500+i*0.004,lon:-60.7100+i*0.004,observed_at:'2026-09-26T11:59:52.000Z'}));
  }
  const near=store.nearby({lat:-31.6500,lon:-60.7100});
  assert.ok(near.length<=MAX_NEARBY_MARKERS,`nearby must be capped at ${MAX_NEARBY_MARKERS}, got ${near.length}`);
  store.select('bus-15');
  const near2=store.nearby({lat:-31.6500,lon:-60.7100});
  assert.ok(near2.some(e=>e.id==='bus-15'),'selected entity must remain visible in nearby context');
});

test('ORDER075 GLM53 actual source observations enter the trail',()=>{
  const store=makeStore();
  store.ingest(realtimeObservation({observed_at:'2026-09-26T11:59:40.000Z'}));
  store.ingest(realtimeObservation({observed_at:'2026-09-26T11:59:46.000Z',lat:-31.6501,lon:-60.7099}));
  store.ingest(realtimeObservation({observed_at:'2026-09-26T11:59:52.000Z',lat:-31.6502,lon:-60.7098}));
  const trail=store.trail('bus-12');
  assert.equal(trail.length,3);
  assert.equal(trail[0].observed_at,'2026-09-26T11:59:40.000Z');
  assert.equal(trail[2].lat,-31.6502);
});

test('ORDER075 GLM53 interpolated display points never enter the trail',()=>{
  const store=makeStore();
  store.ingest(realtimeObservation({observed_at:'2026-09-26T11:59:40.000Z'}));
  store.ingest(realtimeObservation({observed_at:'2026-09-26T11:59:52.000Z',lat:-31.6502,lon:-60.7098}));
  // present many interpolation frames between the two source observations
  for(let i=0;i<10;i++)store.displayFrame('bus-12');
  const trail=store.trail('bus-12');
  assert.equal(trail.length,2,'display interpolation must not create trail history');
});

test('ORDER075 GLM53 trail observation cap is enforced (FIFO at 32)',()=>{
  assert.equal(TRAIL_MAX_OBSERVATIONS,32);
  const store=makeStore();
  for(let i=0;i<40;i++){
    store.ingest(realtimeObservation({observed_at:new Date(Date.parse('2026-09-26T11:58:00.000Z')+i*1000).toISOString(),lat:-31.6500-i*0.00001,lon:-60.7099}));
  }
  const trail=store.trail('bus-12');
  assert.equal(trail.length,32);
  assert.equal(trail[0].observed_at,new Date(Date.parse('2026-09-26T11:58:08.000Z')).toISOString(),'oldest entries dropped first');
});

test('ORDER075 GLM53 trail age cap is enforced (120 seconds)',()=>{
  assert.equal(TRAIL_MAX_AGE_MS,120000);
  const store=makeStore();
  const t0=Date.parse('2026-09-26T11:57:00.000Z');
  for(let i=0;i<5;i++)store.ingest(realtimeObservation({observed_at:new Date(t0+i*40000).toISOString(),lat:-31.6500,lon:-60.7099}));
  // newest at 11:59:40+; points older than 120s vs newest are purged
  const trail=store.trail('bus-12');
  const newest=Date.parse(trail.at(-1).observed_at);
  for(const point of trail)assert.ok(newest-Date.parse(point.observed_at)<=TRAIL_MAX_AGE_MS+1000,'trail point older than age cap');
  assert.equal(trail.length,4,'points beyond 120s of the newest must be purged');
});

test('ORDER075 GLM53 source/entity identity switch clears incompatible trail',()=>{
  const store=makeStore();
  store.ingest(realtimeObservation({observed_at:'2026-09-26T11:59:40.000Z'}));
  store.ingest(realtimeObservation({observed_at:'2026-09-26T11:59:46.000Z',lat:-31.6501,lon:-60.7099}));
  // same entity id but a different provenance: trail is incompatible
  store.ingest(realtimeObservation({source_id:'src-other',observed_at:'2026-09-26T11:59:52.000Z',lat:-31.6502,lon:-60.7098}));
  let trail=store.trail('bus-12');
  assert.equal(trail.length,1,'trail must reset when provenance changes');
  assert.equal(trail[0].source_id,'src-other');
  // different entity id: unrelated trail
  store.ingest(realtimeObservation({id:'bus-99',observed_at:'2026-09-26T11:59:58.000Z'}));
  assert.equal(store.trail('bus-99').length,1);
});

test('ORDER075 GLM53 scrub is zero-fetch by construction and walks real observations only',async()=>{
  const store=makeStore();
  for(let i=0;i<5;i++)store.ingest(realtimeObservation({observed_at:new Date(Date.parse('2026-09-26T11:59:30.000Z')+i*5000).toISOString(),lat:-31.6500-i*0.0005,lon:-60.7099}));
  store.select('bus-12');
  const t=store.timeState();
  assert.equal(t.mode,'now');
  store.scrubTo(2);
  const t2=store.timeState();
  assert.equal(t2.mode,'scrub');
  assert.equal(t2.index,2);
  const frame=store.displayFrame('bus-12');
  assert.equal(frame.render,true);
  assert.equal(frame.animated,false,'scrub must be discrete');
  assert.equal(frame.scrub,true);
  assert.equal(frame.position.lat,-31.6500-2*0.0005,'scrub must land exactly on the stored source observation');
  // the store modules expose no fetch at all
  const [storeSrc,obsSrc]=await Promise.all([
    readFile(new URL('../public/tracker/store.js',import.meta.url),'utf8'),
    readFile(new URL('../public/tracker/observations.js',import.meta.url),'utf8')
  ]);
  for(const src of [storeSrc,obsSrc]){
    assert.doesNotMatch(src,/fetch\(/);
    assert.doesNotMatch(src,/\/api\//);
  }
});

test('ORDER075 GLM53 return-to-now restores the latest live presentation',()=>{
  const store=makeStore();
  for(let i=0;i<4;i++)store.ingest(realtimeObservation({observed_at:new Date(Date.parse('2026-09-26T11:59:30.000Z')+i*5000).toISOString(),lat:-31.6500-i*0.0005,lon:-60.7098}));
  store.select('bus-12');
  store.scrubTo(0);
  assert.equal(store.timeState().mode,'scrub');
  store.returnToNow();
  assert.equal(store.timeState().mode,'now');
  const frame=store.displayFrame('bus-12');
  assert.notEqual(frame.scrub,true);
  assert.equal(frame.temporal_state,'realtime');
});

test('ORDER075 GLM53 reduced motion produces discrete observation steps',()=>{
  const store=makeStore();
  store.ingest(realtimeObservation({observed_at:'2026-09-26T11:59:40.000Z'}));
  store.ingest(realtimeObservation({observed_at:'2026-09-26T11:59:52.000Z',lat:-31.6502,lon:-60.7098}));
  const frame=store.displayFrame('bus-12',{reducedMotion:true});
  assert.equal(frame.render,true);
  assert.equal(frame.animated,false);
  assert.equal(frame.position.lat,-31.6502,'reduced motion snaps to the source observation');
  assert.equal(frame.position.lon,-60.7098);
});

test('ORDER075 GLM53 scheduled time rail never creates a vehicle',()=>{
  const store=makeStore();
  store.ingest(realtimeObservation({id:'svc-rail',temporal_state:'scheduled',observed_at:'2026-09-26T11:00:00.000Z',lat:-31.6420,lon:-60.7000,scheduled_times:['12:10','12:40','13:10']}));
  store.select('svc-rail');
  for(let i=0;i<3;i++){
    store.scrubTo(i);
    const frame=store.displayFrame('svc-rail');
    assert.equal(frame.render,false,'scheduled entity must never get a vehicle marker, not even under scrub');
    assert.equal(frame.temporal_state,'scheduled');
  }
  store.returnToNow();
  assert.equal(store.displayFrame('svc-rail').render,false);
});

test('ORDER075 GLM53 fixtures are opt-in only (Santa Fe stays truthful by default)',()=>{
  assert.equal(fixtureEnabled(new URLSearchParams('')) ,false,'no params => no fake live');
  assert.equal(fixtureEnabled(new URLSearchParams('fixture=other')),false);
  assert.equal(fixtureEnabled(new URLSearchParams('fixture=realtime')),true);
});

test('ORDER075 GLM53 fixture engine is deterministic and labeled synthetic',()=>{
  const pushed=[];
  const engine=createFixtureEngine({push:obs=>pushed.push(obs),now,tickMs:6000});
  engine.step(3);
  assert.ok(pushed.length>=3);
  for(const obs of pushed){
    assert.equal(obs.source_id,FIXTURE_SOURCE_ID);
    assert.equal(obs.synthetic_fixture,true,'every fixture observation must be labeled synthetic');
    assert.ok(obs.id&&obs.observed_at&&Number.isFinite(obs.lat)&&Number.isFinite(obs.lon));
    assert.ok(['realtime','predicted','scheduled'].includes(obs.temporal_state));
  }
  // determinism: a second engine produces the identical sequence
  const pushed2=[];
  const engine2=createFixtureEngine({push:obs=>pushed2.push(obs),now,tickMs:6000});
  engine2.step(3);
  assert.deepEqual(pushed,pushed2);
  // realtime fixtures ride synthetic-but-explicit geometries
  const realtime=pushed.filter(o=>o.temporal_state==='realtime');
  assert.ok(realtime.length>0);
  for(const obs of realtime)assert.ok(Array.isArray(obs.verified_geometry)&&obs.verified_geometry.length>=2,'realtime fixture must declare its geometry');
});

test('ORDER075 GLM53 fixture realtime entities render as realtime in the store',()=>{
  const store=makeStore();
  const engine=createFixtureEngine({push:obs=>store.ingest(obs),now,tickMs:6000});
  engine.step(2);
  const entities=store.entities();
  assert.ok(entities.length>0);
  const realtime=entities.find(e=>e.observation.temporal_state==='realtime'&&e.observation.verified_geometry);
  assert.ok(realtime,'fixture must produce at least one realtime entity with geometry');
  const frame=store.displayFrame(realtime.id,{freshnessMs:25000});
  assert.equal(frame.render,true);
  assert.equal(frame.temporal_state,'realtime');
  assert.equal(frame.source_synthetic,true,'frame must disclose synthetic provenance');
});

test('ORDER075 GLM53 fixture entity goes stale when its stream stops (truthful transition)',()=>{
  const streamNow=()=>Date.parse('2026-09-26T12:00:00.000Z');
  const store=createTrackerStore({now:streamNow,presentTransportEntity});
  const engine=createFixtureEngine({push:obs=>store.ingest(obs),now:streamNow,tickMs:6000});
  engine.step(2);
  const entities=store.entities();
  const target=entities.find(e=>e.observation.temporal_state==='realtime');
  // 40 seconds pass without new observations
  const laterStore=createTrackerStore({now:()=>Date.parse('2026-09-26T12:00:40.000Z'),presentTransportEntity});
  laterStore.ingest(target.previous);
  laterStore.ingest(target.observation);
  const frame=laterStore.displayFrame(target.id);
  assert.equal(frame.render,false,'stale entity stops moving immediately');
  assert.equal(frame.reason,'stale_observation');
});

test('ORDER075 GLM53 entity registry is bounded',()=>{
  assert.equal(MAX_TRACKER_ENTITIES,16);
  const store=makeStore();
  for(let i=0;i<24;i++)store.ingest(realtimeObservation({id:`bus-${i}`,observed_at:'2026-09-26T11:59:52.000Z'}));
  assert.ok(store.entities().length<=MAX_TRACKER_ENTITIES,'loaded entity count must stay bounded');
});

test('ORDER075 GLM53 malformed observations are rejected without placeholders',()=>{
  const store=makeStore();
  const bad=[
    realtimeObservation({id:'',}),
    realtimeObservation({lat:NaN}),
    realtimeObservation({lat:91,lon:999}),
    realtimeObservation({observed_at:'not-a-date'}),
    null,
    42
  ];
  for(const raw of bad){
    const result=store.ingest(raw);
    assert.equal(result.accepted,false,'malformed observation must be rejected');
  }
  assert.equal(store.entities().length,0);
  assert.equal(normalizeObservation(undefined),null);
  const cls=classifyObservation(null,FIXED_NOW);
  assert.equal(cls.state,'unknown');
});

test('ORDER075 GLM53 predicted never animates and is never styled as live',()=>{
  const store=makeStore();
  store.ingest(realtimeObservation({id:'pred-1',temporal_state:'predicted',observed_at:'2026-09-26T11:59:55.000Z'}));
  store.ingest(realtimeObservation({id:'pred-1',temporal_state:'predicted',observed_at:'2026-09-26T11:59:56.000Z',lat:-31.6400,lon:-60.7000}));
  const frame=store.displayFrame('pred-1');
  assert.equal(frame.render,true);
  assert.equal(frame.temporal_state,'predicted');
  assert.equal(frame.animated,false,'predicted must not animate');
  const cls=classifyObservation(realtimeObservation({id:'pred-1',temporal_state:'predicted'}),FIXED_NOW);
  assert.equal(cls.state,'predicted');
  assert.equal(cls.movable,false);
});
