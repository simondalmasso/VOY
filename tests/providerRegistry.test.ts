import { afterEach, describe, expect, test } from 'bun:test';
import { providerOptions } from '../src/features/providers/provider.registry';
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const fares = { fare_registry: { taxi: { diurno: { bajada: 1790, ficha: 179, distFicha: 130 }, source: 'Resolución 217/2026', verified_at: '2026-08-04' }, remis: { diurno: { bajada: 1600, ficha: 160, distFicha: 130 }, source: 'Resolución 365/2026', verified_at: '2026-08-04' } } };
const route = { source: 'osrm_route' as const, distanceKm: 3.2, durationMin: 11, geometry: [{ lat: -31.63, lon: -60.70 }, { lat: -31.64, lon: -60.69 }] };
describe('provider ranking and price truthfulness', () => {
  test('apps remain APP_ONLY and bus remains disabled', async () => {
    globalThis.fetch = async () => new Response(JSON.stringify(fares), { status: 200 });
    const apps = await providerOptions(route, 'app');
    expect(apps.map(option => option.id)).toEqual(['taxi', 'remis', 'uber', 'didi']);
    expect(apps.filter(option => option.id === 'uber' || option.id === 'didi').every(option => option.price.kind === 'app_only')).toBe(true);
    const bus = await providerOptions(route, 'bus');
    expect(bus).toHaveLength(1); expect(bus[0]?.available).toBe(false); expect(bus[0]?.detail).toContain('Desactivado');
  });
});
