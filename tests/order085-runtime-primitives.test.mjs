import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('ORDER085 keeps the shared geographic distance primitive used by GPS, routes, and 3D', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(app, /function trainRadarDistanceMeters\(a,b\)/, 'shared Haversine helper must remain defined');
  assert.match(app, /function currentBusNetworkGeometries[\s\S]*?trainRadarDistanceMeters\(/, 'route geometry selection depends on geographic distance');
  assert.match(app, /function hasLocal3DTopologyContext[\s\S]*?trainRadarDistanceMeters\(/, '3D context selection depends on geographic distance');
  assert.match(app, /async function pollSantaFeGps[\s\S]*?trainRadarDistanceMeters\(/, 'GPS polling must keep the local-radius guard');
});
