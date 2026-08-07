import { expect, test, type Page, type TestInfo } from '@playwright/test';

const tilePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');

async function deterministicTripApis(page: Page): Promise<{ routeRequests: string[] }> {
  const routeRequests: string[] = [];
  await page.route('**/api/geocode?*', async route => {
    const q = new URL(route.request().url()).searchParams.get('q') || '';
    const results = q.includes('Origen diseño') ? [{ id: 'issue36:origin', name: 'Plaza 25 de Mayo', display_name: 'Plaza 25 de Mayo, Santa Fe', address: 'Santa Fe', lat: -31.633, lon: -60.706 }] : [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results }) });
  });
  await page.route('**/api/route', route => {
    routeRequests.push(route.request().postData() || '');
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, source: 'osrm_route', distance_km: 3.2, duration_min: 10.5, geometry: [[-60.706,-31.633],[-60.7,-31.64],[-60.700503,-31.643533]] }) });
  });
  await page.route('https://*.basemaps.cartocdn.com/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: tilePng }));
  return { routeRequests };
}

async function planTrip(page: Page): Promise<void> {
  await page.getByTestId('origin-input').fill('Origen diseño');
  await page.getByTestId('origin-apply').click();
  await expect(page.getByTestId('origin-control')).toContainText('Plaza 25 de Mayo');
  await page.getByTestId('destination-input').fill('Terminal');
  const destination = page.getByTestId('destination-result-verified').first();
  await expect(destination).toContainText('Terminal de Ómnibus');
  await destination.click();
  await expect(page.getByTestId('trip-sheet')).toBeVisible();
}

test('Issue36 composition is authored for mobile and desktop instead of scaled phone UI', async ({ page }, testInfo: TestInfo) => {
  await deterministicTripApis(page);
  await page.goto('/');
  const metrics = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) throw new Error(`missing:${selector}`);
      const r = element.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, width: r.width, height: r.height, left: r.left, right: r.right };
    };
    return {
      shell: rect('[data-testid="app-shell"]'),
      planner: rect('.planner'),
      map: rect('[data-testid="map-shell"]'),
      decision: rect('[data-testid="decision-empty"]'),
      searchLabelSize: parseFloat(getComputedStyle(document.querySelector('.search label') as HTMLElement).fontSize),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });
  expect(metrics.overflow).toBeLessThanOrEqual(1);
  expect(metrics.searchLabelSize).toBeGreaterThanOrEqual(28);
  if (testInfo.project.name.startsWith('desktop')) {
    expect(metrics.shell.width).toBeGreaterThan(1000);
    expect(metrics.planner.width).toBeGreaterThanOrEqual(360);
    expect(metrics.planner.width).toBeLessThanOrEqual(430);
    expect(metrics.map.width).toBeGreaterThan(metrics.planner.width);
    expect(metrics.map.height).toBeGreaterThanOrEqual(560);
    expect(Math.abs(metrics.planner.left - metrics.decision.left)).toBeLessThanOrEqual(2);
    expect(metrics.map.left).toBeGreaterThan(metrics.planner.right);
  } else {
    expect(metrics.planner.top).toBeLessThan(metrics.map.top);
    expect(metrics.map.top).toBeLessThan(metrics.decision.top);
    expect(metrics.map.height).toBeGreaterThanOrEqual(180);
  }
});

test('Issue36 theme choice is explicit, persistent and preserves the no-account path', async ({ page }) => {
  await deterministicTripApis(page);
  await page.goto('/');
  const toggle = page.getByTestId('theme-toggle');
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const signal = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--voy-signal').trim());
  expect(signal.toUpperCase()).toBe('#FF6847');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByTestId('destination-input')).toBeVisible();
});

test('Issue36 decision hierarchy makes verified facts dominant without changing truth boundaries', async ({ page }) => {
  const { routeRequests } = await deterministicTripApis(page);
  await page.goto('/');
  await planTrip(page);
  const provenance = page.getByTestId('destination-provenance');
  await expect(provenance).toContainText('Verificado');
  await expect(provenance).toContainText('Municipalidad de Santa Fe');
  await expect(provenance).toContainText('2026-08-05');
  await expect(page.getByTestId('trip-sheet')).not.toContainText('Destino autoritativo');
  const taxiPrice = page.getByTestId('provider-taxi').locator('.provider-meta > strong');
  await expect(taxiPrice).toBeVisible();
  expect(parseFloat(await taxiPrice.evaluate(node => getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(30);
  for (const id of ['uber','didi']) {
    const provider = page.getByTestId(`provider-${id}`);
    await expect(provider).not.toContainText(/\$|\d+(?:[.,]\d+)?\s*min/i);
    expect(await provider.getAttribute('data-price-kind')).not.toBe('regulated_estimate');
  }
  const beforeBus = routeRequests.length;
  await page.locator('[data-mode="bus"]').click();
  await expect(page.getByTestId('provider-bus')).toContainText('no calcula ni sugiere');
  expect(routeRequests.length).toBe(beforeBus);
  await expect(page.getByTestId('trip-sheet')).not.toContainText(/(?:Línea|Lin\.)\s*\d/i);
});

test('Issue36 controls keep minimum 44px targets and 200% zoom without horizontal overflow', async ({ page }) => {
  await deterministicTripApis(page);
  await page.goto('/');
  const small = await page.locator('button,input,a').evaluateAll(nodes => nodes
    .filter(node => (node as HTMLElement).offsetParent !== null)
    .map(node => ({ text: (node.textContent || '').trim(), width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height }))
    .filter(item => item.height < 43.5 || item.width < 43.5));
  expect(small, JSON.stringify(small)).toEqual([]);
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
