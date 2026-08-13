import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { canonicalRouteRequest, ROUTE_COORD_PRECISION, validGeometry } from '../worker/routes/route';
import { PROVIDER_AVAILABILITY_MAX_AGE_DAYS, providerAvailabilityCurrent } from '../src/features/providers/provider.registry';

const json = (path: string): Record<string, any> => JSON.parse(readFileSync(path, 'utf8'));

describe('Issue39 adversarial regression gates', () => {
  test('private app fare metadata cannot expose stale numeric coefficients', () => {
    const fares = json('public/cities/santa-fe/fares.json');
    const forbidden = new Set(['base', 'km', 'min', 'minFare', 'amount', 'price', 'fare']);
    for (const [provider, record] of Object.entries<any>(fares.fare_registry.apps)) {
      expect(record.availability_price_status, provider).toBeTruthy();
      expect(['stale_estimate', 'stale_reference', 'provider_app_only', 'unverified'].includes(record.status), provider).toBe(true);
      for (const [key, value] of Object.entries(record)) {
        expect(forbidden.has(key) && typeof value === 'number', `${provider}.${key} leaked numeric private-app fare`).toBe(false);
      }
    }
  });

  test('coverage copy cannot imply operational stops or bike stations when runtime has none', () => {
    const profile = json('public/cities/santa-fe/profile.json');
    const transport = json('public/cities/santa-fe/transport.json');
    expect(transport.bus_stops).toEqual([]);
    expect(transport.bike_stations).toEqual([]);
    const notes = profile.coverage_notes.join(' ').toLowerCase();
    expect(notes).toContain('no están disponibles operacionalmente');
    expect(notes).not.toContain('paradas y estaciones curadas');
  });

  test('provider availability expires fail-closed after bounded freshness window', () => {
    const record = { available: true, verified: true, availability_status: 'verified_current', verified_at: '2026-08-04', price_status: 'app_only' };
    expect(PROVIDER_AVAILABILITY_MAX_AGE_DAYS).toBe(30);
    expect(providerAvailabilityCurrent(record, Date.parse('2026-08-20T00:00:00Z'))).toBe(true);
    expect(providerAvailabilityCurrent(record, Date.parse('2026-09-04T00:00:01Z'))).toBe(false);
    expect(providerAvailabilityCurrent({ ...record, verified_at: 'not-a-date' }, Date.parse('2026-08-20T00:00:00Z'))).toBe(false);
  });

  test('OSRM upstream identity and isolate cache identity share the same canonical coordinates', () => {
    const raw = { profile: 'driving' as const, origin: { lat: -31.633041234, lon: -60.706049876 }, destination: { lat: -31.643533912, lon: -60.700503876 } };
    const canonical = canonicalRouteRequest(raw);
    expect(ROUTE_COORD_PRECISION).toBe(4);
    expect(canonical.origin).toEqual({ lat: -31.633, lon: -60.706 });
    expect(canonical.destination).toEqual({ lat: -31.6435, lon: -60.7005 });
    expect(String(canonical.origin.lat).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(ROUTE_COORD_PRECISION);
    expect(validGeometry([[-60.706, -31.633], [-60.703, -31.638], [-60.7005, -31.6435]], canonical)).toBe(true);
    expect(validGeometry([[-60.73, -31.65], [-60.7005, -31.6435]], canonical)).toBe(false);
  });

  test('territorial assets are network-only in the service worker and APIs remain uncached', () => {
    const sw = readFileSync('public/sw.js', 'utf8');
    expect(sw).toContain("url.pathname.startsWith('/api/')");
    expect(sw).toContain("url.pathname.startsWith('/cities/')");
    const cityBranch = sw.slice(sw.indexOf("url.pathname.startsWith('/cities/')"), sw.indexOf("url.pathname.startsWith('/assets/')"));
    expect(cityBranch).toContain("fetch(request, { cache: 'no-store' })");
    expect(cityBranch).not.toContain('safePut');
    expect(cityBranch).not.toContain('caches.match');
  });

  test('displayed route duration is labeled as trip time, never provider pickup ETA', () => {
    const component = readFileSync('src/components/ProviderOption.svelte', 'utf8');
    expect(component).toContain('min de viaje');
    expect(component).not.toContain('{option.etaMin} min</small>');
  });
});
