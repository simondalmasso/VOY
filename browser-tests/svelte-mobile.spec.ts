import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const evidenceDir = process.env.VOY_EVIDENCE_DIR || 'test-results/svelte-screens';
mkdirSync(evidenceDir, { recursive: true });

async function deterministicApis(page: Page) {
  await page.route('**/api/geocode?*', route => {
    const query = new URL(route.request().url()).searchParams.get('q') || 'Destino';
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [{ name: query, lat: -31.633, lon: -60.695 }] }) });
  });
  await page.route('**/api/route', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ distance_km: 4.2, duration_min: 14, geometry: [[-60.7, -31.64], [-60.69, -31.63]] }) }));
}

async function planTrip(page: Page) {
  await page.getByTestId('origin-input').fill('Plaza 25 de Mayo');
  await page.getByTestId('origin-apply').click();
  await page.getByTestId('destination-input').fill('Terminal de Ómnibus');
  await page.getByTestId('destination-search').click();
  await page.getByTestId('destination-result').first().click();
  await expect(page.getByTestId('trip-sheet')).toBeVisible();
}

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
  await context.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    Object.defineProperty(navigator, 'serviceWorker', { value: undefined, configurable: true });
  });
});

test('mobile-first journey is usable, truthful and accessible', async ({ page }, testInfo) => {
  await deterministicApis(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '¿A dónde vas?' })).toBeVisible();
  await planTrip(page);
  await expect(page.getByTestId('map-truth')).toContainText('Recorrido por calles');
  await expect(page.getByTestId('provider-uber')).toContainText('consultá el precio en la app');
  await expect(page.getByTestId('provider-didi')).toContainText('consultá el precio en la app');
  await expect(page.getByTestId('provider-taxi')).toContainText('regulada');
  await expect(page.getByTestId('provider-remis')).toContainText('regulada');
  await expect(page.getByTestId('provider-bus')).toContainText('no se recomienda');
  await expect(page.getByTestId('provider-uber').getByRole('button')).toBeEnabled();
  await page.getByTestId('provider-uber').getByRole('button').click();
  await expect(page.getByRole('dialog')).toContainText('Confirmá antes de salir de VOY');
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('voice-panel')).toContainText(/Voice está|asistente de voz/i);
  await expect(page.getByTestId('auth-panel')).toContainText(/Cuenta opcional|sin iniciar sesión/i);
  await page.screenshot({ path: join(evidenceDir, `${testInfo.project.name}-journey.png`), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('legal, privacy, offline and PWA contracts remain available', async ({ page }, testInfo) => {
  await deterministicApis(page);
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Privacidad' })).toHaveAttribute('href', '/privacy');
  await expect(page.getByRole('link', { name: 'Términos' })).toHaveAttribute('href', '/terms');
  await expect(page.getByRole('link', { name: 'Fuentes' })).toHaveAttribute('href', '/sources');
  await expect(page.getByRole('link', { name: 'Contacto' })).toHaveAttribute('href', '/contact');
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