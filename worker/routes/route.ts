import type { Env } from '../contracts/env';
type Profile = 'driving' | 'foot' | 'cycling';
interface Point { lat: number; lon: number }
interface RouteRequest { origin: Point; destination: Point; profile: Profile }
interface OsrmPayload { code?: string; routes?: Array<{ distance?: number; duration?: number; geometry?: { coordinates?: Array<[number, number]> } }> }
const BBOX = Object.freeze({ minLat: -31.67, maxLat: -31.57, minLon: -60.75, maxLon: -60.65 });
const memoryCache = new Map<string, { expires: number; body: string }>();
function inside(point: Point): boolean { return Number.isFinite(point.lat) && Number.isFinite(point.lon) && point.lat >= BBOX.minLat && point.lat <= BBOX.maxLat && point.lon >= BBOX.minLon && point.lon <= BBOX.maxLon; }
function json(body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } }); }
function originAllowed(request: Request): boolean { const origin = request.headers.get('Origin'); return !origin || origin === new URL(request.url).origin; }
async function readRequest(request: Request): Promise<RouteRequest | null> {
  const length = Number(request.headers.get('Content-Length')); if (Number.isFinite(length) && length > 2048) return null;
  const text = await request.text(); if (new TextEncoder().encode(text).byteLength > 2048) return null;
  try { const value = JSON.parse(text) as Partial<RouteRequest>; const profile = value.profile; if (!value.origin || !value.destination || (profile !== 'driving' && profile !== 'foot' && profile !== 'cycling')) return null; const result: RouteRequest = { origin: { lat: Number(value.origin.lat), lon: Number(value.origin.lon) }, destination: { lat: Number(value.destination.lat), lon: Number(value.destination.lon) }, profile }; return inside(result.origin) && inside(result.destination) ? result : null; } catch { return null; }
}
function cacheKey(value: RouteRequest): string { const round = (number: number) => number.toFixed(4); return `${value.profile}:${round(value.origin.lat)},${round(value.origin.lon)}:${round(value.destination.lat)},${round(value.destination.lon)}`; }
export function validGeometry(points: Array<[number, number]>, input: RouteRequest): boolean {
  if (points.length < 2 || points.length > 20_000) return false; const first = points[0]; const last = points.at(-1); if (!first || !last) return false;
  const finiteAndInside = points.every(([lon, lat]) => Number.isFinite(lat) && Number.isFinite(lon) && inside({ lat, lon }));
  const near = (point: [number, number], expected: Point) => Math.abs(point[0] - expected.lon) < .02 && Math.abs(point[1] - expected.lat) < .02;
  return finiteAndInside && near(first, input.origin) && near(last, input.destination);
}
export async function handleRoute(request: Request, _env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Cache-Control': 'no-store' } });
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
  if (!originAllowed(request)) return json({ ok: false, error: 'origin_not_allowed' }, 403);
  const input = await readRequest(request); if (!input) return json({ ok: false, error: 'invalid_route_request' }, 400);
  const key = cacheKey(input); const cached = memoryCache.get(key); if (cached && cached.expires > Date.now()) return new Response(cached.body, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-VOY-Route-Cache': 'isolate-rounded-hit' } });
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const profile = input.profile === 'cycling' ? 'driving' : input.profile;
    const url = `https://router.project-osrm.org/route/v1/${profile}/${input.origin.lon},${input.origin.lat};${input.destination.lon},${input.destination.lat}?overview=full&geometries=geojson&steps=false`;
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json', 'User-Agent': 'VOY/8.0 mobility routing proxy' } });
    if (!response.ok) return json({ ok: false, error: 'route_upstream_unavailable', fallback: 'straight_line_estimate' }, 503);
    const payload = await response.json() as OsrmPayload; const route = payload.routes?.[0]; const coordinates = route?.geometry?.coordinates || []; const distance = Number(route?.distance); const duration = Number(route?.duration);
    if (payload.code !== 'Ok' || !Number.isFinite(distance) || distance < 0 || !Number.isFinite(duration) || duration < 0 || !validGeometry(coordinates, input)) return json({ ok: false, error: 'route_schema_invalid', fallback: 'straight_line_estimate' }, 502);
    const body = JSON.stringify({ ok: true, source: 'osrm_route', distance_km: Math.round(distance / 10) / 100, duration_min: Math.round(duration / 6) / 10, geometry: coordinates });
    memoryCache.set(key, { expires: Date.now() + 120_000, body }); if (memoryCache.size > 100) { const oldest = memoryCache.keys().next().value; if (oldest) memoryCache.delete(oldest); }
    return new Response(body, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-VOY-Route-Cache': 'miss' } });
  } catch (error) { return json({ ok: false, error: error instanceof DOMException && error.name === 'AbortError' ? 'route_timeout' : 'route_failed', fallback: 'straight_line_estimate' }, 503); }
  finally { clearTimeout(timer); }
}
