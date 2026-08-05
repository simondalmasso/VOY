import {
  VOICE_LIMITS,
  boundedString,
  isPlainObject,
  normalizeCityId,
  sanitizePlaceRef
} from './voiceCopilotContracts.mjs';

const FIXED_PROVIDER_URLS = Object.freeze({
  uber: 'https://m.uber.com/ul/',
  didi: 'https://www.didiglobal.com/',
  maxim: 'https://taximaxim.com/',
  cabify: 'https://cabify.com/'
});

const AUTHORITATIVE_DESTINATION_HOSTS = new Set([
  'santafeciudad.gov.ar',
  'www.santafeciudad.gov.ar',
  'turismo.santafeciudad.gov.ar',
  'agenda.santafeciudad.gov.ar',
  'argentina.gob.ar',
  'www.argentina.gob.ar',
  'bcra.gob.ar',
  'www.bcra.gob.ar'
]);

function authoritativeHttpsUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && AUTHORITATIVE_DESTINATION_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function isAuthoritativeTerritorialDestination(item) {
  if (!isPlainObject(item) || item.verified !== true || item.source !== 'authoritative') return false;
  if (item.precision !== 'poi' && item.precision !== 'address') return false;
  if (typeof item.lat !== 'number' || !Number.isFinite(item.lat) || typeof item.lon !== 'number' || !Number.isFinite(item.lon)) return false;
  if (typeof item.address !== 'string' || !item.address.trim()) return false;
  if (typeof item.verified_at !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.verified_at)) return false;
  const provenance = item.provenance;
  return isPlainObject(provenance)
    && provenance.status === 'authoritative'
    && typeof provenance.issuer === 'string'
    && Boolean(provenance.issuer.trim())
    && typeof provenance.source_title === 'string'
    && Boolean(provenance.source_title.trim())
    && typeof provenance.license === 'string'
    && Boolean(provenance.license.trim())
    && typeof provenance.coordinate_method === 'string'
    && Boolean(provenance.coordinate_method.trim())
    && authoritativeHttpsUrl(provenance.source_url)
    && authoritativeHttpsUrl(provenance.coordinate_source_url);
}

export function cityFolder(cityId) {
  return normalizeCityId(cityId) === 'santafe' ? 'santa-fe' : '_default';
}

export async function assetJson(env, path) {
  const response = await env.ASSETS.fetch(new Request(`https://voy.internal${path}`, {
    headers: { Accept: 'application/json' }
  }));
  if (response.status !== 200) throw new Error(`territorial_asset_http_${response.status}`);
  const text = await response.text();
  const bytes = new TextEncoder().encode(text).byteLength;
  if (!text || bytes > VOICE_LIMITS.maxToolResultBytes) throw new Error('territorial_asset_size_invalid');
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('territorial_asset_invalid_json');
  }
  if (!isPlainObject(parsed)) throw new Error('territorial_asset_invalid_shape');
  return parsed;
}

export async function loadCityBundle(env, cityId) {
  const normalized = normalizeCityId(cityId);
  const folder = cityFolder(normalized);
  const [profile, providers, transport, fares, flags] = await Promise.all([
    assetJson(env, `/cities/${folder}/profile.json`),
    assetJson(env, `/cities/${folder}/providers.json`),
    assetJson(env, `/cities/${folder}/transport.json`),
    assetJson(env, `/cities/${folder}/fares.json`),
    assetJson(env, `/cities/${folder}/feature_flags.json`)
  ]);
  for (const component of [profile, providers, transport, fares, flags]) {
    if (component.city_id !== normalized) throw new Error('territorial_city_id_mismatch');
  }
  return { profile, providers, transport, fares, flags };
}

export function foldText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function searchNeedles(query) {
  const original = foldText(query);
  if (original.length < 2) return [];
  const withoutLeadingArticle = original.replace(/^(?:a la|a los|a las|al|a|la|el|los|las)\s+/, '').trim();
  return [...new Set([original, withoutLeadingArticle].filter(value => value.length >= 2))];
}

export function toPlaceRef(item, cityId, sourceType) {
  if (sourceType !== 'landmark' || !isAuthoritativeTerritorialDestination(item)) return null;
  const name = boundedString(item?.nombre || item?.name, 180);
  if (!name) return null;
  const address = boundedString(item.address, 240);
  const ref = boundedString(item?.canonicalId, 160, { allowEmpty: true })
    || `${cityId}:${sourceType}:${foldText(name).replace(/\s+/g, '-')}`;
  return sanitizePlaceRef({ ref, name, address, source: 'local', city_id: cityId });
}

export function searchTerritorial(bundle, cityId, query) {
  const needles = searchNeedles(query);
  if (!needles.length) return [];
  const candidates = [];
  const exactNameByRef = new Map();
  let exactLandmarkAlias = null;
  for (const [sourceType, items] of [
    ['landmark', bundle.transport.landmarks],
    ['stop', bundle.transport.bus_stops],
    ['bike', bundle.transport.bike_stations]
  ]) {
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      const ref = toPlaceRef(item, cityId, sourceType);
      if (!ref) continue;
      const aliases = Array.isArray(item.aliases) ? item.aliases.map(foldText) : [];
      const foldedName = foldText(ref.name);
      const haystack = foldText(`${ref.name} ${ref.address} ${(item.aliases || []).join(' ')}`);
      let best = null;
      for (const needle of needles) {
        const exactName = foldedName === needle;
        const exactAlias = sourceType === 'landmark' && aliases.includes(needle);
        const allParts = needle.split(' ').every(part => haystack.includes(part));
        if (!haystack.includes(needle) && !allParts) continue;
        const score = (exactName ? 2 : 0)
          + (foldedName.startsWith(needle) ? 1 : 0)
          + (exactAlias ? 4 : 0);
        if (!best || score > best.score) best = { exactName, exactAlias, score };
      }
      if (!best) continue;
      const candidate = { ref, score: best.score };
      candidates.push(candidate);
      if (best.exactName) exactNameByRef.set(ref.ref, candidate);
      if (best.exactAlias && (!exactLandmarkAlias || best.score > exactLandmarkAlias.score)) {
        exactLandmarkAlias = candidate;
      }
    }
  }
  if (exactLandmarkAlias) return [exactLandmarkAlias.ref];
  if (exactNameByRef.size === 1) return [[...exactNameByRef.values()][0].ref];
  return candidates
    .sort((a, b) => b.score - a.score || a.ref.name.localeCompare(b.ref.name, 'es'))
    .slice(0, VOICE_LIMITS.maxCandidates)
    .map(entry => entry.ref);
}

export function providerSummary(bundle) {
  return Object.entries(bundle.providers.providers || {}).map(([id, provider]) => ({
    id,
    name: boundedString(provider?.name, 100) || id,
    available: provider?.available === true,
    verified: provider?.verified === true,
    category: boundedString(provider?.category, 40, { allowEmpty: true }) || ''
  }));
}

export function safeExternalUrl(bundle, requestedProvider) {
  if (FIXED_PROVIDER_URLS[requestedProvider]) return FIXED_PROVIDER_URLS[requestedProvider];
  const companies = [
    ...(Array.isArray(bundle.providers.taxi_companies) ? bundle.providers.taxi_companies : []),
    ...(Array.isArray(bundle.providers.remis_companies) ? bundle.providers.remis_companies : [])
  ];
  const company = companies.find(item => {
    const category = bundle.providers.providers?.[item.id]?.category;
    return requestedProvider === 'taxi'
      ? category === 'taxi'
      : requestedProvider === 'remis'
        ? category === 'remis'
        : item.id === requestedProvider;
  });
  const candidate = company?.whatsapp || company?.web || company?.app;
  if (typeof candidate !== 'string') return null;
  let url;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  if (!['wa.link', 'wa.me', 'api.whatsapp.com'].includes(url.hostname)) return null;
  return url.toString();
}
