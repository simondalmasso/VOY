/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const test = require('node:test');

const authPromise = import('../authSession.mjs');

function cookieValue(response, name) {
  const values = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie') || ''];
  for (const value of values) {
    const match = value.match(new RegExp(`(?:^|,\\s*)${name}=([^;,]*)`));
    if (match) return decodeURIComponent(match[1]);
  }
  return '';
}

function configuredEnv(verify) {
  return {
    VOY_GOOGLE_CLIENT_ID: 'client.apps.googleusercontent.com',
    VOY_AUTH_SESSION_SECRET_V1: 'test-secret-value-with-enough-entropy',
    __VOY_AUTH_TEST_VERIFY: verify || (async () => ({ sub: 'google-subject', exp: Math.floor(Date.now() / 1000) + 3600 }))
  };
}

test('session endpoint is safe and explicitly disabled without external configuration', async () => {
  const { handleAuthRequest, authContract } = await authPromise;
  const response = await handleAuthRequest(new Request('https://voy.test/api/auth/session'), {});
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.enabled, false);
  assert.equal(body.authenticated, false);
  assert.equal(body.persistent_account, false);
  assert.equal(body.trip_history_persisted, false);
  assert.ok(cookieValue(response, authContract.csrfCookie));
});

test('Google POST requires exact double-submit CSRF and allowed origin', async () => {
  const { handleAuthRequest } = await authPromise;
  const noCsrf = await handleAuthRequest(new Request('https://voy.test/api/auth/google', {
    method: 'POST',
    headers: { Origin: 'https://accounts.google.com', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'credential=token'
  }), configuredEnv());
  assert.equal(noCsrf.status, 400);
  assert.equal((await noCsrf.json()).error, 'google_csrf_mismatch');

  const foreign = await handleAuthRequest(new Request('https://voy.test/api/auth/google', {
    method: 'POST',
    headers: { Origin: 'https://evil.example', 'Content-Type': 'application/x-www-form-urlencoded', Cookie: 'g_csrf_token=abc' },
    body: 'credential=token&g_csrf_token=abc'
  }), configuredEnv());
  assert.equal(foreign.status, 403);
});

test('verified Google credential creates only an encrypted ephemeral session', async () => {
  const { handleAuthRequest, authContract, __authTest } = await authPromise;
  const env = configuredEnv(async (_credential, options) => {
    assert.equal(options.clientId, env.VOY_GOOGLE_CLIENT_ID);
    assert.equal(options.nonce, 'nonce-1');
    return { sub: 'raw-google-subject', email: 'must-not-persist@example.com', exp: Math.floor(Date.now() / 1000) + 3600 };
  });
  const response = await handleAuthRequest(new Request('https://voy.test/api/auth/google', {
    method: 'POST',
    headers: {
      Origin: 'https://accounts.google.com',
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: 'g_csrf_token=abc; __Host-voy_auth_nonce=nonce-1'
    },
    body: 'credential=credential.jwt.value&g_csrf_token=abc'
  }), env);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('Location'), '/');
  const sealed = cookieValue(response, authContract.sessionCookie);
  assert.ok(sealed.startsWith('v1.'));
  assert.doesNotMatch(sealed, /raw-google-subject|must-not-persist/);
  const session = await __authTest.openSession(sealed, env.VOY_AUTH_SESSION_SECRET_V1);
  assert.equal(session.auth_provider, 'google');
  assert.notEqual(session.subject, 'raw-google-subject');
  assert.equal(Object.hasOwn(session, 'email'), false);
  assert.equal(Object.hasOwn(session, 'raw_token'), false);
});

test('logout is same-origin and requires the session CSRF cookie/header pair', async () => {
  const { handleAuthRequest, authContract } = await authPromise;
  const env = configuredEnv();
  const rejected = await handleAuthRequest(new Request('https://voy.test/api/auth/logout', {
    method: 'POST', headers: { Origin: 'https://voy.test', Cookie: `${authContract.csrfCookie}=abc`, 'X-VOY-CSRF': 'wrong' }
  }), env);
  assert.equal(rejected.status, 400);
  const response = await handleAuthRequest(new Request('https://voy.test/api/auth/logout', {
    method: 'POST', headers: { Origin: 'https://voy.test', Cookie: `${authContract.csrfCookie}=abc`, 'X-VOY-CSRF': 'abc' }
  }), env);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).authenticated, false);
});

test('session encryption rejects tampering and expiry', async () => {
  const { __authTest } = await authPromise;
  const secret = 'secret';
  const sealed = await __authTest.sealSession({ version: 1, session_id: 's', subject: 'p', issued_at: 1, expires_at: 10, auth_provider: 'google' }, secret);
  assert.equal(await __authTest.openSession(sealed, secret, 11), null);
  const tampered = sealed.slice(0, Math.floor(sealed.length / 2)) + (sealed[Math.floor(sealed.length / 2)] === 'A' ? 'B' : 'A') + sealed.slice(Math.floor(sealed.length / 2) + 1);
  assert.equal(await __authTest.openSession(tampered, secret, 2), null);
});

test('session bootstrap rejects an explicit foreign origin', async () => {
  const { handleAuthRequest } = await authPromise;
  const response = await handleAuthRequest(new Request('https://voy.test/api/auth/session', {
    headers: { Origin: 'https://evil.example' }
  }), configuredEnv());
  assert.equal(response.status, 403);
});

test('multi-audience Google tokens require exact authorized party', async () => {
  const { __authTest } = await authPromise;
  __authTest.resetJwksCache();
  const now = Math.floor(Date.now() / 1000);
  const encoder = new TextEncoder();
  const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  jwk.kid = 'kid-1';
  const b64 = bytes => Buffer.from(bytes).toString('base64url');
  async function token(azp) {
    const header = b64(JSON.stringify({ alg: 'RS256', kid: 'kid-1' }));
    const payload = b64(JSON.stringify({ sub: 'subject', aud: ['client.apps.googleusercontent.com', 'other'], azp, iss: 'https://accounts.google.com', iat: now, exp: now + 600, nonce: 'n' }));
    const signed = `${header}.${payload}`;
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, encoder.encode(signed));
    return `${signed}.${b64(new Uint8Array(signature))}`;
  }
  const fetcher = async () => new Response(JSON.stringify({ keys: [jwk] }), { status: 200, headers: { 'Cache-Control': 'max-age=600' } });
  await assert.rejects(async () => __authTest.verifyGoogleCredential(await token('wrong'), { clientId: 'client.apps.googleusercontent.com', nonce: 'n', fetcher }), /authorized_party/);
  __authTest.resetJwksCache();
  const claims = await __authTest.verifyGoogleCredential(await token('client.apps.googleusercontent.com'), { clientId: 'client.apps.googleusercontent.com', nonce: 'n', fetcher });
  assert.equal(claims.sub, 'subject');
});
