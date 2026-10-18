import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=async name=>readFile(new URL('../'+name,import.meta.url),'utf8');

test('public UI does not send riders to an external live-bus application',async()=>{
 const html=await read('public/index.html');
 const app=await read('public/app.js');
 const css=await read('public/styles.css');
 assert.doesNotMatch(html,/bus-live-external|cuandopasa\.app|Colectivos en vivo · app externa/i);
 assert.doesNotMatch(html,/VOY no recibe posiciones GPS de esa app/);
 assert.doesNotMatch(app,/EXTERNAL_BUS_LIVE_URL|cuandopasa\.app|Consultar posiciones · Cuándo Pasa \(externo\)/);
 assert.doesNotMatch(css,/\.live-source-link/);
});

test('bus card keeps route map and does not overclaim current arrivals',async()=>{
 const app=await read('public/app.js');
 assert.match(app,/Recorridos publicados: visibles en el mapa · Seguimiento GPS: sujeto a observaciones recientes/);
 assert.match(app,/GPS de colectivos en vivo/);
 const worker=await read('src/worker.template.js');
 assert.match(worker,/realtime_state: "not_integrated"/);
});
