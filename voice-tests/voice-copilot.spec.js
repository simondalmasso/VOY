const { test, expect } = require('@playwright/test');

function initialSession() {
  const now = Date.now();
  return {
    session_id: 'browser-session',
    created_at: now,
    expires_at: now + 15 * 60 * 1000,
    turn_count: 0,
    inference_count: 0,
    state_revision: 0,
    city_id: 'santafe',
    origin: null,
    destination: null,
    selected_mode: null,
    results: [],
    pending_confirmation: null,
    recent_turns: [],
    last_response: '',
    active_request_id: null,
    mobility_snapshot: []
  };
}

async function installBrowserStubs(page, options = {}) {
  await page.addInitScript(({ micDenied }) => {
    window.__voiceTest = { spoken: [], cancelled: 0, opened: [] };
    window.open = (url, target, features) => {
      window.__voiceTest.opened.push({ url, target, features });
      return null;
    };
    class FakeUtterance extends EventTarget {
      constructor(text) {
        super();
        this.text = text;
        this.lang = '';
        this.rate = 1;
      }
    }
    window.SpeechSynthesisUtterance = FakeUtterance;
    window.speechSynthesis = {
      speak(utterance) {
        window.__voiceTest.spoken.push(utterance.text);
        utterance.dispatchEvent(new Event('start'));
        setTimeout(() => utterance.dispatchEvent(new Event('end')), 10);
      },
      cancel() { window.__voiceTest.cancelled += 1; }
    };
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: micDenied
          ? async () => { throw Object.assign(new Error('denied'), { name: 'NotAllowedError' }); }
          : async () => ({ getTracks: () => [{ stop() {} }] })
      }
    });
    class FakeMediaRecorder extends EventTarget {
      static isTypeSupported() { return true; }
      constructor(stream, config) {
        super();
        this.stream = stream;
        this.mimeType = config && config.mimeType || 'audio/webm';
        this.state = 'inactive';
      }
      start() { this.state = 'recording'; }
      stop() {
        this.state = 'inactive';
        this.dispatchEvent(new MessageEvent('dataavailable', { data: new Blob([new Uint8Array([1, 2, 3])], { type: this.mimeType }) }));
        this.dispatchEvent(new Event('stop'));
      }
    }
    window.MediaRecorder = FakeMediaRecorder;
  }, { micDenied: options.micDenied === true });
}

async function mockVoiceApi(page, options = {}) {
  let session = initialSession();
  let tokenUsed = false;
  await page.route('**/api/voice/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (options.delayChat && url.pathname.endsWith('/chat')) {
      await new Promise(resolve => setTimeout(resolve, options.delayChat));
    }
    let body;
    if (url.pathname.endsWith('/session')) {
      body = { ok: true, session };
    } else if (url.pathname.endsWith('/transcribe')) {
      body = { ok: true, transcript: 'Quiero ir a la terminal', word_count: 6, audio_persisted: false, transcript_logged: false };
    } else if (url.pathname.endsWith('/chat')) {
      const payload = request.postDataJSON();
      session = structuredClone(payload.session);
      session.turn_count += 1;
      session.last_response = payload.message.includes('Uber') ? 'Preparé abrir Uber. Confirmalo.' : 'Hola. ¿A dónde querés ir?';
      session.recent_turns = [{ role: 'user', content: payload.message }, { role: 'assistant', content: session.last_response }];
      if (payload.message.includes('Uber')) {
        session.destination = { ref: 'santafe:terminal', name: 'Terminal de Ómnibus', address: 'Belgrano 2910', source: 'local', city_id: 'santafe' };
        session.state_revision += 1;
        session.pending_confirmation = { token: 'one-use-token', provider: 'uber', destination_ref: 'santafe:terminal', operation_id: 'op-1', state_revision: session.state_revision, expires_at: Date.now() + 60000 };
        body = {
          ok: true,
          request_id: payload.request_id,
          response: session.last_response,
          session,
          tool_execution: { tool: 'prepare_external_provider_action', status: 'success' },
          tool_result: { confirmation_required: true, provider: 'uber', destination: session.destination, token: 'one-use-token', expires_at: session.pending_confirmation.expires_at },
          events: [{ type: 'confirmation_required', detail: { provider: 'uber' } }]
        };
      } else {
        body = { ok: true, request_id: payload.request_id, response: session.last_response, session, tool_execution: null, tool_result: null, events: [] };
      }
    } else if (url.pathname.endsWith('/confirm')) {
      const payload = request.postDataJSON();
      if (payload.token !== 'one-use-token' || tokenUsed) {
        await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'confirmation_replay_or_missing' }) });
        return;
      }
      tokenUsed = true;
      session.pending_confirmation = null;
      session.state_revision += 1;
      body = { ok: true, session, external_action: { provider: 'uber', url: 'https://m.uber.com/ul/', destination_ref: 'santafe:terminal', operation_id: 'op-1', confirmed: true, reversible: false } };
    } else {
      body = { ok: true, enabled: true };
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

async function openCopilot(page) {
  await page.goto('/?city=santafe', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-voy-voice-ui]')).toBeVisible();
  await page.getByRole('button', { name: 'Hablar con VOY' }).click();
  await expect(page.getByRole('dialog', { name: 'Asistente de movilidad VOY' })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await installBrowserStubs(page);
  await mockVoiceApi(page);
});

test('works completely by text and speaks a bounded answer', async ({ page }) => {
  await openCopilot(page);
  const input = page.getByLabel('Mensaje para VOY');
  await input.fill('Hola VOY');
  await page.getByRole('button', { name: 'Enviar' }).click();
  await expect(page.getByText('Hola. ¿A dónde querés ir?')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__voiceTest.spoken.length)).toBe(1);
  await page.getByRole('button', { name: 'Detener voz' }).click();
  expect(await page.evaluate(() => window.__voiceTest.cancelled)).toBeGreaterThan(0);
});

test('records synthetic audio, exposes editable transcript and never persists storage', async ({ page, context }) => {
  await openCopilot(page);
  await page.getByRole('button', { name: 'Hablar', exact: true }).click();
  await expect(page.locator('.voy-voice-status')).toHaveText('recording');
  await page.getByRole('button', { name: 'Detener grabación' }).click();
  await expect(page.getByLabel('Mensaje para VOY')).toHaveValue('Quiero ir a la terminal');
  const storage = await page.evaluate(async () => ({
    local: Object.keys(localStorage),
    session: Object.keys(sessionStorage),
    caches: await caches.keys(),
    controllers: navigator.serviceWorker && navigator.serviceWorker.controller ? 1 : 0
  }));
  expect(storage.local.filter(key => /voice|transcript|audio/i.test(key))).toEqual([]);
  expect(storage.session.filter(key => /voice|transcript|audio/i.test(key))).toEqual([]);
  expect(storage.caches.filter(key => /voice|transcript|audio/i.test(key))).toEqual([]);
  expect(storage.controllers).toBe(0);
  expect((await context.cookies()).filter(cookie => /voice|transcript|audio/i.test(cookie.name))).toEqual([]);
});

test('requires explicit one-use confirmation before opening a provider', async ({ page }) => {
  await openCopilot(page);
  await page.getByLabel('Mensaje para VOY').fill('Abrime Uber');
  await page.getByRole('button', { name: 'Enviar' }).click();
  await expect(page.getByText(/¿Abrir uber/)).toBeVisible();
  expect(await page.evaluate(() => window.__voiceTest.opened.length)).toBe(0);
  await page.getByRole('button', { name: 'Confirmar y abrir' }).click();
  await expect.poll(() => page.evaluate(() => window.__voiceTest.opened.length)).toBe(1);
  expect(await page.evaluate(() => window.__voiceTest.opened[0].url)).toBe('https://m.uber.com/ul/');
});

test('cancel aborts an in-flight request and applies no action', async ({ page }) => {
  await page.unroute('**/api/voice/**');
  await mockVoiceApi(page, { delayChat: 3000 });
  await openCopilot(page);
  await page.getByLabel('Mensaje para VOY').fill('Abrime Uber');
  await page.getByRole('button', { name: 'Enviar' }).click();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.locator('.voy-voice-status')).toHaveText('cancelled');
  expect(await page.evaluate(() => window.__voiceTest.opened.length)).toBe(0);
});

test('mic denied falls back to text without page errors', async ({ page }) => {
  await page.unroute('**/api/voice/**');
  await installBrowserStubs(page, { micDenied: true });
  await mockVoiceApi(page);
  await openCopilot(page);
  await page.getByRole('button', { name: 'Hablar', exact: true }).click();
  await expect(page.getByText(/seguir completamente por texto/)).toBeVisible();
  await expect(page.locator('.voy-voice-status')).toHaveText('error');
  await expect(page.getByLabel('Mensaje para VOY')).toBeEnabled();
});

test('offline state blocks sending and reset creates a fresh session', async ({ page, context }) => {
  await openCopilot(page);
  await context.setOffline(true);
  await page.getByLabel('Mensaje para VOY').fill('Hola');
  await page.getByRole('button', { name: 'Enviar' }).click();
  await expect(page.locator('.voy-voice-status')).toHaveText('offline');
  await context.setOffline(false);
  await page.getByRole('button', { name: 'Resetear conversación' }).click();
  await expect(page.locator('.voy-voice-status')).toHaveText('idle');
});
