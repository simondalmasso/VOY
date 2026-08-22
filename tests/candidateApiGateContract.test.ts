import { describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';

describe('ORDER-048 candidate API harness contract', () => {
  test('Córdoba retry predicate uses the camelCase territory runtime contract', async () => {
    const source = await readFile(new URL('../scripts/svelte-candidate-api-gate.mjs', import.meta.url), 'utf8');
    expect(source).toContain("territory?.provinceId==='14'");
    expect(source).not.toContain("territory?.province_id==='14'");
  });
});
