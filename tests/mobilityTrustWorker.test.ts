import { describe, expect, test } from 'bun:test';
import { handleMobilityTrust } from '../worker/routes/mobility-trust';

describe('mobility trust API', () => {
  test('is read-only and keeps Santa Fe bus activation off', async () => {
    const response = handleMobilityTrust(new Request('https://voy.test/api/mobility/trust'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = await response.json() as any;
    expect(body.ok).toBeTrue();
    expect(body.operational_bus_activation).toBeFalse();
    expect(body.mobility_database_role).toBe('DISCOVERY_ONLY');
    expect(body.gtfs_validator.version).toBe('8.0.1');
    expect(body.gtfs_validator.sha256).toBe('19293ddd9b6f954f216d4f12054bd8a3232921751c4484339e339764a91000e2');
    expect(body.santa_fe.bus_activation).toBeFalse();
    expect(body.santa_fe.sources[0].trust_status).toBe('UNAVAILABLE');
  });

  test('rejects mutation methods', async () => {
    const response = handleMobilityTrust(new Request('https://voy.test/api/mobility/trust', { method: 'POST' }));
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET');
    const body = await response.json() as any;
    expect(body.error).toBe('method_not_allowed');
  });
});
