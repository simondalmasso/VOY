/* eslint-disable @typescript-eslint/no-require-imports */
const { test, expect } = require('@playwright/test');
const { createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const baseURL = process.env.VOY_BASE_URL;
const candidateVersionId = process.env.VOY_CANDIDATE_VERSION_ID;
const evidenceDirectory = process.env.VOY_EVIDENCE_DIR || 'test-results/cache-isolation';
const expectedSourceRoot = process.env.VOY_EXPECTED_SOURCE_ROOT || process.cwd();
const baseOrigin = new URL(baseURL).origin;

function digest(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

test.describe('City Platform candidate clean-cache acquisition', () => {
  test('loads all five Santa Fe components from verified network responses', async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const contract = await import('../scripts/required-city-platform-assets.mjs');
    const manifest = contract.expectedAssetManifest(expectedSourceRoot);
    const expectedByPath = new Map(manifest.map(asset => [asset.path.split('?')[0], asset]));
    const requiredSantaFePaths = contract.REQUIRED_CITY_PLATFORM_ASSETS
      .filter(asset => asset.cityId === 'santafe')
      .map(asset => asset.path);
    const requestLog = [];
    const responseLog = [];
    const responseTasks = [];
    const consoleLog = [];
    const pageErrors = [];
    let directNominatim = 0;

    await page.route('**/*', async route => {
      const request = route.request();
      if (new URL(request.url()).origin === baseOrigin) {
        await route.continue();
        return;
      }
      const headers = { ...request.headers() };
      delete headers['cloudflare-workers-version-overrides'];
      delete headers['x-voy-candidate-smoke'];
      delete headers['cache-control'];
      delete headers.pragma;
      await route.continue({ headers });
    });

    page.on('console', message => consoleLog.push({ type: message.type(), text: message.text() }));
    page.on('pageerror', error => pageErrors.push(String(error?.stack || error)));

    await page.goto(`/api/health?cache_isolation_prep=${Date.now()}`, { waitUntil: 'domcontentloaded' });
    const cleared = await page.evaluate(async () => {
      localStorage.clear();
      sessionStorage.clear();
      const cacheNames = 'caches' in globalThis ? await caches.keys() : [];
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      const registrations = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistrations() : [];
      await Promise.all(registrations.map(registration => registration.unregister()));
      return {
        localStorage: localStorage.length,
        sessionStorage: sessionStorage.length,
        caches: 'caches' in globalThis ? await caches.keys() : [],
        serviceWorkers: 'serviceWorker' in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 0
      };
    });
    expect(cleared).toEqual({ localStorage: 0, sessionStorage: 0, caches: [], serviceWorkers: 0 });

    page.on('request', request => {
      const url = request.url();
      if (url.includes('nominatim.openstreetmap.org')) directNominatim += 1;
      if (new URL(url).origin !== baseOrigin) return;
      const pathname = new URL(url).pathname;
      if (!requiredSantaFePaths.includes(pathname)) return;
      requestLog.push({
        url,
        pathname,
        method: request.method(),
        resourceType: request.resourceType(),
        override: request.headers()['cloudflare-workers-version-overrides'] || null,
        cacheControl: request.headers()['cache-control'] || null
      });
    });

    page.on('response', response => {
      const url = response.url();
      if (new URL(url).origin !== baseOrigin) return;
      const pathname = new URL(url).pathname;
      if (!requiredSantaFePaths.includes(pathname)) return;
      responseTasks.push((async () => {
        const body = await response.body();
        const expected = expectedByPath.get(pathname);
        const asset = contract.REQUIRED_CITY_PLATFORM_ASSETS.find(entry => entry.path === pathname);
        const evaluated = contract.evaluateRemoteAsset(asset, body, {
          requested_url: url,
          effective_url: url,
          status: response.status(),
          content_type: response.headers()['content-type'] || null,
          content_length: response.headers()['content-length'] || null,
          etag: response.headers().etag || null,
          age: response.headers().age || null,
          cache_status: response.headers()['cf-cache-status'] || null,
          cf_ray: response.headers()['cf-ray'] || null,
          version_id: candidateVersionId
        }, expected);
        responseLog.push({ ...evaluated, observed_sha256: digest(body) });
      })());
    });

    await page.goto(`/?city=santafe&cache_isolation=${Date.now()}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.VoyCityPlatform && window.CURRENT_CITY?.city_id === 'santafe' && !document.getElementById('splash'));
    await Promise.all(responseTasks);

    expect(new Set(requestLog.map(record => record.pathname))).toEqual(new Set(requiredSantaFePaths));
    expect(new Set(responseLog.map(record => record.path))).toEqual(new Set(requiredSantaFePaths));
    for (const record of responseLog) {
      expect(record.status, record.path).toBe(200);
      expect(record.body_bytes, record.path).toBeGreaterThan(0);
      expect(record.hash_pass, record.path).toBe(true);
      expect(record.json_parse_result, record.path).toBe(true);
      expect(record.schema_result, record.path).toBe(true);
      expect(record.city_id, record.path).toBe('santafe');
      expect(record.pass, record.path).toBe(true);
    }
    for (const request of requestLog) {
      expect(request.override).toContain(candidateVersionId);
      expect(request.cacheControl).toContain('no-cache');
    }

    const runtimeState = await page.evaluate(() => ({
      cityId: window.CURRENT_CITY?.city_id,
      profileSource: window.CURRENT_CITY?.dataSources?.profile || null,
      localV2: localStorage.getItem('voy_city_cache_v2_santafe'),
      localLegacy: localStorage.getItem('voy_city_cache_santafe'),
      overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth
    }));
    expect(runtimeState.cityId).toBe('santafe');
    expect(runtimeState.profileSource).not.toBe('emergency');
    expect(runtimeState.overflow).toBeLessThanOrEqual(1);
    expect(pageErrors).toEqual([]);
    expect(consoleLog.filter(entry => entry.type === 'error')).toEqual([]);
    expect(directNominatim).toBe(0);

    await fs.mkdir(evidenceDirectory, { recursive: true });
    const slug = `${testInfo.project.name}-cache-isolation`;
    await fs.writeFile(path.join(evidenceDirectory, `${slug}-requests.json`), JSON.stringify(requestLog, null, 2));
    await fs.writeFile(path.join(evidenceDirectory, `${slug}-responses.json`), JSON.stringify(responseLog, null, 2));
    await fs.writeFile(path.join(evidenceDirectory, `${slug}-storage.json`), JSON.stringify({ cleared, runtimeState }, null, 2));
    await fs.writeFile(path.join(evidenceDirectory, `${slug}-console.json`), JSON.stringify(consoleLog, null, 2));
    await fs.writeFile(path.join(evidenceDirectory, `${slug}-pageerrors.json`), JSON.stringify(pageErrors, null, 2));
    await page.screenshot({ path: path.join(evidenceDirectory, `${slug}.png`), fullPage: false });
  });
});
