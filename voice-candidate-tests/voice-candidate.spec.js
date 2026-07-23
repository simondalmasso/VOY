const { test, expect } = require('@playwright/test');
const { mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const { basename, join } = require('node:path');

const workerUrl = process.env.WORKER_URL;
const workerName = process.env.WORKER_NAME || 'voy-app';
const candidateVersionId = process.env.CANDIDATE_VERSION_ID;
const expectedBuild = process.env.SHORT_SHA;
const samplePath = process.env.VOICE_SAMPLE_WAV;
const evidenceRoot = process.env.VOY_EVIDENCE_DIR || 'test-results/voice-candidate-browser';

if (!workerUrl || !candidateVersionId || !expectedBuild || !samplePath) {
  throw new Error('missing_voice_candidate_browser_environment');
}

const origin = new URL(workerUrl).origin;
const sampleBytes = [...readFileSync(samplePath)];
const override = `${workerName}="${candidateVersionId}"`;

function candidateHeaders(existing = {}) {
  return {
    ...existing,
    'Cloudflare-Workers-Version-Overrides': override,
    'X-VOY-Voice-Test': 'synthetic-ci-v1',
    'Cache-Control': 'no-cache, no-store, max-age=0',
    Pragma: 'no-cache'
  };
}

async function installCandidateRouting(page) {
  await page.route('**/*', async route => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    if (requestUrl.origin !== origin) return route.continue();
    return route.continue({ headers: candidateHeaders(request.headers()) });
  });
}

async function installBrowserStubs(page) {
  await page.addInitScript(({ audio }) => {
    window.__voiceCandidateTest = { spoken: [], cancelled: 0, opened: [] };
    window.open = (url, target, features) => {
      window.__voiceCandidateTest.opened.push({ url, target, features });
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
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      writable: true,
      value: FakeUtterance
    });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      writable: true,
      value: {
        speak(utterance) {
          window.__voiceCandidateTest.spoken.push(utterance.text);
          utterance.dispatchEvent(new Event('start'));
          setTimeout(() => utterance.dispatchEvent(new Event('end')), 10);
        },
        cancel() { window.__voiceCandidateTest.cancelled += 1; }
      }
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        async getUserMedia() {
          return { getTracks: () => [{ stop() {} }] };
        }
      }
    });
    class FakeMediaRecorder extends EventTarget {
      static isTypeSupported() { return false; }
      constructor(stream) {
        super();
        this.stream = stream;
        this.mimeType = 'audio/wav';
        this.state = 'inactive';
      }
      start() { this.state = 'recording'; }
      stop() {
        this.state = 'inactive';
        const bytes = Uint8Array.from(audio);
        this.dispatchEvent(new MessageEvent('dataavailable', {
          data: new Blob([bytes], { type: 'audio/wav' })
        }));
        this.dispatchEvent(new Event('stop'));
      }
    }
    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      writable: true,
      value: FakeMediaRecorder
    });
  }, { audio: sampleBytes });
}

function evidencePath(projectName) {
  const directory = join(evidenceRoot, projectName);
  mkdirSync(directory, { recursive: true });
  return directory;
}

async function openCopilot(page) {
  await page.goto('/?city=santafe&voice_candidate=1', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-voy-voice-ui]')).toBeVisible();
  await page.getByRole('button', { name: 'Hablar con VOY' }).click();
  const dialog = page.getByRole('dialog', { name: 'Asistente de movilidad VOY' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.beforeEach(async ({ page }) => {
  await installCandidateRouting(page);
  await installBrowserStubs(page);
});

test('clean candidate validates text, mic, STT, tools, cancellation, confirmation and TTS', async ({ page, context }, testInfo) => {
  const projectName = testInfo.project.name;
  const evidenceDir = evidencePath(projectName);
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];
  const directNominatim = [];

  page.on('pageerror', error => pageErrors.push(String(error?.stack || error)));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('requestfailed', request => {
    const failure = request.failure();
    if (failure?.errorText !== 'net::ERR_ABORTED') {
      failedRequests.push({ url: request.url(), error: failure?.errorText || 'unknown' });
    }
  });
  page.on('request', request => {
    const host = new URL(request.url()).hostname;
    if (host.includes('nominatim.openstreetmap.org')) directNominatim.push(request.url());
  });

  const dialog = await openCopilot(page);
  const health = await page.evaluate(async () => {
    const response = await fetch(`/api/health?voice_browser=${Date.now()}`, { cache: 'no-store' });
    return response.json();
  });
  expect(health.build_hash).toBe(expectedBuild);

  const cleanBefore = await page.evaluate(async () => ({
    local: Object.keys(localStorage),
    session: Object.keys(sessionStorage),
    caches: await caches.keys(),
    serviceWorkerControlled: Boolean(navigator.serviceWorker?.controller)
  }));
  expect(cleanBefore.local.filter(key => /voice|audio|transcript/i.test(key))).toEqual([]);
  expect(cleanBefore.session.filter(key => /voice|audio|transcript/i.test(key))).toEqual([]);
  expect(cleanBefore.caches.filter(key => /voice|audio|transcript/i.test(key))).toEqual([]);
  expect(cleanBefore.serviceWorkerControlled).toBe(false);

  const input = dialog.getByLabel('Mensaje para VOY');
  await input.fill('Quiero ir a la terminal.');
  await dialog.getByRole('button', { name: 'Enviar' }).click();
  await expect.poll(() => page.evaluate(() => window.VoyVoiceCopilot?.session?.destination?.city_id || null), {
    timeout: 120_000
  }).toBe('santafe');
  await expect.poll(() => page.evaluate(() => window.VoyVoiceCopilot?.events?.some(event => event.type === 'tool_completed') || false), {
    timeout: 30_000
  }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__voiceCandidateTest.spoken.length), {
    timeout: 30_000
  }).toBeGreaterThan(0);
  await dialog.getByRole('button', { name: 'Detener voz' }).click();

  await dialog.getByRole('button', { name: 'Hablar', exact: true }).click();
  await expect(page.locator('.voy-voice-status')).toHaveText('recording');
  await dialog.getByRole('button', { name: 'Detener grabación' }).click();
  await expect.poll(async () => (await input.inputValue()).trim().length, { timeout: 120_000 }).toBeGreaterThan(3);
  const transcript = await input.inputValue();

  await input.fill('Abrime Uber para este destino.');
  await dialog.getByRole('button', { name: 'Enviar' }).click();
  await expect(dialog.getByText(/¿Abrir uber/i)).toBeVisible({ timeout: 120_000 });
  expect(await page.evaluate(() => window.__voiceCandidateTest.opened.length)).toBe(0);
  await dialog.getByRole('button', { name: 'Confirmar y abrir' }).click();
  await expect.poll(() => page.evaluate(() => window.__voiceCandidateTest.opened.length), {
    timeout: 60_000
  }).toBe(1);
  const opened = await page.evaluate(() => window.__voiceCandidateTest.opened[0]);
  expect(new URL(opened.url).protocol).toBe('https:');

  await page.route('**/api/voice/chat', async route => {
    const request = route.request();
    const response = await route.fetch({ headers: candidateHeaders(request.headers()) });
    await new Promise(resolvePromise => setTimeout(resolvePromise, 2500));
    await route.fulfill({ response });
  });
  await input.fill('Hola, cancelá esta respuesta.');
  await dialog.getByRole('button', { name: 'Enviar' }).click();
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.locator('.voy-voice-status')).toHaveText('cancelled');
  await page.unroute('**/api/voice/chat');

  const finalStorage = await page.evaluate(async () => ({
    local: Object.keys(localStorage),
    session: Object.keys(sessionStorage),
    caches: await caches.keys(),
    events: window.VoyVoiceCopilot?.events || [],
    state: window.VoyVoiceCopilot?.state,
    opened: window.__voiceCandidateTest.opened,
    spoken: window.__voiceCandidateTest.spoken,
    cancelledSpeech: window.__voiceCandidateTest.cancelled,
    width: {
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth
    }
  }));
  const voiceCookies = (await context.cookies()).filter(cookie => /voice|audio|transcript/i.test(cookie.name));
  expect(finalStorage.local.filter(key => /voice|audio|transcript/i.test(key))).toEqual([]);
  expect(finalStorage.session.filter(key => /voice|audio|transcript/i.test(key))).toEqual([]);
  expect(finalStorage.caches.filter(key => /voice|audio|transcript/i.test(key))).toEqual([]);
  expect(voiceCookies).toEqual([]);
  expect(finalStorage.width.scroll - finalStorage.width.client).toBeLessThanOrEqual(1);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(directNominatim).toEqual([]);
  expect(failedRequests).toEqual([]);

  const evidence = {
    result: 'PASS',
    project: projectName,
    candidate_version_id: candidateVersionId,
    candidate_build_hash: expectedBuild,
    sample_file: basename(samplePath),
    transcript,
    destination: await page.evaluate(() => window.VoyVoiceCopilot?.session?.destination || null),
    events: finalStorage.events,
    opened: finalStorage.opened,
    spoken_count: finalStorage.spoken.length,
    speech_cancel_count: finalStorage.cancelledSpeech,
    page_errors: pageErrors,
    console_errors: consoleErrors,
    failed_requests: failedRequests,
    direct_nominatim: directNominatim,
    horizontal_overflow: finalStorage.width.scroll - finalStorage.width.client,
    storage: {
      local_voice_keys: finalStorage.local.filter(key => /voice|audio|transcript/i.test(key),
      ),
      session_voice_keys: finalStorage.session.filter(key => /voice|audio|transcript/i.test(key)),
      cache_voice_keys: finalStorage.caches.filter(key => /voice|audio|transcript/i.test(key)),
      voice_cookies: voiceCookies
    },
    checked_at: new Date().toISOString()
  };
  writeFileSync(join(evidenceDir, 'voice-candidate-browser.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  await page.screenshot({ path: join(evidenceDir, 'voice-candidate.png'), fullPage: true });
});
