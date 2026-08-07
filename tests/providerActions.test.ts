import { describe, expect, test } from 'bun:test';
import { consumeExternalAction, createExternalAction } from '../src/features/providers/provider.actions';
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
});
