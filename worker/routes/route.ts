import { isFiniteCoordinate, TERRITORY_VERSION, type Coordinates, type TerritoryContext } from '../../src/core/territory';
import type { Env } from '../contracts/env';
import { resolveTerritories, sampleRoutePoints } from '../lib/georef';

type Profile = 'driving' | 'foot';
interface Point { lat: number; lon: number }
interface RouteRequest { origin: Point; destination: Point; profile: Profile }
interface OsrmPayload { code?: string; routes?: Array<{ distance?: unknown; duration?: unknown; geometry?: { coordinates?: unknown } }> }
const memoryCache = new Map<string, { expires: number; body: string }>();
function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function pointValid(point: Point): boolean { return isFiniteCoordinate(point); }
function json(body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } }); }
function originAllowed(request: Request): boolean { const origin = request.headers.get('Origin'); return !origin || origin === new URL(request.url).origin; }
async function readRequest(request: Request): Promise<RouteRequest | null> {
  const lengthHeader = request.headers.get('Content-Length');
  if (lengthHeader && (!/^\d+$/.test(lengthHeader) || Number(lengthHeader) > 2048)) return null;
  const text = await request.text(); if (new TextEncoder().encode(text).byteLength > 2048) return null;
  try {
    const value = JSON.parse(text) as Record<string, unknown>;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const profile = value.profile;
    const origin = value.origin as Record<string, unknown> | undefined;
    const destination = value.destination as Record<string, unknown> | undefined;
    if ((profile !== 'driving' && profile !== 'foot') || !origin || !destination || Array.isArray(origin) || Array.isArray(destination)) return null;
    if (!finite(origin.lat) || !finite(origin.lon) || !finite(destination.lat) || !finite(destination.lon)) return null;
    const result: RouteRequest = { origin: { lat: origin.lat, lon: origin.lon }, destination: { lat: destination.lat, lon: destination.lon }, profile };
    return pointValid(result.origin) && pointValid(result.destination) ? result : null;
  } catch { return null; }
}
function cacheKey(value: RouteRequest, originTerritory: TerritoryContext, destinationTerritory: TerritoryContext): string {
  const exact = (number: number) => number.toFixed(6);
  return `${TERRITORY_VERSION}:${originTerritory.provinceId}:${destinationTerritory.provinceId}:${value.profile}:${exact(value.origin.lat)},${exact(value.origin.lon)}:${exact(value.destination.lat)},${exact(value.destination.lon)}`;
}
export function validGeometry(points: Array<[number, number]>, input: RouteRequest): boolean {
  if (points.length < 2 || points.length > 20_000) return false;
  const first = points[0]; const last = points.at(-1); if (!first || !last) return false;
  const finitePoints = points.every(point => Array.isArray(point) && point.length === 2 && finite(point[0]) && finite(point[1]) && pointValid({ lat: point[1], lon: point[0] }));
  const near = (point: [number, number], expected: Point) => Math.abs(point[0] - expected.lon) < .02 && Math.abs(point[1] - expected.lat) < .02;
  return finitePoints && near(first, input.origin) && near(last, input.destination);
}
function parseCoordinates(value: unknown): Array<[number, number]> {
  if (!Array.isArray(value)) return [];
  const output: Array<[number, number]> = [];
  for (const point of value) {
    if (!Array.isArray(point) || point.length !== 2 || !finite(point[0]) || !finite(point[1])) return [];
    output.push([point[0], point[1]]);
  }
  return output;
}
async function routeGeometryInsideArgentina(coordinates: Array<[number, number]>): Promise<boolean> {
  const points: Coordinates[] = coordinates.map(([lon, lat]) => ({ lat, lon }));
  const sample = sampleRoutePoints(points, 200);
  const territories = await resolveTerritories(sample);
  return territories.length === sample.length && territories.every(Boolean);
}
export async function handleRoute(request: Request, _env: Partial<Env> = {}): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Cache-Control': 'no-store' } });
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
  if (!originAllowed(request)) return json({ ok: false, error: 'origin_not_allowed' }, 403);
  const input = await readRequest(request); if (!input) return json({ ok: false, error: 'invalid_route_request' }, 400);

  let endpointTerritories: Array<TerritoryContext | null>;
  try { endpointTerritories = await resolveTerritories([input.origin, input.destination]); }
  catch { return json({ ok: false, error: 'territory_upstream_unavailable', fallback: 'straight_line_estimate' }, 503); }
  const originTerritory = endpointTerritories[0];
  const destinationTerritory = endpointTerritories[1];
  if (!originTerritory || !destinationTerritory) return json({ ok: false, error: 'territory_unresolved', fallback: 'straight_line_estimate' }, 422);

  const key = cacheKey(input, originTerritory, destinationTerritory);
  const cached = memoryCache.get(key);
  if (cached && cached.expires > Date.now()) return new Response(cached.body, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-VOY-Route-Cache': 'isolate-territorial-hit' } });
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const url = `https://router.project-osrm.org/route/v1/${input.profile}/${input.origin.lon},${input.origin.lat};${input.destination.lon},${input.destination.lat}?overview=full&geometries=geojson&steps=false`;
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json', 'User-Agent': 'VOY/8.0 mobility routing proxy' } });
    if (!response.ok) return json({ ok: false, error: 'route_upstream_unavailable', fallback: 'straight_line_estimate' }, 503);
    const payload = await response.json() as OsrmPayload;
    const route = payload.routes?.[0];
    const coordinates = parseCoordinates(route?.geometry?.coordinates);
    const distance = route?.distance;
    const duration = route?.duration;
    if (payload.code !== 'Ok' || !finite(distance) || distance < 0 || !finite(duration) || duration < 0 || !validGeometry(coordinates, input)) return json({ ok: false, error: 'route_schema_invalid', fallback: 'straight_line_estimate' }, 502);
    let geometryInsideArgentina = false;
    try { geometryInsideArgentina = await routeGeometryInsideArgentina(coordinates); }
    catch { return json({ ok: false, error: 'territory_upstream_unavailable', fallback: 'straight_line_estimate' }, 503); }
    if (!geometryInsideArgentina) return json({ ok: false, error: 'route_geometry_outside_argentina', fallback: 'straight_line_estimate' }, 502);
    const body = JSON.stringify({
      ok: true,
      source: 'osrm_route',
      country: 'AR',
      territory_version: TERRITORY_VERSION,
      origin_territory: { province_id: originTerritory.provinceId, province_iso_id: originTerritory.provinceIsoId },
      destination_territory: { province_id: destinationTerritory.provinceId, province_iso_id: destinationTerritory.provinceIsoId },
      distance_km: Math.round(distance / 10) / 100,
      duration_min: Math.round(duration / 6) / 10,
      geometry: coordinates
    });
    memoryCache.set(key, { expires: Date.now() + 120_000, body });
    if (memoryCache.size > 100) { const oldest = memoryCache.keys().next().value; if (oldest) memoryCache.delete(oldest); }
    return new Response(body, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-VOY-Route-Cache': 'miss' } });
  } catch (error) {
    return json({ ok: false, error: error instanceof DOMException && error.name === 'AbortError' ? 'route_timeout' : 'route_failed', fallback: 'straight_line_estimate' }, 503);
  } finally { clearTimeout(timer); }
}
