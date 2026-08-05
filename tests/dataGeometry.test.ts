import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { isInsideSantaFe } from '../src/core/coordinates';

describe('territorial data', () => {
  test('landmarks are inside coverage and verified claims have source/date', () => {
    const data = JSON.parse(readFileSync('public/cities/santa-fe/transport.json', 'utf8')) as { landmarks: Array<Record<string, unknown>>; bus_stops: unknown[] };
    for (const landmark of data.landmarks) {
      expect(isInsideSantaFe({ lat: Number(landmark.lat), lon: Number(landmark.lon) })).toBe(true);
      if (landmark.verified === true) { expect(String(landmark.source || '')).not.toBe(''); expect(String(landmark.verified_at || '')).not.toBe(''); }
    }
    expect(data.bus_stops.length).toBeGreaterThan(0);
  });
});
