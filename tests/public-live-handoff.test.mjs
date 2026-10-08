import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=async name=>readFile(new URL('../'+name,import.meta.url),'utf8');

test('public landing offers directly discoverable explicitly external live Santa Fe bus service',async()=>{
 const html=await read('public/index.html');
 assert.match(html,/<a[^>]*id="bus-live-external"[^>]*href="https:\/\/cuandopasa\.app\/"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
 assert.match(html,/Colectivos en vivo · app externa/);
 assert.match(html,/VOY no recibe posiciones GPS/);
});
test('live external handoff has keyboard/mobile target size without erasing map-first',async()=>{
 const css=await read('public/styles.css');
 assert.match(css,/\.live-source-link\{[^}]*min-height:44px/);
 assert.match(css,/--sheet-collapsed-max:min\(176px,30svh\)/);
});
test('app exposes source external without presenting its vehicles as VOY realtime',async()=>{
 const app=await read('public/app.js');
 assert.match(app,/const EXTERNAL_BUS_LIVE_URL='https:\/\/cuandopasa\.app\/'/);
 assert.match(app,/Recorridos publicados: visibles en el mapa · Arribos en VOY: no integrados/);
 assert.match(app,/Consultar posiciones · Cuándo Pasa \(externo\)/);
 const worker=await read('src/worker.template.js');
 assert.match(worker,/realtime_state: "not_integrated"/);
 assert.doesNotMatch(app,/fetch\(['"]https:\/\/cuandopasa\.app\//);
});
