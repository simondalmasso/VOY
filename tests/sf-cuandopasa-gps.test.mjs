import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
 createRequestHandler, readSantaFeGps, sfGpsLineScope, strideSample,
 dedupeNewestSfGpsObservations, normalizeSfGpsVehicles
} from '../src/worker.template.js';

// Evidence-backed integration suite for the Cuándo Pasa Santa Fe GPS adapter.
// Focus: multi-stop aggregation, line filtering, partial failures, privacy,
// cache semantics and bounded polling — all with a mocked upstream.

const env=(tag)=>({
 VOY_SF_GPS_REUSE_APPROVED:'YES',
 VOY_SF_GPS_FEED_URL:'https://licensed.example.org',
 VOY_SF_GPS_APPROVED_HOST:'licensed.example.org',
 VOY_SF_GPS_SOURCE_ID:'sf_gps_'+tag,
 VOY_SF_GPS_LICENSE_URL:'https://licensed.example.org/terms'
});
const p=n=>String(n).padStart(2,'0');
const art=(epochMs)=>{const t=new Date(epochMs-3*3600*1000);return `${p(t.getUTCDate())}/${p(t.getUTCMonth()+1)}/${t.getUTCFullYear()} ${p(t.getUTCHours())}:${p(t.getUTCMinutes())}:${p(t.getUTCSeconds())}`};
const arribo=(coche,epochObserved,lineCode='75',lineName='9',lat='-31.65061',lon='-60.713207')=>({
 DescripcionLinea:lineName,DescripcionBandera:'AL POZO',Arribo:'5 min. aprox.',
 Latitud:lat,Longitud:lon,IdentificadorCoche:coche,IdentificadorChofer:'DRIVER (1)',
 DesvioHorario:'+00:05',UltimaFechaHoraGPS:art(epochObserved),CodigoLineaParada:lineCode
});
const payload=(arribos)=>({CodigoEstado:0,MensajeEstado:'ok',arribos});
const jsonResponse=(body,extraHeaders={})=>new Response(JSON.stringify(body),{
 status:200,headers:{'content-type':'application/json','x-cache-source':'fresh',
 'x-data-fetched-at':new Date().toISOString(),...extraHeaders}});

test('cross-stop dedupe keeps the newest GPS fix per vehicle id',()=>{
 const now=Date.now();
 const raw=[
  {id:'s:75-3228',source_id:'s',lat:-31.65,lon:-60.71,temporal_state:'realtime',observed_at:new Date(now-80000).toISOString()},
  {id:'s:75-3228',source_id:'s',lat:-31.648,lon:-60.711,temporal_state:'realtime',observed_at:new Date(now-40000).toISOString()},
  {id:'s:75-4120',source_id:'s',lat:-31.632,lon:-60.719,temporal_state:'realtime',observed_at:new Date(now-50000).toISOString()}
 ];
 const deduped=dedupeNewestSfGpsObservations(raw);
 assert.equal(deduped.length,2);
 assert.equal(deduped[0].id,'s:75-3228');
 assert.equal(Date.parse(deduped[0].observed_at),now-40000);
 assert.equal(deduped[1].id,'s:75-4120');
});
test('stride sample is bounded, deterministic and preserves order',()=>{
 const codes=Array.from({length:154},(_,i)=>String(1000+i));
 const a=strideSample(codes,12),b=strideSample(codes,12);
 assert.equal(a.length,12);
 assert.deepEqual(a,b);
 assert.deepEqual(strideSample(['1','2','3'],12),['1','2','3']);
});
test('line scope maps picker short names to routes, line codes and bounded stop codes',()=>{
 const line9=sfGpsLineScope('9');
 assert.equal(line9.routes.length,1);
 assert.equal(line9.routes[0].id,'SF09');
 assert.ok(line9.lineCodes.has('75'));
 assert.ok(line9.codes.length<=12);
 assert.ok(line9.codes.length>=1);
 assert.ok(line9.codes.every(code=>/^\d+$/.test(code)));
 // Shared short name across interurban routes resolves to all of them.
 const c=sfGpsLineScope('C');
 assert.ok(c.routes.length>1);
 assert.ok(c.routes.every(r=>r.id.startsWith('IU')));
 assert.equal(sfGpsLineScope('zzzz'),null);
 assert.equal(sfGpsLineScope('9; DROP TABLE'),null);
});
test('multi-stop aggregation dedupes the same bus seen from several stops',async()=>{
 const now=Date.now();
 let calls=0;
 const answer=await readSantaFeGps(env('multistop'),async()=>{
  calls++;
  // The same bus 3228 is approaching every sampled stop of line 9 (older fix),
  // plus stop-specific bus 4120 with a fresh fix.
  return jsonResponse(payload([arribo('3228',now-60000),arribo('4120',now-20000)]));
 },now,'9');
 assert.equal(answer.status,'live');
 assert.ok(calls<=12);
 const bus3228=answer.observations.find(o=>o.id.endsWith('75-3228'));
 const bus4120=answer.observations.find(o=>o.id.endsWith('75-4120'));
 assert.ok(bus3228&&bus4120,'both distinct vehicles survive dedupe');
 assert.equal(answer.observations.filter(o=>o.id.endsWith('75-3228')).length,1);
 assert.equal(Date.parse(bus3228.observed_at),Math.floor((now-60000)/1000)*1000);
 assert.equal(bus3228.route_id,'SF09');
 assert.equal(bus3220_sanity(answer),'sf_gps_multistop');
});
function bus3220_sanity(answer){return answer.source_id}
test('partial stop failures still deliver live partial truth; total failure is source_unavailable',async()=>{
 const now=Date.now();
 let calls=0;
 const partial=await readSantaFeGps(env('partial'),async()=>{
  calls++;
  if(calls%2===0)return new Response('gateway timeout',{status:504,headers:{'content-type':'text/plain'}});
  return jsonResponse(payload([arribo('9001',now-10000)]));
 },now,'9');
 assert.equal(partial.status,'live');
 assert.ok(partial.stops_answered<partial.stops_queried);
 assert.equal(partial.observations.length,1);
 const total=await readSantaFeGps(env('totalfail'),async()=>new Response('nope',{status:500,headers:{'content-type':'text/plain'}}),Date.now(),'9');
 assert.equal(total.status,'source_unavailable');
 assert.deepEqual(total.observations,[]);
 // All stops OK but every observation stale -> no_current_positions, not error.
 const emptyish=await readSantaFeGps(env('nostale'),async()=>jsonResponse(payload([arribo('9002',now-3600000)])),now,'9');
 assert.equal(emptyish.status,'no_current_positions');
 assert.deepEqual(emptyish.observations,[]);
});
test('upstream cache metadata is surfaced as retrieved_at, not used to rewrite GPS time',async()=>{
 const now=Date.now();
 const fetchedAt='2026-10-16T20:30:00.000Z';
 const answer=await readSantaFeGps(env('meta'),async()=>jsonResponse(
  payload([arribo('7001',now-30000)]),{'x-cache-source':'cache','x-data-fetched-at':fetchedAt}),now,'9');
 assert.equal(answer.retrieved_at,fetchedAt);
 // observed_at must remain the source GPS fix, never the proxy fetch time.
 const obs=answer.observations[0];
 assert.equal(Date.parse(obs.observed_at),Math.floor((now-30000)/1000)*1000);
});
test('worker never sends credentials or cookies upstream and builds only the documented path',async()=>{
 const now=Date.now();
 const seen=[];
 await readSantaFeGps(env('urlshape'),async(url,init)=>{
  seen.push({url:String(url),init});
  return jsonResponse(payload([arribo('8001',now-5000)]));
 },now,'9');
 assert.ok(seen.length>=1);
 for(const {url,init} of seen){
  assert.match(url,/^https:\/\/licensed\.example\.org\/v0\/stops\/\d+\/arrivals\?source=poll$/);
  assert.equal(init.redirect,'error');
  assert.ok(init.signal);
  assert.equal(init.headers.accept,'application/json');
  assert.equal(Object.keys(init.headers).length,1);
 }
});
test('response caps at 16 vehicles sorted freshest first',async()=>{
 const now=Date.now();
 const arribos=Array.from({length:40},(_,i)=>arribo(String(5000+i),now-(i+1)*1000));
 const answer=await readSantaFeGps(env('cap'),async()=>jsonResponse(payload(arribos)),now,'9');
 assert.equal(answer.observations.length,16);
 for(let i=1;i<answer.observations.length;i+=1)
  assert.ok(Date.parse(answer.observations[i-1].observed_at)>=Date.parse(answer.observations[i].observed_at));
});
test('5 s isolate cache dedupes burst polls without rewriting status',async()=>{
 const now=Date.now();
 let calls=0;
 const fetchImpl=async()=>{calls++;return jsonResponse(payload([arribo('6001',now-10000)]))};
 const first=await readSantaFeGps(env('cachettl'),fetchImpl,now,'9');
 const second=await readSantaFeGps(env('cachettl'),fetchImpl,now+2000,'9');
 assert.equal(first.status,'live');
 assert.equal(second.status,'live');
 assert.equal(calls<=12,true,'second hit within TTL must not refetch all stops');
 const burstCalls=calls;
 const third=await readSantaFeGps(env('cachettl'),fetchImpl,now+6000,'9');
 assert.ok(calls>burstCalls,'after TTL expiry polling resumes');
});
test('handler exposes line-filtered live data same-origin only, GET only',async()=>{
 const now=Date.now();
 const handler=createRequestHandler({upstreamFetch:async()=>jsonResponse(payload([arribo('7100',now-8000)]))});
 const post=await handler(new Request('https://voy.example/api/transit/santa-fe/vehicles',{method:'POST'}),env('httpmethods'));
 assert.equal(post.status,405);
 const get=await handler(new Request('https://voy.example/api/transit/santa-fe/vehicles?line=9'),env('httpmethods2'));
 assert.equal(get.status,200);
 assert.equal(get.headers.get('cache-control'),'no-store');
 const body=await get.json();
 assert.equal(body.status,'live');
 assert.ok(body.observations.length>=1);
});
test('normalizer drops driver identity and never emits it downstream',()=>{
 const now=Date.now();
 const obs=normalizeSfGpsVehicles(payload([arribo('9999',now-2000)]),'sf_gps_priv',now);
 assert.equal(obs.length,1);
 const serialized=JSON.stringify(obs[0]);
 assert.ok(!serialized.includes('IdentificadorChofer'));
 assert.ok(!serialized.includes('DRIVER'));
 assert.ok(!serialized.includes('DesvioHorario'));
});


test('line-first GPS UX has no all-lines option and persists only an explicit selected line', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /option[^>]*value=["']{0}["'][^>]*>\s*Todas las líneas/i);
  assert.match(html, /Seleccioná una línea/);
  assert.match(app, /localStorage\.setItem\(['"]voy\.sf\.line['"]/);
  assert.match(app, /!String\(busLinePicker\.value\|\|['"]['"]\)\.trim\(\)/);
  assert.match(app, /const gpsUrl='\/api\/transit\/santa-fe\/vehicles\?line='/);
  assert.match(app, /localStorage\.getItem\(['"]voy\.sf\.line['"]/);
  assert.match(css, /max-width:170px/);
});
