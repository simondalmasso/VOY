import { expect, test, type Page, type TestInfo } from '@playwright/test';

const tilePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');

async function deterministicApis(page: Page): Promise<void> {
  await page.route('**/api/geocode?*', async route => {
    const q = new URL(route.request().url()).searchParams.get('q') || '';
    const results = q.includes('Origen issue39') ? [{ id: 'issue39:origin', name: 'Plaza 25 de Mayo', display_name: 'Plaza 25 de Mayo, Santa Fe', address: 'Santa Fe', lat: -31.633, lon: -60.706 }] : [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results }) });
  });
  await page.route('**/api/route', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, source: 'osrm_route', distance_km: 3.2, duration_min: 10.5, geometry: [[-60.706,-31.633],[-60.7,-31.64],[-60.700503,-31.643533]] }) }));
  await page.route('https://*.basemaps.cartocdn.com/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: tilePng }));
}

async function planTrip(page: Page): Promise<void> {
  await page.getByTestId('origin-manual-trigger').click();
  const origin = page.getByTestId('origin-input');
  await expect(origin).toBeFocused();
  await origin.fill('Origen issue39');
  await origin.press('Enter');
  await page.getByTestId('destination-input').fill('Terminal');
  await page.getByTestId('destination-result-verified').first().click();
  await expect(page.getByTestId('trip-sheet')).toBeVisible();
}

test('offline state is explicit and territorial truth is not silently claimed as current', async ({ page, context }) => {
  await deterministicApis(page);
  await page.goto('/');
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await expect(page.getByTestId('offline-banner')).toBeVisible();
  await expect(page.getByTestId('offline-banner')).toContainText('búsqueda y rutas necesitan internet');
  const result = await page.evaluate(async () => {
    try {
      const response = await fetch(`/cities/santa-fe/fares.json?offline=${Date.now()}`, { cache: 'no-store' });
      return { resolved: true, status: response.status };
    } catch {
      return { resolved: false, status: 0 };
    }
  });
  expect(result.resolved).toBe(false);
});

test('reduced-motion preference removes material sheet animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await deterministicApis(page);
  await page.goto('/');
  await planTrip(page);
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  const durations = await page.getByTestId('trip-sheet').evaluate(node => {
    const style = getComputedStyle(node);
    return { transition: style.transitionDuration, animation: style.animationDuration };
  });
  const milliseconds = (value: string) => value.split(',').map(part => part.trim()).reduce((max, part) => {
    const n = parseFloat(part) || 0;
    return Math.max(max, part.endsWith('ms') ? n : n * 1000);
  }, 0);
  expect(milliseconds(durations.transition), durations.transition).toBeLessThanOrEqual(1);
  expect(milliseconds(durations.animation), durations.animation).toBeLessThanOrEqual(1);
});

test('keyboard-sized mobile viewport keeps destination input usable without sheet competition', async ({ page }, testInfo: TestInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile-'), 'mobile keyboard gate');
  await deterministicApis(page);
  await page.goto('/');
  await planTrip(page);
  const initial = page.viewportSize();
  if (!initial) throw new Error('viewport_missing');
  const input = page.getByTestId('destination-input');
  await input.focus();
  await page.setViewportSize({ width: initial.width, height: Math.min(500, initial.height) });
  await expect(input).toBeVisible();
  await expect(page.getByTestId('trip-sheet')).toBeHidden();
  const geometry = await input.boundingBox();
  if (!geometry) throw new Error('destination_input_geometry_missing');
  expect(geometry.y).toBeGreaterThanOrEqual(0);
  expect(geometry.y + geometry.height).toBeLessThanOrEqual(Math.min(500, initial.height));
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
