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

export function toPlaceRef(item, cityId, sourceType) {
  const name = boundedString(item?.nombre || item?.name, 180);
  if (!name) return null;
  const address = boundedString(item?.address || item?.calles, 240, { allowEmpty: true }) || '';
  const ref = boundedString(item?.canonicalId, 160, { allowEmpty: true })
    || `${cityId}:${sourceType}:${foldText(name).replace(/\s+/g, '-')}`;
  return sanitizePlaceRef({ ref, name, address, source: 'local', city_id: cityId });
}

export function searchTerritorial(bundle, cityId, query) {
  const needle = foldText(query);
  if (needle.length < 2) return [];
  const candidates = [];
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
      const exactAlias = sourceType === 'landmark' && aliases.includes(needle);
      const haystack = foldText(`${ref.name} ${ref.address} ${(item.aliases || []).join(' ')}`);
      const allParts = needle.split(' ').every(part => haystack.includes(part));
      if (!haystack.includes(needle) && !allParts) continue;
      const score = (foldText(ref.name) === needle ? 2 : 0)
        + (foldText(ref.name).startsWith(needle) ? 1 : 0)
        + (exactAlias ? 4 : 0);
      const candidate = { ref, score };
      candidates.push(candidate);
      if (exactAlias && (!exactLandmarkAlias || score > exactLandmarkAlias.score)) {
        exactLandmarkAlias = candidate;
      }
    }
  }
  if (exactLandmarkAlias) return [exactLandmarkAlias.ref];
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
