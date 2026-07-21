import { VOICE_LIMITS, VOICE_MODELS, boundedString, isPlainObject } from './voiceCopilotContracts.mjs';

function bytesToBase64(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < view.length; index += chunk) {
    binary += String.fromCharCode(...view.subarray(index, Math.min(index + chunk, view.length)));
  }
  return btoa(binary);
}

function boundedJson(value, maxBytes, errorCode) {
  const text = JSON.stringify(value);
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new Error(errorCode);
  return value;
}

function modelText(response) {
  if (typeof response === 'string') return response;
  if (typeof response?.response === 'string') return response.response;
  const choice = response?.choices?.[0];
  if (typeof choice?.message?.content === 'string') return choice.message.content;
  if (typeof choice?.text === 'string') return choice.text;
  return '';
}

function normalizeArguments(value) {
  if (isPlainObject(value)) return value;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return isPlainObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function normalizeToolCalls(response) {
  const direct = Array.isArray(response?.tool_calls) ? response.tool_calls : [];
  const choiceCalls = Array.isArray(response?.choices?.[0]?.message?.tool_calls) ? response.choices[0].message.tool_calls : [];
  const source = direct.length ? direct : choiceCalls;
  return source.slice(0, 2).map(call => {
    const fn = call?.function || call;
    return {
      id: boundedString(call?.id, 100, { allowEmpty: true }) || crypto.randomUUID(),
      name: boundedString(fn?.name || call?.name, 100) || '',
      arguments: normalizeArguments(fn?.arguments ?? call?.arguments)
    };
  }).filter(call => call.name);
}

export class STTProvider {
  async transcribe() {
    throw new Error('stt_not_implemented');
  }
}

export class LLMProvider {
  async plan() {
    throw new Error('llm_plan_not_implemented');
  }

  async narrate() {
    throw new Error('llm_narrate_not_implemented');
  }
}

export class TTSProvider {
  get mode() {
    return VOICE_MODELS.tts;
  }
}

export class WorkersAISttProvider extends STTProvider {
  constructor(ai) {
    super();
    this.ai = ai;
  }

  async transcribe(audioBytes, options = {}) {
    if (!this.ai?.run) throw new Error('ai_binding_unavailable');
    const bytes = audioBytes instanceof Uint8Array ? audioBytes : new Uint8Array(audioBytes);
    if (!bytes.length || bytes.length > VOICE_LIMITS.maxAudioBytes) throw new Error('audio_size_invalid');
    const response = await this.ai.run(VOICE_MODELS.stt, {
      audio: bytesToBase64(bytes),
      task: 'transcribe',
      language: options.language || 'es',
      vad_filter: true,
      condition_on_previous_text: false,
      no_speech_threshold: 0.65
    });
    boundedJson(response, VOICE_LIMITS.maxToolResultBytes, 'stt_response_too_large');
    const text = boundedString(response?.text || response?.transcription_info?.text, VOICE_LIMITS.maxTranscriptChars);
    if (!text) throw new Error('empty_transcription');
    return {
      text,
      word_count: Number(response?.word_count || response?.transcription_info?.word_count || text.split(/\s+/).length),
      provider: VOICE_MODELS.stt
    };
  }
}

export class WorkersAILlmProvider extends LLMProvider {
  constructor(ai) {
    super();
    this.ai = ai;
  }

  async plan(messages, tools) {
    if (!this.ai?.run) throw new Error('ai_binding_unavailable');
    const response = await this.ai.run(VOICE_MODELS.llm, {
      messages,
      tools,
      max_tokens: 500,
      temperature: 0.1,
      top_p: 0.8,
      repetition_penalty: 1.05,
      seed: 17031993
    });
    boundedJson(response, VOICE_LIMITS.maxToolResultBytes, 'llm_plan_response_too_large');
    return {
      tool_calls: normalizeToolCalls(response),
      text: boundedString(modelText(response), VOICE_LIMITS.maxResponseChars, { allowEmpty: true }) || '',
      provider: VOICE_MODELS.llm,
      usage: isPlainObject(response?.usage) ? response.usage : null
    };
  }

  async narrate(messages, toolCall, toolResult) {
    if (!this.ai?.run) throw new Error('ai_binding_unavailable');
    const response = await this.ai.run(VOICE_MODELS.llm, {
      messages: [
        ...messages,
        { role: 'assistant', content: JSON.stringify({ tool_call: { name: toolCall.name, arguments: toolCall.arguments } }) },
        { role: 'tool', content: JSON.stringify(toolResult) }
      ],
      max_tokens: 320,
      temperature: 0.2,
      top_p: 0.85,
      repetition_penalty: 1.08,
      seed: 17031993
    });
    boundedJson(response, VOICE_LIMITS.maxToolResultBytes, 'llm_narration_response_too_large');
    const text = boundedString(modelText(response), VOICE_LIMITS.maxResponseChars);
    if (!text) throw new Error('empty_llm_narration');
    return { text, provider: VOICE_MODELS.llm, usage: isPlainObject(response?.usage) ? response.usage : null };
  }
}

export class BrowserSpeechSynthesisProvider extends TTSProvider {
  get mode() {
    return 'browser:speechSynthesis';
  }
}

export function createProviders(env) {
  return {
    stt: new WorkersAISttProvider(env.AI),
    llm: new WorkersAILlmProvider(env.AI),
    tts: new BrowserSpeechSynthesisProvider()
  };
}
