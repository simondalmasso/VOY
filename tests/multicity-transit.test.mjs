import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('map-first transit UI has no city filter and line selection lives under Lines', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /id="city-picker"/);
  assert.match(html, /id="transport-mode-picker"/);
  assert.match(html, /id="quick-lines"/);
  assert.ok(html.indexOf('id="bus-line-control"') > html.indexOf('id="map-quick-actions"'));
  assert.match(app, /function trackerMarkerModels\(\)/);
  assert.match(app, /trackerStore\.nearby\(center\)/);
});

test('temporal truth is visibly rendered over the map, not screen-reader-only', async () => {
  const html = await read('public/index.html');
  const css = await read('public/styles.css');
  const app = await read('public/app.js');
  assert.match(html, /id="truth-pill" class="truth-pill"/);
  assert.doesNotMatch(html, /id="truth-pill" class="truth-pill sr-only"/);
  assert.match(app, /truthLabel\.textContent\s*=\s*entry\.label/);
  assert.match(app, /truthLabel\.hidden\s*=\s*false/);
  assert.doesNotMatch(css, /#truth-pill\.sr-only\{position:absolute!important;display:block!important;left:-10000px!important/);
});

test('browser location recenters the nearby transit map without a city picker', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(app, /cityPicker=null/);
  assert.doesNotMatch(app, /cityPicker\?\.addEventListener\('change'/);
  assert.match(app, /state\.locationGranted=true;renderMap\(candidate\.coordinates/);
  assert.match(app, /function toggleBusLineControl\(\)/);
});

test('non-Santa-Fe buses do not reuse Santa Fe geometry or GPS feed', async () => {
  const app = await read('public/app.js');
  assert.match(app, /state\.activeCityId\s*!==\s*'santa-fe'/);
  assert.match(app, /activeTransportMode\s*===\s*'bus'/);
  assert.match(app, /pollSantaFeGps/);
  assert.match(app, /city\.bus\.coverage/);
});

test('train city mode keeps station catalogue explicitly historical and never invents live trains', async () => {
  const app = await read('public/app.js');
  assert.match(app, /activeTransportMode\s*===\s*'train'/);
  assert.match(app, /stationModels/);
  assert.match(app, /no se confirma.*servicio|servicio.*no confirmado/i);
  assert.match(app, /api\/radar\/trains\/nearby/);
});
