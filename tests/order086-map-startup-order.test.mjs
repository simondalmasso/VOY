import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('ORDER086 avoids starting a hidden vector map while urban 3D is the default', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(app, /let vectorUpgradePromise=null;/, 'the base-map upgrade needs one shared promise');
  assert.ok(app.includes('function startVectorUpgradeOnce(){') && app.includes('substrate.upgradeToVector'), '2D upgrades must share one substrate promise');
  assert.ok(!app.includes('function scheduleVectorUpgrade('), 'the hidden base vector map is not booted on idle');
  const start = app.indexOf('async function activate3D(){');
  const end = app.indexOf('mapModeButtons.forEach', start);
  assert.ok(start >= 0 && end > start, 'urban 3D activation handler must exist');
  const activation = app.slice(start, end);
  assert.ok(!activation.includes('startVectorUpgradeOnce('), '3D startup must not create a competing MapLibre map');
  assert.ok(activation.includes('if(vectorUpgradePromise){') && activation.includes('await vectorUpgradePromise;'), 'if a user already opened 2D, finish its startup before creating the 3D map');
  assert.ok(app.includes('if(!substrate.maplibreReady)void startVectorUpgradeOnce()'), '2D requests the vector map only when selected or used as fallback');
  assert.ok(app.includes('setTimeout(()=>activate3D(),180)'), '3D remains the progressive default');
});
