import type { AuthStatus } from './auth.contracts';
export async function authStatus(): Promise<AuthStatus> {
  const response = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } });
  if (!response.ok) return { ok: false, enabled: false, authenticated: false };
  return response.json() as Promise<AuthStatus>;
}
