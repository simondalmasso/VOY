import { afterEach, describe, expect, test } from 'bun:test';
import { handleRoute, validGeometry } from '../worker/routes/route';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function georefRows(count: number, provinceId = '82', provinceName = 'Santa Fe') {
  return Array.from({ length: count }, (_, index) => ({
    provincia: { id: provinceId, nombre: provinceName },
    departamento: { id: `${provinceId}007`, nombre: 'Capital' },
    localidad: { id: `${provinceId}000001`, nombre: provinceId === '82' ? 'Santa Fe' : provinceName },
    ubicacion: { lat: -31.63 - index * 0.001, lon: -60.7 + index * 0.001 }
  }));
}

function installRouteUpstreams(options: { unresolved?: boolean } = {}): { osrmCalls: () => number } {
  let osrm = 0;
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    if (url.includes('apis.datos.gob.ar/georef/api/v2.0/ubicacion')) {
      const body = JSON.parse(String(init?.body || '{}')) as { ubicaciones?: unknown[] };
      const count = body.ubicaciones?.length || 0;
      return new Response(JSON.stringify({ resultados: options.unresolved ? Array(count).fill(null) : georefRows(count) }), { status: 200 });
    }
    if (url.includes('router.project-osrm.org/route/v1/')) {
      osrm += 1;
      return new Response(JSON.stringify({
        code: 'Ok',
        routes: [{ distance: 3200, duration: 630, geometry: { coordinates: [[-60.70, -31.63], [-60.695, -31.635], [-60.69, -31.64]] } }]
      }), { status: 200 });
    }
    throw new Error(`unexpected_fetch:${url}`);
  }) as unknown as typeof fetch;
  return { osrmCalls: () => osrm };
}

describe('route API boundary', () => {
  test('rejects malformed, coercive and unsupported profiles before any upstream fetch', async () => {
    let calls = 0;
    globalThis.fetch = (async () => { calls += 1; throw new Error('unexpected_fetch'); }) as unknown as typeof fetch;
    const inputs = [
      {},
      { origin: { lat: '-31.63', lon: -60.7 }, destination: { lat: -31.64, lon: -60.69 }, profile: 'driving' },
      { origin: { lat: -31.63, lon: -60.7 }, destination: { lat: -31.64, lon: -60.69 }, profile: 'cycling' }
    ];
    for (const body of inputs) {
      const response = await handleRoute(new Request('https://voy.test/api/route', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), {});
      expect(response.status).toBe(400);
    }
    expect(calls).toBe(0);
  });

  test('fails closed when Argentine territorial identity cannot be resolved and never calls OSRM', async () => {
    const upstream = installRouteUpstreams({ unresolved: true });
    const response = await handleRoute(new Request('https://voy.test/api/route', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: { lat: -34.6, lon: -58.4 }, destination: { lat: -31.63, lon: -60.7 }, profile: 'driving' })
    }), {});
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ ok: false, error: 'territory_unresolved' });
    expect(upstream.osrmCalls()).toBe(0);
  });

  test('rejects cross-origin writes', async () => {
    const response = await handleRoute(new Request('https://voy.test/api/route', { method: 'POST', headers: { Origin: 'https://evil.test', 'Content-Type': 'application/json' }, body: JSON.stringify({ origin: { lat: -31.63, lon: -60.7 }, destination: { lat: -31.64, lon: -60.69 }, profile: 'driving' }) }), {});
    expect(response.status).toBe(403);
  });

  test('accepts only finite geometry that starts and ends near requested points', () => {
    const input = { origin: { lat: -31.63, lon: -60.70 }, destination: { lat: -31.64, lon: -60.69 }, profile: 'driving' as const };
    expect(validGeometry([[-60.70, -31.63], [-60.695, -31.635], [-60.69, -31.64]], input)).toBe(true);
    expect(validGeometry([[-58.4, -34.6], [-60.69, -31.64]], input)).toBe(false);
  });

  test('valid national upstream response is normalized only after GeoRef validates endpoints and geometry', async () => {
    const upstream = installRouteUpstreams();
    const response = await handleRoute(new Request('https://voy.test/api/route', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ origin: { lat: -31.63, lon: -60.7 }, destination: { lat: -31.64, lon: -60.69 }, profile: 'driving' }) }), {});
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toMatchObject({ ok: true, country: 'AR', distance_km: 3.2, duration_min: 10.5 });
    expect(upstream.osrmCalls()).toBe(1);
  });
});
