import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const evidenceDir = process.env.VOY_EVIDENCE_DIR || 'test-results/map-render-diagnostic';
mkdirSync(evidenceDir, { recursive: true });

async function deterministicTripApis(page: Page): Promise<void> {
  await page.route('**/api/geocode?*', async route => {
    const q = new URL(route.request().url()).searchParams.get('q') || '';
    const results = q.includes('Origen')
      ? [{ id: `diag:${q}`, name: 'Plaza 25 de Mayo', display_name: q, address: 'Santa Fe', lat: -31.633, lon: -60.706 }]
      : [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results }) });
  });
  await page.route('**/api/route', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, source: 'osrm_route', distance_km: 3.2, duration_min: 10.5, geometry: [[-60.706, -31.633], [-60.7, -31.64], [-60.700503, -31.643533]] })
  }));
}

async function planTrip(page: Page): Promise<void> {
  await page.getByTestId('origin-input').fill('Origen prueba');
  await page.getByTestId('origin-apply').click();
  await expect(page.getByTestId('origin-control')).toContainText('Plaza 25 de Mayo');
  await page.getByTestId('destination-input').fill('Terminal');
  const verified = page.getByTestId('destination-result-verified').first();
  await expect(verified).toContainText('Terminal de Ómnibus');
  await verified.click();
  await expect(page.getByTestId('trip-sheet')).toBeVisible();
}

test('persist blocked-candidate map host and canvas geometry', async ({ page }, testInfo) => {
  test.skip(process.env.VOY_MAP_DIAGNOSTIC !== '1', 'explicit blocked-candidate diagnostic only');
  const tileResponses: Array<{ url: string; status: number; contentType: string }> = [];
  page.on('response', response => {
    if (/https:\/\/[a-d]\.basemaps\.cartocdn\.com\/light_all\//.test(response.url())) {
      tileResponses.push({ url: response.url(), status: response.status(), contentType: response.headers()['content-type'] || '' });
    }
  });
  await deterministicTripApis(page);
  await page.goto('/');
  await planTrip(page);
  await expect(page.getByTestId('map-shell')).toHaveAttribute('data-map-state', 'ready', { timeout: 20_000 });
  await expect.poll(() => tileResponses.filter(item => item.status === 200 && item.contentType.includes('image')).length, { timeout: 20_000 }).toBeGreaterThan(0);

  const geometry = await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="map-shell"]');
    const host = shell?.querySelector('.maplibregl-map');
    const canvas = host?.querySelector('.maplibregl-canvas');
    if (!(shell instanceof HTMLElement)) throw new Error('map_shell_missing');
    if (!(host instanceof HTMLElement)) throw new Error('maplibre_host_missing');
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error('maplibre_canvas_missing');
    const rect = (element: Element) => {
      const r = element.getBoundingClientRect();
      return { x: r.x, y: r.y, top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };
    const style = (element: Element) => {
      const s = getComputedStyle(element);
      return { position: s.position, width: s.width, height: s.height, display: s.display, visibility: s.visibility, opacity: s.opacity, inset: s.inset, overflow: s.overflow };
    };
    const stylesheets = Array.from(document.styleSheets).map((sheet, index) => {
      const result: { index: number; href: string | null; matchingSelectors: string[]; readable: boolean } = { index, href: sheet.href, matchingSelectors: [], readable: true };
      try {
        for (const rule of Array.from(sheet.cssRules)) {
          if (rule instanceof CSSStyleRule && /(?:^|,)\s*(?:\.map(?:\s|,|$)|\.maplibregl-map|\.map-shell)/.test(rule.selectorText)) result.matchingSelectors.push(rule.selectorText);
        }
      } catch {
        result.readable = false;
      }
      return result;
    });
    let webgl2 = false;
    let webgl = false;
    try { webgl2 = canvas.getContext('webgl2') !== null; } catch {}
    try { webgl = canvas.getContext('webgl') !== null || canvas.getContext('experimental-webgl') !== null; } catch {}
    return {
      subject: {
        blockedSourceSha: 'f09d849497490b2a544808ab8ad9c38b35199e39',
        blockedCandidateVersion: '28e040f0-c77e-4f53-a819-24bfef113976'
      },
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
      shell: { rect: rect(shell), style: style(shell), classList: Array.from(shell.classList) },
      host: { rect: rect(host), style: style(host), classList: Array.from(host.classList), clientWidth: host.clientWidth, clientHeight: host.clientHeight, offsetWidth: host.offsetWidth, offsetHeight: host.offsetHeight },
      canvas: { rect: rect(canvas), style: style(canvas), classList: Array.from(canvas.classList), widthAttribute: canvas.width, heightAttribute: canvas.height, clientWidth: canvas.clientWidth, clientHeight: canvas.clientHeight },
      stylesheets,
      webgl: { webgl2, webgl, available: webgl2 || webgl },
      mapState: shell.dataset.mapState || null,
      overlayReady: shell.dataset.overlayReady || null
    };
  });

  const evidence = { geometry, tileResponses, capturedAt: new Date().toISOString(), testRunnerHead: process.env.GITHUB_SHA || null };
  writeFileSync(join(evidenceDir, `${testInfo.project.name}-blocked-map-geometry.json`), `${JSON.stringify(evidence, null, 2)}\n`);
  await page.getByTestId('map-shell').screenshot({ path: join(evidenceDir, `${testInfo.project.name}-blocked-map-shell.png`) });
  await page.screenshot({ path: join(evidenceDir, `${testInfo.project.name}-blocked-full.png`), fullPage: true });
});
