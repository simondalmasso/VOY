import {
  VOICE_LIMITS,
  VOICE_MODELS,
  boundedString,
  isPlainObject,
  makeEvent,
  newSession,
  normalizeCityId,
  validateSession
} from './voiceCopilotContracts.mjs';
import { createProviders } from './voiceCopilotProviders.mjs';
import { consumeConfirmation } from './voiceCopilotRuntime.mjs';
import {
  boundedRequestText,
  voiceEnabled,
  voiceMode,
  voiceOriginAllowed,
  voiceErrorResponse,
  voiceJson,
  voiceRateAllowed
} from './voiceCopilotApiUtils.mjs';
import { handleVoiceChat } from './voiceCopilotConversation.mjs';

async function handleTranscription(request, env) {
  if (!(await voiceRateAllowed(request, env, 'stt', VOICE_LIMITS.maxDailyStt))) {
    throw new Error('stt_rate_limited');
  }
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > VOICE_LIMITS.maxAudioBytes) throw new Error('audio_too_large');
  const contentType = String(request.headers.get('content-type') || '').toLowerCase();
  if (!contentType.startsWith('audio/')) throw new Error('audio_content_type_required');
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!bytes.length || bytes.length > VOICE_LIMITS.maxAudioBytes) throw new Error('audio_size_invalid');
  const transcript = await createProviders(env).stt.transcribe(bytes, { language: 'es' });
  return voiceJson({
    ok: true,
    transcript: transcript.text,
    word_count: transcript.word_count,
    provider: transcript.provider,
    audio_persisted: false,
    transcript_logged: false
  });
}

async function handleConfirmation(request) {
  const raw = await boundedRequestText(request, 4096);
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new Error('invalid_confirmation_json');
  }
  if (!isPlainObject(body) || Object.keys(body).some(key => !['token', 'session'].includes(key))) {
    throw new Error('invalid_confirmation_shape');
  }
  const token = boundedString(body.token, 120);
  const session = validateSession(body.session);
  if (!token) throw new Error('invalid_confirmation_token');
  const confirmed = consumeConfirmation(token, session);
  return voiceJson({
    ok: true,
    external_action: confirmed.external_action,
    session: confirmed.session,
    event: makeEvent('confirmation_accepted', confirmed.external_action.operation_id, 1, {
      provider: confirmed.external_action.provider
    })
  });
}

export async function handleVoiceRequest(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/voice/')) return null;
  if (!voiceOriginAllowed(request)) {
    return voiceJson({ ok: false, error: 'origin_not_allowed' }, 403);
  }
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { Allow: 'GET, POST, OPTIONS', 'Cache-Control': 'no-store' }
    });
  }
  if (!voiceEnabled(request, env)) {
    return voiceJson({ ok: false, error: 'voice_feature_disabled' }, 404);
  }
  try {
    if (url.pathname === '/api/voice/capabilities' && request.method === 'GET') {
      return voiceJson({
        ok: true,
        enabled: true,
        mode: voiceMode(request, env),
        available: Boolean(env.AI),
        providers: {
          stt: VOICE_MODELS.stt,
          llm: VOICE_MODELS.llm,
          tts: VOICE_MODELS.tts,
          voicebox: 'disabled'
        },
        limits: VOICE_LIMITS,
        audio_persisted: false,
        transcript_logged: false
      });
    }
    if (url.pathname === '/api/voice/session' && request.method === 'POST') {
      let cityId = '_default';
      try {
        cityId = normalizeCityId((await request.json())?.city_id);
      } catch {
        cityId = '_default';
      }
      return voiceJson({ ok: true, session: newSession(cityId) });
    }
    if (url.pathname === '/api/voice/transcribe' && request.method === 'POST') {
      return await handleTranscription(request, env);
    }
    if (url.pathname === '/api/voice/chat' && request.method === 'POST') {
      return await handleVoiceChat(request, env);
    }
    if (url.pathname === '/api/voice/confirm' && request.method === 'POST') {
      return await handleConfirmation(request);
    }
    return voiceJson({ ok: false, error: 'voice_route_not_found' }, 404);
  } catch (error) {
    return voiceErrorResponse(error);
  }
}

export const __voiceApiTest = Object.freeze({ handleTranscription, handleConfirmation });
