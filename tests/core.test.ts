import { describe, expect, test } from 'bun:test';
import { approximatelyEqual, haversineKm, isInsideSantaFe } from '../src/core/coordinates';
import { estimateDurationMinutes } from '../src/core/duration';
import { regulatedMeterFare } from '../src/core/pricing';

describe('deterministic mobility core', () => {
  test('validates Santa Fe coordinates and route endpoints', () => {
    expect(isInsideSantaFe({ lat: -31.63, lon: -60.70 })).toBe(true);
    expect(isInsideSantaFe({ lat: -34.60, lon: -58.38 })).toBe(false);
    expect(approximatelyEqual({ lat: -31.63, lon: -60.70 }, { lat: -31.631, lon: -60.699 })).toBe(true);
  });
  test('distance is finite, symmetric and non-negative', () => {
    const a = { lat: -31.63, lon: -60.70 }; const b = { lat: -31.64, lon: -60.68 };
    expect(haversineKm(a, b)).toBeGreaterThan(0);
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10);
  });
  test('duration and regulated fare are deterministic', () => {
    expect(estimateDurationMinutes(4.7, 'walk')).toBe(60);
    expect(regulatedMeterFare(1.3, { bajada: 1790, ficha: 179, distFicha: 130 })).toBe(3580);
  });
  test('invalid values fail closed', () => {
    expect(() => estimateDurationMinutes(-1, 'app')).toThrow('invalid_distance');
    expect(() => regulatedMeterFare(2, { bajada: 0, ficha: 1, distFicha: 1 })).toThrow('invalid_fare');
  });
});
