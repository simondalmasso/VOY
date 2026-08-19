import { expect, test, type Page, type TestInfo } from '@playwright/test';

const tilePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');

async function deterministicApis(page: Page): Promise<void> {
  await page.route('**/api/geocode?*', async route => {
    const q = new URL(route.request().url()).searchParams.get('q') || '';
    const results = q.includes('Origen map-first') ? [{ id: 'map-first:origin', name: 'Plaza 25 de Mayo', display_name: 'Plaza 25 de Mayo, Santa Fe', address: 'Santa Fe', lat: -31.633, lon: -60.706 }] : [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results }) });
  });
  await page.route('**/api/route', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, source: 'osrm_route', distance_km: 3.2, duration_min: 10.5, geometry: [[-60.706,-31.633],[-60.7,-31.64],[-60.700503,-31.643533]] }) }));
  await page.route('https://*.basemaps.cartocdn.com/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: tilePng }));
}

async function planTrip(page: Page): Promise<void> {
  await page.getByTestId('origin-manual-trigger').click();
  const originInput = page.getByTestId('origin-input');
  await expect(originInput).toBeFocused();
  await originInput.fill('Origen map-first');
  await originInput.press('Enter');
  await expect(page.getByTestId('origin-control')).toContainText('Plaza 25 de Mayo');
  await expect(page.getByTestId('origin-apply')).toHaveCount(0);
  await page.getByTestId('destination-input').fill('Terminal');
  const destination = page.getByTestId('destination-result-verified').first();
  await expect(destination).toContainText('Terminal de Ómnibus');
  await destination.click();
  await expect(page.getByTestId('trip-sheet')).toBeVisible();
  await expect(page.getByTestId('trip-sheet')).toHaveAttribute('data-snap', 'peek');
}

async function cameraFitCount(page: Page): Promise<number> {
  return Number(await page.getByTestId('map-shell').getAttribute('data-camera-fit-count') || '0');
}

async function stableCameraFitCount(page: Page): Promise<number> {
  let previous = -1;
  let stableSamples = 0;
  for (let sample = 0; sample < 12; sample += 1) {
    await page.waitForTimeout(200);
    const current = await cameraFitCount(page);
    if (current === previous) stableSamples += 1;
    else stableSamples = 0;
    previous = current;
    if (current > 0 && stableSamples >= 3) return current;
  }
  throw new Error(`camera_fit_never_stabilized:${previous}`);
}

test('MAP-FIRST initial mobile viewport keeps at least 55% unobscured usable map area', async ({ page }, testInfo: TestInfo) => {
  test.skip(!['mobile-360x800','mobile-390x844'].includes(testInfo.project.name), 'critical mobile occlusion gate');
  await deterministicApis(page);
  await page.goto('/');
  await expect(page.getByTestId('map-shell')).toBeVisible();
  await expect(page.getByTestId('gps-button')).toBeVisible();
  await expect(page.getByTestId('origin-manual-trigger')).toBeVisible();
  await expect(page.getByTestId('origin-input')).toHaveCount(0);
  await expect(page.getByTestId('origin-apply')).toHaveCount(0);
  const metric = await page.evaluate(() => {
    const viewport = { width: innerWidth, height: innerHeight };
    const map = document.querySelector('[data-testid="map-shell"]') as HTMLElement | null;
    if (!map) throw new Error('map_missing');
    const intersection = (rect: DOMRect) => {
      const left = Math.max(0, rect.left); const right = Math.min(innerWidth, rect.right);
      const top = Math.max(0, rect.top); const bottom = Math.min(innerHeight, rect.bottom);
      return Math.max(0, right-left) * Math.max(0, bottom-top);
    };
    const mapArea = intersection(map.getBoundingClientRect());
    const selectors = ['[data-testid="journey-builder"]','.message','.assistant-trigger','[data-testid="decision-empty"]'];
    let occluded = 0;
    for (const selector of selectors) {
      const node = document.querySelector(selector) as HTMLElement | null;
      if (!node || node.offsetParent === null) continue;
      const style = getComputedStyle(node);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      const r = node.getBoundingClientRect();
      const mapRect = map.getBoundingClientRect();
      const left = Math.max(0, r.left, mapRect.left); const right = Math.min(innerWidth, r.right, mapRect.right);
      const top = Math.max(0, r.top, mapRect.top); const bottom = Math.min(innerHeight, r.bottom, mapRect.bottom);
      occluded += Math.max(0,right-left)*Math.max(0,bottom-top);
    }
    const viewportArea = viewport.width * viewport.height;
    return { ratio: Math.max(0,mapArea-occluded)/viewportArea, mapArea, occluded, viewportArea, overflow: document.documentElement.scrollWidth-document.documentElement.clientWidth };
  });
  expect(metric.overflow).toBeLessThanOrEqual(1);
  expect(metric.ratio, JSON.stringify(metric)).toBeGreaterThanOrEqual(.55);
});

test('search owns one transient layer, keeps map interactive, and Escape restores focus hierarchy', async ({ page }) => {
  await deterministicApis(page);
  await page.goto('/');
  const input = page.getByTestId('destination-input');
  await input.fill('Terminal');
  await expect(page.getByTestId('destination-results')).toBeVisible();
  await expect(page.getByTestId('map-first-layout')).toHaveAttribute('data-interaction-state', 'SEARCH_RESULTS');
  await expect(page.getByTestId('map-shell')).toHaveAttribute('data-map-interaction', 'enabled');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('destination-results')).toHaveCount(0);
  await expect(page.getByTestId('map-first-layout')).not.toHaveAttribute('data-interaction-state', 'SEARCH_RESULTS');
});

test('manual origin is hidden initially, opens explicitly, and Escape/Back restore trigger focus', async ({ page }) => {
  await deterministicApis(page);
  await page.goto('/');
  const trigger = page.getByTestId('origin-manual-trigger');
  await expect(page.getByTestId('origin-input')).toHaveCount(0);
  await expect(page.getByTestId('origin-apply')).toHaveCount(0);
  await expect(trigger).toBeVisible();

  await trigger.click();
  await expect(page.getByTestId('origin-input')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('origin-input')).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(page.getByTestId('origin-input')).toBeFocused();
  await page.evaluate(() => history.back());
  await expect(page.getByTestId('origin-input')).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  const input = page.getByTestId('origin-input');
  await input.fill('Origen map-first');
  await input.press('Enter');
  await expect(page.getByTestId('origin-control')).toContainText('Plaza 25 de Mayo');
  await expect(page.getByTestId('origin-input')).toHaveCount(0);
  await expect(page.getByTestId('origin-apply')).toHaveCount(0);
});

test('location is never requested on load and permission denial progressively exposes manual origin', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __voyGpsCalls: number }).__voyGpsCalls = 0;
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
      getCurrentPosition: (_success: PositionCallback, error?: PositionErrorCallback | null) => {
        (window as unknown as { __voyGpsCalls: number }).__voyGpsCalls += 1;
        error?.({ code: 1, message: 'denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
      }
    }});
  });
  await deterministicApis(page);
  await page.goto('/');
  expect(await page.evaluate(() => (window as unknown as { __voyGpsCalls: number }).__voyGpsCalls)).toBe(0);
  await expect(page.getByTestId('origin-input')).toHaveCount(0);
  await expect(page.getByTestId('origin-apply')).toHaveCount(0);
  await page.getByTestId('gps-button').click();
  expect(await page.evaluate(() => (window as unknown as { __voyGpsCalls: number }).__voyGpsCalls)).toBe(1);
  await expect(page.getByTestId('origin-control')).toHaveAttribute('data-location-state', 'denied');
  await expect(page.getByTestId('origin-control')).toContainText('Podés ingresar el origen manualmente');
  await expect(page.getByTestId('origin-input')).toBeFocused();
  await expect(page.getByTestId('origin-apply')).toHaveCount(0);
});

test('decision sheet snaps progressively and map camera does not recenter during drag', async ({ page }) => {
  await deterministicApis(page);
  await page.goto('/');
  await planTrip(page);
  const sheet = page.getByTestId('trip-sheet');
  const handle = page.getByTestId('sheet-handle');
  const map = page.getByTestId('map-shell');
  await expect(map).toHaveAttribute('data-map-interaction','enabled');
  await handle.click();
  await expect(sheet).toHaveAttribute('data-snap','half');
  const beforeDrag = await stableCameraFitCount(page);
  const box = await handle.boundingBox();
  if (!box) throw new Error('sheet_handle_missing');
  await page.mouse.move(box.x + box.width/2, box.y + box.height/2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width/2, box.y - 24, { steps: 4 });
  await page.waitForTimeout(100);
  expect(await cameraFitCount(page)).toBe(beforeDrag);
  await page.mouse.move(box.x + box.width/2, box.y - 60, { steps: 4 });
  await page.mouse.up();
  await expect(sheet).toHaveAttribute('data-snap','expanded');
  await page.waitForTimeout(280);
  expect(await cameraFitCount(page)).toBeLessThanOrEqual(beforeDrag + 1);
});

test('browser Back collapses transient sheet states before navigation', async ({ page }) => {
  await deterministicApis(page);
  await page.goto('/');
  await planTrip(page);
  const sheet = page.getByTestId('trip-sheet');
  const handle = page.getByTestId('sheet-handle');
  await handle.click();
  await handle.click();
  await expect(sheet).toHaveAttribute('data-snap','expanded');
  await page.evaluate(() => history.back());
  await expect(sheet).toHaveAttribute('data-snap','half');
  await page.evaluate(() => history.back());
  await expect(sheet).toHaveAttribute('data-snap','peek');
  await page.getByTestId('origin-edit').click();
  await expect(page.getByTestId('origin-input')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('origin-input')).toHaveCount(0);
  await expect(page.getByTestId('origin-edit')).toBeFocused();
});

test('search focus on critical mobile sizes keeps input usable and removes sheet competition', async ({ page }, testInfo: TestInfo) => {
  test.skip(!['mobile-360x800','mobile-390x844'].includes(testInfo.project.name), 'mobile keyboard contract');
  await deterministicApis(page);
  await page.goto('/');
  await planTrip(page);
  const input = page.getByTestId('destination-input');
  await input.focus();
  await expect(page.getByTestId('map-first-layout')).toHaveAttribute('data-interaction-state','SEARCH_FOCUSED');
  await expect(input).toBeVisible();
  await expect(page.getByTestId('trip-sheet')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('opening an external provider does not reset camera and disables map only for confirmation', async ({ page }) => {
  await deterministicApis(page);
  await page.goto('/');
  await planTrip(page);
  await page.getByTestId('sheet-handle').click();
  await expect(page.getByTestId('trip-sheet')).toHaveAttribute('data-snap','half');
  const before = await stableCameraFitCount(page);
  await page.getByTestId('provider-uber').click();
  await expect(page.getByTestId('external-confirmation')).toBeVisible();
  await expect(page.getByTestId('map-shell')).toHaveAttribute('data-map-interaction','disabled');
  await page.waitForTimeout(400);
  expect(await cameraFitCount(page)).toBe(before);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('external-confirmation')).toHaveCount(0);
  await expect(page.getByTestId('map-shell')).toHaveAttribute('data-map-interaction','enabled');
});
