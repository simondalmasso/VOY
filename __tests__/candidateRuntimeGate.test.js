/* eslint-disable @typescript-eslint/no-require-imports */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const modulePromise = import('../scripts/candidate-runtime-gate.mjs');
const contractPromise = import('../scripts/required-city-platform-assets.mjs');

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://unpkg.com https://accounts.google.com",
  "style-src 'self' 'unsafe-inline' https://unpkg.com",
  "img-src 'self' data: blob: https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://tile.openstreetmap.org",
  "connect-src 'self' https://router.project-osrm.org https://accounts.google.com https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://tile.openstreetmap.org",
  'frame-src https://accounts.google.com',
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "manifest-src 'self'"
].join('; ');

function payload(versions) {
  return {
    success: true,
    result: {
      deployments: [{ id: 'deployment-final', versions }]
    }
  };
}

function rootMetadata(overrides = {}) {
  return {
    status: 200,
    content_type: 'text/html; charset=utf-8',
    cache_control: 'no-store',
    content_security_policy: CSP,
    content_security_policy_report_only: CSP,
    x_content_type_options: 'nosniff',
    referrer_policy: 'strict-origin-when-cross-origin',
    permissions_policy: 'camera=(), geolocation=(self), microphone=(self)',
    x_frame_options: 'DENY',
    cross_origin_opener_policy: 'same-origin',
    cross_origin_resource_policy: 'same-origin',
    strict_transport_security: 'max-age=31536000; includeSubDomains',
    set_cookie: 'voy_sid=12345678; Max-Age=86400; SameSite=Lax; Path=/; Secure; HttpOnly',
    ...overrides
  };
}

function rootBody(hash = 'abc1234') {
  return `<!doctype html>
<html lang="es">
<head>
<meta name="voy-version" content="V7.8.0">
<meta name="voy-build" content="${hash}">
<script src="core/cityPlatform.js?v=1"></script>
<script src="core/mobilityEngine.js?v=12"></script>
<link rel="stylesheet" href="/ui/productShell.css?v=2" data-voy-product-shell>
<script data-voy-product-shell>window.VOY_PRODUCT_CONFIG={"auth_enabled":false,"google_client_id":null,"voice_enabled":true,"persistent_account":false,"trip_history_persisted":false,"legal_effective_date":"2026-08-04"};</script>
<script src="/core/productShell.js?v=2" defer data-voy-product-shell></script>
<link rel="stylesheet" href="/ui/voiceCopilot.css?v=1" data-voy-voice-copilot>
<script data-voy-voice-copilot>window.VOY_VOICE_ENABLED=true;window.VOY_VOICE_TEST_MODE=false;</script>
<script src="/core/voiceCopilot.js?v=1" defer data-voy-voice-copilot></script>
</head>
<body><main id="map">VOY</main><script>window.VOY_BUILD_HASH='${hash}';</script></body>
</html>`;
}

function rootExpected(hash = 'abc1234') {
  return {
    expectedSha256: 'static-source-hash-is-evidence-only-for-root',
    expectedBytes: 100,
    expectedBuildHash: hash,
    expectedVersion: 'V7.8.0'
  };
}

describe('candidate runtime gate', () => {
  test('accepts exactly one stable 100% and one candidate 0%', async () => {
    const gate = await modulePromise;
    const result = gate.inspectDeployment(payload([
      { version_id: 'stable', percentage: 100 },
      { version_id: 'candidate', percentage: 0 }
    ]), 'stable', 'candidate');
    assert.equal(result.valid, true);
    assert.equal(result.exactPair, true);
    assert.equal(result.active.id, 'deployment-final');
  });

  test('rejects missing, promoted or extra candidate traffic', async () => {
    const gate = await modulePromise;
    const missing = gate.inspectDeployment(payload([
      { version_id: 'stable', percentage: 100 }
    ]), 'stable', 'candidate');
    const promoted = gate.inspectDeployment(payload([
      { version_id: 'stable', percentage: 95 },
      { version_id: 'candidate', percentage: 5 }
    ]), 'stable', 'candidate');
    const extra = gate.inspectDeployment(payload([
      { version_id: 'stable', percentage: 100 },
      { version_id: 'candidate', percentage: 0 },
      { version_id: 'orphan', percentage: 0 }
    ]), 'stable', 'candidate');
    assert.equal(missing.valid, false);
    assert.equal(promoted.valid, false);
    assert.equal(extra.valid, false);
  });

  test('requires exact health version and build hash', async () => {
    const gate = await modulePromise;
    assert.equal(gate.healthMatches({ ok: true, version: 'V7.8.0', build_hash: 'abc1234' }, 'V7.8.0', 'abc1234'), true);
    assert.equal(gate.healthMatches({ ok: true, version: 'V7.8.0', build_hash: 'stable00' }, 'V7.8.0', 'abc1234'), false);
    assert.equal(gate.healthMatches({ ok: false, version: 'V7.8.0', build_hash: 'abc1234' }, 'V7.8.0', 'abc1234'), false);
  });

  test('requires twenty consecutive exact-asset rounds and at least 120 seconds', async () => {
    const gate = await modulePromise;
    assert.equal(gate.REQUIRED_CONSECUTIVE_ASSET_ROUNDS, 20);
    assert.equal(gate.MINIMUM_CONVERGENCE_DURATION_MS, 120_000);
    const startedAt = 1_000;
    assert.equal(gate.convergenceSatisfied({ consecutive: 19, startedAt, now: 130_000 }), false);
    assert.equal(gate.convergenceSatisfied({ consecutive: 20, startedAt, now: 120_999 }), false);
    assert.equal(gate.convergenceSatisfied({ consecutive: 20, startedAt, now: 121_000 }), true);
  });

  test('uses one transformed root plus twelve immutable canonical assets', async () => {
    const contract = await contractPromise;
    assert.equal(contract.REQUIRED_CITY_PLATFORM_ASSET_COUNT, 13);
    assert.equal(contract.IMMUTABLE_CITY_PLATFORM_ASSET_COUNT, 12);
    assert.equal(contract.REQUIRED_CITY_PLATFORM_ASSETS.length, 13);
    assert.equal(contract.assertCanonicalAssetSet(), true);
    assert.ok(contract.REQUIRED_CITY_PLATFORM_ASSETS.some(asset => asset.path === '/cities/santa-fe/providers.json'));
  });

  test('accepts the exact transformed runtime root contract without requiring the static source hash', async () => {
    const contract = await contractPromise;
    const root = contract.REQUIRED_CITY_PLATFORM_ASSETS.find(asset => asset.path === '/');
    const result = contract.evaluateRemoteAsset(root, Buffer.from(rootBody()), rootMetadata(), rootExpected());
    assert.equal(result.pass, true);
    assert.equal(result.validation_mode, 'runtime-transformed-html');
    assert.equal(result.immutable_hash_required, false);
    assert.equal(result.hash_pass, null);
    assert.equal(result.runtime_identity_pass, true);
    assert.equal(result.product_shell_pass, true);
    assert.equal(result.voice_shell_pass, true);
    assert.equal(result.privacy_shell_pass, true);
    assert.equal(result.security_headers_pass, true);
    assert.equal(result.session_cookie_pass, true);
  });

  test('a merely successful root response cannot pass the runtime contract', async () => {
    const contract = await contractPromise;
    const root = contract.REQUIRED_CITY_PLATFORM_ASSETS.find(asset => asset.path === '/');
    const cases = [
      ['old build', rootBody('stable00'), rootMetadata(), /identity/],
      ['missing product shell', rootBody().replaceAll('data-voy-product-shell', 'data-missing-product-shell'), rootMetadata(), /product_shell/],
      ['missing voice shell', rootBody().replaceAll('data-voy-voice-copilot', 'data-missing-voice-shell').replace('window.VOY_VOICE_ENABLED=true', 'window.VOY_VOICE_ENABLED=false'), rootMetadata(), /voice_shell/],
      ['unsafe persistence config', rootBody().replace('"persistent_account":false', '"persistent_account":true'), rootMetadata(), /privacy_shell/],
      ['missing security header', rootBody(), rootMetadata({ content_security_policy: null }), /security_headers/],
      ['unhardened session cookie', rootBody(), rootMetadata({ set_cookie: 'voy_sid=123; Path=/' }), /session_cookie/],
      ['malformed html', '<html>VOY</html>', rootMetadata(), /html/],
      ['arbitrary foreign success', '<!doctype html><html><head></head><body>foreign</body></html>', rootMetadata(), /identity/]
    ];
    for (const [name, body, metadata, error] of cases) {
      const result = contract.evaluateRemoteAsset(root, Buffer.from(body), metadata, rootExpected());
      assert.equal(result.pass, false, name);
      assert.match(result.validation_error, error, name);
    }
  });

  test('preserves exact byte and hash validation for VOY-Lite and every immutable asset', async () => {
    const contract = await contractPromise;
    const asset = contract.REQUIRED_CITY_PLATFORM_ASSETS.find(item => item.path === '/VOY-Lite.html');
    const exact = Buffer.from('<!doctype html><html><head></head><body>VOY</body></html>');
    const expected = { expectedSha256: contract.sha256(exact), expectedBytes: exact.length };
    const pass = contract.evaluateRemoteAsset(asset, exact, { status: 200, content_type: 'text/html' }, expected);
    const changed = contract.evaluateRemoteAsset(asset, Buffer.from(`${exact.toString()}x`), { status: 200, content_type: 'text/html' }, expected);
    assert.equal(pass.pass, true);
    assert.equal(pass.validation_mode, 'immutable-exact');
    assert.equal(pass.immutable_hash_required, true);
    assert.equal(pass.hash_pass, true);
    assert.equal(changed.pass, false);
    assert.equal(changed.hash_pass, false);
  });

  test('extracts exact candidate version events and non-ok outcomes', async () => {
    const gate = await modulePromise;
    const text = [
      '{"scriptVersion":{"id":"candidate"},"outcome":"ok"}',
      '{"scriptVersion":{"id":"candidate"},"outcome":"ok"}',
      '{"scriptVersion":{"id":"other"},"outcome":"exception"}'
    ].join('\n');
    assert.deepEqual(gate.extractTailProof(text, 'candidate'), {
      exactEvents: 2,
      observedVersionIds: ['candidate', 'other'],
      nonOkOutcomes: ['exception']
    });
  });

  test('rejects malformed deployment payloads', async () => {
    const gate = await modulePromise;
    assert.throws(() => gate.deploymentsFromPayload({ success: false }), /deployments_api_failed/);
    assert.throws(() => gate.deploymentsFromPayload({ success: true, result: {} }), /deployments_shape_unknown/);
  });
});
