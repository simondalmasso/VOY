import { describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { classifyControlOnlyPaths, findRuntimeAttestationReferences } from '../scripts/verify-order48-control-only-refresh.mjs';
import { MAX_AGE_HOURS, TARGET, validateAttestation } from '../scripts/verify-santa-fe-transit-handoff.mjs';

const NOW = Date.parse('2026-08-22T16:00:00Z');

function validAttestation() {
  return {
    schema_version: 2,
    source_id: 'santa_fe_official_transit_handoff',
    url: TARGET,
    authority: 'Municipalidad de Santa Fe',
    surface: 'Colectivos',
    current_information_reference: 'Cuándo Pasa',
    verified_at_utc: '2026-08-22T15:23:03Z',
    evidence: {
      kind: 'github_issue_comment',
      repository: 'simonkey888/VOY',
      issue: 48,
      comment_id: 5381139446,
      url: 'https://github.com/simonkey888/VOY/issues/48#issuecomment-5381139446'
    },
    verification_method: 'independent_aud_primary_source_check',
    claims: {
      official_municipal_surface: true,
      colectivos_present: true,
      cuando_pasa_present: true
    }
  };
}

function mutate(mutator) {
  const value = structuredClone(validAttestation());
  mutator(value);
  return value;
}

describe('ORDER-048 refreshable source attestation', () => {
  test('T1 full RFC3339 timestamp within bounded window passes', () => {
    const result = validateAttestation(validAttestation(), NOW);
    expect(result.ok).toBe(true);
    expect(result.ageHours).toBeGreaterThanOrEqual(0);
    expect(result.ageHours).toBeLessThan(MAX_AGE_HOURS);
  });

  test('T2 date-only timestamp fails', () => {
    expect(validateAttestation(mutate(a => { a.verified_at_utc = '2026-08-22'; }), NOW).ok).toBe(false);
  });

  test('T3 invalid timestamp fails', () => {
    expect(validateAttestation(mutate(a => { a.verified_at_utc = 'not-a-time'; }), NOW).ok).toBe(false);
  });

  test('T4 future timestamp beyond tolerance fails', () => {
    const result = validateAttestation(mutate(a => { a.verified_at_utc = '2026-08-22T16:07:00Z'; }), NOW);
    expect(result.ok).toBe(false);
    expect(result.failure).toBe('official_handoff_attestation_from_future');
  });

  test('T5 age beyond 36 hours fails closed', () => {
    const result = validateAttestation(mutate(a => { a.verified_at_utc = '2026-08-21T03:59:59Z'; }), NOW);
    expect(result.ok).toBe(false);
    expect(result.failure).toBe('official_handoff_attestation_stale');
  });

  test('T6 URL query hash host and path drift fail', () => {
    for (const url of [
      `${TARGET}?q=1`,
      `${TARGET}#fragment`,
      'https://example.com/secretaria-de-gobierno-control-movilidad-seguridadciudadana/colectivos/',
      'https://santafeciudad.gov.ar/desvios/'
    ]) {
      expect(validateAttestation(mutate(a => { a.url = url; }), NOW).ok).toBe(false);
    }
  });

  test('T7 authority drift fails', () => {
    expect(validateAttestation(mutate(a => { a.authority = 'Otro'; }), NOW).ok).toBe(false);
  });

  test('T8 source id and schema drift fail', () => {
    expect(validateAttestation(mutate(a => { a.source_id = 'other'; }), NOW).ok).toBe(false);
    expect(validateAttestation(mutate(a => { a.schema_version = 1; }), NOW).ok).toBe(false);
  });

  test('T9 wrong issue or repository fails', () => {
    expect(validateAttestation(mutate(a => { a.evidence.issue = 47; }), NOW).ok).toBe(false);
    expect(validateAttestation(mutate(a => { a.evidence.repository = 'other/repo'; }), NOW).ok).toBe(false);
  });

  test('T10 evidence URL and comment id mismatch fails', () => {
    expect(validateAttestation(mutate(a => { a.evidence.url = 'https://github.com/simonkey888/VOY/issues/48#issuecomment-1'; }), NOW).ok).toBe(false);
    expect(validateAttestation(mutate(a => { a.evidence.comment_id = 1; }), NOW).ok).toBe(false);
  });

  test('T11 missing claims fail', () => {
    expect(validateAttestation(mutate(a => { delete a.claims.cuando_pasa_present; }), NOW).ok).toBe(false);
  });

  test('T12 verifier contains no live network/browser/proxy/cookie shaping path', async () => {
    const source = await readFile(new URL('../scripts/verify-santa-fe-transit-handoff.mjs', import.meta.url), 'utf8');
    for (const forbidden of ['fetch(', '@playwright', 'chromium', 'page.goto', 'http.request', 'https.request', 'extraHTTPHeaders', 'proxy:', 'user-agent']) {
      expect(source.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });

  test('T13 runtime handoff presentation no longer embeds freshness timestamp', async () => {
    const source = await readFile(new URL('../src/features/providers/officialHandoffs.ts', import.meta.url), 'utf8');
    expect(source).not.toContain('verifiedAt');
    expect(source).not.toContain('verified_at');
  });

  test('T14 control-only refresh accepts only exact attestation/docs paths', () => {
    expect(classifyControlOnlyPaths([
      'config/source-attestations/santa-fe-official-transit-handoff.json',
      'docs/CURRENT_STATE.md'
    ]).ok).toBe(true);
    expect(classifyControlOnlyPaths(['docs/CURRENT_STATE.md']).ok).toBe(true);
  });

  test('T15 runtime workflow verifier package and lock changes invalidate control-only reuse', () => {
    for (const path of [
      'src/App.svelte',
      'worker/index.ts',
      '.github/workflows/order48-final-candidate.yml',
      'scripts/verify-santa-fe-transit-handoff.mjs',
      'package.json',
      'bun.lock'
    ]) {
      const result = classifyControlOnlyPaths(['docs/CURRENT_STATE.md', path]);
      expect(result.ok).toBe(false);
      expect(result.rejected).toContain(path);
    }
  });

  test('attestation is not imported by runtime or build code', async () => {
    expect(await findRuntimeAttestationReferences()).toEqual([]);
  });
});
