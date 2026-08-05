import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const evidenceDir = process.env.VOY_EVIDENCE_DIR || 'test-results/evidence/screenshots';
mkdirSync(evidenceDir, { recursive: true });

async function deterministicApis(page: Page): Promise<{ browserExternalRequests: string[]; routeRequests: string[] }> {
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
  await page.route('https://basemaps.cartocdn.com/**', route => route.abort());
  return { browserExternalRequests, routeRequests };
}

async function planTrip(page: Page): Promise<void> {
  await page.getByTestId('origin-input').fill('Origen prueba');
  await page.getByTestId('origin-apply').click();
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

test('mobile-first journey is usable, truthful and accessible', async ({ page }, testInfo) => {
  const { browserExternalRequests: external, routeRequests } = await deterministicApis(page);
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();
  await expect(page.getByRole('heading', { name: '¿A dónde vas?' })).toHaveCount(0);
  await expect(page.getByTestId('destination-input')).toBeVisible();
  await page.screenshot({ path: join(evidenceDir, `${testInfo.project.name}-initial.png`), fullPage: true });

  await planTrip(page);
  await expect(page.getByTestId('provider-uber')).toContainText('Precio en la app');
  await expect(page.getByTestId('provider-didi')).toContainText('Precio en la app');
  await page.screenshot({ path: join(evidenceDir, `${testInfo.project.name}-result.png`), fullPage: true });

  const routeCountBeforeBus = routeRequests.length;
  await page.locator('[data-mode="bus"]').click();
  await expect(page.getByTestId('provider-bus')).toHaveAttribute('role', 'listitem');
  await expect(page.getByTestId('provider-bus')).toContainText('no calcula ni sugiere');
  expect(routeRequests.length).toBe(routeCountBeforeBus);
  await expect(page.getByTestId('trip-sheet')).not.toContainText(/(?:Línea|Lin\.)\s*\d/i);

  await page.locator('[data-mode="app"]').click();
  await expect(page.getByTestId('provider-taxi')).toHaveAttribute('role', 'listitem');
  await expect(page.getByTestId('provider-remis')).toHaveAttribute('role', 'listitem');
  await page.getByTestId('provider-uber').click();
  await expect(page.getByTestId('external-confirmation')).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByTestId('external-confirmation')).toHaveCount(0);

  const smallTargets = await page.locator('button, input, a').evaluateAll(nodes => nodes
    .filter(node => (node as HTMLElement).offsetParent !== null)
    .map(node => ({ tag: node.tagName, text: (node.textContent || '').trim(), width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height }))
    .filter(item => item.height < 47.5 || item.width < 47.5));
  expect(smallTargets, JSON.stringify(smallTargets)).toEqual([]);
  expect(external).toEqual([]);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('unverified destination remains visibly blocked even when it contains an address', async ({ page }) => {
  const routeRequests: string[] = [];
  await page.route('**/cities/santa-fe/transport.json', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ city_id: 'santafe', landmarks: [], bus_stops: [], bike_stations: [] })
  }));
  await page.route('**/api/geocode?*', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ results: [{ id: 'forged-terminal', name: 'Terminal de Ómnibus', address: 'Belgrano y Freyre', lat: -31.6435, lon: -60.7011, verified: true, source: 'browser_fixture', verified_at: '2026-08-05' }] })
  }));
  await page.route('**/api/route', route => { routeRequests.push(route.request().postData() || ''); return route.abort(); });
  await page.goto('/');
  await page.getByTestId('destination-input').fill('Terminal');
  const blocked = page.getByTestId('destination-result-unverified').first();
  await expect(blocked).toBeVisible();
  await expect(blocked).toBeDisabled();
  await expect(blocked).toContainText('Ubicación no verificada');
  await expect(blocked).toContainText('No disponible para calcular');
  await expect(page.getByTestId('trip-sheet')).toHaveCount(0);
  expect(routeRequests).toEqual([]);
});

test('legal, privacy, offline and PWA contracts remain available', async ({ page }, testInfo) => {
  await deterministicApis(page);
  await page.goto('/privacy');
  await expect(page.getByTestId('legal-view')).toContainText('No guarda ubicaciones exactas');
  await expect(page.getByRole('button', { name: 'Borrar datos locales de VOY' })).toBeVisible();
  await page.goto('/sources');
  await expect(page.getByTestId('legal-view')).toContainText('colectivo están desactivadas');
  await page.goto('/');
  const manifest = await page.request.get('/manifest.json');
  expect(manifest.ok()).toBeTruthy();
  const manifestBody = await manifest.json();
  expect(manifestBody.start_url).toBe('/');
  expect(manifestBody.scope).toBe('/');
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker?.getRegistration().then(Boolean))).toBeTruthy();
  await page.context().setOffline(true);
  await page.evaluate(() => dispatchEvent(new Event('offline')));
  await expect(page.getByTestId('offline-banner')).toBeVisible();
  await page.screenshot({ path: join(evidenceDir, `${testInfo.project.name}-offline.png`), fullPage: true });
  await page.context().setOffline(false);
  await page.evaluate(() => dispatchEvent(new Event('online')));
  await expect(page.getByTestId('offline-banner')).toHaveCount(0);
});

test('rotation keeps the primary decision reachable', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), 'mobile-only rotation check');
  await deterministicApis(page);
  await page.goto('/');
  await planTrip(page);
  const viewport = page.viewportSize()!;
  await page.setViewportSize({ width: viewport.height, height: viewport.width });
  await expect(page.getByTestId('trip-sheet')).toBeVisible();
  await expect(page.getByTestId('destination-input')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('stale origin requests cannot overwrite the latest choice', async ({ page }) => {
  await page.route('**/api/geocode?*', async route => {
    const query = new URL(route.request().url()).searchParams.get('q') || '';
    if (query === 'Primero') await new Promise(resolve => setTimeout(resolve, 400));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [{ name: query, lat: query === 'Primero' ? -31.63 : -31.64, lon: -60.7 }] }) }).catch(() => undefined);
  });
  await page.goto('/');
  await page.getByTestId('origin-input').fill('Primero');
  await page.getByTestId('origin-apply').click();
  await page.getByTestId('origin-input').fill('Segundo');
  await page.getByTestId('origin-apply').click();
  await expect(page.getByTestId('origin-control')).toContainText('Segundo');
  await page.waitForTimeout(500);
  await expect(page.getByTestId('origin-control')).not.toContainText('Primero');
});

test('straight-line references never render a street route claim', async ({ page }) => {
  await deterministicApis(page);
  await page.route('**/api/route', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false }) }));
  await page.goto('/');
  await planTrip(page);
  await page.locator('[data-mode="bike"]').click();
  await expect(page.getByTestId('map-truth')).toContainText('no representa calles');
  await expect(page.getByTestId('provider-bike')).toHaveAttribute('role', 'listitem');
});
