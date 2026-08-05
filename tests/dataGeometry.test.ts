import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { isInsideSantaFe } from '../src/core/coordinates';
import { normalizeLocalDestination } from '../src/features/destination/destination.service';

describe('territorial data', () => {
  test('runtime contains destinations but no operational bus or bike arrays', () => {
    const data = JSON.parse(readFileSync('public/cities/santa-fe/transport.json', 'utf8')) as { landmarks: Array<Record<string, unknown>>; bus_stops: unknown[]; bike_stations: unknown[]; status: string; components: Record<string, { status: string }> };
    for (const landmark of data.landmarks) {
      expect(isInsideSantaFe({ lat: Number(landmark.lat), lon: Number(landmark.lon) })).toBe(true);
      const normalized = normalizeLocalDestination(landmark);
      expect(normalized).not.toBeNull();
      if (normalized?.verified) {
        expect(String(normalized.source || '')).not.toBe('');
        expect(String(normalized.verifiedAt || '')).not.toBe('');
      }
      if (landmark.verified === true && !landmark.verified_at) {
        expect(normalized?.verified).toBe(false);
        expect(normalized?.verifiedAt).toBeUndefined();
      }
    }
    expect(data.bus_stops).toEqual([]);
    expect(data.bike_stations).toEqual([]);
    expect(data.components.bus_routes?.status).toBe('unavailable');
    expect(data.status).toContain('no_bus_or_bike_operational_data');
  });
});
