import type { TravelMode } from '../../core/duration';
import { regulatedMeterFare } from '../../core/pricing';
import type { RouteResult } from '../trip/trip.types';
import type { ProviderOptionModel } from './provider.types';

interface FarePayload {
  fare_registry: {
    taxi: { diurno: { bajada: number; ficha: number; distFicha: number }; source: string; verified_at: string };
    remis: { diurno: { bajada: number; ficha: number; distFicha: number }; source: string; verified_at: string };
  }
}
let fares: FarePayload | null = null;
async function loadFares(): Promise<FarePayload> {
  if (fares) return fares;
  const response = await fetch('/cities/santa-fe/fares.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error('fare_registry_unavailable');
  fares = await response.json() as FarePayload;
  return fares;
}

function visibleForMode(option: ProviderOptionModel, selected: TravelMode): boolean {
  if (selected === 'app') return option.id === 'uber' || option.id === 'didi' || option.id === 'taxi' || option.id === 'remis';
  return option.mode === selected;
}

export async function providerOptions(route: RouteResult, selectedMode: TravelMode): Promise<ProviderOptionModel[]> {
  const registry = await loadFares();
  const taxi = registry.fare_registry.taxi;
  const remis = registry.fare_registry.remis;
  const all: ProviderOptionModel[] = [
    { id: 'uber', name: 'Uber', mode: 'app', available: true, etaMin: route.durationMin, price: { kind: 'app_only', label: 'Precio en la app' }, detail: 'Disponibilidad verificada; el precio final se consulta en Uber.', external: true, rank: 20 },
    { id: 'didi', name: 'DiDi', mode: 'app', available: true, etaMin: route.durationMin, price: { kind: 'app_only', label: 'Precio en la app' }, detail: 'Disponibilidad verificada; el precio final se consulta en DiDi.', external: true, rank: 21 },
    { id: 'taxi', name: 'Taxi', mode: 'taxi', available: true, etaMin: route.durationMin, price: { kind: 'regulated_estimate', value: regulatedMeterFare(route.distanceKm, taxi.diurno), source: taxi.source, verifiedAt: taxi.verified_at }, detail: 'Estimación diurna con tarifa regulada; manda el taxímetro.', external: false, rank: 10 },
    { id: 'remis', name: 'Remis', mode: 'remis', available: true, etaMin: route.durationMin, price: { kind: 'regulated_estimate', value: regulatedMeterFare(route.distanceKm, remis.diurno), source: remis.source, verifiedAt: remis.verified_at }, detail: 'Estimación diurna regulada; confirmar disponibilidad con el prestador.', external: false, rank: 11 },
    { id: 'walk', name: 'Caminar', mode: 'walk', available: route.distanceKm <= 8, etaMin: Math.max(1, Math.round(route.distanceKm / 4.7 * 60)), price: { kind: 'unavailable', label: 'Sin costo' }, detail: route.source === 'osrm_route' ? 'Tiempo sobre distancia de ruta.' : 'Tiempo sobre línea recta estimada.', external: false, rank: 30 },
    { id: 'bike', name: 'Bicicleta', mode: 'bike', available: route.distanceKm <= 20, etaMin: Math.max(1, Math.round(route.distanceKm / 14 * 60)), price: { kind: 'unavailable', label: 'Sin costo estimado' }, detail: route.source === 'osrm_route' ? 'Tiempo sobre distancia de ruta.' : 'Tiempo sobre línea recta estimada.', external: false, rank: 31 },
    { id: 'bus', name: 'Colectivo', mode: 'bus', available: false, etaMin: 0, price: { kind: 'unavailable', label: 'Sin recomendación disponible' }, detail: 'Desactivado hasta contar con rutas, líneas, paradas y sentido vigentes.', external: false, rank: 99 }
  ];
  return all.filter(option => visibleForMode(option, selectedMode)).sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
}
