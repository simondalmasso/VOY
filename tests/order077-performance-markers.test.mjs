import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');
const substrate = readFileSync(new URL('../public/map/substrate.js', import.meta.url), 'utf8');
const three = readFileSync(new URL('../public/3d/voy3d.js', import.meta.url), 'utf8');
const build = readFileSync(new URL('../scripts/build.ps1', import.meta.url), 'utf8');
const headers = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');

test('ORDER077: static route catalog is lazy until line picker focus or saved selection', () => {
  assert.match(app, /busLinePicker\.addEventListener\('focus',loadSantaFeBusNetwork\)/);
  assert.match(app, /busLinePicker\.addEventListener\('pointerdown',loadSantaFeBusNetwork\)/);
  assert.match(app, /if\(localStorage\.getItem\('voy\.sf\.line'\)\)loadSantaFeBusNetwork\(\)/);
  assert.doesNotMatch(app, /renderInitialMap\(\);\s*loadSantaFeBusNetwork\(\);/);
  assert.match(app, /if\(state\.busNetwork\|\|busNetworkLoadStarted\)return/);
});

test('ORDER077: no-op tracker ticks skip map updates but keep 3D GPS status alive with an empty store', () => {
  assert.match(app, /const needsAnimationCheck=\(state\.mapMode==='2d'&&!selected/);
  assert.match(app, /if\(needsAnimationCheck\)\{[\s\S]*?for\(const entity of entities\)/);
  assert.match(app, /state\.mapMode==='3d'&&entities\.length===0\)\{update3DGpsStatus\(\);return\}/);
  assert.match(app, /state\.mapMode==='2d'&&!selected&&trackerStore\.follow\(\)!=='following'&&!interpolating/);
  assert.match(app, /state\.mapMode==='3d'&&!selected&&!interpolating/);
  assert.match(app, /setInterval\(trackerTick,250\)/);
});

test('ORDER077: 2D GPS markers use lightweight top-down PNGs and preserve train/bus identity', () => {
  assert.match(css, /bus-top\.png\?v=__BUILD_ID__/);
  assert.match(css, /train-top\.png\?v=__BUILD_ID__/);
  assert.match(substrate, /is-gps-train/);
  assert.match(substrate, /model\.vehicleType === 'bus'/);
});

test('ORDER077: pitched 3D uses small side sprites for bus and train with circle fallback', () => {
  assert.match(three, /bus-side\.png/);
  assert.match(three, /train-side\.png/);
  assert.match(three, /voy-3d-train-icons/);
  assert.match(three, /voy-3d-transport-markers',type:'circle'/);
});

test('ORDER077: PNG sprites are valid, transparent PNG files under 5 KB each', () => {
  for (const name of ['bus-top.png', 'train-top.png', 'bus-side.png', 'train-side.png']) {
    const path = new URL('../public/transit/markers/' + name, import.meta.url);
    const bytes = readFileSync(path);
    assert.deepEqual([...bytes.subarray(0, 8)], [137,80,78,71,13,10,26,10], name + ' PNG signature');
    assert.ok(statSync(path).size < 5 * 1024, name + ' budget');
  }
});

test('ORDER077: build includes nested PNG sprites and content-addressed PMTiles are immutable-cached', () => {
  assert.match(build, /Copy-Item public\\transit\\\* dist\\client\\transit -Recurse -Force/);
  assert.match(headers, /\/data\/santa-fe-3d\/\*\.pmtiles\s+Cache-Control: public, max-age=31536000, immutable/);
});

test('ORDER077: 3D GPS state remains current for an empty store and only counts the selected line', () => {
  const status = app.slice(app.indexOf('function update3DGpsStatus()'), app.indexOf('function activate2D(', app.indexOf('function update3DGpsStatus()')));
  assert.match(status, /selectedLine\?trackerStore\.entities\(\)\.filter/);
  assert.match(status, /entity\.observation\.line\|\|''\)\.trim\(\)===selectedLine/);
  assert.match(app, /if\(state\.mapMode==='3d'&&entities\.length===0\)\{update3DGpsStatus\(\);return\}/);
  assert.match(app, /busLinePicker\.addEventListener\('change',[\s\S]*?update3DGpsStatus\(\)/);
});

test('ORDER077: changing selected line cannot render stale GPS pins or accept an old in-flight reply', () => {
  assert.match(app, /function matchesSelectedGpsLine\(observation\)/);
  assert.match(app, /return Boolean\(selectedLine\)&&String\(observation\.line\|\|''\)\.trim\(\)===selectedLine/);
  assert.match(app, /trackerStore\.nearby\(center\)\.filter\(entity=>matchesSelectedGpsLine\(entity\.observation\)\)/);
  assert.match(app, /entity\.next\?\.temporal_state==='realtime'&&matchesSelectedGpsLine\(entity\.next\)/);
  assert.match(app, /state\.gpsStatus='not_integrated';state\.gpsLastLiveAt=0/);
  assert.ok(app.includes("if(String(busLinePicker.value||'').trim()!==selectedLine)return;"));
  assert.match(app, /currentLine!==selectedLineAtRequest/);
  assert.match(app, /if\(selectedGps&&!matchesSelectedGpsLine\(selectedGps\.entity\.observation\)\)trackerStore\.clearSelection\(\)/);
});
