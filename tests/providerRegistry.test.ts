import { afterEach, describe, expect, test } from 'bun:test';
import { clearCapabilityCacheForTests } from '../src/features/capabilities/capabilityBroker';
import { providerOptions } from '../src/features/providers/provider.registry';
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; clearCapabilityCacheForTests(); });
const fares = { fare_registry: { taxi: { diurno: { bajada: 1790, ficha: 179, distFicha: 130 }, source: 'Resolución 217/2026', verified_at: '2026-08-04', status: 'regulated_current' }, remis: { diurno: { bajada: 1600, ficha: 160, distFicha: 130 }, source: 'Resolución 365/2026', verified_at: '2026-08-04', status: 'regulated_current' } } };
const providers = { providers: { uber: { name: 'Uber', available: true, verified: true, availability_status: 'verified_current', verified_at: '2026-08-04', expires_at: '2099-12-31', price_status: 'app_only' }, didi: { name: 'DiDi', available: true, verified: true, availability_status: 'verified_current', verified_at: '2026-08-04', expires_at: '2099-12-31', price_status: 'app_only' } } };
const route = { source: 'osrm_route' as const, distanceKm: 3.2, durationMin: 11, geometry: [{ lat: -31.63, lon: -60.70 }, { lat: -31.64, lon: -60.69 }] };
describe('provider ranking and price truthfulness', () => {
  test('national base never inherits Santa Fe providers, regulated fares, brand availability or transit handoff', async () => {
    let fetchCalls = 0;
    globalThis.fetch = (async () => { fetchCalls += 1; return new Response('{}', { status: 500 }); }) as unknown as typeof fetch;
    expect(await providerOptions(route, 'app', '_default')).toEqual([]);
    expect(fetchCalls).toBe(0);
    const bus = await providerOptions(null, 'bus', '_default');
    expect(bus).toHaveLength(1);
    expect(bus[0]?.available).toBe(false);
    expect(bus[0]?.external).toBe(false);
    expect(bus[0]?.etaMin).toBeNull();
    expect(bus[0]?.handoff).toBeNull();
    expect(bus[0]?.price.kind).toBe('unavailable');
    expect(bus[0]?.detail).toContain('no afirma líneas');
  });

  test('Santa Fe bus stays unavailable while exposing exactly one typed official-information handoff', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL) => new Response(JSON.stringify(String(input).includes('providers.json') ? providers : fares), { status: 200 })) as unknown as typeof fetch;
    const bus = await providerOptions(null, 'bus', 'santa-fe');
    expect(bus).toHaveLength(1);
    const option = bus[0];
    expect(option?.id).toBe('bus');
    expect(option?.available).toBe(false);
    expect(option?.external).toBe(false);
    expect(option?.etaMin).toBeNull();
    expect(option?.price.kind).toBe('unavailable');
    expect(option?.handoff).toEqual({
      kind: 'santa_fe_municipal_transit',
      label: 'Consultar transporte oficial',
      authority: 'Municipalidad de Santa Fe'
    });
  });

  test('Santa Fe explicit overlay keeps APP_ONLY truth without private price copy or inherited ETA', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL) => new Response(JSON.stringify(String(input).includes('providers.json') ? providers : fares), { status: 200 })) as unknown as typeof fetch;
    const apps = await providerOptions(route, 'app', 'santa-fe');
    expect(apps.map(option => option.id)).toEqual(['taxi', 'remis', 'uber', 'didi']);
    const appOnly = apps.filter(option => option.id === 'uber' || option.id === 'didi');
    expect(appOnly.every(option => option.price.kind === 'app_only' && option.external)).toBe(true);
    expect(appOnly.every(option => option.etaMin === null)).toBe(true);
    expect(appOnly.every(option => !('label' in option.price))).toBe(true);
    expect(appOnly.every(option => !/precio|\b\d+\s*min/i.test(option.detail))).toBe(true);
    expect(apps.filter(option => option.id === 'taxi' || option.id === 'remis').every(option => option.external === false && option.price.kind === 'regulated_estimate')).toBe(true);
  });
});
