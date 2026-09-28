import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=async p=>readFile(new URL('../'+p,import.meta.url),'utf8');

test('ORDER076 unknown communicates insufficient knowledge, not service unavailability',async()=>{
  const app=await read('public/app.js');
  assert.match(app,/unknown:\{icon:[^}]*label:'Estado desconocido'/);
  assert.match(app,/function truthConclusion\(/);
  assert.match(app,/No hay evidencia suficiente para ubicar/);
  assert.match(app,/La última observación está vencida/);
  assert.doesNotMatch(app,/unknown:\{icon:[^}]*label:'Sin señal'/);
});

test('ORDER076 selected truth shows conclusion, source and update separately',async()=>{
  const [html,app,css]=await Promise.all([
    read('public/index.html'),
    read('public/app.js'),
    read('public/styles.css')
  ]);
  assert.match(html,/id="truth-meta"/);
  assert.match(app,/factsRow\('Qué sabemos'/);
  assert.match(app,/factsRow\('Actualizado'/);
  assert.match(app,/factsRow\('Fuente'/);
  assert.doesNotMatch(app,/factsRow\('Fuente',[^\n]*toLocaleTimeString/);
  assert.match(css,/\.truth-meta\{/);
});

test('ORDER076 native MapLibre pan synchronizes logical center and nearby overlays',async()=>{
  const [substrate,app]=await Promise.all([read('public/map/substrate.js'),read('public/app.js')]);
  assert.match(substrate,/onViewportChange\s*=\s*\(\)\s*=>\s*\{\}/);
  assert.match(substrate,/map\.on\('moveend'/);
  assert.match(substrate,/getCenter/);
  assert.match(substrate,/center\s*=\s*\{\s*lat:[\s\S]*lon:/);
  assert.match(substrate,/onViewportChange\(\{\s*\.\.\.center\s*\}\)/);
  assert.match(app,/onViewportChange:\(\)=>\{?syncTrackerOverlays\(\)/);
  assert.doesNotMatch(substrate,/\/api\//,'viewport sync must remain Worker-silent');
});

test('ORDER076 3D stays contextual, lazy and selected-only',async()=>{
  const [html,app]=await Promise.all([read('public/index.html'),read('public/app.js')]);
  assert.match(html,/id="map-3d-quality"[^>]*hidden/);
  assert.match(app,/function has3DContext\(/);
  assert.match(app,/function current3DTransportEntities\(\)[\s\S]*trackerStore\.selected\(\)/);
  assert.doesNotMatch(app,/function current3DTransportEntities\(\)\{return trackerStore\.transportEntries\(\)\}/);
  const guard=app.indexOf('if(!has3DContext())');
  const dynamicImport=app.indexOf("state.threeModulePromise??=loadVoy3DModule()");
  assert.ok(guard>=0,'3D activation must guard missing context');
  assert.ok(dynamicImport>guard,'3D context guard must run before lazy import');
  assert.match(app,/map3dQuality\.hidden=true/);
  assert.match(app,/map3dQuality\.hidden=false/);
});
