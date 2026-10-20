import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('live bus markers use the Gemini PNG, measured bearing and animate only estimated GPS frames', async () => {
  const [css, substrate, app, three] = await Promise.all([
    read('../public/styles.css'),
    read('../public/map/substrate.js'),
    read('../public/app.js'),
    read('../public/3d/voy3d.js')
  ]);

  assert.match(css, /background-image:url\('\/transit\/markers\/bus-top\.png\?v=__BUILD_ID__'\)/);
  assert.match(css, /\.tracker-marker\.is-gps-bus::before\{[^}]*transform:rotate\(var\(--gps-bearing,0deg\)\)/);
  assert.match(substrate, /busIcon\.className = 'tracker-bus-icon'/);
  assert.match(substrate, /animate: model\.gpsVehicle === true && model\.displayInterpolated === true/);
  assert.match(substrate, /requestAnimationFrame\(step\)/);
  assert.match(substrate, /cancelAnimationFrame\(entry\.animationFrame\)/);
  assert.match(app, /displayInterpolated:frame\.display_interpolated===true/);
  assert.match(app, /Posición estimada entre mediciones/);
  assert.match(three, /loadVehicleSprite\(map,'voy-bus-3d','\/transit\/markers\/bus-top\.png'\)/);
  assert.doesNotMatch(three, /bus-side\.png/);
  assert.match(app, /function current3DTransportEntities\(\)[\s\S]*?displayFrame:trackerStore\.displayFrame/);
  assert.match(app, /function trackerTick\(\)[\s\S]*?sync3DTopology\(\);[\s\S]*?update3DGpsStatus\(\);/);
  assert.match(three, /entry\.displayFrame\?\.render&&entry\.displayFrame\?\.position/);
  assert.match(three, /'circle-radius':5,'circle-stroke-width':1\.5/);
});
