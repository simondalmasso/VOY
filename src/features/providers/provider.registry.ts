import type { TravelMode } from '../../core/duration';
import { regulatedMeterFare } from '../../core/pricing';
import { capabilitySnapshot, type CoverageKey } from '../capabilities/capabilityBroker';
import type { RouteResult } from '../trip/trip.types';
import { officialHandoffPresentation } from './officialHandoffs';
import type { ProviderOptionModel } from './provider.types';

interface MeterRegistry { diurno: { bajada: number; ficha: number; distFicha: number }; source: string; verified_at: string; status: string }
interface FarePayload { fare_registry?: { taxi?: MeterRegistry; remis?: MeterRegistry } }
const fareCache = new Map<CoverageKey, Promise<FarePayload>>();

function normalizeCoverageKey(value: string): CoverageKey {
  return value === 'santa-fe' ? 'santa-fe' : '_default';
}

async function loadFares(coverageKey: CoverageKey): Promise<FarePayload> {
  const existing = fareCache.get(coverageKey);
  if (existing) return existing;
  const pending = fetch(`/cities/${coverageKey}/fares.json`, { cache: 'no-cache' })
    .then(async response => {
      if (!response.ok) throw new Error('fare_registry_unavailable');
      return response.json() as Promise<FarePayload>;
    })
    .catch(error => { fareCache.delete(coverageKey); throw error; });
  fareCache.set(coverageKey, pending);
  return pending;
}

function currentMeter(record: MeterRegistry | undefined): record is MeterRegistry {
  return Boolean(record && record.status === 'regulated_current' && record.source && /^\d{4}-\d{2}-\d{2}$/.test(record.verified_at)
    && Number.isFinite(record.diurno?.bajada) && Number.isFinite(record.diurno?.ficha) && Number.isFinite(record.diurno?.distFicha));
}
function visibleForMode(option: ProviderOptionModel, selected: TravelMode): boolean {
  if (selected === 'app') return option.id === 'uber' || option.id === 'didi' || option.id === 'taxi' || option.id === 'remis';
  return option.mode === selected;
}

export async function providerOptions(route: RouteResult | null, selectedMode: TravelMode, coverageKey = '_default'): Promise<ProviderOptionModel[]> {
  const normalizedCoverageKey = normalizeCoverageKey(coverageKey);
  const capabilities = await capabilitySnapshot(normalizedCoverageKey);
  if (selectedMode === 'bus') return [{
    id: 'bus', name: 'Colectivo', mode: 'bus', available: false, etaMin: null,
    price: { kind: 'unavailable', label: capabilities.publicTransport === 'VERIFIED_CURRENT' ? 'Sin planificación verificada' : 'Sin datos locales verificados' },
    detail: 'VOY no afirma líneas, paradas, frecuencias ni tarifas sin una fuente territorial vigente y un planificador validado.', external: false,
    handoff: normalizedCoverageKey === 'santa-fe' ? officialHandoffPresentation('santa_fe_municipal_transit') : null,
    rank: 99
  }];
  if (!route) return [];

  const baseMobility: ProviderOptionModel[] = [
    { id: 'walk', name: 'Caminar', mode: 'walk', available: route.distanceKm <= 8, etaMin: route.durationMin, price: { kind: 'unavailable', label: 'Sin costo monetario' }, detail: route.source === 'osrm_route' ? 'Tiempo calculado sobre una ruta peatonal.' : 'Tiempo estimado sobre distancia en línea recta; no se dibuja como recorrido.', external: false, rank: 30 },
    { id: 'bike', name: 'Bicicleta', mode: 'bike', available: route.distanceKm <= 20, etaMin: route.durationMin, price: { kind: 'unavailable', label: 'Sin costo monetario' }, detail: 'Referencia de tiempo; no afirma ciclovías, infraestructura ni un recorrido vial para bicicleta.', external: false, rank: 31 }
  ];
  if (normalizedCoverageKey !== 'santa-fe') return baseMobility.filter(option => visibleForMode(option, selectedMode));

  const fares = await loadFares('santa-fe');
  const taxi = fares.fare_registry?.taxi;
  const remis = fares.fare_registry?.remis;
  const taxiCapability = capabilities.providers.find(item => item.id === 'taxi');
  const remisCapability = capabilities.providers.find(item => item.id === 'remis');
  const uber = capabilities.providers.find(item => item.id === 'uber');
  const didi = capabilities.providers.find(item => item.id === 'didi');
  const taxiCurrent = taxiCapability?.quoteClass === 'REGULATED_FARE' && taxiCapability.availability === 'VERIFIED_CURRENT' && currentMeter(taxi);
  const remisCurrent = remisCapability?.quoteClass === 'REGULATED_FARE' && remisCapability.availability === 'VERIFIED_CURRENT' && currentMeter(remis);
  const uberCurrent = uber?.availability === 'VERIFIED_CURRENT' && uber.quoteClass === 'APP_ONLY';
  const didiCurrent = didi?.availability === 'VERIFIED_CURRENT' && didi.quoteClass === 'APP_ONLY';

  const all: ProviderOptionModel[] = [
    { id: 'uber', name: uber?.name || 'Uber', mode: 'app', available: uberCurrent, etaMin: null, price: { kind: 'app_only' }, detail: uberCurrent ? 'Presencia territorial verificada; tarifa y disponibilidad puntual se consultan en la app.' : 'Presencia territorial actual no verificada.', external: true, rank: 20 },
    { id: 'didi', name: didi?.name || 'DiDi', mode: 'app', available: didiCurrent, etaMin: null, price: { kind: 'app_only' }, detail: didiCurrent ? 'Presencia territorial verificada; tarifa y disponibilidad puntual se consultan en la app.' : 'Presencia territorial actual no verificada.', external: true, rank: 21 },
    { id: 'taxi', name: 'Taxi', mode: 'taxi', available: taxiCurrent, etaMin: route.durationMin, price: taxiCurrent ? { kind: 'regulated_estimate', value: regulatedMeterFare(route.distanceKm, taxi.diurno), source: taxi.source, verifiedAt: taxi.verified_at } : { kind: 'unavailable', label: 'Tarifa no verificada' }, detail: 'Referencia diurna regulada; no reserva un vehículo y manda el taxímetro.', external: false, rank: 10 },
    { id: 'remis', name: 'Remis', mode: 'remis', available: remisCurrent, etaMin: route.durationMin, price: remisCurrent ? { kind: 'regulated_estimate', value: regulatedMeterFare(route.distanceKm, remis.diurno), source: remis.source, verifiedAt: remis.verified_at } : { kind: 'unavailable', label: 'Tarifa no verificada' }, detail: 'Referencia regulada; no reserva y la disponibilidad se confirma con el prestador.', external: false, rank: 11 },
    ...baseMobility
  ];
  return all.filter(option => visibleForMode(option, selectedMode)).sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
}
