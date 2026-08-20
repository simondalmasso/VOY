import type { Env } from '../contracts/env';

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const ALLOWED_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);
const CLOCK_SKEW_SECONDS = 300;
const MAX_TOKEN_AGE_SECONDS = 2 * 60 * 60;
const MAX_JWKS_CACHE_SECONDS = 6 * 60 * 60;

type JsonRecord = Record<string, unknown>;
type FetchLike = typeof fetch;

type CachedKeys = { keys: JsonWebKey[]; expiresAtMs: number };
let keyCache: CachedKeys | null = null;

export interface VerifiedGoogleIdentity {
  sub: string;
}

function record(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null;
}

function base64UrlBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length > 16384) throw new Error('google_token_encoding');
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  const output = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) output[index] = binary.charCodeAt(index);
  return output;
}

function base64UrlJson(value: string): JsonRecord {
  const bytes = base64UrlBytes(value);
  if (bytes.byteLength > 8192) throw new Error('google_token_payload_too_large');
  const parsed = JSON.parse(new TextDecoder().decode(bytes));
  const item = record(parsed);
  if (!item) throw new Error('google_token_payload_invalid');
  return item;
}

function cacheSeconds(headers: Headers): number {
  const match = (headers.get('Cache-Control') || '').match(/(?:^|,)\s*max-age=(\d+)/i);
  const value = match ? Number(match[1]) : 300;
  return Math.max(60, Math.min(Number.isFinite(value) ? value : 300, MAX_JWKS_CACHE_SECONDS));
}

async function fetchKeys(fetcher: FetchLike, force = false): Promise<JsonWebKey[]> {
  if (!force && keyCache && keyCache.expiresAtMs > Date.now()) return keyCache.keys;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetcher(GOOGLE_JWKS_URL, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`google_jwks_http_${response.status}`);
    const payload = record(await response.json());
    const keys = payload && Array.isArray(payload.keys)
      ? payload.keys.filter((value): value is JsonWebKey => Boolean(record(value))).slice(0, 20)
      : [];
    if (!keys.length) throw new Error('google_jwks_empty');
    keyCache = { keys, expiresAtMs: Date.now() + cacheSeconds(response.headers) * 1000 };
    return keys;
  } finally {
    clearTimeout(timer);
  }
}

async function signingKey(kid: string, fetcher: FetchLike): Promise<JsonWebKey> {
  let keys = await fetchKeys(fetcher);
  let key = keys.find(item => item.kid === kid && item.kty === 'RSA' && (!item.use || item.use === 'sig'));
  if (!key) {
    keys = await fetchKeys(fetcher, true);
    key = keys.find(item => item.kid === kid && item.kty === 'RSA' && (!item.use || item.use === 'sig'));
  }
  if (!key) throw new Error('google_unknown_kid');
  return key;
}

function textClaim(payload: JsonRecord, key: string, max = 512): string | null {
  const value = payload[key];
  return typeof value === 'string' && value.length > 0 && value.length <= max ? value : null;
}

function numericClaim(payload: JsonRecord, key: string): number | null {
  const value = payload[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function audienceMatches(payload: JsonRecord, clientId: string): boolean {
  const aud = payload.aud;
  if (typeof aud === 'string') return aud === clientId;
  if (!Array.isArray(aud) || !aud.every(item => typeof item === 'string')) return false;
  return aud.includes(clientId);
}

export async function verifyGoogleIdToken(
  token: string,
  env: Pick<Env, 'VOY_GOOGLE_CLIENT_ID'>,
  expectedNonce: string,
  options: { nowSeconds?: number; fetcher?: FetchLike } = {}
): Promise<VerifiedGoogleIdentity> {
  const clientId = String(env.VOY_GOOGLE_CLIENT_ID || '').trim();
  if (!clientId) throw new Error('google_client_id_missing');
  if (typeof token !== 'string' || token.length < 100 || token.length > 8192) throw new Error('google_token_size');
  if (!expectedNonce || expectedNonce.length < 16 || expectedNonce.length > 256) throw new Error('google_nonce_missing');

  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('google_token_format');
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = base64UrlJson(encodedHeader!);
  const payload = base64UrlJson(encodedPayload!);
  const alg = textClaim(header, 'alg', 16);
  const kid = textClaim(header, 'kid', 256);
  if (alg !== 'RS256' || !kid) throw new Error('google_token_header');

  const jwk = await signingKey(kid, options.fetcher || fetch);
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const verified = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    publicKey,
    base64UrlBytes(encodedSignature!),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
  );
  if (!verified) throw new Error('google_invalid_signature');

  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const iss = textClaim(payload, 'iss', 64);
  const sub = textClaim(payload, 'sub', 255);
  const nonce = textClaim(payload, 'nonce', 256);
  const exp = numericClaim(payload, 'exp');
  const iat = numericClaim(payload, 'iat');
  const azp = payload.azp === undefined ? null : textClaim(payload, 'azp', 512);

  if (!iss || !ALLOWED_ISSUERS.has(iss)) throw new Error('google_wrong_iss');
  if (!audienceMatches(payload, clientId)) throw new Error('google_wrong_aud');
  if (azp !== null && azp !== clientId) throw new Error('google_wrong_azp');
  if (!sub) throw new Error('google_missing_sub');
  if (nonce !== expectedNonce) throw new Error('google_nonce_mismatch');
  if (exp === null || exp <= now - CLOCK_SKEW_SECONDS) throw new Error('google_token_expired');
  if (iat === null || iat > now + CLOCK_SKEW_SECONDS || iat < now - MAX_TOKEN_AGE_SECONDS) throw new Error('google_invalid_iat');
  return { sub };
}

export function resetGoogleKeyCacheForTests(): void {
  keyCache = null;
}
