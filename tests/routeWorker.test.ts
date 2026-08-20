import { afterEach, describe, expect, test } from 'bun:test';
import { handleRoute, validGeometry } from '../worker/routes/route';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function georefBatch(body: string | null, outside = false): Response {
  const parsed = JSON.parse(body || '{}') as { ubicaciones?: Array<{ lat: number; lon: number }> };
  return new Response(JSON.stringify({ resultados: (parsed.ubicaciones || []).map((point, index) => ({ ubicacion: {
    lat: point.lat,
    lon: point.lon,
    provincia: outside && index === Math.floor((parsed.ubicaciones || []).length / 2)
      ? { id: null, nombre: null }
      : { id: point.lon < -59 ? '82' : '02', nombre: point.lon < -59 ? 'Santa Fe' : 'Ciudad Autónoma de Buenos Aires' },
    departamento: { id: point.lon < -59 ? '82063' : '02000', nombre: point.lon < -59 ? 'La Capital' : 'Comuna' },
    municipio: { id: null, nombre: null }
  } })) }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function routeRequest(origin = { lat: -34.60, lon: -58.40 }, destination = { lat: -34.61, lon: -58.39 }): Request {
  return new Request('https://voy.test/api/route', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ origin, destination, profile: 'driving' })
  });
}

describe('national route API boundary', () => {
  test('rejects malformed, coercive and unsupported profile input before upstream fetch', async () => {
    const inputs = [
      {},
      { origin: { lat: '-31.63', lon: -60.7 }, destination: { lat: -31.64, lon: -60.69 }, profile: 'driving' },
      { origin: { lat: -31.63, lon: -60.7 }, destination: { lat: -31.64, lon: -60.69 }, profile: 'cycling' },
      { origin: { lat: 91, lon: -58.4 }, destination: { lat: -34.6, lon: -58.39 }, profile: 'driving' }
    ];
    for (const body of inputs) {
      let calls = 0;
      globalThis.fetch = (async () => { calls += 1; return new Response('{}'); }) as unknown as typeof fetch;
      const response = await handleRoute(new Request('https://voy.test/api/route', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), {});
      expect(response.status).toBe(400);
      expect(calls).toBe(0);
    }
  });

  test('rejects cross-origin writes', async () => {
    const request = routeRequest();
    const response = await handleRoute(new Request(request.url, { method: 'POST', headers: { Origin: 'https://evil.test', 'Content-Type': 'application/json' }, body: await request.text() }), {});
    expect(response.status).toBe(403);
  });

  test('accepts finite endpoint-aligned geometry independent of the Santa Fe reference bbox', () => {
    const input = { origin: { lat: -34.60, lon: -58.40 }, destination: { lat: -34.61, lon: -58.39 }, profile: 'driving' as const };
    expect(validGeometry([[-58.40, -34.60], [-58.395, -34.605], [-58.39, -34.61]], input)).toBe(true);
    expect(validGeometry([[-60.70, -31.63], [-58.39, -34.61]], input)).toBe(false);
  });

  test('fails closed when GeoRef cannot resolve an endpoint into Argentina', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/georef/api/v2.0/ubicacion')) return new Response(JSON.stringify({ resultados: [{ ubicacion: { provincia: { id: '02', nombre: 'CABA' } } }, { ubicacion: { provincia: { id: null, nombre: null } } }] }));
      throw new Error(`unexpected:${url}:${String(init?.method)}`);
    }) as unknown as typeof fetch;
    const response = await handleRoute(routeRequest(), {});
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ error: 'territory_unresolved', fallback: 'straight_line_estimate' });
  });

  test('valid national OSRM response is normalized after GeoRef endpoint and geometry validation', async () => {
    let georefCalls = 0;
    let osrmCalls = 0;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/georef/api/v2.0/ubicacion')) {
        georefCalls += 1;
        return georefBatch(typeof init?.body === 'string' ? init.body : null);
      }
      if (url.startsWith('https://router.project-osrm.org/')) {
        osrmCalls += 1;
        return new Response(JSON.stringify({ code: 'Ok', routes: [{ distance: 3200, duration: 630, geometry: { coordinates: [[-58.40, -34.60], [-58.395, -34.605], [-58.39, -34.61]] } }] }), { status: 200 });
      }
      throw new Error(`unexpected:${url}`);
    }) as unknown as typeof fetch;
    const response = await handleRoute(routeRequest(), {});
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toMatchObject({ ok: true, country: 'AR', distance_km: 3.2, duration_min: 10.5 });
    expect(georefCalls).toBe(2);
    expect(osrmCalls).toBe(1);
  });

  test('rejects an OSRM geometry sample that GeoRef places outside Argentina', async () => {
    const origin = { lat: -34.62, lon: -58.42 };
    const destination = { lat: -34.63, lon: -58.41 };
    let georefCalls = 0;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/georef/api/v2.0/ubicacion')) {
        georefCalls += 1;
        return georefBatch(typeof init?.body === 'string' ? init.body : null, georefCalls === 2);
      }
      return new Response(JSON.stringify({ code: 'Ok', routes: [{ distance: 3200, duration: 630, geometry: { coordinates: [[-58.42, -34.62], [-58.415, -34.625], [-58.41, -34.63]] } }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const response = await handleRoute(routeRequest(origin, destination), {});
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ error: 'route_geometry_outside_argentina' });
    expect(georefCalls).toBe(2);
  });
});
