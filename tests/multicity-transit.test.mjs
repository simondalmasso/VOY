import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('map-first transit controls remove city selection and keep bus/train choices inside Lines', async () => {
  const html = await read('public/index.html');
  assert.doesNotMatch(html, /id="city-picker"/);
  assert.doesNotMatch(html, /aria-label="Ciudad del mapa"/);
  const linesStart = html.indexOf('id="quick-lines-wrap" class="map-quick-lines-wrap"');
  const mapViewStart = html.indexOf('<div class="map-quick-view"', linesStart);
  assert.ok(linesStart >= 0 && mapViewStart > linesStart, 'Lines owns the transport controls');
  const linesRegion = html.slice(linesStart, mapViewStart);
  assert.match(linesRegion, /id="quick-lines"/);
  assert.match(linesRegion, /id="transport-mode-picker"/);
  assert.match(linesRegion, /option value="bus"/);
  assert.match(linesRegion, /option value="train"/);
  assert.match(linesRegion, /id="bus-line-picker"/);
});

test('temporal truth is visibly rendered over the map, not screen-reader-only', async () => {
  const html = await read('public/index.html');
  const css = await read('public/styles.css');
  const app = await read('public/app.js');
  assert.match(html, /id="truth-pill" class="truth-pill"/);
  assert.doesNotMatch(html, /id="truth-pill" class="truth-pill sr-only"/);
  assert.match(app, /truthIcon\.textContent\s*=\s*['"]●['"]/);
  assert.match(app, /truthLabel\.hidden\s*=\s*true/);
  assert.match(app, /truthPill\.querySelector\('\.truth-copy'\)\.hidden\s*=\s*true/);
  assert.match(css, /\.truth-pill\{[^}]*width:\s*12px[^}]*height:\s*12px/s);
  assert.doesNotMatch(css, /\.truth-pill:not\(\[data-state="realtime"\]\) \.truth-icon/);
  assert.match(css, /\.truth-pill\[data-state="stale"\] \.truth-icon\s*\{\s*color:\s*var\(--danger\)\s*\}/);
  assert.match(css, /\.truth-pill\[data-state="source_unavailable"\] \.truth-icon\s*\{\s*color:\s*var\(--danger\)\s*\}/);
  assert.doesNotMatch(css, /#truth-pill\.sr-only\{position:absolute!important;display:block!important;left:-10000px!important/);
});

test('transport mode changes preserve the active map center and restore previously granted location', async () => {
  const [html, app] = await Promise.all([read('public/index.html'), read('public/app.js')]);
  assert.doesNotMatch(html, /id="city-picker"/);
  assert.doesNotMatch(app, /getTransitCity|cityPicker/);
  assert.match(app, /function renderInitialMap\(\)\{renderMap\(state\.mapCenter\|\|DEFAULT_MAP_CENTER/);
  assert.match(app, /function applyTransitContext/);
  assert.match(app, /transportModePicker\?\.addEventListener\('change'/);
  assert.match(app, /function restoreGrantedLocation\(/);
  assert.match(app, /permission\.state==='granted'/);
  assert.match(app, /renderMap\(\{lat:Number\(position\.coords\.latitude\),lon:Number\(position\.coords\.longitude\)\}/);
  assert.match(app, /Tiempo real no disponible/);
});

test('bus routes and GPS are gated to local coverage and the active transport mode', async () => {
  const app = await read('public/app.js');
  assert.doesNotMatch(app, /activeCityId|cityPicker|getTransitCity/);
  assert.match(app, /function hasSantaFeBusCoverage\(center=null\)/);
  assert.match(app, /return trainRadarDistanceMeters\(point,DEFAULT_MAP_CENTER\)<=30000/);
  assert.match(app, /function currentBusNetworkGeometries\(\)\{\s*if\(state\.activeTransportMode!=='bus'\)return\[\]/);
  assert.match(app, /trackerStore\.nearby\(center,\{limit:24,radiusMeters:20000,filter:entity=>matchesTransportMode\(entity\.observation,state\.activeTransportMode\)&&matchesSelectedGpsLine\(entity\.observation\)\}\)/);
  assert.match(app, /entity\.observation\.temporal_state==='realtime'&&matchesTransportMode\(entity\.observation,state\.activeTransportMode\)&&matchesSelectedGpsLine\(entity\.observation\)/);
  assert.match(app, /entity\.next\?\.temporal_state==='realtime'&&matchesTransportMode\(entity\.next,state\.activeTransportMode\)&&matchesSelectedGpsLine\(entity\.next\)/);
  assert.match(app, /if\(state\.activeTransportMode!=='bus'\|\|!hasSantaFeBusCoverage\(\)\)return/);
});

test('train radar is mode-scoped, stale requests are ignored, and station changes refresh 3D immediately', async () => {
  const app = await read('public/app.js');
  const clearStart = app.indexOf('function clearTrainRadar()');
  const clearEnd = app.indexOf('function radarObservedLabel', clearStart);
  const refreshStart = app.indexOf('async function refreshTrainRadar(', clearEnd);
  const refreshEnd = app.indexOf('function applyTransitContext(', refreshStart);
  const applyEnd = app.indexOf('transportModePicker?.addEventListener', refreshEnd);
  const clear = app.slice(clearStart, clearEnd);
  const refresh = app.slice(refreshStart, refreshEnd);
  const apply = app.slice(refreshEnd, applyEnd);
  const stationStart = app.indexOf('function updateTrainStationMarkers(', clearEnd);
  const stationEnd = app.indexOf('async function refreshTrainRadar(', stationStart);
  const station = app.slice(stationStart, stationEnd);

  assert.match(clear, /trainRadarRequestRevision\+\+/);
  assert.match(clear, /syncTrackerOverlays\(\);sync3DTopology\(\)/);
  assert.match(refresh, /if\(state\.activeTransportMode!=='train'\)\{clearTrainRadar\(\);return\}/);
  assert.match(refresh, /const requestRevision=\+\+trainRadarRequestRevision/);
  assert.match(refresh, /requestRevision!==trainRadarRequestRevision\|\|state\.activeTransportMode!=='train'/);
  assert.match(station, /state\.activeTransportMode==='train'\?/);
  assert.match(station, /syncTrackerOverlays\(\);sync3DTopology\(\)/);
  assert.match(apply, /syncTrackerOverlays\(\);update3DGpsStatus\(\)/);
});

test('train mode keeps station catalogue explicitly historical and never invents live trains', async () => {
  const app = await read('public/app.js');
  assert.match(app, /activeTransportMode\s*===\s*'train'/);
  assert.match(app, /stationModels/);
  assert.match(app, /no se confirma.*servicio|servicio.*no confirmado/i);
  assert.match(app, /api\/radar\/trains\/nearby/);
});


test('line labels are idempotent when a feed already supplies the Línea prefix', async () => {
  const { labelSantaFeLine } = await import('../public/transit/line-picker.js');
  assert.equal(labelSantaFeLine('3'), 'Línea 3');
  assert.equal(labelSantaFeLine('Línea 3'), 'Línea 3');
  assert.equal(labelSantaFeLine('Linea 3'), 'Línea 3');
});

test('compact search preserves a usable touch target while halving the visible field', async () => {
  const css = await read('public/styles.css');
  assert.match(css, /\.destination-control::before/);
  assert.match(css, /\.destination-control\s*\{[^}]*min-height:\s*44px/s);
  assert.match(css, /\.destination-control::before\s*\{[^}]*height:\s*26px/s);
  assert.match(css, /\.destination-control input\s*\{[^}]*min-height:\s*44px/s);
});

test('the view switch offers lightweight isometric MapLibre instead of Three.js 3D', async () => {
  const [html, app, substrate] = await Promise.all([
    read('public/index.html'), read('public/app.js'), read('public/map/substrate.js')
  ]);
  assert.match(html, /data-map-mode="iso"[^>]*>Iso(?:métrica)?</);
  assert.doesNotMatch(html, /data-map-mode="3d"|map-3d-quality/);
  assert.match(app, /async function activateIso\(/);
  assert.match(app, /substrate\.setCameraMode\('isometric'\)/);
  assert.match(app, /button\.dataset\.mapMode==='iso'\?activateIso\(\):activate2D\(\)/);
  assert.match(substrate, /function setCameraMode\(/);
  assert.match(substrate, /pitch:\s*isometric\s*\?\s*55\s*:\s*0/);
});

test('the compact dashboard keeps the existing quick-action icon dimensions', async () => {
  const css = await read('public/styles.css');
  assert.match(css, /--voy-dashboard-max-height:\s*min\(36svh,320px\)/);
  assert.match(css, /\.map-quick-action svg\s*\{[^}]*width:\s*18px[^}]*height:\s*18px/s);
  assert.match(css, /\.map-quick-view \.map-mode-toggle button\s*\{[^}]*min-width:\s*44px[^}]*min-height:\s*44px/s);
});
