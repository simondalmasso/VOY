import { describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';

describe('ORDER-048 candidate API harness contract', () => {
  test('Córdoba uses the camelCase territory runtime contract', async () => {
    const source = await readFile(new URL('../scripts/svelte-candidate-api-gate.mjs', import.meta.url), 'utf8');
    expect(source).toContain("territory?.provinceId === '14'");
    expect(source).toContain("territory?.provinceIsoId === 'AR-X'");
    expect(source).toContain("territory?.coverageKey === '_default'");
    expect(source).not.toContain("territory?.province_id === '14'");
  });

  test('Córdoba candidate proof persists bounded raw attempt observability', async () => {
    const source = await readFile(new URL('../scripts/svelte-candidate-api-gate.mjs', import.meta.url), 'utf8');
    expect(source).toContain("territory-cordoba-attempts.json");
    expect(source).toContain('http_status');
    expect(source).toContain('body_class');
    expect(source).toContain('provinceId');
    expect(source).toContain('provinceIsoId');
    expect(source).toContain('coverageKey');
    expect(source).toContain('target_version_id');
    expect(source).not.toContain('response.headers');
    expect(source).not.toContain('cookie');
  });

  test('observed GeoRef upstream outage gets bounded 60-second backoff without weakening PASS', async () => {
    const source = await readFile(new URL('../scripts/svelte-candidate-api-gate.mjs', import.meta.url), 'utf8');
    expect(source).toContain('const UPSTREAM_RETRY_MS = 60_000');
    expect(source).toContain('const MAX_UPSTREAM_ATTEMPTS = 6');
    expect(source).toContain("result?.body?.error === 'territory_upstream_unavailable'");
    expect(source).toContain("throw new Error('territory_upstream_unavailable_after_retry')");
    expect(source).toContain("throw new Error('route_territory_upstream_unavailable_after_retry')");
    expect(source).toContain("value?.response?.status === 200 && value?.body?.ok === true");
  });

  test('territory failures remain causally split and fail closed', async () => {
    const source = await readFile(new URL('../scripts/svelte-candidate-api-gate.mjs', import.meta.url), 'utf8');
    for (const error of [
      'territory_http_status_failed',
      'territory_ok_failed',
      'territory_province_id_failed',
      'territory_iso_failed',
      'territory_coverage_failed'
    ]) expect(source).toContain(error);
    expect(source).not.toContain('national_territory_gate_failed');
  });
});
