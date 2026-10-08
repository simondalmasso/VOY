import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=async p=>readFile(new URL('../'+p,import.meta.url),'utf8');

test('public 3D action keeps real cartography rather than isolated Three grid',async()=>{
 const [app,renderer,css]=await Promise.all([
  read('public/app.js'),read('public/3d/voy3d.js'),read('public/styles.css')
 ]);
 assert.match(app,/mod\.activateVoyUrbanMap3D\(/);
 assert.match(renderer,/export async function activateVoyUrbanMap3D/);
 assert.match(renderer,/new MapLibreMap\(/);
 assert.match(renderer,/voy-urban-raster/);
 assert.match(renderer,/voy-3d-buildings-extrusion/);
 assert.match(renderer,/fill-extrusion/);
 assert.match(renderer,/voy-3d-bus-network-lines/);
 assert.match(renderer,/voy-3d-selected-route-line/);
 assert.match(css,/\.map-shell \.map-3d-layer\.maplibregl-map\{position:absolute;inset:0;width:100%;height:100%\}/,'3D canvas must never collapse to zero-height when MapLibre appends its class');
});

test('public 3D retains attribution and strict tile host access',async()=>{
 const [app,headers,html]=await Promise.all([
  read('public/app.js'),read('public/_headers'),read('public/index.html')
 ]);
 assert.match(headers,/connect-src[^;\n]*https:\/\/tile\.openstreetmap\.org/);
 assert.match(app,/recorridos publicados · sin vehículos en vivo/);
 assert.match(html,/Vista 3D cartográfica/);
});

test('3D map supports return to 2D without accumulating GL canvases',async()=>{
 const app=await read('public/app.js');
 assert.match(app,/function activate2D\(message=''\)[\s\S]*state\.threeController\?\.dispose/);
 assert.match(app,/map3dLayer\.hidden=false/);
});
