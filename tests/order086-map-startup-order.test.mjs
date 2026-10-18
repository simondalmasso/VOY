import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('ORDER086 serializes base vector startup before urban 3D WebGL startup', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(app, /let vectorUpgradePromise=null;/, 'the base-map upgrade needs one shared promise');
  assert.match(app, /function startVectorUpgradeOnce\(\)[\s\S]*?substrate\.upgradeToVector/, 'all startup paths must share the same substrate upgrade');
  const schedule = app.match(/function scheduleVectorUpgrade\(\)\{[\s\S]*?\n\}/)?.[0] ?? '';
  assert.match(schedule, /startVectorUpgradeOnce\(\)/, 'idle startup must use the shared upgrade promise');
  const start = app.indexOf('async function activate3D(){');
  const end = app.indexOf('mapModeButtons.forEach', start);
  assert.ok(start >= 0 && end > start, 'urban 3D activation handler must exist');
  const activation = app.slice(start, end);
  const wait = activation.indexOf('await startVectorUpgradeOnce()');
  const moduleLoad = activation.indexOf('loadVoy3DModule()');
  assert.ok(wait >= 0 && moduleLoad > wait, '3D module/renderer must not compete with initial MapLibre substrate startup');
  assert.match(activation, /await startVectorUpgradeOnce\(\);\s*if\(!has3DContext\(\)\)/, 'local 3D coverage must be revalidated after the base map settles');
});
