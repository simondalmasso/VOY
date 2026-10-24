import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createTrackerStore, MAX_NEARBY_MARKERS, NEARBY_RADIUS_METERS } from '../public/tracker/store.js';
import * as trackerStoreModule from '../public/tracker/store.js';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const NOW = Date.parse('2026-10-19T10:00:00.000Z');
const makeStore = () => createTrackerStore({ now: () => NOW, presentTransportEntity: () => null });

function observation(id, lat, lon) {
  return {
    id, source_id: 'test-source', temporal_state: 'realtime',
    observed_at: new Date(NOW - 1000).toISOString(), lat, lon
  };
}

test('transport mode matching is explicit and fails closed on unknown or conflicting vehicle identity', () => {
  const matchesTransportMode = trackerStoreModule.matchesTransportMode;
  assert.equal(typeof matchesTransportMode, 'function', 'transport filtering must be a reusable tested contract');
  assert.equal(matchesTransportMode({ mode: 'bus' }, 'bus'), true);
  assert.equal(matchesTransportMode({ mode: 'bus' }, 'train'), false);
  assert.equal(matchesTransportMode({ mode: 'rail' }, 'train'), true);
  assert.equal(matchesTransportMode({ mode: 'rail' }, 'bus'), false);
  assert.equal(matchesTransportMode({ source_id: 'sf_gps_cuandopasa', observed_position_only: true }, 'bus'), true);
  assert.equal(matchesTransportMode({ source_id: 'sf_gps_cuandopasa', observed_position_only: true, mode: 'train' }, 'train'), false);
  assert.equal(matchesTransportMode({ observed_position_only: true }, 'train'), false);
  assert.equal(matchesTransportMode({ mode: 'bus' }, 'air'), false);
});

test('measured GPS movement produces compass bearings and the 2D/3D renderers apply orientation', async () => {
  const directions = [
    { name: 'north', dLat: 0.001, dLon: 0, bearing: 0 },
    { name: 'east', dLat: 0, dLon: 0.001, bearing: 90 },
    { name: 'south', dLat: -0.001, dLon: 0, bearing: 180 },
    { name: 'west', dLat: 0, dLon: -0.001, bearing: 270 }
  ];
  for (const direction of directions) {
    const store = createTrackerStore({ now: () => NOW, presentTransportEntity: () => null });
    const id = 'heading-' + direction.name;
    const first = {
      id, source_id: 'sf_gps_cuandopasa', temporal_state: 'realtime',
      observed_at: new Date(NOW - 6000).toISOString(), lat: -31.65, lon: -60.71,
      observed_position_only: true, mode: 'bus'
    };
    store.ingest(first);
    store.ingest({
      ...first,
      observed_at: new Date(NOW - 1000).toISOString(),
      lat: first.lat + direction.dLat,
      lon: first.lon + direction.dLon
    });
    const frame = store.displayFrame(id);
    assert.equal(frame.render, true, direction.name + ' GPS fix should render');
    assert.ok(Math.abs(frame.bearing - direction.bearing) < 1e-6,
      direction.name + ' bearing should follow the compass convention');
  }

  const [app, substrate, css, three] = await Promise.all([
    read('public/app.js'), read('public/map/substrate.js'),
    read('public/styles.css'), read('public/3d/voy3d.js')
  ]);
  assert.match(app, /bearing:frame\.bearing/);
  assert.match(substrate, /Number\.isFinite\(Number\(model\.bearing\)\)[\s\S]*?setProperty\('--gps-bearing'/);
  assert.match(css, /transform:rotate\(var\(--gps-bearing,0deg\)\)/);
  assert.match(three, /'icon-rotate':\['get','bearing'\]/);
});

test('nearby vehicle discovery is distance-bounded and capped instead of loading the whole fleet', () => {
  assert.equal(MAX_NEARBY_MARKERS, 8);
  assert.equal(NEARBY_RADIUS_METERS, 5000);
  const store = makeStore();
  for (let i = 0; i < 10; i++) {
    store.ingest(observation('near-' + i, -31.65 + i * 0.001, -60.71));
  }
  store.ingest(observation('far-1', -31.77, -60.71));
  store.ingest(observation('far-2', -31.79, -60.71));
  const nearby = store.nearby({ lat: -31.65, lon: -60.71 });
  assert.ok(nearby.length <= 8, 'only a bounded set of nearby vehicles should be surfaced');
  assert.ok(nearby.every(item => !item.id.startsWith('far-')), 'vehicles outside the 5 km radius must be omitted');
});

test('explicitly selected vehicle remains visible even when it is outside the automatic nearby radius', () => {
  const store = makeStore();
  for (let i = 0; i < 9; i++) {
    store.ingest(observation('near-' + i, -31.65 + i * 0.001, -60.71));
  }
  store.ingest(observation('selected-far', -31.77, -60.71));
  store.select('selected-far');
  const nearby = store.nearby({ lat: -31.65, lon: -60.71 });
  assert.ok(nearby.some(item => item.id === 'selected-far'));
});

test('transit choices are inside Lines; there is no city filter and no route panel floating above the map', async () => {
  const html = await read('public/index.html');
  assert.doesNotMatch(html, /id="city-picker"/);
  assert.doesNotMatch(html, /aria-label="Ciudad del mapa"/);
  const wrapperStart = html.indexOf('id="quick-lines-wrap" class="map-quick-lines-wrap"');
  const quickViewStart = html.indexOf('<div class="map-quick-view"', wrapperStart);
  assert.ok(wrapperStart >= 0 && quickViewStart > wrapperStart, 'Lines owns a bounded popover in the quick-action bar');
  const linesRegion = html.slice(wrapperStart, quickViewStart);
  assert.ok(linesRegion.includes('id="quick-lines"'));
  assert.ok(linesRegion.includes('id="bus-line-control"'));
  assert.ok(linesRegion.includes('id="transport-mode-picker"'), 'bus/train mode belongs inside Lines');
  assert.ok(linesRegion.includes('id="bus-line-picker"'), 'line selection belongs inside Lines');
  assert.ok(linesRegion.indexOf('id="quick-lines"') < linesRegion.indexOf('id="bus-line-control"'));
  assert.doesNotMatch(html.slice(0, wrapperStart), /id="bus-line-control"/, 'the line selector must not float in the map HUD');
});

test('2D starts with the vector basemap; raster is created only after vector failure', async () => {
  const substrate = await read('public/map/substrate.js');
  const setCenterStart = substrate.indexOf('function setCenter(');
  const getCenterStart = substrate.indexOf('function getCenter()', setCenterStart);
  const setCenter = substrate.slice(setCenterStart, getCenterStart);
  assert.doesNotMatch(setCenter, /renderRaster\(center/, 'normal startup must not paint an OSM raster before MapLibre');
  assert.match(setCenter, /substrate === 'vector_failed'/, 'raster is allowed when the vector path has failed');
  const failureStart = substrate.indexOf('function vectorFailed(');
  const upgradeStart = substrate.indexOf('function upgradeToVector(', failureStart);
  const failure = substrate.slice(failureStart, upgradeStart);
  assert.match(failure, /if\s*\(!rasterCenter\s*&&\s*center\)\s*renderRaster/, 'failure fallback must create raster tiles if none were painted');
  assert.match(substrate, /const startCenter = center \? \[center\.lon, center\.lat\]/, 'vector startup must use the latest user/map center');
});

test('user location immediately recenters the map and previously granted permission is restored without a prompt', async () => {
  const app = await read('public/app.js');
  assert.match(app, /function restoreGrantedLocation\(/);
  assert.match(app, /navigator\.permissions\.query\(\{name:'geolocation'\}\)/);
  assert.match(app, /permission\.state==='granted'/);
  assert.match(app, /renderMap\(\{lat:Number\(position\.coords\.latitude\),lon:Number\(position\.coords\.longitude\)\}/);
});

test('transit mode changes do not restore all route geometries when no line is selected', async () => {
  const app = await read('public/app.js');
  assert.match(app, /busLinePicker\.value\s*\?\s*geometriesForSantaFeLine\(state\.busNetwork\?\.routes,busLinePicker\.value\)\s*:\s*\[\]/);
  assert.doesNotMatch(app, /const cityPicker=\$\('#city-picker'\)/);
});
