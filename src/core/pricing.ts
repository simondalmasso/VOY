export interface MeterFare { bajada: number; ficha: number; distFicha: number }
export function regulatedMeterFare(distanceKm: number, fare: MeterFare): number {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) throw new Error('invalid_distance');
  if (![fare.bajada, fare.ficha, fare.distFicha].every(value => Number.isFinite(value) && value > 0)) throw new Error('invalid_fare');
  const meters = distanceKm * 1000;
  return Math.round(fare.bajada + Math.ceil(meters / fare.distFicha) * fare.ficha);
}
export function formatArs(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
}
