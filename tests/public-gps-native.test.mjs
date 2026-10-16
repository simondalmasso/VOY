import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
 createRequestHandler, sfGpsSource, normalizeSfGpsVehicles, readSantaFeGps
} from '../src/worker.template.js';

// Approved-source env fixture. FEED_URL is the API BASE root (no path, no query);
// the adapter appends /v0/stops/{x_stop_code}/arrivals?source=poll itself.
const source=(tag='a')=>({
 VOY_SF_GPS_REUSE_APPROVED:'YES',
 VOY_SF_GPS_FEED_URL:'https://licensed.example.org',
 VOY_SF_GPS_APPROVED_HOST:'licensed.example.org',
 VOY_SF_GPS_SOURCE_ID:'sf_gps_approved_'+tag,
 VOY_SF_GPS_LICENSE_URL:'https://licensed.example.org/terms'
});
// Base-root fixture (the form the maintainer actually configures).
const baseSource=(tag='base')=>({
 VOY_SF_GPS_REUSE_APPROVED:'YES',
 VOY_SF_GPS_FEED_URL:'https://licensed.example.org',
 VOY_SF_GPS_APPROVED_HOST:'licensed.example.org',
 VOY_SF_GPS_SOURCE_ID:'sf_gps_approved_'+tag,
 VOY_SF_GPS_LICENSE_URL:'https://licensed.example.org/terms'
});
// Real Cuándo Pasa arrivals payload shape (sanitized fixture of the observed schema).
// offsetMs is the fixture's GPS age in milliseconds relative to `now`.
function artTimestamp(now,offsetMs=0){
 const t=new Date(now+offsetMs-3*3600*1000); // UTC -> ART (UTC-3)
 const p=n=>String(n).padStart(2,'0');
 return `${p(t.getUTCDate())}/${p(t.getUTCMonth()+1)}/${t.getUTCFullYear()} ${p(t.getUTCHours())}:${p(t.getUTCMinutes())}:${p(t.getUTCSeconds())}`;
}
const arribo=(coche,now,offsetMs=0,lineCode='75',lineName='9')=>({
 DescripcionLinea:lineName,DescripcionBandera:'AL POZO',Arribo:'5 min. aprox.',
 Latitud:'-31.65061',Longitud:'-60.713207',LatitudParada:'-31.647121',LongitudParada:'-60.700868',
 DescripcionCortaBandera:'AL POZO',DescripcionCartelBandera:'AL POZO',EsAdaptado:'True',
 IdentificadorCoche:coche,IdentificadorChofer:'TESTDRIVER (40000)',DesvioHorario:'-02:21',
 UltimaFechaHoraGPS:artTimestamp(now,offsetMs),MensajeError:'',CodigoLineaParada:lineCode
});
const arrivalsPayload=(arribos,estado=0,mensaje='ok')=>({CodigoEstado:estado,MensajeEstado:mensaje,arribos});

test('native GPS defaults disabled: zero unapproved fetches, no-store response',async()=>{
 let called=0;
 const handler=createRequestHandler({upstreamFetch:async()=>{called++;throw Error('must not fetch')}});
 const response=await handler(new Request('https://voy.example/api/transit/santa-fe/vehicles'));
 assert.equal(response.status,200);
 assert.equal(response.headers.get('cache-control'),'no-store');
 assert.deepEqual(await response.json(),{ok:true,status:'not_integrated',source_id:null,observations:[]});
 assert.equal(called,0);
});
test('source needs explicit approval, pinned HTTPS host, license, root path, no credentials/query',()=>{
 assert.equal(sfGpsSource({...baseSource('0'),VOY_SF_GPS_REUSE_APPROVED:'NO'}),null);
 assert.equal(sfGpsSource({...baseSource('1'),VOY_SF_GPS_FEED_URL:'http://licensed.example.org'}),null);
 assert.equal(sfGpsSource({...baseSource('2'),VOY_SF_GPS_FEED_URL:'https://evil.example.org'}),null);
 assert.equal(sfGpsSource({...baseSource('3'),VOY_SF_GPS_LICENSE_URL:''}),null);
 assert.equal(sfGpsSource({...baseSource('4'),VOY_SF_GPS_FEED_URL:'https://licensed.example.org/vehicles?key=secret'}),null);
 assert.ok(sfGpsSource(baseSource('5')));
 assert.equal(sfGpsSource({...baseSource('6'),VOY_SF_GPS_FEED_URL:'https://licensed.example.org/api/path'}),null);
});
test('fresh approved positions normalize within Santa Fe, reject stale/future/invalid/out of bounds',()=>{
 const now=Date.now();
 const good=normalizeSfGpsVehicles(arrivalsPayload([
  arribo('3228',now,-5000),
  arribo('4120',now,-2000),
  arribo('stale',now,-95000),
  arribo('future',now,+9000),
  {...arribo('fake',now,-3000),Latitud:'-34.5'},
  {...arribo('badlat',now,-3000),Latitud:''},
  {...arribo('badid',now,-3000),IdentificadorCoche:'bad id'},
  {...arribo('badtime',now,-3000),UltimaFechaHoraGPS:'not a date'}
 ]),'sf_gps_test',now);
 assert.equal(good.length,2);
 assert.equal(good[0].id,'sf_gps_test:75-3228');
 assert.equal(good[0].temporal_state,'realtime');
 assert.equal(good[0].route_id,'SF09');
 assert.equal(good[0].line,'9');
 assert.equal(good[0].trip_id,'AL POZO');
 assert.equal(good[0].delay_seconds,-141);
 assert.equal(Date.parse(good[0].observed_at),Math.floor((now-5000)/1000)*1000);
 // No driver identity may cross the boundary.
 assert.equal(good[0].IdentificadorChofer,undefined);
 assert.equal(JSON.stringify(good[0]).includes('TESTDRIVER'),false);
});
test('estado gate: non-ok MensajeEstado and non-zero CodigoEstado yield no observations, unknown schema fails closed',()=>{
 const now=Date.now();
 assert.deepEqual(normalizeSfGpsVehicles(arrivalsPayload([arribo('1',now,-1000)],1,'error'),'sf_gps_test',now),[]);
 assert.deepEqual(normalizeSfGpsVehicles(arrivalsPayload([arribo('1',now,-1000)],0,'Sin datos disponibles para esta parada'),'sf_gps_test',now),[]);
 assert.equal(normalizeSfGpsVehicles([],'sf_gps_test',now),null);
 assert.equal(normalizeSfGpsVehicles({foo:[]},'sf_gps_test',now),null);
 assert.equal(normalizeSfGpsVehicles({arribos:new Array(257)},'sf_gps_test',now),null);
});
test('approved source maps strictly typed fresh payload; feed failure does not manufacture vehicles',async()=>{
 const now=Date.now(),env=baseSource('6');
 const answer=await readSantaFeGps(env,async()=>{
  return new Response(JSON.stringify(arrivalsPayload([arribo('12',now,-3000)])),{
   status:200,headers:{'Content-Type':'application/json'}});
 },now);
 assert.equal(answer.status,'live');
 assert.ok(answer.observations.length>=1);
 const observed=answer.observations.find(o=>o.id==='sf_gps_approved_6:75-12');
 assert.ok(observed);
 assert.equal(observed.lat,-31.65061);
 assert.equal(answer.stops_answered,answer.stops_queried);
 const failure=await readSantaFeGps(baseSource('7'),async()=>new Response('<html>proxy error</html>',{
  status:200,headers:{'Content-Type':'text/html'}
 }),Date.now());
 assert.equal(failure.status,'source_unavailable');
 assert.deepEqual(failure.observations,[]);
});
test('ART timestamp parsing converts America/Argentina/Santa_Fe (UTC-3, no DST) to ISO UTC',async()=>{
 const {parseCuandopasaArtTimestamp}=await import('../src/worker.template.js');
 assert.equal(parseCuandopasaArtTimestamp('16/10/2026 17:33:49'),Date.UTC(2026,9,16,20,33,49));
 assert.equal(parseCuandopasaArtTimestamp('01/01/2026 00:00:00'),Date.UTC(2026,0,1,3,0,0));
 assert.equal(parseCuandopasaArtTimestamp(''),null);
 assert.equal(parseCuandopasaArtTimestamp('2026-10-16T17:33:49Z'),null);
});
test('desvio parsing: signed HH:MM to seconds',async()=>{
 const {parseCuandopasaDesvio}=await import('../src/worker.template.js');
 assert.equal(parseCuandopasaDesvio('-02:21'),-141);
 assert.equal(parseCuandopasaDesvio('+00:05'),5);
 assert.equal(parseCuandopasaDesvio(''),null);
 assert.equal(parseCuandopasaDesvio('02:21'),null);
});
test('native GPS only ever uses VOY same-origin readback, retains no-coverage state when unconfigured',async()=>{
 const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
 assert.match(app,/fetch\(gpsUrl/);
 assert.match(app,/\/api\/transit\/santa-fe\/vehicles\?line=/);
 assert.match(app,/payload\?\.status==='not_integrated'/);
 assert.match(app,/sfGpsEnabled=false/);
 assert.match(app,/state\.gpsStatus==='live'/);
 assert.doesNotMatch(app,/fetch\(['"]https:\/\/api\.cuandopasa/);
});
test('a single approved GPS observation renders its exact measured coordinate until another fix exists',async()=>{
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
 // Stale beyond the evidence-based 90 s window stops rendering.
 const expired=createTrackerStore({now:()=>now+95000});
 expired.ingest(obs);
 assert.equal(expired.displayFrame(obs.id).render,false);
 // But a 60 s old observation (real source cadence) still renders truthfully.
 const realistic=createTrackerStore({now:()=>now});
 realistic.ingest({...obs,observed_at:new Date(now-60000).toISOString()});
 assert.equal(realistic.displayFrame(obs.id).render,true);
});
test('legacy realtime without verified geometry stays blocked from inferred motion',async()=>{
 const {createTrackerStore}=await import('../public/tracker/store.js');
 const now=Date.now(),store=createTrackerStore({now:()=>now});
 const obs={id:'legacy_vehicle_1',source_id:'legacy',temporal_state:'realtime',
  observed_at:new Date(now-2500).toISOString(),lat:-31.6345,lon:-60.7012};
 store.ingest(obs);store.ingest({...obs,observed_at:new Date(now-1500).toISOString()});
 assert.equal(store.displayFrame(obs.id).render,false);
});
test('Worker endpoint serves licensed fresh GPS observations only with an explicitly configured source',async()=>{
 const now=Date.now(),env=baseSource('integration1');
 let count=0;
 const handler=createRequestHandler({upstreamFetch:async url=>{
  count++;
  assert.match(url,new RegExp('^https://licensed\\.example\\.org/v0/stops/\\d+/arrivals\\?source=poll$'));
  return new Response(JSON.stringify(arrivalsPayload([arribo('bus-21',now,-1200)])),{
   status:200,headers:{'content-type':'application/json'}});
 }});
 const response=await handler(new Request('https://voy.example/api/transit/santa-fe/vehicles'),env);
 const payload=await response.json();
 assert.equal(response.status,200);
 assert.equal(payload.status,'live');
 assert.equal(payload.observations[0].observed_position_only,true);
 assert.equal(payload.observations[0].lat,-31.65061);
 assert.ok(payload.observations.length>=1);
 assert.ok(count>=1&&count<=24);
 assert.ok(typeof payload.retrieved_at==='string');
});
test('Worker endpoint line filter narrows polling to that line\'s stops and filters arrivals by line code',async()=>{
 const now=Date.now(),env=baseSource('integration2');
 const queried=[];
 const handler=createRequestHandler({upstreamFetch:async url=>{
  queried.push(String(url));
  // Return buses of line 9 (code 75) and a foreign line (code 70); filter must drop code 70.
  return new Response(JSON.stringify(arrivalsPayload([
   arribo('9001',now,-4000,'75','9'),
   arribo('1001',now,-4000,'70','1')
  ])),{status:200,headers:{'content-type':'application/json'}});
 }});
 const response=await handler(new Request('https://voy.example/api/transit/santa-fe/vehicles?line=9'),env);
 const payload=await response.json();
 assert.equal(payload.status,'live');
 assert.ok(queried.length>=1&&queried.length<=12);
 assert.ok(queried.every(url=>url.startsWith('https://licensed.example.org/v0/stops/')));
 assert.ok(payload.observations.every(o=>o.line==='9'&&o.route_id==='SF09'));
 assert.ok(!payload.observations.some(o=>o.id.includes(':70-')));
 // Unknown line fails closed without manufacturing anything.
 const unknown=await handler(new Request('https://voy.example/api/transit/santa-fe/vehicles?line=zzzz'),env);
 const unknownPayload=await unknown.json();
 assert.equal(unknownPayload.status,'source_unavailable');
 assert.equal(unknownPayload.reason,'unknown_line');
 assert.deepEqual(unknownPayload.observations,[]);
});
test('browser never hardcodes the upstream host and keeps the truth budgets in code review',async()=>{
 const worker=await readFile(new URL('../src/worker.template.js',import.meta.url),'utf8');
 assert.match(worker,/v0\/stops\/'\+encodeURIComponent\(code\)\+'\/arrivals\?source=poll/);
 assert.doesNotMatch(worker,/api\.cuandopasa\.(app|com\.ar)/);
 const observations=await readFile(new URL('../public/tracker/observations.js',import.meta.url),'utf8');
 assert.match(observations,/REALTIME_FRESHNESS_MS = 90000/);
});
