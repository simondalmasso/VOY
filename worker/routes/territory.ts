import { isFiniteCoordinate } from '../../src/core/territory';
import { resolveTerritory } from '../lib/georef';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

export async function handleTerritory(request: Request): Promise<Response> {
  if (request.method !== 'GET') return json({ ok: false, error: 'method_not_allowed' }, 405);
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get('lat'));
  const lon = Number(url.searchParams.get('lon'));
  if (!isFiniteCoordinate({ lat, lon })) return json({ ok: false, error: 'invalid_coordinates' }, 400);
  try {
    const territory = await resolveTerritory({ lat, lon });
    if (!territory) return json({ ok: false, error: 'territory_unresolved' }, 422);
    return json({ ok: true, territory });
  } catch {
    return json({ ok: false, error: 'territory_upstream_unavailable' }, 503);
  }
}
