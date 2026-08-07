import { describe, expect, test } from 'bun:test';
import { collectiveAvailability } from '../src/features/collective/collective.service';
describe('collective safety gate', () => {
  test('does not recommend stale bus lines', () => {
    expect(collectiveAvailability.enabled).toBe(false);
    expect(collectiveAvailability.lineRecommendations).toHaveLength(0);
    expect(collectiveAvailability.reason).toContain('datos actuales verificables');
    expect(collectiveAvailability.payment).toBe('SUBE');
  });
});
