import { afterEach, describe, expect, test } from 'bun:test';
import { handleRoute, validGeometry } from '../worker/routes/route';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

describe('route API boundary', () => {
  test('rejects malformed and out-of-territory input before upstream fetch', async () => {
    const malformed = await handleRoute(new Request('https://voy.test/api/route', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }), {});
    expect(malformed.status).toBe(400);
    const outside = await handleRoute(new Request('https://voy.test/api/route', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ origin: { lat: -34.6, lon: -58.4 }, destination: { lat: -31.63, lon: -60.7 }, profile: 'driving' }) }), {});
    expect(outside.status).toBe(400);
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
  test('valid upstream response is normalized and never cached publicly', async () => {
    globalThis.fetch = async () => new Response(JSON.stringify({ code: 'Ok', routes: [{ distance: 3200, duration: 630, geometry: { coordinates: [[-60.70, -31.63], [-60.695, -31.635], [-60.69, -31.64]] } }] }), { status: 200 });
    const response = await handleRoute(new Request('https://voy.test/api/route', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ origin: { lat: -31.63, lon: -60.7 }, destination: { lat: -31.64, lon: -60.69 }, profile: 'driving' }) }), {});
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toMatchObject({ ok: true, distance_km: 3.2, duration_min: 10.5 });
  });
});
