import { afterEach, describe, expect, test } from 'bun:test';
import { providerOptions } from '../src/features/providers/provider.registry';
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const fares = { fare_registry: { taxi: { diurno: { bajada: 1790, ficha: 179, distFicha: 130 }, source: 'Resolución 217/2026', verified_at: '2026-08-04', status: 'regulated_current' }, remis: { diurno: { bajada: 1600, ficha: 160, distFicha: 130 }, source: 'Resolución 365/2026', verified_at: '2026-08-04', status: 'regulated_current' } } };
const providers = { providers: { uber: { name: 'Uber', available: true, verified: true, availability_status: 'verified_current', verified_at: '2026-08-04', price_status: 'app_only' }, didi: { name: 'DiDi', available: true, verified: true, availability_status: 'verified_current', verified_at: '2026-08-04', price_status: 'app_only' } } };
const route = { source: 'osrm_route' as const, distanceKm: 3.2, durationMin: 11, geometry: [{ lat: -31.63, lon: -60.70 }, { lat: -31.64, lon: -60.69 }] };
describe('provider ranking and price truthfulness', () => {
  test('apps keep APP_ONLY internal truth without price copy or inherited ETA', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL) => new Response(JSON.stringify(String(input).includes('providers.json') ? providers : fares), { status: 200 })) as unknown as typeof fetch;
    const apps = await providerOptions(route, 'app');
    expect(apps.map(option => option.id)).toEqual(['taxi', 'remis', 'uber', 'didi']);
    const appOnly = apps.filter(option => option.id === 'uber' || option.id === 'didi');
    expect(appOnly.every(option => option.price.kind === 'app_only' && option.external)).toBe(true);
    expect(appOnly.every(option => option.etaMin === null)).toBe(true);
    expect(appOnly.every(option => !('label' in option.price))).toBe(true);
    expect(appOnly.every(option => !/precio|\b\d+\s*min/i.test(option.detail))).toBe(true);
    expect(apps.filter(option => option.id === 'taxi' || option.id === 'remis').every(option => option.external === false && option.price.kind === 'regulated_estimate')).toBe(true);
    const bus = await providerOptions(null, 'bus');
    expect(bus).toHaveLength(1); expect(bus[0]?.available).toBe(false); expect(bus[0]?.etaMin).toBeNull(); expect(bus[0]?.detail).toContain('no calcula ni sugiere');
  });
});
