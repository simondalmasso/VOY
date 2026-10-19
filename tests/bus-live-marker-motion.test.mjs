import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('live bus markers use the credited Icons8 bus icon and animate only estimated GPS frames', async () => {
  const [css, substrate, app, icon, sources, sw] = await Promise.all([
    read('../public/styles.css'),
    read('../public/map/substrate.js'),
    read('../public/app.js'),
    read('../public/icons/bus-transport-icons8.svg'),
    read('../public/sources.html'),
    read('../public/sw.js')
  ]);

  assert.match(css, /mask-image:url\('\/icons\/bus-transport-icons8\.svg'\)/);
  assert.match(css, /\.tracker-marker\.is-gps-bus \.tracker-bus-icon\{display:block\}/);
  assert.match(substrate, /busIcon\.className = 'tracker-bus-icon'/);
  assert.match(substrate, /animate: model\.gpsVehicle === true && model\.displayInterpolated === true/);
  assert.match(substrate, /requestAnimationFrame\(step\)/);
  assert.match(substrate, /cancelAnimationFrame\(entry\.animationFrame\)/);
  assert.match(app, /displayInterpolated:frame\.display_interpolated===true/);
  assert.match(app, /Posición estimada entre mediciones/);
  assert.match(icon, /data:image\/png;base64,/);
  assert.match(sources, /Icons8.*CC BY 4\.0/);
  assert.match(sources, /https:\/\/icon-icons\.com\/icon\/bus-transport\/4422/);
  assert.doesNotMatch(sw, /'\/icons\/bus-transport-icons8\.svg'/);
  assert.match(css, /\.tracker-marker\.is-gps-bus::before\{content:"";display:block;width:29px;height:29px/);
  assert.match(css, /\.tracker-marker\.is-gps-bus \.tracker-bus-icon\{position:absolute;width:17px;height:17px/);
  const three = await read('../public/3d/voy3d.js');
  assert.match(app, /function current3DTransportEntities\(\)[\s\S]*?displayFrame:trackerStore\.displayFrame/);
  assert.match(app, /function trackerTick\(\)[\s\S]*?sync3DTopology\(\);[\s\S]*?update3DGpsStatus\(\);/);
  assert.match(three, /entry\.displayFrame\?\.render&&entry\.displayFrame\?\.position/);
  assert.match(three, /'circle-radius':5,'circle-stroke-width':1\.5/);
});
