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

async function openDecisionHalf(page: Page): Promise<void> {
  const sheet = page.getByTestId('trip-sheet');
  await expect(sheet).toHaveAttribute('data-snap', 'peek');
  await page.getByTestId('sheet-handle').click();
  await expect(sheet).toHaveAttribute('data-snap', 'half');
}

test('Issue36 composition follows the audited map-first amendment on mobile and desktop', async ({ page }, testInfo: TestInfo) => {
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
  expect(metrics.searchLabelSize).toBeGreaterThanOrEqual(22);
  if (testInfo.project.name.startsWith('desktop')) {
    expect(metrics.shell.width).toBeGreaterThan(1000);
    expect(metrics.planner.width).toBeGreaterThanOrEqual(350);
    expect(metrics.planner.width).toBeLessThanOrEqual(430);
    expect(metrics.map.width).toBeGreaterThan(metrics.planner.width);
    expect(metrics.map.height).toBeGreaterThanOrEqual(560);
    expect(metrics.map.left).toBeGreaterThan(metrics.planner.right);
    expect(metrics.decision.left).toBeGreaterThanOrEqual(metrics.map.left);
    expect(metrics.decision.right).toBeLessThanOrEqual(metrics.map.right + 1);
  } else {
    expect(metrics.map.top).toBeLessThanOrEqual(metrics.planner.top);
    expect(metrics.map.bottom).toBeGreaterThanOrEqual(metrics.decision.bottom - 1);
    expect(metrics.map.height).toBeGreaterThanOrEqual(620);
    expect(metrics.planner.left).toBeGreaterThanOrEqual(metrics.map.left);
    expect(metrics.planner.right).toBeLessThanOrEqual(metrics.map.right);
  }
});

test('Issue36 mandatory design-system token contract is complete', async ({ page }) => {
  await deterministicTripApis(page);
  await page.goto('/');
  const required = [
    '--voy-canvas', '--voy-font-sans', '--voy-weight-label', '--voy-type-body', '--voy-leading-copy', '--voy-tracking-label',
    '--voy-space-4', '--voy-radius-md', '--voy-border-default', '--voy-shadow', '--voy-motion-fast', '--voy-ease-standard',
    '--voy-z-sheet', '--voy-content-max', '--voy-control-m'
  ];
  const values = await page.evaluate(names => {
    const style = getComputedStyle(document.documentElement);
    return Object.fromEntries(names.map(name => [name, style.getPropertyValue(name).trim()]));
  }, required);
  for (const name of required) expect(values[name], `${name} missing`).not.toBe('');
  expect(values['--voy-font-sans']).toContain('system-ui');
  expect(values['--voy-border-default']).toContain('solid');
  const motion = values['--voy-motion-fast'] ?? '';
  const motionMs = motion.endsWith('ms') ? parseFloat(motion) : motion.endsWith('s') ? parseFloat(motion) * 1000 : Number.NaN;
  expect(motionMs).toBeCloseTo(160, 3);
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
  await openDecisionHalf(page);
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
  await openDecisionHalf(page);
  await expect(page.getByTestId('provider-bus')).toBeVisible();
  await expect(page.getByTestId('provider-bus')).toContainText('no calcula ni sugiere');
  expect(routeRequests.length).toBe(beforeBus);
  await expect(page.getByTestId('trip-sheet')).not.toContainText(/(?:Línea|Lin\.)\s*\d/i);
});

test('Issue36 narrow mobile mode rail signals overflow and reveals Colectivo cleanly', async ({ page }, testInfo: TestInfo) => {
  test.skip(!['mobile-360x800', 'mobile-360x780', 'mobile-390x844'].includes(testInfo.project.name), 'narrow-mobile overflow gate');
  await deterministicTripApis(page);
  await page.goto('/');
  await planTrip(page);
  const selector = page.getByTestId('mode-selector');
  const cue = page.getByTestId('mode-overflow-cue');
  await expect(cue).toBeVisible();
  const initial = await selector.evaluate(element => ({ scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, overflowX: getComputedStyle(element).overflowX }));
  expect(initial.scrollWidth).toBeGreaterThan(initial.clientWidth);
  expect(initial.overflowX).toBe('auto');
  await selector.evaluate(element => { element.scrollLeft = element.scrollWidth; element.dispatchEvent(new Event('scroll')); });
  await expect.poll(() => selector.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
  await expect(cue).toHaveCount(0);
  const geometry = await page.evaluate(() => {
    const rail = document.querySelector('[data-testid="mode-selector"]');
    const bus = document.querySelector('[data-mode="bus"]');
    if (!(rail instanceof HTMLElement) || !(bus instanceof HTMLElement)) throw new Error('mode_overflow_subject_missing');
    const rr = rail.getBoundingClientRect(); const br = bus.getBoundingClientRect();
    return { railLeft: rr.left, railRight: rr.right, busLeft: br.left, busRight: br.right };
  });
  expect(geometry.busLeft).toBeGreaterThanOrEqual(geometry.railLeft - 1);
  expect(geometry.busRight).toBeLessThanOrEqual(geometry.railRight + 1);
  await expect(page.locator('[data-mode="bus"]')).toHaveText('Colectivo');
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
