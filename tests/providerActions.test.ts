import { describe, expect, test } from 'bun:test';
import { consumeExternalAction, createExternalAction, createOfficialHandoffAction } from '../src/features/providers/provider.actions';

describe('external actions', () => {
  test('requires a single-use confirmation', () => {
    const action = createExternalAction('uber', { lat: -31.63, lon: -60.70 }, { lat: -31.64, lon: -60.69 });
    expect(consumeExternalAction(action)).toContain('uber.com');
    expect(() => consumeExternalAction(action)).toThrow('confirmation_expired_or_used');
  });

  test('never invents a DiDi coordinate deeplink', () => {
    const action = createExternalAction('didi', { lat: -31.63, lon: -60.70 }, { lat: -31.64, lon: -60.69 });
    expect(action.url).toBe('https://web.didiglobal.com/ar/ciudades/santa-fe/');
  });

  test('official transit handoff is fixed allowlisted and carries no trip or identity payload', () => {
    const action = createOfficialHandoffAction('santa_fe_municipal_transit');
    const url = new URL(action.url);
    expect(action.kind).toBe('official_information');
    expect(action.provider).toBeNull();
    expect(action.handoff).toBe('santa_fe_municipal_transit');
    expect(action.authority).toBe('Municipalidad de Santa Fe');
    expect(action.url).toBe('https://santafeciudad.gov.ar/secretaria-de-gobierno-control-movilidad-seguridadciudadana/colectivos/');
    expect(url.hostname).toBe('santafeciudad.gov.ar');
    expect(url.search).toBe('');
    expect(action.url).not.toMatch(/-31\.|-60\.|origin|destination|query|account|user|voy_sid/i);
    expect(consumeExternalAction(action)).toBe(action.url);
    expect(() => consumeExternalAction(action)).toThrow('confirmation_expired_or_used');
  });

  test('official transit handoff expires fail closed', () => {
    const action = createOfficialHandoffAction('santa_fe_municipal_transit');
    action.expiresAt = Date.now() - 1;
    expect(() => consumeExternalAction(action)).toThrow('confirmation_expired_or_used');
  });
});
