import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const evidenceDir = process.env.VOY_EVIDENCE_DIR || 'test-results/evidence/screenshots';
mkdirSync(evidenceDir, { recursive: true });
const tilePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
type BasemapMode = 'mock' | 'fail' | 'real';

async function deterministicApis(page: Page, basemapMode: BasemapMode = 'mock'): Promise<{ browserExternalRequests: string[]; routeRequests: string[] }> {
  const browserExternalRequests: string[] = [];
  const routeRequests: string[] = [];
  page.on('request', request => {
    const url = request.url();
    if (/nominatim\.openstreetmap\.org|router\.project-osrm\.org/.test(url)) browserExternalRequests.push(url);
  });
  await page.route('**/api/geocode?*', async route => {
    const q = new URL(route.request().url()).searchParams.get('q') || '';
    const results = q.includes('Origen')
      ? [{ id: `test:${q}`, name: 'Plaza 25 de Mayo', display_name: q, address: 'Santa Fe', lat: -31.633, lon: -60.706 }]
      : [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results }) });
  });
  await page.route('**/api/route', route => { routeRequests.push(route.request().postData() || ''); return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, source: 'osrm_route', distance_km: 3.2, duration_min: 10.5, geometry: [[-60.706, -31.633], [-60.7, -31.64], [-60.700503, -31.643533]] })
  }); });
  if (basemapMode === 'mock') {
    await page.route('https://*.basemaps.cartocdn.com/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: tilePng }));
  } else if (basemapMode === 'fail') {
    await page.route('https://*.basemaps.cartocdn.com/**', route => route.abort('failed'));
  }
  return { browserExternalRequests, routeRequests };
}

async function planTrip(page: Page): Promise<void> {
  await expect(page.getByTestId('origin-input')).toHaveCount(0);
  await expect(page.getByTestId('origin-apply')).toHaveCount(0);
  await page.getByTestId('origin-manual-trigger').click();
  const originInput = page.getByTestId('origin-input');
  await expect(originInput).toBeFocused();
  await originInput.fill('Origen prueba');
  await originInput.press('Enter');
  await expect(page.getByTestId('origin-control')).toContainText('Plaza 25 de Mayo');
  await page.getByTestId('destination-input').fill('Terminal');
  await expect(page.getByTestId('destination-results')).toBeVisible();
  const verifiedDestination = page.getByTestId('destination-result-verified').first();
  await expect(verifiedDestination).toContainText('Terminal de Ómnibus');
  await expect(verifiedDestination).toContainText('Belgrano 2910');
  await expect(verifiedDestination).toContainText('Fuente oficial');
  await verifiedDestination.click();
  await expect(page.getByTestId('trip-sheet')).toBeVisible();
  await expect(page.getByTestId('destination-provenance')).toContainText('Municipalidad de Santa Fe');
  await expect(page.getByTestId('destination-provenance')).toContainText('2026-08-05');
}

async function openDecisionHalf(page: Page): Promise<void> {
  const sheet = page.getByTestId('trip-sheet');
  await expect(sheet).toHaveAttribute('data-snap', 'peek');
  await page.getByTestId('sheet-handle').click();
  await expect(sheet).toHaveAttribute('data-snap', 'half');
}

async function assertMobileDensity(page: Page, testInfo: TestInfo): Promise<void> {
  const metrics = await page.evaluate(() => {
    const box = (id: string) => {
      const element = document.querySelector(`[data-testid="${id}"]`);
      if (!(element instanceof HTMLElement)) throw new Error(`missing_${id}`);
      const rect = element.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, height: rect.height, width: rect.width };
    };
    const destination = box('destination-search');
    const origin = box('origin-control');
    const map = box('map-shell');
    return {
      viewport: { width: innerWidth, height: innerHeight },
      destination,
      origin,
      map,
      combinedTopBlocks: destination.height + origin.height,
      mapVisiblePx: Math.max(0, Math.min(map.bottom, innerHeight) - Math.max(map.top, 0)),
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });
  writeFileSync(join(evidenceDir, `${testInfo.project.name}-mobile-density.json`), `${JSON.stringify(metrics, null, 2)}\n`);
  if (!testInfo.project.name.startsWith('mobile')) return;
  expect(metrics.destination.height).toBeLessThanOrEqual(106);
  expect(metrics.origin.height).toBeLessThanOrEqual(121);
  expect(metrics.combinedTopBlocks).toBeLessThanOrEqual(226);
  expect(metrics.map.top).toBeLessThan(metrics.viewport.height);
  expect(metrics.mapVisiblePx).toBeGreaterThanOrEqual(120);
  expect(metrics.horizontalOverflow).toBeLessThanOrEqual(1);
}

test('mobile-first journey is usable, truthful and accessible', async ({ page }, testInfo) => {
  const { browserExternalRequests: external, routeRequests } = await deterministicApis(page);
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();
  await expect(page.getByRole('heading', { name: '¿A dónde vas?' })).toHaveCount(0);
  await expect(page.getByTestId('destination-input')).toBeVisible();
  await page.screenshot({ path: join(evidenceDir, `${testInfo.project.name}-initial.png`), fullPage: true });

  await planTrip(page);
  await expect(page.getByTestId('map-shell')).toHaveAttribute('data-map-state', 'ready');
  await expect(page.getByTestId('map-shell')).toHaveAttribute('data-overlay-ready', 'true');
  await openDecisionHalf(page);
  for (const id of ['uber', 'didi']) {
    const provider = page.getByTestId(`provider-${id}`);
    await expect(provider).toBeVisible();
    await expect(provider).not.toContainText(/precio/i);
    await expect(provider.getByText(/\d+(?:[.,]\d+)?\s*min/i)).toHaveCount(0);
    expect((await provider.getAttribute('aria-label')) || '').not.toMatch(/precio|\d+(?:[.,]\d+)?\s*min/i);
    expect((await provider.getAttribute('title')) || '').not.toMatch(/precio|\d+(?:[.,]\d+)?\s*min/i);
  }
  await expect(page.locator('body')).not.toContainText('Precio en la app');
  await assertMobileDensity(page, testInfo);
  await page.screenshot({ path: join(evidenceDir, `${testInfo.project.name}-result.png`), fullPage: true });

  const routeCountBeforeBus = routeRequests.length;
  await page.locator('[data-mode="bus"]').click();
  await openDecisionHalf(page);
  await expect(page.getByTestId('provider-bus')).toBeVisible();
  await expect(page.getByTestId('provider-bus')).toHaveAttribute('role', 'listitem');
  await expect(page.getByTestId('provider-bus')).toContainText('no calcula ni sugiere');
  expect(routeRequests.length).toBe(routeCountBeforeBus);
  await expect(page.getByTestId('trip-sheet')).not.toContainText(/(?:Línea|Lin\.)\s*\d/i);

  await page.locator('[data-mode="app"]').click();
  await openDecisionHalf(page);
  await expect(page.getByTestId('provider-taxi')).toBeVisible();
  await expect(page.getByTestId('provider-taxi')).toHaveAttribute('role', 'listitem');
  await expect(page.getByTestId('provider-remis')).toHaveAttribute('role', 'listitem');
  await page.getByTestId('provider-uber').click();
  await expect(page.getByTestId('external-confirmation')).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByTestId('external-confirmation')).toHaveCount(0);

  const smallTargets = await page.locator('button, input, a').evaluateAll(nodes => nodes
    .filter(node => (node as HTMLElement).offsetParent !== null)
    .map(node => ({ tag: node.tagName, text: (node.textContent || '').trim(), width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height }))
    .filter(item => item.height < 43.5 || item.width < 43.5));
  expect(smallTargets, JSON.stringify(smallTargets)).toEqual([]);
  expect(external).toEqual([]);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('basemap failure is explicit instead of a silent ready blank map', async ({ page }) => {
  await deterministicApis(page, 'fail');
  await page.goto('/');
  await expect(page.getByTestId('map-shell')).toHaveAttribute('data-map-state', 'fallback', { timeout: 15_000 });
  await expect(page.getByTestId('map-fallback')).toContainText('mapa base no está disponible');
});
