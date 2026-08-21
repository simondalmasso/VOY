import { isFiniteCoordinate, type Coordinates, type TerritoryContext } from '../../src/core/territory';
import { resolveTerritories, searchGeoRefDirections } from '../lib/georef';

type LegacyFetch = (request: Request) => Promise<Response>;
type JsonRecord = Record<string, unknown>;

interface NationalCandidate {
  canonicalId: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  precision: 'address' | 'poi' | 'approximate';
  verified: false;
  operational: false;
  confidence: 'unverified';
  routeEligible: boolean;
  territoryVerified: boolean;
  source: string;
  territory: TerritoryContext | null;
  coverageKey: '_default' | 'santa-fe';
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
function record(value: unknown): JsonRecord | null { return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null; }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }

function legacyCandidate(raw: JsonRecord, territory: TerritoryContext | null): NationalCandidate | null {
  if (!finite(raw.lat) || !finite(raw.lon) || !isFiniteCoordinate({ lat: raw.lat, lon: raw.lon })) return null;
  const name = text(raw.name || raw.display_name);
  if (!name) return null;
  const precision = raw.precision === 'address' ? 'address' : raw.precision === 'poi' ? 'poi' : 'approximate';
  return {
    canonicalId: text(raw.canonicalId || raw.id) || `osm:${raw.lat}:${raw.lon}`,
    name,
    address: text(raw.address || raw.display_name) || name,
    lat: raw.lat,
    lon: raw.lon,
    precision,
    verified: false,
    operational: false,
    confidence: 'unverified',
    routeEligible: Boolean(territory),
    territoryVerified: Boolean(territory),
    source: territory ? 'osm_nominatim+georef_v2' : 'osm_nominatim_unresolved',
    territory,
    coverageKey: territory?.coverageKey || '_default'
  };
}

async function readLegacyCandidates(request: Request, q: string, legacyFetch: LegacyFetch): Promise<JsonRecord[]> {
  try {
    const url = new URL('/api/geocode', request.url);
    url.searchParams.set('q', q);
    url.searchParams.set('city', '_default');
    const headers = new Headers(request.headers);
    headers.set('Accept', 'application/json');
    const response = await legacyFetch(new Request(url, { method: 'GET', headers }));
    if (!response.ok) return [];
    const payload = record(await response.json());
    return payload && Array.isArray(payload.results) ? payload.results.map(record).filter((item): item is JsonRecord => Boolean(item)).slice(0, 8) : [];
  } catch {
    return [];
  }
}

export async function handleNationalGeocode(request: Request, legacyFetch: LegacyFetch): Promise<Response> {
  if (request.method !== 'GET') return json({ ok: false, error: 'method_not_allowed' }, 405);
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').replace(/\s+/g, ' ').trim();
  const province = (url.searchParams.get('province') || '').trim().slice(0, 80) || null;
  const locality = (url.searchParams.get('locality') || '').trim().slice(0, 100) || null;
  if (q.length < 2 || q.length > 160) return json({ ok: false, error: 'invalid_query' }, 400);

  const [directionsResult, legacyResult] = await Promise.allSettled([
    searchGeoRefDirections(q, { province, locality }),
    readLegacyCandidates(request, q, legacyFetch)
  ]);
  const directions = directionsResult.status === 'fulfilled' ? directionsResult.value : [];
  const legacy = legacyResult.status === 'fulfilled' ? legacyResult.value : [];
  const legacyPoints: Coordinates[] = legacy.flatMap(item => finite(item.lat) && finite(item.lon) ? [{ lat: item.lat, lon: item.lon }] : []);
  let territories: Array<TerritoryContext | null> = legacyPoints.map(() => null);
  if (legacyPoints.length) {
    try { territories = await resolveTerritories(legacyPoints); }
    catch { territories = legacyPoints.map(() => null); }
  }

  const output: NationalCandidate[] = directions.map(item => ({
    canonicalId: item.id,
    name: item.name,
    address: item.address,
    lat: item.coordinates.lat,
    lon: item.coordinates.lon,
    precision: 'address',
    verified: false,
    operational: false,
    confidence: 'unverified',
    routeEligible: true,
    territoryVerified: true,
    source: 'georef_v2_address',
    territory: item.territory,
    coverageKey: item.territory.coverageKey
  }));
  let territoryIndex = 0;
  for (const item of legacy) {
    if (!finite(item.lat) || !finite(item.lon)) continue;
    const candidate = legacyCandidate(item, territories[territoryIndex] || null);
    territoryIndex += 1;
    if (candidate) output.push(candidate);
  }

  const seen = new Set<string>();
  const results = output.filter(item => {
    const key = `${item.lat.toFixed(5)}:${item.lon.toFixed(5)}:${item.name.toLocaleLowerCase('es-AR')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);
  return json({ ok: true, query: q, country: 'AR', territory_source: 'GeoRef Argentina v2', results });
}
