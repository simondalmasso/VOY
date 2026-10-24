import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('optional realtime fixture has a module-scoped demo label for store change listeners', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.ok(app.includes("const FIXTURE_LABEL='FIXTURE DEMO · no producción';"));
  assert.ok(app.includes('FIXTURE_LABEL} · entidades sintéticas para evidencia de desarrollo'));
  assert.ok(app.includes('fixtures.FIXTURE_LABEL'));
});
