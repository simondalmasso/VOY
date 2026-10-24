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

test('ORDER076 CABA_OS-inspired urban HUD is dark-first, full-bleed and restrained',async()=>{
  const [html,app,css]=await Promise.all([read('public/index.html'),read('public/app.js'),read('public/styles.css')]);
  assert.match(html,/<html[^>]*data-theme="dark"/);
  assert.match(app,/localStorage\.getItem\('voy-theme'\)\|\|'dark'/);
  assert.match(css,/ORDER076 CABA_OS VISUAL DISCIPLINE/);
  assert.match(css,/\.app-shell\{[^}]*position:fixed;[^}]*inset:0/s);
  assert.match(css,/\.topbar\.voy-topbar\{[^}]*position:fixed;[^}]*background:transparent/s);
  assert.match(css,/\.map-shell\.voy-map-stage::after\{/);
  assert.match(css,/\.truth-meta\{[^}]*font-family:ui-monospace/s);
  assert.match(css,/\.map-mode-toggle\{[^}]*border:1px solid rgba\(224,236,222,/s);
  assert.match(css,/\.voy-sheet\{[^}]*background:var\(--hud-panel\)/s);
  assert.doesNotMatch(css,/crt-flicker|crt-overlay|background-music/i);
});

test('ORDER076 isometric mode reuses the live vector map without 3D quality controls',async()=>{
  const [html,app,substrate]=await Promise.all([read('public/index.html'),read('public/app.js'),read('public/map/substrate.js')]);
  assert.doesNotMatch(html,/id="map-3d-quality"|data-map-mode="3d"/);
  assert.match(html,/data-map-mode="iso"/);
  const isoStart=app.indexOf('async function activateIso()');
  const isoEnd=app.indexOf('mapModeButtons.forEach',isoStart);
  const activation=app.slice(isoStart,isoEnd);
  assert.ok(isoStart>=0&&isoEnd>isoStart);
  assert.match(activation,/startVectorUpgradeOnce\(\)/);
  assert.match(activation,/substrate\.setCameraMode\('isometric'\)/);
  assert.doesNotMatch(activation,/loadVoy3DModule|threeModulePromise/);
  assert.match(substrate,/function setCameraMode\(/);
});
