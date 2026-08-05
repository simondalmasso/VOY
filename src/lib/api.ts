export interface HealthPayload {
  ok: boolean;
  service: string;
  version: string;
  build_hash: string;
  features: { voice: boolean; auth: boolean; collective_recommendations: boolean; core_without_login_voice_ai: boolean; pwa: boolean };
}
export async function health(): Promise<HealthPayload> {
  const response = await fetch('/api/health', { cache: 'no-store', headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('health_unavailable');
  return response.json() as Promise<HealthPayload>;
}
