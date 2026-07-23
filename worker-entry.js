import worker, { NominatimCoordinator as BaseNominatimCoordinator } from './worker.js';
import { recordSweepExpiration, runCoordinatorAlarmSweep } from './coordinatorAlarm.js';
import { createSecurityBoundary } from './securityBoundary.mjs';
import { createAnalyticsOptOutBoundary } from './analyticsOptOutBoundary.mjs';
import { handleVoiceRequest } from './voiceCopilot.mjs';
import { maybeInjectVoiceCopilotHtml } from './voiceCopilotHtml.mjs';

export class NominatimCoordinator extends BaseNominatimCoordinator {
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
    const voiceResponse = await handleVoiceRequest(request, env, ctx);
    if (voiceResponse) return voiceResponse;
    const response = await worker.fetch(request, env, ctx);
    const url = new URL(request.url);
    if ((url.pathname === '/' || url.pathname === '') && request.method === 'GET') {
      return maybeInjectVoiceCopilotHtml(request, response, env);
    }
    return response;
  },
  scheduled(event, env, ctx) {
    return worker.scheduled(event, env, ctx);
  }
};

const securedWorker = createSecurityBoundary(voiceAwareWorker);
export default createAnalyticsOptOutBoundary(securedWorker);
