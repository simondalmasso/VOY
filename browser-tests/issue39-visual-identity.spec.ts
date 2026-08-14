import { expect, test, type Page } from '@playwright/test';

const tilePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');

async function deterministicApis(page: Page): Promise<void> {
  await page.route('**/api/geocode?*', async route => {
    const q = new URL(route.request().url()).searchParams.get('q') || '';
    const results = q.includes('Origen visual') ? [{ id: 'visual:origin', name: 'Plaza 25 de Mayo', display_name: 'Plaza 25 de Mayo, Santa Fe', address: 'Santa Fe', lat: -31.633, lon: -60.706 }] : [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results }) });
  });
  await page.route('**/api/route', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, source: 'osrm_route', distance_km: 3.2, duration_min: 10.5, geometry: [[-60.706,-31.633],[-60.7,-31.64],[-60.700503,-31.643533]] }) }));
  await page.route('https://*.basemaps.cartocdn.com/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: tilePng }));
}

async function planTrip(page: Page): Promise<void> {
  await page.getByTestId('origin-manual-trigger').click();
  await page.getByTestId('origin-input').fill('Origen visual');
  await page.getByTestId('origin-input').press('Enter');
  await page.getByTestId('destination-input').fill('Terminal');
  await page.getByTestId('destination-result-verified').first().click();
  await expect(page.getByTestId('trip-sheet')).toBeVisible();
}

test('VOY exposes a structural wayfinding identity instead of pill/card-only chrome', async ({ page }) => {
  await deterministicApis(page);
  await page.goto('/');

  const shell = page.getByTestId('app-shell');
  await expect(shell).toHaveAttribute('data-visual-system', 'voy-wayfinding-v1');
  await expect(page.locator('.brand-route')).toBeVisible();

  const signature = await page.evaluate(() => {
    const builder = getComputedStyle(document.querySelector('.journey-builder')!);
    const map = getComputedStyle(document.querySelector('.map-shell')!);
    const root = getComputedStyle(document.documentElement);
    return {
      builderBorderLeft: parseFloat(builder.borderLeftWidth),
      builderRadius: builder.borderRadius,
      mapRadius: map.borderRadius,
      route: root.getPropertyValue('--voy-route').trim(),
      wayfinding: root.getPropertyValue('--voy-wayfinding').trim()
    };
  });
  expect(signature.builderBorderLeft).toBeGreaterThanOrEqual(3);
  expect(signature.builderRadius).not.toBe('999px');
  expect(signature.mapRadius).not.toBe('999px');
  expect(signature.route).not.toBe('');
  expect(signature.wayfinding).not.toBe('');

  await planTrip(page);
  const sheet = page.getByTestId('trip-sheet');
  const sheetSignature = await sheet.evaluate(node => {
    const style = getComputedStyle(node);
    return { clipPath: style.clipPath, borderLeftWidth: parseFloat(style.borderLeftWidth) };
  });
  expect(sheetSignature.clipPath).not.toBe('none');
  expect(sheetSignature.borderLeftWidth).toBeGreaterThanOrEqual(3);
});

test('VOY identity preserves initial origin disclosure, touch geometry and page reflow', async ({ page }) => {
  await deterministicApis(page);
  await page.goto('/');

  await expect(page.getByTestId('origin-input')).toHaveCount(0);
  await expect(page.getByTestId('origin-manual-trigger')).toBeVisible();
  await expect(page.getByTestId('gps-button')).toBeVisible();

  const touchTargets = await page.locator('button:visible').evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect();
    return { width: rect.width, height: rect.height, label: node.getAttribute('aria-label') || node.textContent || '' };
  }));
  if ((page.viewportSize()?.width || 0) < 760) {
    for (const target of touchTargets) {
      expect(target.height, target.label).toBeGreaterThanOrEqual(44);
    }
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

  await page.getByTestId('theme-toggle').click();
  await page.getByTestId('theme-toggle').click();
  const darkOrSystemInk = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--voy-ink').trim());
  expect(darkOrSystemInk).not.toBe('');
});
