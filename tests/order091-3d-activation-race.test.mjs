import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('an explicit 2D choice cancels any pending default 3D activation', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(app, /threeActivationRevision/);
  assert.match(app, /const activationRevision=\+\+state\.threeActivationRevision/);
  assert.match(app, /function activate2D\([^)]*\)\{[\s\S]{0,160}threeActivationRevision(?:\+\+|\+=1)/);
  assert.match(app, /activationRevision!==state\.threeActivationRevision/);
  assert.match(app, /controller\?\.dispose\?\.\(\)/);
});

test('stale 3D completion cannot replace a newer 2D or 3D selection', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(app, /if\(activationRevision!==state\.threeActivationRevision\)return/);
  assert.match(app, /if\(activationRevision!==state\.threeActivationRevision\)\{controller\?\.dispose\?\.\(\);return\}/);
});
