import type { TravelMode } from '../../core/duration';
import { regulatedMeterFare } from '../../core/pricing';
import type { RouteResult } from '../trip/trip.types';
import type { ProviderOptionModel } from './provider.types';

interface MeterRegistry { diurno: { bajada: number; ficha: number; distFicha: number }; source: string; verified_at: string; status: string }
interface FarePayload { fare_registry: { taxi: MeterRegistry; remis: MeterRegistry } }
interface ProviderRecord { name?: string; available?: boolean; verified?: boolean; availability_status?: string; verified_at?: string; expires_at?: string; price_status?: string }
interface ProviderPayload { providers?: Record<string, ProviderRecord> }
type CoverageKey = '_default' | 'santa-fe';
const registryCache = new Map<CoverageKey, Promise<{ fares: FarePayload; providers: ProviderPayload }>>();

async function loadRegistry(coverageKey: CoverageKey): Promise<{ fares: FarePayload; providers: ProviderPayload }> {
  const existing = registryCache.get(coverageKey);
  if (existing) return existing;
  const folder = coverageKey === 'santa-fe' ? 'santa-fe' : '_default';
  const pending = Promise.all([
    fetch(`/cities/${folder}/fares.json`, { cache: 'no-cache' }),
    fetch(`/cities/${folder}/providers.json`, { cache: 'no-cache' })
  ]).then(async ([fareResponse, providerResponse]) => {
    if (!fareResponse.ok || !providerResponse.ok) throw new Error('provider_registry_unavailable');
    return { fares: await fareResponse.json() as FarePayload, providers: await providerResponse.json() as ProviderPayload };
  }).catch(error => { registryCache.delete(coverageKey); throw error; });
  registryCache.set(coverageKey, pending);
  return pending;
}

function dateCurrent(value: string | undefined): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const end = Date.parse(`${value}T23:59:59Z`);
  return Number.isFinite(end) && end >= Date.now();
}
function currentApp(record: ProviderRecord | undefined): boolean {
  return record?.available === true && record.verified === true && record.availability_status === 'verified_current'
    && record.price_status === 'app_only' && typeof record.verified_at === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(record.verified_at)
    && dateCurrent(record.expires_at);
}
function currentMeter(record: MeterRegistry | undefined): record is MeterRegistry {
  return Boolean(record && record.status === 'regulated_current' && record.source && /^\d{4}-\d{2}-\d{2}$/.test(record.verified_at)
    && Number.isFinite(record.diurno?.bajada) && Number.isFinite(record.diurno?.ficha) && Number.isFinite(record.diurno?.distFicha));
}
function visibleForMode(option: ProviderOptionModel, selected: TravelMode): boolean {
  if (selected === 'app') return option.id === 'uber' || option.id === 'didi' || option.id === 'taxi' || option.id === 'remis';
  return option.mode === selected;
}

export async function providerOptions(route: RouteResult | null, selectedMode: TravelMode, coverageKey: CoverageKey = '_default'): Promise<ProviderOptionModel[]> {
  if (selectedMode === 'bus') return [{ id: 'bus', name: 'Colectivo', mode: 'bus', available: false, etaMin: null, price: { kind: 'unavailable', label: 'Sin datos locales verificados' }, detail: 'VOY no afirma líneas, paradas, frecuencias ni tarifas sin una fuente territorial vigente.', external: false, rank: 99 }];
  if (!route) return [];

  const baseMobility: ProviderOptionModel[] = [
    { id: 'walk', name: 'Caminar', mode: 'walk', available: route.distanceKm <= 8, etaMin: route.durationMin, price: { kind: 'unavailable', label: 'Sin costo monetario' }, detail: route.source === 'osrm_route' ? 'Tiempo calculado sobre una ruta peatonal.' : 'Tiempo estimado sobre distancia en línea recta; no se dibuja como recorrido.', external: false, rank: 30 },
    { id: 'bike', name: 'Bicicleta', mode: 'bike', available: route.distanceKm <= 20, etaMin: route.durationMin, price: { kind: 'unavailable', label: 'Sin costo monetario' }, detail: 'Referencia de tiempo; no afirma ciclovías, infraestructura ni un recorrido vial para bicicleta.', external: false, rank: 31 }
  ];
  if (coverageKey !== 'santa-fe') return baseMobility.filter(option => visibleForMode(option, selectedMode));

  const { fares, providers } = await loadRegistry('santa-fe');
  const taxi = fares.fare_registry?.taxi;
  const remis = fares.fare_registry?.remis;
  const uber = providers.providers?.uber;
  const didi = providers.providers?.didi;
  const all: ProviderOptionModel[] = [
    { id: 'uber', name: uber?.name || 'Uber', mode: 'app', available: currentApp(uber), etaMin: null, price: { kind: 'app_only' }, detail: currentApp(uber) ? 'Presencia territorial verificada; precio y disponibilidad puntual se consultan en la app.' : 'Presencia territorial actual no verificada.', external: true, rank: 20 },
    { id: 'didi', name: didi?.name || 'DiDi', mode: 'app', available: currentApp(didi), etaMin: null, price: { kind: 'app_only' }, detail: currentApp(didi) ? 'Presencia territorial verificada; precio y disponibilidad puntual se consultan en la app.' : 'Presencia territorial actual no verificada.', external: true, rank: 21 },
    { id: 'taxi', name: 'Taxi', mode: 'taxi', available: currentMeter(taxi), etaMin: route.durationMin, price: currentMeter(taxi) ? { kind: 'regulated_estimate', value: regulatedMeterFare(route.distanceKm, taxi.diurno), source: taxi.source, verifiedAt: taxi.verified_at } : { kind: 'unavailable', label: 'Tarifa no verificada' }, detail: 'Referencia diurna regulada; no reserva un vehículo y manda el taxímetro.', external: false, rank: 10 },
    { id: 'remis', name: 'Remis', mode: 'remis', available: currentMeter(remis), etaMin: route.durationMin, price: currentMeter(remis) ? { kind: 'regulated_estimate', value: regulatedMeterFare(route.distanceKm, remis.diurno), source: remis.source, verifiedAt: remis.verified_at } : { kind: 'unavailable', label: 'Tarifa no verificada' }, detail: 'Referencia regulada; no reserva y la disponibilidad se confirma con el prestador.', external: false, rank: 11 },
    ...baseMobility
  ];
  return all.filter(option => visibleForMode(option, selectedMode)).sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
}
