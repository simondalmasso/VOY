import { describe, expect, test } from 'bun:test';
import {
  clearSessionCookie,
  issueSession,
  normalizePreferences,
  preferencesJson,
  readSessionToken
} from '../worker/auth/session';
import type { Env } from '../worker/contracts/env';

describe('ORDER-046 account/session privacy contract', () => {
  test('session token is high entropy, cookie-only client credential and hash-only D1 storage', async () => {
    const writes: Array<{ sql: string; args: unknown[] }> = [];
    const DB = {
      prepare(sql: string) {
        return {
          bind(...args: unknown[]) {
            return {
              async run() { writes.push({ sql, args }); return { success: true }; }
            };
          }
        };
      }
    } as unknown as D1Database;
    const env: Env = {
      ASSETS: {} as Fetcher,
      DB,
      GOOGLE_AUTH_ENABLED: 'true',
      VOY_GOOGLE_CLIENT_ID: 'test.apps.googleusercontent.com',
      VOY_AUTH_SESSION_SECRET_V1: 'unit-test-secret-value-that-is-long-enough'
    };
    const session = await issueSession(env, 'usr_test', 1_000);
    expect(session.expiresAt).toBeGreaterThan(1_000);
    expect(session.cookie).toContain('__Host-voy_session=');
    expect(session.cookie).toContain('Secure');
    expect(session.cookie).toContain('HttpOnly');
    expect(session.cookie).toContain('SameSite=Lax');
    expect(session.cookie).not.toContain('Domain=');
    const token = session.cookie.match(/__Host-voy_session=([^;]+)/)?.[1];
    expect(token?.length).toBeGreaterThanOrEqual(32);
    expect(writes).toHaveLength(1);
    expect(writes[0]?.sql).toContain('voy_sessions');
    expect(String(writes[0]?.args[0])).toMatch(/^[0-9a-f]{64}$/);
    expect(writes[0]?.args[0]).not.toBe(token);
    expect(writes[0]?.args).not.toContain(token);
  });

  test('cookie parser is bounded and logout cookie expires the __Host session', () => {
    const request = new Request('https://voy.example/', { headers: { Cookie: '__Host-voy_session=abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG; other=x' } });
    expect(readSessionToken(request)).toBe('abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG');
    expect(readSessionToken(new Request('https://voy.example/', { headers: { Cookie: '__Host-voy_session=short' } }))).toBeNull();
    expect(clearSessionCookie()).toContain('Max-Age=0');
  });

  test('preferences reject free-form identity/location payloads and normalize allowlisted low-risk fields only', () => {
    const normalized = normalizePreferences({
      theme: 'dark', analytics: true, reducedMotion: true,
      preferredModes: ['walk', 'taxi', 'walk', 'evil'], defaultProvinceId: '82', defaultLocalityId: '82001',
      email: 'should-not-persist@example.com', exactLatitude: -31.6, home: 'secret address', transcript: 'secret'
    });
    expect(normalized).toEqual({
      theme: 'dark', analytics: true, reducedMotion: true,
      preferredModes: ['walk', 'taxi'], defaultProvinceId: '82', defaultLocalityId: '82001'
    });
    const serialized = preferencesJson(normalized);
    expect(serialized).not.toContain('email');
    expect(serialized).not.toContain('Latitude');
    expect(serialized).not.toContain('home');
    expect(serialized).not.toContain('transcript');
  });
});
