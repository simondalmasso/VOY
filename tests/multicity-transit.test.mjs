import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('map-first transit control exposes all five requested cities and both modes', async () => {
  const html = await read('public/index.html');
  assert.match(html, /id="city-picker"/);
  for (const id of ['santa-fe', 'parana', 'rosario', 'mendoza', 'caba']) {
    assert.match(html, new RegExp('value="' + id + '"'));
  }
  assert.match(html, /id="transport-mode-picker"/);
  assert.match(html, /value="bus"/);
  assert.match(html, /value="train"/);
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

test('city and mode changes are source-aware and recenter the primary map', async () => {
  const app = await read('public/app.js');
  assert.match(app, /getTransitCity/);
  assert.match(app, /applyTransitContext/);
  assert.match(app, /cityPicker\?\.addEventListener\('change'/);
  assert.match(app, /transportModePicker\?\.addEventListener\('change'/);
  assert.match(app, /renderMap\(city\.center/);
  assert.match(app, /Tiempo real no disponible/);
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
