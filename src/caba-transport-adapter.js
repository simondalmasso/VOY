const DEFAULT_BASE_URL = 'https://datosabiertos-transporte-apis.buenosaires.gob.ar';
const ENDPOINTS = Object.freeze({
  buses: '/colectivos/vehiclePositionsSimple',
  trains: '/trenes/vehiclePositions'
});
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

function unavailable(reason) {
  return { available: false, source_status: 'unavailable', reason, fetched_at: null, temporal_state: 'unknown', data: null };
}

function validBaseUrl(value) {
  const url = new URL(value || DEFAULT_BASE_URL);
  if (url.protocol !== 'https:' || ![
    'datosabiertos-transporte-apis.buenosaires.gob.ar',
    'datosabiertos-apis.buenosaires.gob.ar'
  ].includes(url.hostname) || url.username || url.password) {
    throw new Error('caba_transport_base_url_not_allowlisted');
  }
  return url.origin;
}

/**
 * Server-side scaffold for the official Buenos Aires transport API.
 * Credentials must be Worker secrets; never pass them from browser input.
 * Network access is opt-in: without both credentials this adapter fails closed.
 * The upstream payload is deliberately not promoted to a vehicle observation
 * until the issued API's current schema and timestamp semantics are verified.
 */
export function createCabaTransportAdapter({
  env = {},
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  timeoutMs = 5000,
  maxResponseBytes = MAX_RESPONSE_BYTES,
  baseUrl = DEFAULT_BASE_URL
} = {}) {
  const origin = validBaseUrl(baseUrl);

  async function read(mode) {
    const path = ENDPOINTS[mode];
    if (!path) return unavailable('unsupported_mode');

    const clientId = env.CABA_TRANSPORT_CLIENT_ID;
    const clientSecret = env.CABA_TRANSPORT_CLIENT_SECRET;
    if (typeof clientId !== 'string' || !clientId.trim() ||
        typeof clientSecret !== 'string' || !clientSecret.trim()) {
      return unavailable('credentials_missing');
    }
    if (typeof fetchImpl !== 'function') return unavailable('fetch_unavailable');

    const url = new URL(path, origin);
    // Auth parameter placement must be confirmed against the credentials/API
    // documentation issued to the owner. Never log this URL: it contains a secret.
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('client_secret', clientSecret);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url.toString(), {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: controller.signal
      });
      if (!response || !response.ok) {
        return unavailable(response ? 'upstream_http_error' : 'upstream_no_response');
      }
      const contentType = response.headers?.get?.('content-type') || '';
      if (!/json/i.test(contentType)) return unavailable('upstream_content_type_invalid');

      const declaredLength = Number(response.headers?.get?.('content-length'));
      if (Number.isFinite(declaredLength) && declaredLength > maxResponseBytes) {
        return unavailable('upstream_payload_too_large');
      }
      const body = await response.text();
      if (new TextEncoder().encode(body).byteLength > maxResponseBytes) {
        return unavailable('upstream_payload_too_large');
      }
      let data;
      try {
        data = JSON.parse(body);
      } catch {
        return unavailable('upstream_json_invalid');
      }
      if (!data || typeof data !== 'object') return unavailable('upstream_schema_invalid');

      return {
        available: true,
        source_status: 'available',
        reason: null,
        source_id: 'caba_datosabiertos_transport',
        mode,
        temporal_state: 'unknown',
        fetched_at: new Date(now()).toISOString(),
        data,
        cache_hit: false
      };
    } catch (error) {
      return unavailable(error?.name === 'AbortError' ? 'upstream_timeout' : 'source_unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }

  return Object.freeze({
    readBuses: () => read('buses'),
    readTrains: () => read('trains')
  });
}

export const CABA_TRANSPORT_ENDPOINTS = ENDPOINTS;
