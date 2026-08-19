import { approximatelyEqual, haversineKm, isInsideSantaFe, type Coordinates } from '../../core/coordinates';
import { estimateDurationMinutes, type TravelMode } from '../../core/duration';
import type { RouteResult } from './trip.types';

interface RoutePayload { ok?: boolean; distance_km?: unknown; duration_min?: unknown; geometry?: unknown }
const ROUTE_ENDPOINT_TOLERANCE_DEGREES = 0.002;
function isFiniteNumber(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function parseGeometry(value: unknown): Coordinates[] {
  if (!Array.isArray(value)) return [];
  const points: Coordinates[] = [];
  for (const item of value) {
    if (!Array.isArray(item) || item.length !== 2 || !isFiniteNumber(item[0]) || !isFiniteNumber(item[1])) return [];
    points.push({ lon: item[0], lat: item[1] });
  }
  return points;
}
function validRouteGeometry(geometry: Coordinates[], origin: Coordinates, destination: Coordinates): boolean {
  return geometry.length >= 2 && geometry.length <= 20_000 && geometry.every(isInsideSantaFe)
    && approximatelyEqual(geometry[0]!, origin, ROUTE_ENDPOINT_TOLERANCE_DEGREES)
    && approximatelyEqual(geometry.at(-1)!, destination, ROUTE_ENDPOINT_TOLERANCE_DEGREES);
}
function straightLine(origin: Coordinates, destination: Coordinates, mode: TravelMode): RouteResult {
  const distanceKm = haversineKm(origin, destination);
  return { source: 'straight_line_estimate', distanceKm, durationMin: estimateDurationMinutes(distanceKm, mode), geometry: [] };
}

export async function resolveRoute(origin: Coordinates, destination: Coordinates, mode: TravelMode, signal?: AbortSignal): Promise<RouteResult> {
  if (!isInsideSantaFe(origin) || !isInsideSantaFe(destination)) throw new Error('outside_coverage');
  if (mode === 'bus') throw new Error('bus_routing_unavailable');
  if (mode === 'bike') return straightLine(origin, destination, mode);
  const profile = mode === 'walk' ? 'foot' : 'driving';
  try {
    const response = await fetch('/api/route', {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ origin, destination, profile })
    });
    if (response.ok) {
      const payload = await response.json() as RoutePayload;
      const distanceKm = payload.distance_km;
      const upstreamDuration = payload.duration_min;
      const geometry = parseGeometry(payload.geometry);
      if (payload.ok && isFiniteNumber(distanceKm) && distanceKm >= 0 && isFiniteNumber(upstreamDuration) && upstreamDuration >= 0 && validRouteGeometry(geometry, origin, destination)) {
        return { source: 'osrm_route', distanceKm, durationMin: Math.max(1, Math.round(upstreamDuration)), geometry };
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
  }
  return straightLine(origin, destination, mode);
}
