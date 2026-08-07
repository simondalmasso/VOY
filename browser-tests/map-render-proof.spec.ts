import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const evidenceDir = process.env.VOY_EVIDENCE_DIR || 'test-results/map-render-proof';
mkdirSync(evidenceDir, { recursive: true });

async function deterministicTripApis(page: Page): Promise<void> {
  await page.route('**/api/geocode?*', async route => {
    const q = new URL(route.request().url()).searchParams.get('q') || '';
    const results = q.includes('Origen')
      ? [{ id: `render:${q}`, name: 'Plaza 25 de Mayo', display_name: q, address: 'Santa Fe', lat: -31.633, lon: -60.706 }]
      : [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results }) });
  });
  await page.route('**/api/route', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, source: 'osrm_route', distance_km: 3.2, duration_min: 10.5, geometry: [[-60.706, -31.633], [-60.703, -31.635], [-60.7, -31.64], [-60.700503, -31.643533]] })
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

test('real map has visible host canvas basemap and trip overlay geometry', async ({ page }, testInfo) => {
  test.skip(process.env.VOY_REAL_BASEMAP !== '1', 'real-network map pixel proof gate only');
  const tileResponses: Array<{ url: string; status: number; contentType: string }> = [];
  page.on('response', response => {
    if (/https:\/\/[a-d]\.basemaps\.cartocdn\.com\/light_all\//.test(response.url())) {
      tileResponses.push({ url: response.url(), status: response.status(), contentType: response.headers()['content-type'] || '' });
    }
  });

  await deterministicTripApis(page);
  await page.goto('/');
  await planTrip(page);
  const shell = page.getByTestId('map-shell');
  const host = page.getByTestId('map-host');
  await expect(shell).toHaveAttribute('data-map-state', 'ready', { timeout: 20_000 });
  await expect(shell).toHaveAttribute('data-overlay-ready', 'true');
  await expect.poll(() => tileResponses.filter(item => item.status === 200 && item.contentType.includes('image')).length, { timeout: 20_000 }).toBeGreaterThan(0);
  expect(tileResponses.filter(item => item.status >= 400), JSON.stringify(tileResponses)).toEqual([]);
  await page.waitForTimeout(650);

  const geometry = await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="map-shell"]');
    const host = document.querySelector('[data-testid="map-host"]');
    const canvas = host?.querySelector('.maplibregl-canvas');
    if (!(shell instanceof HTMLElement) || !(host instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) throw new Error('map_geometry_subject_missing');
    const rect = (element: Element) => {
      const r = element.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, left: r.left, right: r.right, bottom: r.bottom };
    };
    const shellRect = rect(shell), hostRect = rect(host), canvasRect = rect(canvas);
    const hostStyle = getComputedStyle(host), canvasStyle = getComputedStyle(canvas);
    const tolerance = 4;
    const geometryPass = hostStyle.position === 'absolute'
      && hostRect.width > 20 && hostRect.height > 20
      && canvasRect.width > 20 && canvasRect.height > 20
      && Math.abs(shellRect.width - hostRect.width) <= tolerance
      && Math.abs(shellRect.height - hostRect.height) <= tolerance
      && Math.abs(hostRect.width - canvasRect.width) <= tolerance
      && Math.abs(hostRect.height - canvasRect.height) <= tolerance;
    return {
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
      shell: { rect: shellRect, classList: Array.from(shell.classList) },
      host: { rect: hostRect, classList: Array.from(host.classList), position: hostStyle.position, width: hostStyle.width, height: hostStyle.height, display: hostStyle.display, visibility: hostStyle.visibility, opacity: hostStyle.opacity },
      canvas: { rect: canvasRect, classList: Array.from(canvas.classList), widthAttribute: canvas.width, heightAttribute: canvas.height, position: canvasStyle.position, width: canvasStyle.width, height: canvasStyle.height, display: canvasStyle.display, visibility: canvasStyle.visibility, opacity: canvasStyle.opacity },
      geometryPass
    };
  });

  expect(geometry.geometryPass, JSON.stringify(geometry)).toBe(true);
  writeFileSync(join(evidenceDir, `${testInfo.project.name}-map-render-geometry.json`), `${JSON.stringify({ geometry, tileResponses }, null, 2)}\n`);
  await host.screenshot({ path: join(evidenceDir, `${testInfo.project.name}-map-render-proof.png`) });
  await page.screenshot({ path: join(evidenceDir, `${testInfo.project.name}-map-render-full.png`), fullPage: true });
});
