import { approximatelyEqual, haversineKm, isInsideSantaFe, type Coordinates } from '../../core/coordinates';
import { estimateDurationMinutes, type TravelMode } from '../../core/duration';
import type { RouteResult } from './trip.types';

interface RoutePayload { ok?: boolean; distance_km?: number; duration_min?: number; geometry?: Array<[number, number]> }
function validRouteGeometry(geometry: Coordinates[], origin: Coordinates, destination: Coordinates): boolean {
  return geometry.length >= 2 && geometry.length <= 20_000 && geometry.every(isInsideSantaFe)
    && approximatelyEqual(geometry[0]!, origin) && approximatelyEqual(geometry.at(-1)!, destination);
}

export async function resolveRoute(origin: Coordinates, destination: Coordinates, mode: TravelMode, signal?: AbortSignal): Promise<RouteResult> {
  if (!isInsideSantaFe(origin) || !isInsideSantaFe(destination)) throw new Error('outside_coverage');
  const profile = mode === 'walk' ? 'foot' : mode === 'bike' ? 'cycling' : 'driving';
  try {
    const response = await fetch('/api/route', {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ origin, destination, profile })
    });
    if (response.ok) {
      const payload = await response.json() as RoutePayload;
      const distanceKm = Number(payload.distance_km);
      const upstreamDuration = Number(payload.duration_min);
      const geometry = (payload.geometry || []).map(([lon, lat]) => ({ lat, lon }));
      if (payload.ok && Number.isFinite(distanceKm) && distanceKm >= 0 && Number.isFinite(upstreamDuration) && upstreamDuration >= 0 && validRouteGeometry(geometry, origin, destination)) {
        const durationMin = mode === 'bike' || mode === 'bus' ? estimateDurationMinutes(distanceKm, mode) : Math.max(1, Math.round(upstreamDuration));
        return { source: 'osrm_route', distanceKm, durationMin, geometry };
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
  }
  const distanceKm = haversineKm(origin, destination);
  return { source: 'straight_line_estimate', distanceKm, durationMin: estimateDurationMinutes(distanceKm, mode), geometry: [origin, destination] };
}
