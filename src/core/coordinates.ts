import type { Coordinates } from './territory';
export type { Coordinates } from './territory';

/** Reference-city bounds only. Never use this as the Argentina product boundary. */
export const SANTA_FE_REFERENCE_BBOX = Object.freeze({ minLat: -31.67, maxLat: -31.57, minLon: -60.75, maxLon: -60.65 });
/** @deprecated compatibility alias for Santa Fe profile/tests only. */
export const SANTA_FE_BBOX = SANTA_FE_REFERENCE_BBOX;

export function isFiniteCoordinate(value: Coordinates): boolean {
  return Number.isFinite(value.lat) && Number.isFinite(value.lon) && value.lat >= -90 && value.lat <= 90 && value.lon >= -180 && value.lon <= 180;
}

/** Reference-city membership helper. It is not an operational national coverage check. */
export function isInsideSantaFe(value: Coordinates): boolean {
  return isFiniteCoordinate(value)
    && value.lat >= SANTA_FE_REFERENCE_BBOX.minLat && value.lat <= SANTA_FE_REFERENCE_BBOX.maxLat
    && value.lon >= SANTA_FE_REFERENCE_BBOX.minLon && value.lon <= SANTA_FE_REFERENCE_BBOX.maxLon;
}

export function haversineKm(a: Coordinates, b: Coordinates): number {
  const radius = 6371;
  const toRad = (degrees: number) => degrees * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const result = radius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  if (!Number.isFinite(result) || result < 0) throw new Error('invalid_distance_result');
  return result;
}

export function approximatelyEqual(a: Coordinates, b: Coordinates, toleranceDegrees = 0.02): boolean {
  return Math.abs(a.lat - b.lat) <= toleranceDegrees && Math.abs(a.lon - b.lon) <= toleranceDegrees;
}
