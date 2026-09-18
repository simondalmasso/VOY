import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTrainRadarSnapshot,
  createSarmientoScheduledAdapter,
  parseSarmientoScheduledService
} from '../src/worker.template.js';

const SOURCE_URL='https://www.argentina.gob.ar/noticias/el-servicio-diferencial-entre-once-haedo-moreno-de-la-linea-sarmiento-suma-servicios-los';
const OFFICIAL_HTML=`<html><body>
<article>
<h1>El servicio diferencial entre Once-Haedo-Moreno de la línea Sarmiento suma servicios los martes y jueves</h1>
<p>El diferencial entre Once-Haedo-Moreno circula los días hábiles. Desde la terminal porteña sale a las 18:35 con paradas por Haedo a las 19:21 y Moreno a las 19:56. En cambio, de Moreno parte a las 6:29 con arribo a Haedo a las 7:05 y llegada a Once a las 7:50.</p>
</article>
</body></html>`;

test('ORDER058 parser emits the minimal scheduled-service contract without invented realtime fields',()=>{
  const observedAt='2026-09-18T14:30:00.000Z';
  const observation=parseSarmientoScheduledService(OFFICIAL_HTML,observedAt);
  assert.equal(observation.source.url,SOURCE_URL);
  assert.equal(observation.source.authority,'Trenes Argentinos Operaciones / SOFSE');
  assert.equal(observation.observed_at,observedAt);
  assert.equal(observation.temporal_state,'scheduled');
  assert.equal(observation.line,'Sarmiento');
  assert.equal(observation.branch,'Once-Haedo-Moreno diferencial');
  assert.deepEqual(observation.service.stations,{
    Once:['18:35','07:50'],
    Haedo:['19:21','07:05'],
    Moreno:['19:56','06:29']
  });
  assert.equal('position' in observation,false);
  assert.equal('eta' in observation,false);
  assert.equal('delay' in observation,false);
});

test('ORDER058 parser fails closed when one required published station time is missing',()=>{
  const broken=OFFICIAL_HTML.replace('19:56','');
  assert.throws(()=>parseSarmientoScheduledService(broken,'2026-09-18T14:30:00.000Z'),/rail_source_contract_invalid/);
});

test('ORDER058 adapter is one-entry bounded, TTL cached and never serves stale data after refresh failure',async()=>{
  let now=Date.parse('2026-09-18T14:30:00.000Z');
  let calls=0;
  const fetchImpl=async()=>{
    calls++;
    if(calls>1) throw new Error('source down');
    return new Response(OFFICIAL_HTML,{status:200,headers:{'content-type':'text/html; charset=utf-8'}});
  };
  const adapter=createSarmientoScheduledAdapter({fetchImpl,now:()=>now,ttlMs:300000,timeoutMs:1000});
  const first=await adapter.read();
  assert.equal(first.available,true);
  assert.equal(first.cache_hit,false);
  assert.equal(first.observation.temporal_state,'scheduled');
  const cached=await adapter.read();
  assert.equal(cached.available,true);
  assert.equal(cached.cache_hit,true);
  assert.equal(calls,1);
  now+=300001;
  const staleRefresh=await adapter.read();
  assert.equal(staleRefresh.available,false);
  assert.equal(staleRefresh.reason,'source_unavailable');
  assert.equal(staleRefresh.observation,null);
  assert.equal(calls,2);
});

test('ORDER058 adapter isolates a source outage without fabricating a service observation',async()=>{
  const adapter=createSarmientoScheduledAdapter({
    fetchImpl:async()=>{throw new Error('network down')},
    now:()=>Date.parse('2026-09-18T14:30:00.000Z'),
    ttlMs:300000,
    timeoutMs:1000
  });
  const result=await adapter.read();
  assert.deepEqual(result,{available:false,reason:'source_unavailable',observation:null,cache_hit:false});
});

test('ORDER058 nearby snapshot stays bounded and joins real scheduled service to Once',()=>{
  const observedAt='2026-09-18T14:30:00.000Z';
  const observation=parseSarmientoScheduledService(OFFICIAL_HTML,observedAt);
  const snapshot=buildTrainRadarSnapshot({
    coordinates:{lat:-34.60828,lon:-58.40752},
    providerResult:{available:true,reason:null,observation,cache_hit:false},
    nowMs:Date.parse('2026-09-18T14:31:00.000Z')
  });
  assert.equal(snapshot.source_status,'available');
  assert.ok(snapshot.stations.length>=1 && snapshot.stations.length<=3);
  const once=snapshot.stations.find(item=>item.station.name==='Once');
  assert.ok(once);
  assert.equal(once.temporal_state,'scheduled');
  assert.equal(once.line,'Sarmiento');
  assert.equal(once.branch,'Once-Haedo-Moreno diferencial');
  assert.deepEqual(once.service.scheduled_times,['18:35','07:50']);
  assert.ok(once.station.distance_meters<100);
  assert.ok(Number.isFinite(once.station.coordinates.lat));
  assert.ok(Number.isFinite(once.station.coordinates.lon));
});

test('ORDER058 stale observation degrades service temporal state to unknown',()=>{
  const observation=parseSarmientoScheduledService(OFFICIAL_HTML,'2026-09-18T14:00:00.000Z');
  const snapshot=buildTrainRadarSnapshot({
    coordinates:{lat:-34.60828,lon:-58.40752},
    providerResult:{available:true,reason:null,observation,cache_hit:false},
    nowMs:Date.parse('2026-09-18T14:06:00.001Z'),
    freshnessMs:300000
  });
  assert.equal(snapshot.source_status,'stale');
  const once=snapshot.stations.find(item=>item.station.name==='Once');
  assert.ok(once);
  assert.equal(once.temporal_state,'unknown');
  assert.equal(once.service,null);
});

test('ORDER058 nearby endpoint keeps station geometry but fails service closed when official source is down',async()=>{
  const handler=(await import('../src/worker.template.js')).createRequestHandler({
    trainServiceAdapter:{read:async()=>({available:false,reason:'source_unavailable',observation:null,cache_hit:false})}
  });
  const response=await handler(new Request('http://local/api/radar/trains/nearby',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({coordinates:{lat:-34.60828,lon:-58.40752}})
  }),{});
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.ok,true);
  assert.equal(body.radar.source_status,'unavailable');
  assert.ok(body.radar.stations.length>=1);
  assert.ok(body.radar.stations.every(item=>item.temporal_state==='unknown'&&item.service===null));
});


test('ORDER058 UI exposes a map-first train radar region and incremental station markers',async()=>{
  const {readFile}=await import('node:fs/promises');
  const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
  const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(html,/id="train-radar"/);
  assert.match(html,/id="train-radar-list"/);
  assert.match(app,/\/api\/radar\/trains\/nearby/);
  assert.match(app,/function refreshTrainRadar/);
  assert.match(app,/function updateTrainStationMarkers/);
});

test('ORDER058 origin acquisition actually refreshes the train radar and map center',async()=>{
  const {readFile}=await import('node:fs/promises');
  const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  assert.ok((app.match(/await refreshTrainRadar\(\)/g)||[]).length>=2);
  assert.match(app,/state\.mapCenter=\{lat:Number\(coords\.lat\),lon:Number\(coords\.lon\)\}/);
});

test('ORDER058 clearing origin also clears the train radar',async()=>{
  const {readFile}=await import('node:fs/promises');
  const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(app,/#clear-location[^\n]+clearTrainRadar\(\)/);
});
