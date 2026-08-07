import { isInsideSantaFe } from '../../core/coordinates';
import type { Destination, DestinationKind, DestinationProvenance } from './destination.types';

interface TransportPayload { landmarks?: Array<Record<string, unknown>> }
interface GeocodePayload { results?: Array<Record<string, unknown>> }
let localCache: Destination[] | null = null;

const AUTHORITATIVE_HOSTS = new Set([
  'santafeciudad.gov.ar',
  'www.santafeciudad.gov.ar',
  'turismo.santafeciudad.gov.ar',
  'agenda.santafeciudad.gov.ar',
  'argentina.gob.ar',
  'www.argentina.gob.ar',
  'bcra.gob.ar',
  'www.bcra.gob.ar'
]);

function nonEmpty(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function authoritativeUrl(value: unknown): string | null {
  const candidate = nonEmpty(value);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:' || !AUTHORITATIVE_HOSTS.has(url.hostname.toLowerCase())) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function verifiedDate(value: unknown): string | null {
  const candidate = nonEmpty(value);
  return candidate && /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : null;
}

function normalizeProvenance(value: unknown): DestinationProvenance | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (raw.status !== 'authoritative') return null;
  const issuer = nonEmpty(raw.issuer);
  const sourceTitle = nonEmpty(raw.source_title);
  const sourceUrl = authoritativeUrl(raw.source_url);
  const license = nonEmpty(raw.license);
  const coordinateMethod = nonEmpty(raw.coordinate_method);
  const coordinateSourceUrl = authoritativeUrl(raw.coordinate_source_url);
  if (!issuer || !sourceTitle || !sourceUrl || !license || !coordinateMethod || !coordinateSourceUrl) return null;
  return { status: 'authoritative', issuer, sourceTitle, sourceUrl, license, coordinateMethod, coordinateSourceUrl };
}

export function isAuthoritativeDestinationRecord(item: Record<string, unknown>): boolean {
  const precision = item.precision;
  return item.verified === true
    && item.source === 'authoritative'
    && (precision === 'poi' || precision === 'address')
    && Boolean(nonEmpty(item.nombre))
    && Boolean(nonEmpty(item.address))
    && Boolean(verifiedDate(item.verified_at))
    && Boolean(normalizeProvenance(item.provenance));
}

export function normalizeLocalDestination(item: Record<string, unknown>): Destination | null {
  if (typeof item.lat !== 'number' || !Number.isFinite(item.lat) || typeof item.lon !== 'number' || !Number.isFinite(item.lon)) return null;
  const coordinates = { lat: item.lat, lon: item.lon };
  if (!isInsideSantaFe(coordinates) || !isAuthoritativeDestinationRecord(item)) return null;
  const name = nonEmpty(item.nombre);
  const address = nonEmpty(item.address);
  const verifiedAt = verifiedDate(item.verified_at);
  const provenance = normalizeProvenance(item.provenance);
  if (!name || !address || !verifiedAt || !provenance) return null;
  return {
    id: String(item.canonicalId || `local:${item.lat}:${item.lon}`),
    name,
    address,
    coordinates,
    kind: item.precision as DestinationKind,
    verified: true,
    operational: true,
    confidence: 'authoritative',
    source: 'authoritative',
    verifiedAt,
    provenance
  };
}

function normalizeRemoteDestination(raw: Record<string, unknown>): Destination | null {
  if (typeof raw.lat !== 'number' || !Number.isFinite(raw.lat) || typeof raw.lon !== 'number' || !Number.isFinite(raw.lon)) return null;
  const coordinates = { lat: raw.lat, lon: raw.lon };
  if (!isInsideSantaFe(coordinates)) return null;
  const name = nonEmpty(raw.name || raw.display_name);
  if (!name) return null;
  const address = nonEmpty(raw.address || raw.display_name) || '';
  return {
    id: String(raw.canonicalId || raw.id || `remote:${raw.lat}:${raw.lon}`),
    name,
    address,
    coordinates,
    kind: raw.precision === 'address' ? 'address' : raw.precision === 'poi' ? 'poi' : 'approximate',
    verified: false,
    operational: false,
    confidence: 'unverified',
    source: String(raw.source || 'worker_geocode_unverified')
  };
}

async function localDestinations(): Promise<Destination[]> {
  if (localCache) return localCache;
  try {
    const response = await fetch('/cities/santa-fe/transport.json', { cache: 'no-cache' });
    if (!response.ok) return [];
    const payload = await response.json() as TransportPayload;
    localCache = (payload.landmarks || []).map(normalizeLocalDestination).filter((item): item is Destination => Boolean(item));
    return localCache;
  } catch {
    return [];
  }
}

export async function searchDestinations(query: string, signal: AbortSignal): Promise<Destination[]> {
  const normalized = query.trim().toLocaleLowerCase('es-AR');
  if (normalized.length < 2) return [];
  const local = (await localDestinations()).filter(item =>
    `${item.name} ${item.address}`.toLocaleLowerCase('es-AR').includes(normalized)
  );
  if (local.length >= 5) return local.slice(0, 6);
  const remote: Destination[] = [];
  try {
    const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { signal, headers: { Accept: 'application/json' } });
    if (response.ok) {
      const payload = await response.json() as GeocodePayload;
      for (const raw of payload.results || []) {
        const destination = normalizeRemoteDestination(raw);
        if (destination) remote.push(destination);
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
  }
  const seen = new Set<string>();
  return [...local, ...remote].filter(item => {
    const key = `${item.name.toLowerCase()}|${item.coordinates.lat.toFixed(5)}|${item.coordinates.lon.toFixed(5)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}
