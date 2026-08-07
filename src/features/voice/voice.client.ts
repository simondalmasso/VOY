import type { VoiceCapabilities, VoiceChatResult, VoiceSession } from './voice.contracts';
export async function voiceCapabilities(signal?: AbortSignal): Promise<VoiceCapabilities> {
  const response = await fetch('/api/voice/capabilities', { signal, cache: 'no-store', headers: { Accept: 'application/json' } });
  if (!response.ok) return { ok: false, enabled: false, text_fallback: true };
  return response.json() as Promise<VoiceCapabilities>;
}
export async function createVoiceSession(signal?: AbortSignal): Promise<VoiceSession> {
  const response = await fetch('/api/voice/session', { method: 'POST', signal, headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ city_id: 'santafe' }) });
  if (!response.ok) throw new Error('voice_session_unavailable');
  const payload = await response.json() as { session?: VoiceSession };
  if (!payload.session) throw new Error('voice_session_invalid');
  return payload.session;
}
export async function sendVoiceText(message: string, session: VoiceSession, signal?: AbortSignal): Promise<VoiceChatResult> {
  const requestId = crypto.randomUUID();
  const response = await fetch('/api/voice/chat', { method: 'POST', signal, headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ request_id: requestId, message: message.slice(0, 500), session }) });
  if (!response.ok) throw new Error('voice_chat_unavailable');
  return response.json() as Promise<VoiceChatResult>;
}
export async function requestMicrophone(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('microphone_unavailable');
  return navigator.mediaDevices.getUserMedia({ audio: true });
}
