import type { TravelMode } from '../../core/duration';
import { regulatedMeterFare } from '../../core/pricing';
import type { RouteResult } from '../trip/trip.types';
import type { ProviderOptionModel } from './provider.types';

interface MeterRegistry { diurno: { bajada: number; ficha: number; distFicha: number }; source: string; verified_at: string; status: string }
interface FarePayload { fare_registry: { taxi: MeterRegistry; remis: MeterRegistry } }
export interface ProviderRecord { name?: string; available?: boolean; verified?: boolean; availability_status?: string; verified_at?: string; price_status?: string }
interface ProviderPayload { providers?: Record<string, ProviderRecord> }
export const PROVIDER_AVAILABILITY_MAX_AGE_DAYS = 30;
const DAY_MS = 86_400_000;
let registryCache: Promise<{ fares: FarePayload; providers: ProviderPayload }> | null = null;

async function loadRegistry(): Promise<{ fares: FarePayload; providers: ProviderPayload }> {
  registryCache ||= Promise.all([
    fetch('/cities/santa-fe/fares.json', { cache: 'no-cache' }),
    fetch('/cities/santa-fe/providers.json', { cache: 'no-cache' })
  ]).then(async ([fareResponse, providerResponse]) => {
    if (!fareResponse.ok || !providerResponse.ok) throw new Error('provider_registry_unavailable');
    return { fares: await fareResponse.json() as FarePayload, providers: await providerResponse.json() as ProviderPayload };
  }).catch(error => { registryCache = null; throw error; });
  return registryCache;
}

export function providerAvailabilityCurrent(record: ProviderRecord | undefined, now = Date.now()): boolean {
  if (record?.available !== true || record.verified !== true || record.availability_status !== 'verified_current' || record.price_status !== 'app_only') return false;
  if (typeof record.verified_at !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(record.verified_at)) return false;
  const verified = Date.parse(`${record.verified_at}T00:00:00Z`);
  if (!Number.isFinite(verified) || !Number.isFinite(now) || now < verified) return false;
  return now - verified <= PROVIDER_AVAILABILITY_MAX_AGE_DAYS * DAY_MS;
}

function currentMeter(record: MeterRegistry): boolean {
  return record.status === 'regulated_current' && Boolean(record.source) && /^\d{4}-\d{2}-\d{2}$/.test(record.verified_at);
}
function visibleForMode(option: ProviderOptionModel, selected: TravelMode): boolean {
  if (selected === 'app') return option.id === 'uber' || option.id === 'didi' || option.id === 'taxi' || option.id === 'remis';
  return option.mode === selected;
}

export async function providerOptions(route: RouteResult | null, selectedMode: TravelMode): Promise<ProviderOptionModel[]> {
  if (selectedMode === 'bus') return [{ id: 'bus', name: 'Colectivo', mode: 'bus', available: false, etaMin: null, price: { kind: 'unavailable', label: 'Sin recomendación disponible' }, detail: 'Sin recorridos, paradas, frecuencias ni espera verificables. VOY no calcula ni sugiere una línea.', external: false, rank: 99 }];
  if (!route) return [];
  const { fares, providers } = await loadRegistry();
  const taxi = fares.fare_registry.taxi;
  const remis = fares.fare_registry.remis;
  const uber = providers.providers?.uber;
  const didi = providers.providers?.didi;
  const uberCurrent = providerAvailabilityCurrent(uber);
  const didiCurrent = providerAvailabilityCurrent(didi);
  const all: ProviderOptionModel[] = [
    { id: 'uber', name: uber?.name || 'Uber', mode: 'app', available: uberCurrent, etaMin: null, price: { kind: 'app_only' }, detail: uberCurrent ? 'Disponibilidad verificada para abrir la app.' : 'Disponibilidad actual no verificada.', external: true, rank: 20 },
    { id: 'didi', name: didi?.name || 'DiDi', mode: 'app', available: didiCurrent, etaMin: null, price: { kind: 'app_only' }, detail: didiCurrent ? 'Disponibilidad verificada para abrir la app.' : 'Disponibilidad actual no verificada.', external: true, rank: 21 },
    { id: 'taxi', name: 'Taxi', mode: 'taxi', available: currentMeter(taxi), etaMin: route.durationMin, price: currentMeter(taxi) ? { kind: 'regulated_estimate', value: regulatedMeterFare(route.distanceKm, taxi.diurno), source: taxi.source, verifiedAt: taxi.verified_at } : { kind: 'unavailable', label: 'Tarifa no verificada' }, detail: 'Referencia diurna regulada; no reserva un vehículo y manda el taxímetro.', external: false, rank: 10 },
    { id: 'remis', name: 'Remis', mode: 'remis', available: currentMeter(remis), etaMin: route.durationMin, price: currentMeter(remis) ? { kind: 'regulated_estimate', value: regulatedMeterFare(route.distanceKm, remis.diurno), source: remis.source, verifiedAt: remis.verified_at } : { kind: 'unavailable', label: 'Tarifa no verificada' }, detail: 'Referencia diurna regulada; no reserva y la disponibilidad se confirma con el prestador.', external: false, rank: 11 },
    { id: 'walk', name: 'Caminar', mode: 'walk', available: route.distanceKm <= 8, etaMin: route.durationMin, price: { kind: 'unavailable', label: 'Sin costo monetario' }, detail: route.source === 'osrm_route' ? 'Tiempo calculado sobre una ruta peatonal.' : 'Tiempo estimado sobre distancia en línea recta; no se dibuja como recorrido.', external: false, rank: 30 },
    { id: 'bike', name: 'Bicicleta', mode: 'bike', available: route.distanceKm <= 20, etaMin: route.durationMin, price: { kind: 'unavailable', label: 'Sin costo monetario' }, detail: 'Tiempo estimado sobre distancia en línea recta; no se presenta como ciclovía o recorrido vial.', external: false, rank: 31 }
  ];
  return all.filter(option => visibleForMode(option, selectedMode)).sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
}
