import { VOICE_TEST_HEADER } from './voiceCopilotApiUtils.mjs';

export async function maybeInjectVoiceCopilotHtml(request, response, env = {}) {
  const productMode = env.VOY_VOICE_ENABLED === 'true' && Boolean(env.AI);
  const testMode = env.VOY_VOICE_TEST_MODE === 'true'
    && request.headers.get('X-VOY-Voice-Test') === VOICE_TEST_HEADER;
  if (!productMode && !testMode) return response;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;
  const text = await response.text();
  if (text.includes('data-voy-voice-copilot')) {
    return new Response(text, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  }
  const injection = [
    '<link rel="stylesheet" href="/ui/voiceCopilot.css?v=1" data-voy-voice-copilot>',
    `<script data-voy-voice-copilot>window.VOY_VOICE_ENABLED=${productMode ? 'true' : 'false'};window.VOY_VOICE_TEST_MODE=${testMode ? 'true' : 'false'};window.VOY_VOICE_TEST_HEADER=${JSON.stringify(testMode ? VOICE_TEST_HEADER : '')};</script>`,
    '<script src="/core/voiceCopilot.js?v=1" defer data-voy-voice-copilot></script>'
  ].join('');
  const body = text.includes('</head>')
    ? text.replace('</head>', `${injection}</head>`)
    : `${injection}${text}`;
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('Cache-Control', 'no-store');
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
