import {
  GEOREF_SOURCE_URL,
  TERRITORY_VERSION,
  isFiniteCoordinate,
  provinceIdentity,
  type Coordinates,
  type TerritoryContext
} from '../../src/core/territory';

const GEOREF_API = 'https://apis.datos.gob.ar/georef/api/v2.0';
const TIMEOUT_MS = 6_000;
type FetchLike = typeof fetch;
type JsonRecord = Record<string, unknown>;

export interface GeoRefDirectionCandidate {
  id: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  territory: TerritoryContext;
}

function record(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null;
}

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function entity(value: unknown): { id: string | null; name: string | null } {
  const item = record(value);
  return { id: item ? text(item.id) : null, name: item ? text(item.nombre) : null };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeSantaFeKey(provinceId: string, localityName: string | null, municipalityName: string | null): '_default' | 'santa-fe' {
  if (provinceId !== '82') return '_default';
  const normalized = (localityName || municipalityName || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  return normalized === 'santa fe' ? 'santa-fe' : '_default';
}

export function territoryFromGeoRef(value: unknown): TerritoryContext | null {
  const root = record(value);
  if (!root) return null;
  const nestedLocation = record(root.ubicacion);
  const location = record(root.provincia) ? root : nestedLocation || root;
  const province = entity(location.provincia);
  if (!province.id) return null;
  const canonicalProvince = provinceIdentity(province.id);
  if (!canonicalProvince) return null;
  const department = entity(location.departamento);
  const municipality = entity(location.municipio || location.gobierno_local);
  const locality = entity(location.localidad || location.localidad_censal);
  const coverageKey = normalizeSantaFeKey(canonicalProvince.id, locality.name, municipality.name);
  const displayName = locality.name
    ? `${locality.name}, ${canonicalProvince.name}`
    : municipality.name
      ? `${municipality.name}, ${canonicalProvince.name}`
      : department.name
        ? `${department.name}, ${canonicalProvince.name}`
        : canonicalProvince.name;
  const cityId = coverageKey === 'santa-fe'
    ? 'santafe'
    : locality.id
      ? `ar:${locality.id}`
      : municipality.id
        ? `ar:municipio:${municipality.id}`
        : `ar:provincia:${canonicalProvince.id}`;
  return {
    countryId: 'AR',
    countryName: 'Argentina',
    provinceId: canonicalProvince.id,
    provinceIsoId: canonicalProvince.isoId,
    provinceName: canonicalProvince.name,
    departmentId: department.id,
    departmentName: department.name,
    municipalityOrLocalGovernmentId: municipality.id,
    municipalityOrLocalGovernmentName: municipality.name,
    localityId: locality.id,
    localityName: locality.name,
    cityId,
    displayName,
    timezone: null,
    coverageKey,
    coverageLevel: 'NATIONAL_BASE',
    source: 'georef_v2',
    sourceUrl: GEOREF_SOURCE_URL,
    verifiedAt: today(),
    territoryVersion: TERRITORY_VERSION
  };
}

async function georefJson(url: URL, init: RequestInit, fetcher: FetchLike): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetcher(url, { ...init, signal: controller.signal, headers: { Accept: 'application/json', ...(init.headers || {}) } });
    if (!response.ok) throw new Error(`georef_http_${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveTerritories(points: readonly Coordinates[], fetcher: FetchLike = fetch): Promise<Array<TerritoryContext | null>> {
  if (!points.length) return [];
  if (points.length > 1000 || points.some(point => !isFiniteCoordinate(point))) return points.map(() => null);
  const url = new URL(`${GEOREF_API}/ubicacion`);
  const payload = await georefJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ubicaciones: points.map(point => ({ lat: point.lat, lon: point.lon, campos: 'completo' })) })
  }, fetcher);
  const root = record(payload);
  const rows = root && Array.isArray(root.resultados) ? root.resultados : [];
  if (rows.length !== points.length) return points.map(() => null);
  return rows.map(row => territoryFromGeoRef(row));
}

export async function resolveTerritory(point: Coordinates, fetcher: FetchLike = fetch): Promise<TerritoryContext | null> {
  const [territory] = await resolveTerritories([point], fetcher);
  return territory || null;
}

export async function searchGeoRefDirections(
  query: string,
  hints: { province?: string | null; locality?: string | null } = {},
  fetcher: FetchLike = fetch
): Promise<GeoRefDirectionCandidate[]> {
  const normalized = query.trim();
  if (normalized.length < 3 || normalized.length > 160) return [];
  const url = new URL(`${GEOREF_API}/direcciones`);
  url.searchParams.set('direccion', normalized);
  url.searchParams.set('max', '5');
  if (hints.province?.trim()) url.searchParams.set('provincia', hints.province.trim());
  if (hints.locality?.trim()) url.searchParams.set('localidad', hints.locality.trim());
  let payload: unknown;
  try {
    payload = await georefJson(url, { method: 'GET' }, fetcher);
  } catch {
    return [];
  }
  const root = record(payload);
  const rows = root && Array.isArray(root.direcciones) ? root.direcciones : [];
  const candidates: GeoRefDirectionCandidate[] = [];
  for (const row of rows) {
    const item = record(row);
    if (!item) continue;
    const location = record(item.ubicacion);
    const lat = location?.lat;
    const lon = location?.lon;
    if (typeof lat !== 'number' || typeof lon !== 'number' || !isFiniteCoordinate({ lat, lon })) continue;
    const territory = territoryFromGeoRef(item);
    if (!territory) continue;
    const nomenclature = text(item.nomenclatura);
    const street = entity(item.calle);
    const heightRecord = record(item.altura);
    const height = heightRecord && (typeof heightRecord.valor === 'number' || typeof heightRecord.valor === 'string') ? String(heightRecord.valor) : '';
    const name = nomenclature || [street.name, height].filter(Boolean).join(' ') || territory.displayName;
    const id = `georef:address:${street.id || 'street'}:${height || 'sn'}:${territory.provinceId}`;
    candidates.push({ id, name, address: nomenclature || name, coordinates: { lat, lon }, territory });
  }
  return candidates;
}

export function sampleRoutePoints(points: readonly Coordinates[], maxSamples = 200): Coordinates[] {
  if (points.length <= maxSamples) return [...points];
  const output: Coordinates[] = [];
  const lastIndex = points.length - 1;
  for (let i = 0; i < maxSamples; i += 1) {
    const index = Math.round((i / (maxSamples - 1)) * lastIndex);
    const point = points[index];
    if (point && output.at(-1) !== point) output.push(point);
  }
  return output;
}
