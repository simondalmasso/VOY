# VOY Voice Copilot V1 — Provider Matrix

Status: planning only  
Verified: 2026-07-21  
Implementation gate: City Platform V1 must be merged and verified in production before any runtime integration.

## Decision summary

Recommended staged stack:

```text
Phase 2 UI mock
STT: synthetic/manual mock
Intent: deterministic mock
TTS: browser speechSynthesis

Phase 3 STT pilot
Primary candidate: Workers AI @cf/openai/whisper-large-v3-turbo
Secondary benchmark: Workers AI @cf/deepgram/nova-3
Fallback: manual text input
Optional browser fallback: Web Speech API with explicit disclosure

Phase 4 deterministic copilot
Intent: closed rule engine
Tools: VOY allowlist only
TTS: browser speechSynthesis

Phase 5 controlled LLM pilot
Primary candidate: Workers AI @cf/qwen/qwen3-30b-a3b-fp8
External benchmark: OpenAI gpt-4o-mini

Phase 6 cloud TTS pilot
Primary quality candidate: Workers AI @cf/deepgram/aura-2-es
Low-cost benchmark: Workers AI @cf/myshell-ai/melotts
Permanent fallback: browser speechSynthesis

Voicebox
Optional local adapter only, explicit opt-in, desktop-first, never required
```

No paid provider, secret, binding or billing commitment is authorized by this document.

## Evaluation criteria

Providers are evaluated against:

- Spanish and Rioplatense Spanish quality;
- deterministic API behavior;
- latency for turns under 30 seconds of audio;
- structured output and tool calling where applicable;
- privacy and retention controls;
- cost predictability;
- Cloudflare Worker compatibility;
- browser and mobile fallback behavior;
- provider portability;
- operational observability;
- ability to fail closed without disabling VOY.

## STT matrix

| Provider | Spanish | Hosting | Indicative price | Strengths | Constraints | V1 disposition |
|---|---:|---|---:|---|---|---|
| Browser Web Speech API | Browser-dependent | Browser/vendor service | No direct VOY API charge | Very fast prototype, partial transcripts | Limited browser availability; Chrome may send audio to a vendor service; inconsistent control and offline behavior | Fallback only, with explicit privacy disclosure |
| Workers AI `@cf/openai/whisper-large-v3-turbo` | Multilingual | Cloudflare | About USD 0.0005–0.00051/audio minute | Very low unit cost, same operational boundary as VOY, batch transcription | Must benchmark Argentine place names, noise and mobile codecs; not streaming conversational turn detection | Recommended primary STT pilot |
| Workers AI `@cf/openai/whisper` | Multilingual | Cloudflare | USD 0.0005/audio minute | Stable baseline, inexpensive | Lower expected quality/speed than large-v3-turbo | Regression benchmark |
| Workers AI `@cf/deepgram/nova-3` | Multilingual, including Spanish variants | Cloudflare/Deepgram model | USD 0.0052/audio minute HTTP; USD 0.0092/min WebSocket | Strong noisy/far-field accuracy; language support; useful secondary | Roughly 10x Whisper price; WebSocket is outside V1 unless justified | Secondary STT benchmark |
| Deepgram Nova-3 Multilingual direct | Multilingual | Deepgram | About USD 0.0058/min pre-recorded and USD 0.0092/min streaming PAYG | Mature speech API and streaming path | Separate vendor, secret, privacy review and billing | Not enabled; external benchmark only |
| OpenAI `gpt-4o-mini-transcribe` | Multilingual | OpenAI | USD 1.25/M audio input tokens and USD 5/M output tokens | Improved transcription quality; API endpoint supports transcription | Token-based price cannot be represented honestly as a fixed per-minute rate without pilot measurements; external secret/vendor | Not enabled; benchmark candidate |
| OpenAI `gpt-4o-transcribe` | Multilingual | OpenAI | USD 2.50/M audio input tokens and USD 10/M output tokens | Higher-quality benchmark | Higher cost; external secret/vendor | Not enabled |
| Google Speech-to-Text V2 | Spanish | Google Cloud | Starts at USD 0.016/audio minute for standard recognition | Mature language/device support | Higher cost, billing account and separate operational stack | Not recommended for first VOY pilot |
| Voicebox local Whisper | Multilingual | User device, `127.0.0.1:17493` | No VOY cloud inference charge | Local processing, user-controlled models, optional Whisper sizes | Requires installation; VOY origin is not in Voicebox default CORS; browser local-network restrictions; Voicebox can retain captures locally | Optional desktop adapter after explicit opt-in |

### STT recommendation

Start with non-streaming, user-bounded turns:

```text
MediaRecorder
→ maximum 30 seconds
→ explicit transcript review
→ Workers AI Whisper large-v3-turbo
→ manual entry on failure
```

Do not add WebSocket STT in V1. Measure:

- median and p95 latency;
- word error rate on synthetic and consented test phrases;
- Santa Fe street and landmark accuracy;
- codec compatibility from Android Chrome and iPhone Safari;
- empty transcript and low-confidence behavior.

## TTS matrix

| Provider | Spanish | Hosting | Indicative price | Strengths | Constraints | V1 disposition |
|---|---:|---|---:|---|---|---|
| Browser `speechSynthesis` | OS/browser voice dependent | Device/browser | USD 0 provider variable cost | Immediate, offline on some devices, no audio upload by VOY | Voice quality and voice inventory vary; browser interruption behavior differs | Default V1 fallback and first implementation |
| Workers AI `@cf/myshell-ai/melotts` | Model-dependent | Cloudflare | USD 0.0002/generated audio minute | Very low cost | Voice/language quality requires Spanish validation | Low-cost benchmark |
| Workers AI `@cf/deepgram/aura-2-es` | Spanish | Cloudflare/Deepgram model | USD 0.03/1,000 input characters | Purpose-built Spanish TTS, predictable character pricing | Becomes the dominant cost at scale | Quality pilot only; never global without budget approval |
| OpenAI `gpt-4o-mini-tts` | Multilingual | OpenAI | USD 0.60/M text input tokens and USD 12/M audio output tokens | Natural speech and instruction control | Token-based audio cost requires measured duration; external vendor and retention review | Not enabled; benchmark candidate |
| Google Standard/WaveNet/Neural2 | Spanish | Google Cloud | Standard/WaveNet USD 4/M chars; Neural2 USD 16/M chars; Chirp 3 HD USD 30/M chars | Mature voice catalog | Separate billing/vendor and potentially material cost | Not recommended for first pilot |
| Voicebox local `/speak` | Depends on installed engine/profile | User device | No VOY cloud inference charge | Local profiles and multiple engines | Explicit opt-in; installation/CORS/local-network requirements; profiles and generated audio are Voicebox-managed | Optional desktop adapter only |

### TTS recommendation

V1 begins with browser synthesis. Cloud TTS is evaluated only after core flows pass because it is the largest projected variable-cost component.

All TTS adapters must:

- cap input at 1,000 characters;
- strip unsupported markup;
- expose `speak`, `pause`, `resume`, `stop` and `dispose` semantics;
- abort the previous playback before starting another;
- fall back to text-only output without breaking VOY.

## LLM matrix

| Provider/model | Structured output | Tool calling | Indicative price | Strengths | Constraints | V1 disposition |
|---|---:|---:|---:|---|---|---|
| No LLM / deterministic rules | N/A | Fixed VOY tools | USD 0 | Auditable, no hallucinated operational data, low latency | Limited language flexibility | Mandatory before LLM phase |
| Workers AI `@cf/qwen/qwen3-30b-a3b-fp8` | Enforce through schema validation | Yes | USD 0.051/M input tokens; USD 0.34/M output tokens | Multilingual, function calling, same Cloudflare boundary, low projected cost | Reasoning output must not leak; every call/result must be revalidated; model behavior requires Spanish evaluation | Recommended controlled LLM pilot |
| OpenAI `gpt-4o-mini` | Yes | Yes | USD 0.15/M input tokens; USD 0.60/M output tokens | Mature structured outputs, low latency, useful benchmark | Separate vendor/secret and retention controls | External benchmark only, not enabled |
| Larger external models | Usually | Usually | Variable | Potential quality improvement | Higher cost/latency and unnecessary authority | Out of V1 until evidence requires them |
| Voicebox bundled local Qwen | Local free-form refinement | Not a VOY tool authority | User device cost | Local rewrite/refinement | Not a universal backend; must never calculate or execute VOY operations | Not used as VOY operational LLM in V1 |

### LLM recommendation

The first LLM-enabled release may perform only:

- closed intent extraction;
- clarification generation;
- concise natural-language rendering from validated tool results.

The model receives no arbitrary fetch tool, repository access, Cloudflare control-plane tool, secret access, free-form code execution or unrestricted MCP access.

## Browser capability matrix

| Capability | Desktop Chromium | Android Chrome | iPhone Safari | Firefox desktop | Required response |
|---|---:|---:|---:|---:|---|
| `getUserMedia` microphone | Expected | Expected | Expected with user gesture | Expected | HTTPS and explicit permission required |
| `MediaRecorder` | Expected | Expected | Expected, format differs by version | Expected | Detect MIME with `MediaRecorder.isTypeSupported()` |
| Web Speech recognition | Available on some Chromium configurations | Available on some configurations | Not a reliable baseline | Limited/absent | Never sole STT |
| `speechSynthesis` | Expected | Expected | Expected | Expected | Enumerate voices after `voiceschanged`; text fallback |
| Public HTTPS VOY → local HTTP Voicebox | Browser/local-network-policy dependent | Not a supported baseline | Not a supported baseline | Browser-policy dependent | Explicit opt-in, short timeout, exact CORS, never core dependency |

## Voicebox assessment

Official Voicebox characteristics relevant to VOY:

- local-first Tauri application with a FastAPI server;
- default server binding `127.0.0.1:17493`;
- REST endpoints include `/transcribe`, `/speak`, `/generate` and `/profiles`;
- Whisper-based STT and multiple local TTS engines;
- built-in MCP server;
- MIT license;
- local SQLite/data directories can preserve profiles, generations, captures, audio and transcripts;
- default CORS allows localhost development and Tauri origins, not VOY production.

Consequences:

1. VOY must never probe Voicebox silently.
2. The user must explicitly choose “Usar Voicebox local”.
3. The adapter must disclose that processing is local but Voicebox retention is controlled by Voicebox, not VOY.
4. VOY production origin must be explicitly allowed by the user’s Voicebox configuration.
5. Timeout should be short and failure must fall back automatically.
6. Voicebox local is desktop-first and is not an iPhone/Android baseline.
7. No cloned voice, profile or captured audio is copied into Cloudflare.
8. Any substantial reused Voicebox code must preserve the MIT notice.

Disposition:

```text
VOICEBOX_MODE=OPTIONAL_NOT_ENABLED
```

## Cost model

### Planning assumptions

These are modeling assumptions, not usage promises:

- 30 days/month;
- 20 seconds of uploaded speech per conversation = 0.333 minute;
- 600 LLM input tokens per conversation;
- 150 LLM output tokens per conversation;
- 350 TTS input characters per conversation;
- scenarios of 100, 1,000 and 10,000 conversations/day;
- prices exclude taxes, base platform plans and future price changes;
- Workers AI free allocations are not deducted from the gross estimates.

### Component estimates

| Component | Cost/conversation | 100/day | 1,000/day | 10,000/day |
|---|---:|---:|---:|---:|
| CF Whisper large-v3-turbo STT | USD 0.000167 | USD 0.50/mo | USD 5.00/mo | USD 50.00/mo |
| CF Nova-3 HTTP STT | USD 0.001733 | USD 5.20/mo | USD 52.00/mo | USD 520.00/mo |
| CF Qwen3 30B intent/response | USD 0.0000816 | USD 0.2448/mo | USD 2.448/mo | USD 24.48/mo |
| OpenAI GPT-4o mini intent/response | USD 0.00018 | USD 0.54/mo | USD 5.40/mo | USD 54.00/mo |
| CF Aura-2 Spanish TTS | USD 0.0105 | USD 31.50/mo | USD 315.00/mo | USD 3,150.00/mo |
| Google Standard/WaveNet TTS at USD 4/M chars | USD 0.0014 | USD 4.20/mo | USD 42.00/mo | USD 420.00/mo |
| Browser `speechSynthesis` | USD 0 provider variable cost | USD 0 | USD 0 | USD 0 |

### Stack estimates

| Stack | 100/day | 1,000/day | 10,000/day |
|---|---:|---:|---:|
| CF Whisper + rules + browser TTS | USD 0.50/mo | USD 5.00/mo | USD 50.00/mo |
| CF Whisper + CF Qwen3 + browser TTS | USD 0.7448/mo | USD 7.448/mo | USD 74.48/mo |
| CF Whisper + OpenAI GPT-4o mini + browser TTS | USD 1.04/mo | USD 10.40/mo | USD 104.00/mo |
| CF Whisper + CF Qwen3 + CF Aura-2-es | USD 32.2448/mo | USD 322.448/mo | USD 3,224.48/mo |

### Budget controls to implement before paid activation

```text
daily_voice_budget_usd: disabled/0 until explicit authorization
max_session_cost_usd: 0.02 with browser TTS
max_session_cost_usd: 0.05 only for an approved cloud-TTS pilot
max_audio_seconds: 30
max_turns_per_session: 10
provider_timeout_ms:
  stt: 12000
  llm: 8000
  tts: 10000
budget_exceeded_behavior: fail closed to text/manual VOY
```

Every provider adapter must emit a bounded cost estimate before invocation and actual metering after completion when the provider supplies usage data.

## Recommendation gate

Before enabling any cloud provider:

- approve the provider and model explicitly;
- record current price and license;
- configure a hard daily budget;
- confirm privacy/retention terms;
- run synthetic Spanish mobility benchmarks;
- validate timeouts and fallback;
- create an exact-SHA Cloudflare candidate at 0%;
- keep territorial feature flags false until browser/device gates pass.

## Sources

Official sources verified on 2026-07-21:

- Cloudflare Workers AI pricing: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Cloudflare Whisper large-v3-turbo: https://developers.cloudflare.com/workers-ai/models/whisper-large-v3-turbo/
- Cloudflare Qwen3 30B: https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/
- Cloudflare Workers AI data usage: https://developers.cloudflare.com/workers-ai/platform/data-usage/
- OpenAI GPT-4o mini transcription: https://developers.openai.com/api/docs/models/gpt-4o-mini-transcribe
- OpenAI GPT-4o transcription: https://developers.openai.com/api/docs/models/gpt-4o-transcribe
- OpenAI GPT-4o mini TTS: https://developers.openai.com/api/docs/models/gpt-4o-mini-tts
- OpenAI GPT-4o mini: https://developers.openai.com/api/docs/models/gpt-4o-mini
- OpenAI API data controls: https://platform.openai.com/docs/models/default-usage-policies-by-endpoint
- Deepgram pricing: https://deepgram.com/pricing
- Google Speech-to-Text pricing: https://cloud.google.com/speech-to-text/pricing
- Google Text-to-Speech pricing: https://cloud.google.com/text-to-speech/pricing
- MDN SpeechRecognition: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
- MDN getUserMedia: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- MDN MediaRecorder: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
- MDN Local Network Access: https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Local_network_access
- Voicebox repository: https://github.com/jamiepine/voicebox
- Voicebox backend: https://github.com/jamiepine/voicebox/blob/main/backend/README.md
- Voicebox license: https://github.com/jamiepine/voicebox/blob/main/LICENSE
