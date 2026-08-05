import { isInsideSantaFe } from '../../core/coordinates';
import type { Destination } from './destination.types';

interface TransportPayload { landmarks?: Array<Record<string, unknown>> }
interface GeocodePayload { results?: Array<Record<string, unknown>> }
let localCache: Destination[] | null = null;

function normalizeLocal(item: Record<string, unknown>): Destination | null {
  const lat = Number(item.lat); const lon = Number(item.lon);
  const coordinates = { lat, lon };
  if (!isInsideSantaFe(coordinates)) return null;
  const name = String(item.nombre || '').trim();
  if (!name) return null;
  const verified = item.verified === true && Boolean(item.source) && Boolean(item.verified_at);
  return {
    id: String(item.canonicalId || `local:${lat}:${lon}`),
    name,
    address: String(item.address || ''),
    coordinates,
    kind: item.precision === 'poi' ? 'poi' : 'approximate',
    verified,
    source: String(item.source || 'curated_unverified'),
    verifiedAt: typeof item.verified_at === 'string' ? item.verified_at : undefined
  };
}

async function localDestinations(): Promise<Destination[]> {
  if (localCache) return localCache;
  try {
    const response = await fetch('/cities/santa-fe/transport.json', { cache: 'no-cache' });
    if (!response.ok) return [];
    const payload = await response.json() as TransportPayload;
    localCache = (payload.landmarks || []).map(normalizeLocal).filter((item): item is Destination => Boolean(item));
    return localCache;
  } catch { return []; }
}

export async function searchDestinations(query: string, signal: AbortSignal): Promise<Destination[]> {
  const normalized = query.trim().toLocaleLowerCase('es-AR');
  if (normalized.length < 2) return [];
  const local = (await localDestinations()).filter(item =>
    `${item.name} ${item.address}`.toLocaleLowerCase('es-AR').includes(normalized)
  );
  if (local.length >= 5) return local.slice(0, 6);
  let remote: Destination[] = [];
  try {
    const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { signal, headers: { Accept: 'application/json' } });
    if (response.ok) {
      const payload = await response.json() as GeocodePayload;
      for (const raw of payload.results || []) {
        const lat = Number(raw.lat); const lon = Number(raw.lon);
        const coordinates = { lat, lon };
        if (!isInsideSantaFe(coordinates)) continue;
        const name = String(raw.name || raw.display_name || '').trim();
        if (!name) continue;
        remote.push({
          id: String(raw.canonicalId || raw.id || `remote:${lat}:${lon}`),
          name,
          address: String(raw.address || raw.display_name || ''),
          coordinates,
          kind: raw.precision === 'poi' ? 'poi' : raw.precision === 'address' ? 'address' : 'approximate',
          verified: raw.verified === true && Boolean(raw.source) && Boolean(raw.verified_at),
          source: String(raw.source || 'worker_geocode'),
          verifiedAt: typeof raw.verified_at === 'string' ? raw.verified_at : undefined
        });
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
  }
  const seen = new Set<string>();
  return [...local, ...remote].filter(item => {
    const key = `${item.name.toLowerCase()}|${item.coordinates.lat.toFixed(5)}|${item.coordinates.lon.toFixed(5)}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, 8);
}
