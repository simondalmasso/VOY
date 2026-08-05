export type TravelMode = 'walk' | 'bike' | 'car' | 'taxi' | 'remis' | 'app' | 'bus';
const SPEED_KMH: Readonly<Record<TravelMode, number>> = Object.freeze({ walk: 4.7, bike: 14, car: 24, taxi: 24, remis: 24, app: 24, bus: 16 });

export function estimateDurationMinutes(distanceKm: number, mode: TravelMode): number {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) throw new Error('invalid_distance');
  const minutes = distanceKm / SPEED_KMH[mode] * 60;
  return Math.max(1, Math.round(minutes));
}
