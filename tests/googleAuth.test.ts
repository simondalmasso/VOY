import { beforeAll, describe, expect, test } from 'bun:test';
import { resetGoogleKeyCacheForTests, verifyGoogleIdToken } from '../worker/auth/google';

const CLIENT_ID = 'voy-test.apps.googleusercontent.com';
const NONCE = 'nonce-0123456789abcdef';
const NOW = 2_000_000_000;
let privateKey: CryptoKey;
let publicJwk: JsonWebKey;
let alternatePrivateKey: CryptoKey;

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function jsonPart(value: unknown): string {
  return base64Url(new TextEncoder().encode(JSON.stringify(value)));
}

async function token(
  overrides: Record<string, unknown> = {},
  options: { key?: CryptoKey; kid?: string } = {}
): Promise<string> {
  const header = jsonPart({ alg: 'RS256', typ: 'JWT', kid: options.kid || 'kid-main' });
  const payload = jsonPart({
    iss: 'https://accounts.google.com', aud: CLIENT_ID, azp: CLIENT_ID, sub: 'google-sub-123',
    nonce: NONCE, iat: NOW - 30, exp: NOW + 3600, ...overrides
  });
  const signingInput = `${header}.${payload}`;
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', options.key || privateKey, new TextEncoder().encode(signingInput));
  return `${signingInput}.${base64Url(new Uint8Array(signature))}`;
}

function jwksFetcher(keys: JsonWebKey[], calls?: { count: number }): typeof fetch {
  return (async () => {
    if (calls) calls.count += 1;
    return new Response(JSON.stringify({ keys }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' } });
  }) as typeof fetch;
}

beforeAll(async () => {
  const pair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify']
  ) as CryptoKeyPair;
  privateKey = pair.privateKey;
  publicJwk = { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid: 'kid-main', use: 'sig', alg: 'RS256' };
  const alternate = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify']
  ) as CryptoKeyPair;
  alternatePrivateKey = alternate.privateKey;
});

describe('ORDER-046 Google ID token verifier', () => {
  test('accepts a valid Google-shaped RS256 token and returns only stable sub', async () => {
    resetGoogleKeyCacheForTests();
    expect(await verifyGoogleIdToken(await token(), { VOY_GOOGLE_CLIENT_ID: CLIENT_ID }, NONCE, { nowSeconds: NOW, fetcher: jwksFetcher([publicJwk]) }))
      .toEqual({ sub: 'google-sub-123' });
  });

  test('refreshes JWKS once for an unknown kid before accepting a rotated key', async () => {
    resetGoogleKeyCacheForTests();
    const calls = { count: 0 };
    const rotated = { ...publicJwk, kid: 'kid-rotated' };
    const fetcher = (async () => {
      calls.count += 1;
      const keys = calls.count === 1 ? [{ ...publicJwk, kid: 'old-kid' }] : [rotated];
      return new Response(JSON.stringify({ keys }), { status: 200, headers: { 'Cache-Control': 'max-age=3600' } });
    }) as typeof fetch;
    const verified = await verifyGoogleIdToken(await token({}, { kid: 'kid-rotated' }), { VOY_GOOGLE_CLIENT_ID: CLIENT_ID }, NONCE, { nowSeconds: NOW, fetcher });
    expect(verified.sub).toBe('google-sub-123');
    expect(calls.count).toBe(2);
  });

  test('rejects invalid signature', async () => {
    resetGoogleKeyCacheForTests();
    await expect(verifyGoogleIdToken(await token({}, { key: alternatePrivateKey }), { VOY_GOOGLE_CLIENT_ID: CLIENT_ID }, NONCE, { nowSeconds: NOW, fetcher: jwksFetcher([publicJwk]) }))
      .rejects.toThrow('google_invalid_signature');
  });

  test('rejects wrong aud and azp', async () => {
    resetGoogleKeyCacheForTests();
    await expect(verifyGoogleIdToken(await token({ aud: 'other.apps.googleusercontent.com' }), { VOY_GOOGLE_CLIENT_ID: CLIENT_ID }, NONCE, { nowSeconds: NOW, fetcher: jwksFetcher([publicJwk]) })).rejects.toThrow('google_wrong_aud');
    resetGoogleKeyCacheForTests();
    await expect(verifyGoogleIdToken(await token({ azp: 'other.apps.googleusercontent.com' }), { VOY_GOOGLE_CLIENT_ID: CLIENT_ID }, NONCE, { nowSeconds: NOW, fetcher: jwksFetcher([publicJwk]) })).rejects.toThrow('google_wrong_azp');
  });

  test('rejects wrong issuer, expired token, unreasonable iat, missing sub and nonce mismatch', async () => {
    const cases: Array<[Record<string, unknown>, string, string]> = [
      [{ iss: 'https://example.com' }, NONCE, 'google_wrong_iss'],
      [{ exp: NOW - 301 }, NONCE, 'google_token_expired'],
      [{ iat: NOW + 301 }, NONCE, 'google_invalid_iat'],
      [{ iat: NOW - 7201 }, NONCE, 'google_invalid_iat'],
      [{ sub: '' }, NONCE, 'google_missing_sub'],
      [{ nonce: 'different-nonce-123456' }, NONCE, 'google_nonce_mismatch']
    ];
    for (const [claims, nonce, expected] of cases) {
      resetGoogleKeyCacheForTests();
      await expect(verifyGoogleIdToken(await token(claims), { VOY_GOOGLE_CLIENT_ID: CLIENT_ID }, nonce, { nowSeconds: NOW, fetcher: jwksFetcher([publicJwk]) })).rejects.toThrow(expected);
    }
  });
});
