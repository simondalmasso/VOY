import worker, { NominatimCoordinator as BaseNominatimCoordinator } from './worker.js';
import { recordSweepExpiration, runCoordinatorAlarmSweep } from './coordinatorAlarm.js';
import { createSecurityBoundary } from './securityBoundary.mjs';
import { createAnalyticsOptOutBoundary } from './analyticsOptOutBoundary.mjs';
import { handleVoiceRequest } from './voiceCopilot.mjs';
import { maybeInjectVoiceCopilotHtml } from './voiceCopilotHtml.mjs';
import { handleAuthRequest } from './authSession.mjs';
import { handleLegalPage } from './legalPages.mjs';
import { maybeInjectProductShellHtml } from './productShellHtml.mjs';

const VOICE_RATE_KINDS = new Set(['stt', 'chat']);

export class NominatimCoordinator extends BaseNominatimCoordinator {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/voice-quota') {
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), { status: 405, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
      }
      let payload;
      try { payload = await request.json(); } catch { payload = null; }
      const key = typeof payload?.key === 'string' ? payload.key : '';
      const kind = typeof payload?.kind === 'string' ? payload.kind : '';
      const limit = Number(payload?.limit);
      const day = Number(payload?.day);
      if (!/^[a-f0-9]{24}$/.test(key) || !VOICE_RATE_KINDS.has(kind) || !Number.isInteger(limit) || limit < 1 || limit > 1000 || !Number.isInteger(day) || day < 0) {
        return new Response(JSON.stringify({ ok: false, error: 'invalid_voice_quota_request' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
      }
      const storageKey = `voice-rate:${kind}:${key}`;
      const stored = await this.state.storage.get(storageKey);
      const current = stored && stored.day === day && Number.isInteger(stored.count) ? stored.count : 0;
      const next = current + 1;
      await this.state.storage.put(storageKey, { day, count: next });
      return new Response(JSON.stringify({ ok: true, allowed: next <= limit, count: next }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }
    return super.fetch(request);
  }

  async _resolve(payload) {
    const response = await super._resolve(payload);
    const cached = await this.state.storage.get('cache:' + payload.cacheIdentity);
    if (cached && cached.expiresAt) {
      await recordSweepExpiration(this.state.storage, cached.expiresAt);
    }
    return response;
  }

  async alarm() {
    return runCoordinatorAlarmSweep(this);
  }
}

const voiceAwareWorker = {
  async fetch(request, env, ctx) {
    const authResponse = await handleAuthRequest(request, env, ctx);
    if (authResponse) return authResponse;
    const legalResponse = handleLegalPage(request);
    if (legalResponse) return legalResponse;
    const voiceResponse = await handleVoiceRequest(request, env, ctx);
    if (voiceResponse) return voiceResponse;
    const response = await worker.fetch(request, env, ctx);
    const url = new URL(request.url);
    if ((url.pathname === '/' || url.pathname === '') && request.method === 'GET') {
      const productResponse = await maybeInjectProductShellHtml(request, response, env);
      return maybeInjectVoiceCopilotHtml(request, productResponse, env);
    }
    return response;
  },
  scheduled(event, env, ctx) {
    return worker.scheduled(event, env, ctx);
  }
};

const securedWorker = createSecurityBoundary(voiceAwareWorker);
export default createAnalyticsOptOutBoundary(securedWorker);
