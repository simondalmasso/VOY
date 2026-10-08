import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
 createRequestHandler, sfGpsSource, normalizeSfGpsVehicles, readSantaFeGps
} from '../src/worker.template.js';

const source=(tag='a')=>({
 VOY_SF_GPS_REUSE_APPROVED:'YES',
 VOY_SF_GPS_FEED_URL:'https://licensed.example.org/vehicles-'+tag,
 VOY_SF_GPS_APPROVED_HOST:'licensed.example.org',
 VOY_SF_GPS_SOURCE_ID:'sf_gps_approved_'+tag,
 VOY_SF_GPS_LICENSE_URL:'https://licensed.example.org/terms'
});
const observation=(id,when=Date.now())=>({
 id,lat:-31.6345,lon:-60.7012,observed_at:new Date(when).toISOString(),
 route_id:'line_3',line:'3'
});
test('native GPS defaults disabled: zero unapproved fetches, no-store response',async()=>{
 let called=0;
 const handler=createRequestHandler({upstreamFetch:async()=>{called++;throw Error('must not fetch')}});
 const response=await handler(new Request('https://voy.example/api/transit/santa-fe/vehicles'));
 assert.equal(response.status,200);
 assert.equal(response.headers.get('cache-control'),'no-store');
 assert.deepEqual(await response.json(),{ok:true,status:'not_integrated',source_id:null,observations:[]});
 assert.equal(called,0);
});
test('source needs explicit approval, pinned HTTPS host, license and no URL credentials/query',()=>{
 assert.equal(sfGpsSource({...source('0'),VOY_SF_GPS_REUSE_APPROVED:'NO'}),null);
 assert.equal(sfGpsSource({...source('1'),VOY_SF_GPS_FEED_URL:'http://licensed.example.org/vehicles'}),null);
 assert.equal(sfGpsSource({...source('2'),VOY_SF_GPS_FEED_URL:'https://evil.example/vehicles'}),null);
 assert.equal(sfGpsSource({...source('3'),VOY_SF_GPS_LICENSE_URL:''}),null);
 assert.equal(sfGpsSource({...source('4'),VOY_SF_GPS_FEED_URL:'https://licensed.example.org/vehicles?key=secret'}),null);
 assert.ok(sfGpsSource(source('5')));
});
test('fresh approved positions normalize within Santa Fe, reject duplicates/future/stale/invalid/out of bounds',()=>{
 const now=Date.now();
 const good=normalizeSfGpsVehicles({vehicles:[
 observation('42',now-5000),
 observation('42',now-2000),
 observation('stale',now-21000),
 observation('future',now+9000),
 {...observation('fake'),lat:-34.5},
 {...observation('bad'),lat:'-31.6'},
 {...observation('badid'),id:'bad id'}
 ]},'sf_gps_test',now);
 assert.equal(good.length,1);
 assert.equal(good[0].id,'sf_gps_test:42');
 assert.equal(good[0].temporal_state,'realtime');
 assert.equal(good[0].line,'3');
 assert.equal(good[0].source_id,'sf_gps_test');
});
test('approved source maps strictly typed fresh payload; feed failure does not manufacture vehicles',async()=>{
 const now=Date.now(),env=source('6');
 const answer=await readSantaFeGps(env,async(url)=>new Response(JSON.stringify({
  vehicles:[observation('12',now-3000)]}),{
  status:200,headers:{'Content-Type':'application/json'}
 }),now);
 assert.equal(answer.status,'live');
 assert.equal(answer.observations.length,1);
 const failure=await readSantaFeGps(source('7'),async()=>new Response('<html>proxy error</html>',{
  status:200,headers:{'Content-Type':'text/html'}
 }),now);
 assert.equal(failure.status,'source_unavailable');
 assert.deepEqual(failure.observations,[]);
});
test('schema fail closed including oversized or unknown payloads',()=>{
 assert.equal(normalizeSfGpsVehicles([], 'sf_gps_test'),null);
 assert.equal(normalizeSfGpsVehicles({foo:[]},'sf_gps_test'),null);
 assert.equal(normalizeSfGpsVehicles({vehicles:new Array(257)},'sf_gps_test'),null);
});
test('native GPS only ever uses VOY same-origin readback, retains no-coverage state when unconfigured',async()=>{
 const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
 assert.match(app,/fetch\('\/api\/transit\/santa-fe\/vehicles'/);
 assert.match(app,/payload\?\.status==='not_integrated'/);
 assert.match(app,/sfGpsEnabled=false/);
 assert.match(app,/state\.gpsStatus==='live'/);
 assert.doesNotMatch(app,/fetch\(['"]https:\/\/api\.cuandopasa/);
});

test('an approved GPS observation renders a static measured dot without route geometry, never animation',async()=>{
 const {createTrackerStore}=await import('../public/tracker/store.js');
 const now=Date.now(),store=createTrackerStore({now:()=>now});
 const obs={id:'sf_gps_test:42',source_id:'sf_gps_test',temporal_state:'realtime',
  observed_at:new Date(now-6000).toISOString(),lat:-31.6345,lon:-60.7012,
  observed_position_only:true,line:'3'};
 assert.equal(store.ingest(obs).accepted,true);
 const frame=store.displayFrame(obs.id);
 assert.equal(frame.render,true);
 assert.equal(frame.animated,false);
 assert.deepEqual(frame.position,{lat:obs.lat,lon:obs.lon});
 const expired=createTrackerStore({now:()=>now+30000});
 expired.ingest(obs);
 assert.equal(expired.displayFrame(obs.id).render,false);
});
test('legacy realtime without verified geometry stays blocked from inferred motion',async()=>{
 const {createTrackerStore}=await import('../public/tracker/store.js');
 const now=Date.now(),store=createTrackerStore({now:()=>now});
 const obs={id:'legacy_vehicle_1',source_id:'legacy',temporal_state:'realtime',
  observed_at:new Date(now-2500).toISOString(),lat:-31.6345,lon:-60.7012};
 store.ingest(obs);store.ingest({...obs,observed_at:new Date(now-1500).toISOString()});
 assert.equal(store.displayFrame(obs.id).render,false);
});

test('Worker endpoint can serve licensed fresh GPS observations only with explicit configured source',async()=>{
 const now=Date.now(),env=source('integration1');
 let count=0;
 const handler=createRequestHandler({upstreamFetch:async url=>{
  count++;assert.equal(url,env.VOY_SF_GPS_FEED_URL);
  return new Response(JSON.stringify({vehicles:[observation('bus-21',now-1200)]}),{
   status:200,headers:{'content-type':'application/json'}});
 }});
 const response=await handler(new Request('https://voy.example/api/transit/santa-fe/vehicles'),env);
 const payload=await response.json();
 assert.equal(response.status,200);
 assert.equal(payload.status,'live');
 assert.equal(payload.observations[0].observed_position_only,true);
 assert.equal(payload.observations[0].lat,-31.6345);
 assert.equal(payload.observations.length,1);
 assert.equal(count,1);
});
