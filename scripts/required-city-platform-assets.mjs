import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const REQUIRED_CITY_PLATFORM_ASSETS = Object.freeze([
  Object.freeze({ path: '/', sourcePath: 'public/VOY-Lite.html', kind: 'html', cityId: null, component: 'entrypoint' }),
  Object.freeze({ path: '/VOY-Lite.html', sourcePath: 'public/VOY-Lite.html', kind: 'html', cityId: null, component: 'entrypoint' }),
  Object.freeze({ path: '/core/cityPlatform.js?v=1', sourcePath: 'public/core/cityPlatform.js', kind: 'javascript', cityId: null, component: 'runtime' }),
  Object.freeze({ path: '/cities/_default/profile.json', sourcePath: 'public/cities/_default/profile.json', kind: 'json', cityId: '_default', component: 'profile' }),
  Object.freeze({ path: '/cities/_default/providers.json', sourcePath: 'public/cities/_default/providers.json', kind: 'json', cityId: '_default', component: 'providers' }),
  Object.freeze({ path: '/cities/_default/transport.json', sourcePath: 'public/cities/_default/transport.json', kind: 'json', cityId: '_default', component: 'transport' }),
  Object.freeze({ path: '/cities/_default/fares.json', sourcePath: 'public/cities/_default/fares.json', kind: 'json', cityId: '_default', component: 'fares' }),
  Object.freeze({ path: '/cities/_default/feature_flags.json', sourcePath: 'public/cities/_default/feature_flags.json', kind: 'json', cityId: '_default', component: 'feature_flags' }),
  Object.freeze({ path: '/cities/santa-fe/profile.json', sourcePath: 'public/cities/santa-fe/profile.json', kind: 'json', cityId: 'santafe', component: 'profile' }),
  Object.freeze({ path: '/cities/santa-fe/providers.json', sourcePath: 'public/cities/santa-fe/providers.json', kind: 'json', cityId: 'santafe', component: 'providers' }),
  Object.freeze({ path: '/cities/santa-fe/transport.json', sourcePath: 'public/cities/santa-fe/transport.json', kind: 'json', cityId: 'santafe', component: 'transport' }),
  Object.freeze({ path: '/cities/santa-fe/fares.json', sourcePath: 'public/cities/santa-fe/fares.json', kind: 'json', cityId: 'santafe', component: 'fares' }),
  Object.freeze({ path: '/cities/santa-fe/feature_flags.json', sourcePath: 'public/cities/santa-fe/feature_flags.json', kind: 'json', cityId: 'santafe', component: 'feature_flags' })
]);

export const REQUIRED_CITY_PLATFORM_ASSET_COUNT = 13;
export const IMMUTABLE_CITY_PLATFORM_ASSET_COUNT = 12;
export const RUNTIME_TRANSFORMED_ROOT_PATH = '/';
export const REQUIRED_TERRITORIAL_COMPONENTS = Object.freeze(['profile', 'providers', 'transport', 'fares', 'feature_flags']);

const REQUIRED_ROOT_CSP_TOKENS = Object.freeze([
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "connect-src 'self'",
  'https://accounts.google.com',
  "manifest-src 'self'"
]);

export function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export function assertCanonicalAssetSet(definitions = REQUIRED_CITY_PLATFORM_ASSETS) {
  if (!Array.isArray(definitions)) throw new Error('required_assets_not_array');
  const canonicalPaths = REQUIRED_CITY_PLATFORM_ASSETS.map(asset => asset.path);
  const suppliedPaths = definitions.map(asset => asset.path);
  if (suppliedPaths.length !== REQUIRED_CITY_PLATFORM_ASSET_COUNT) {
    throw new Error(`required_asset_count:${suppliedPaths.length}`);
  }
  if (new Set(suppliedPaths).size !== suppliedPaths.length) throw new Error('duplicate_required_asset_path');
  for (const path of canonicalPaths) {
    if (!suppliedPaths.includes(path)) throw new Error(`missing_required_asset:${path}`);
  }
  for (const path of suppliedPaths) {
    if (!canonicalPaths.includes(path)) throw new Error(`unknown_required_asset:${path}`);
  }
  const immutableCount = definitions.filter(asset => asset.path !== RUNTIME_TRANSFORMED_ROOT_PATH).length;
  if (immutableCount !== IMMUTABLE_CITY_PLATFORM_ASSET_COUNT) {
    throw new Error(`immutable_required_asset_count:${immutableCount}`);
  }
  for (const cityId of ['_default', 'santafe']) {
    const components = definitions.filter(asset => asset.cityId === cityId).map(asset => asset.component);
    for (const component of REQUIRED_TERRITORIAL_COMPONENTS) {
      if (!components.includes(component)) throw new Error(`missing_territorial_component:${cityId}:${component}`);
    }
    if (components.length !== REQUIRED_TERRITORIAL_COMPONENTS.length) {
      throw new Error(`territorial_component_count:${cityId}:${components.length}`);
    }
  }
  return true;
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateJsonSchema(asset, value) {
  if (!isObject(value)) return { valid: false, error: 'json_root_not_object' };
  if (value.schema_version !== 1) return { valid: false, error: 'schema_version_invalid' };
  if (value.city_id !== asset.cityId) return { valid: false, error: `city_id_mismatch:${String(value.city_id)}` };
  if (asset.component === 'profile') {
    if (typeof value.name !== 'string' || !Array.isArray(value.center) || value.center.length !== 2 || typeof value.coverage_level !== 'string') {
      return { valid: false, error: 'profile_schema_invalid' };
    }
  } else if (asset.component === 'providers') {
    if (!isObject(value.providers) || !Array.isArray(value.taxi_companies) || !Array.isArray(value.remis_companies)) {
      return { valid: false, error: 'providers_schema_invalid' };
    }
  } else if (asset.component === 'transport') {
    if (!Array.isArray(value.bus_stops) || !Array.isArray(value.bike_stations) || !Array.isArray(value.landmarks)) {
      return { valid: false, error: 'transport_schema_invalid' };
    }
  } else if (asset.component === 'fares') {
    if (!isObject(value.fare_registry) || !isObject(value.fare_registry.taxi) || !isObject(value.fare_registry.remis) || !isObject(value.fare_registry.bus) || !isObject(value.fare_registry.apps)) {
      return { valid: false, error: 'fares_schema_invalid' };
    }
  } else if (asset.component === 'feature_flags') {
    if (!isObject(value.flags) || Object.values(value.flags).some(flag => typeof flag !== 'boolean')) {
      return { valid: false, error: 'feature_flags_schema_invalid' };
    }
  }
  return { valid: true, error: null };
}

export function validateAssetBody(asset, body) {
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body || '');
  const bodyBytes = buffer.length;
  const bodySha256 = sha256(buffer);
  if (bodyBytes === 0) {
    return { bodyBytes, bodySha256, parseResult: false, schemaResult: false, cityId: null, error: 'empty_body' };
  }
  const text = buffer.toString('utf8');
  if (asset.kind === 'json') {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { bodyBytes, bodySha256, parseResult: false, schemaResult: false, cityId: null, error: 'invalid_json' };
    }
    const schema = validateJsonSchema(asset, parsed);
    return {
      bodyBytes,
      bodySha256,
      parseResult: true,
      schemaResult: schema.valid,
      cityId: parsed.city_id ?? null,
      error: schema.error
    };
  }
  if (asset.kind === 'html') {
    const valid = /<!doctype html/i.test(text) && /<html\b/i.test(text) && /<head\b/i.test(text)
      && /<body\b/i.test(text) && /<\/html>/i.test(text) && text.includes('VOY');
    return { bodyBytes, bodySha256, parseResult: valid, schemaResult: valid, cityId: null, error: valid ? null : 'html_contract_invalid' };
  }
  if (asset.kind === 'javascript') {
    const valid = text.includes('VoyCityPlatform') && text.includes('loadCity');
    return { bodyBytes, bodySha256, parseResult: true, schemaResult: valid, cityId: null, error: valid ? null : 'javascript_contract_invalid' };
  }
  return { bodyBytes, bodySha256, parseResult: false, schemaResult: false, cityId: null, error: 'unknown_asset_kind' };
}

function extractMeta(text, name) {
  const pattern = new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([^"']+)["']`, 'i');
  return text.match(pattern)?.[1] || null;
}

function extractBuildHash(text) {
  const meta = extractMeta(text, 'voy-build');
  const script = text.match(/window\.VOY_BUILD_HASH\s*=\s*['"]([^'"]+)['"]/i)?.[1] || null;
  return meta && script && meta === script ? meta : null;
}

function extractProductConfig(text) {
  const raw = text.match(/window\.VOY_PRODUCT_CONFIG\s*=\s*({[^;]+})\s*;/)?.[1];
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function expectedRuntimeIdentity(text) {
  return {
    expectedBuildHash: extractBuildHash(text),
    expectedVersion: extractMeta(text, 'voy-version')
  };
}

export function expectedAssetManifest(sourceRoot = process.cwd()) {
  assertCanonicalAssetSet();
  return REQUIRED_CITY_PLATFORM_ASSETS.map(asset => {
    const buffer = readFileSync(resolve(sourceRoot, asset.sourcePath));
    const validation = validateAssetBody(asset, buffer);
    if (!validation.schemaResult) throw new Error(`invalid_local_required_asset:${asset.path}:${validation.error}`);
    const runtimeIdentity = asset.path === RUNTIME_TRANSFORMED_ROOT_PATH
      ? expectedRuntimeIdentity(buffer.toString('utf8'))
      : { expectedBuildHash: null, expectedVersion: null };
    return {
      ...asset,
      validationMode: asset.path === RUNTIME_TRANSFORMED_ROOT_PATH ? 'runtime-transformed-html' : 'immutable-exact',
      expectedSha256: validation.bodySha256,
      expectedBytes: validation.bodyBytes,
      ...runtimeIdentity
    };
  });
}

function evaluateRuntimeRoot(asset, body, metadata, expected) {
  const validation = validateAssetBody(asset, body);
  const text = Buffer.isBuffer(body) ? body.toString('utf8') : String(body || '');
  const observedBuildHash = extractBuildHash(text);
  const observedVersion = extractMeta(text, 'voy-version');
  const config = extractProductConfig(text);
  const expectedBuildHash = String(expected.expectedBuildHash || '');
  const expectedVersion = String(expected.expectedVersion || '');

  const statusPass = metadata.status === 200;
  const contentTypePass = String(metadata.content_type || '').toLowerCase().includes('text/html');
  const bodyPass = validation.bodyBytes > 0;
  const parsePass = validation.parseResult === true;
  const schemaPass = validation.schemaResult === true;
  const identityPass = expectedBuildHash.length >= 7
    && observedBuildHash === expectedBuildHash
    && observedVersion === expectedVersion
    && text.includes('core/cityPlatform.js?v=1')
    && text.includes('core/mobilityEngine.js?v=12')
    && /id=["']map["']/.test(text);
  const productShellPass = text.includes('data-voy-product-shell')
    && text.includes('/ui/productShell.css?v=2')
    && text.includes('window.VOY_PRODUCT_CONFIG=')
    && text.includes('/core/productShell.js?v=2');
  const voiceShellPass = text.includes('data-voy-voice-copilot')
    && text.includes('/ui/voiceCopilot.css?v=1')
    && text.includes('window.VOY_VOICE_ENABLED=true')
    && text.includes('/core/voiceCopilot.js?v=1');
  const privacyShellPass = Boolean(config)
    && config.auth_enabled === false
    && config.google_client_id === null
    && config.voice_enabled === true
    && config.persistent_account === false
    && config.trip_history_persisted === false
    && config.legal_effective_date === '2026-08-04';

  const csp = String(metadata.content_security_policy || '');
  const cspReportOnly = String(metadata.content_security_policy_report_only || '');
  const securityHeadersPass = String(metadata.cache_control || '').toLowerCase().includes('no-store')
    && metadata.x_content_type_options === 'nosniff'
    && metadata.referrer_policy === 'strict-origin-when-cross-origin'
    && metadata.permissions_policy === 'camera=(), geolocation=(self), microphone=(self)'
    && metadata.x_frame_options === 'DENY'
    && metadata.cross_origin_opener_policy === 'same-origin'
    && metadata.cross_origin_resource_policy === 'same-origin'
    && String(metadata.strict_transport_security || '').includes('max-age=31536000')
    && csp.length > 0
    && cspReportOnly === csp
    && REQUIRED_ROOT_CSP_TOKENS.every(token => csp.includes(token))
    && !/unsafe-eval|nominatim\.openstreetmap\.org/i.test(csp);

  const cookie = String(metadata.set_cookie || '');
  const sessionCookiePass = /(?:^|;\s*)voy_sid=[^;]+/i.test(cookie)
    && /Max-Age=86400/i.test(cookie)
    && /SameSite=Lax/i.test(cookie)
    && /Path=\//i.test(cookie)
    && /(?:^|;\s*)Secure(?:;|$)/i.test(cookie)
    && /(?:^|;\s*)HttpOnly(?:;|$)/i.test(cookie);

  const checks = {
    status: statusPass,
    content_type: contentTypePass,
    body: bodyPass,
    html: parsePass && schemaPass,
    identity: identityPass,
    product_shell: productShellPass,
    voice_shell: voiceShellPass,
    privacy_shell: privacyShellPass,
    security_headers: securityHeadersPass,
    session_cookie: sessionCookiePass
  };
  const failures = Object.entries(checks).filter(([, value]) => !value).map(([name]) => name);

  return {
    ...metadata,
    path: asset.path,
    source_path: asset.sourcePath,
    validation_mode: 'runtime-transformed-html',
    immutable_hash_required: false,
    expected_source_sha256: expected.expectedSha256,
    expected_source_bytes: expected.expectedBytes,
    expected_build_hash: expectedBuildHash,
    observed_build_hash: observedBuildHash,
    expected_version: expectedVersion,
    observed_version: observedVersion,
    body_sha256: validation.bodySha256,
    body_bytes: validation.bodyBytes,
    json_parse_result: null,
    schema_result: schemaPass,
    city_id: null,
    status_pass: statusPass,
    content_type_pass: contentTypePass,
    body_pass: bodyPass,
    hash_pass: null,
    city_pass: true,
    runtime_identity_pass: identityPass,
    product_shell_pass: productShellPass,
    voice_shell_pass: voiceShellPass,
    privacy_shell_pass: privacyShellPass,
    security_headers_pass: securityHeadersPass,
    session_cookie_pass: sessionCookiePass,
    runtime_checks: checks,
    validation_error: failures.length ? `runtime_root_contract:${failures.join(',')}` : null,
    pass: failures.length === 0
  };
}

export function evaluateRemoteAsset(asset, body, metadata, expected) {
  if (asset.path === RUNTIME_TRANSFORMED_ROOT_PATH) {
    return evaluateRuntimeRoot(asset, body, metadata, expected);
  }
  const validation = validateAssetBody(asset, body);
  const statusPass = metadata.status === 200;
  const bodyPass = validation.bodyBytes > 0;
  const hashPass = validation.bodySha256 === expected.expectedSha256;
  const parsePass = validation.parseResult === true;
  const schemaPass = validation.schemaResult === true;
  const cityPass = asset.cityId === null || validation.cityId === asset.cityId;
  return {
    ...metadata,
    path: asset.path,
    source_path: asset.sourcePath,
    validation_mode: 'immutable-exact',
    immutable_hash_required: true,
    expected_source_sha256: expected.expectedSha256,
    expected_source_bytes: expected.expectedBytes,
    body_sha256: validation.bodySha256,
    body_bytes: validation.bodyBytes,
    json_parse_result: asset.kind === 'json' ? parsePass : null,
    schema_result: schemaPass,
    city_id: validation.cityId,
    status_pass: statusPass,
    body_pass: bodyPass,
    hash_pass: hashPass,
    city_pass: cityPass,
    validation_error: validation.error,
    pass: statusPass && bodyPass && hashPass && parsePass && schemaPass && cityPass
  };
}

assertCanonicalAssetSet();
