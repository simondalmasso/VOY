import { expect, test, type Page, type TestInfo } from '@playwright/test';

const tilePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const mobileBusProjects = new Set(['mobile-360x800', 'mobile-360x780', 'mobile-390x844', 'mobile-412x915']);

async function deterministicTripApis(page: Page): Promise<{ routeRequests: string[] }> {
  const routeRequests: string[] = [];
  await page.route('**/api/geocode?*', async route => {
    const q = new URL(route.request().url()).searchParams.get('q') || '';
    const results = q.includes('Origen BUS')
      ? [{ id: 'issue36:bus-origin', name: 'Plaza 25 de Mayo', display_name: 'Plaza 25 de Mayo, Santa Fe', address: 'Santa Fe', lat: -31.633, lon: -60.706 }]
      : [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results }) });
  });
  await page.route('**/api/route', route => {
    routeRequests.push(route.request().postData() || '');
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, source: 'osrm_route', distance_km: 3.2, duration_min: 10.5, geometry: [[-60.706, -31.633], [-60.7, -31.64], [-60.700503, -31.643533]] })
    });
  });
  await page.route('https://*.basemaps.cartocdn.com/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: tilePng }));
  return { routeRequests };
}

async function planTrip(page: Page): Promise<void> {
  await page.getByTestId('origin-input').fill('Origen BUS');
  await page.getByTestId('origin-apply').click();
  await expect(page.getByTestId('origin-control')).toContainText('Plaza 25 de Mayo');
  await page.getByTestId('destination-input').fill('Terminal');
  const destination = page.getByTestId('destination-result-verified').first();
  await expect(destination).toContainText('Terminal de Ómnibus');
  await destination.click();
  await expect(page.getByTestId('trip-sheet')).toBeVisible();
}

async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  const toggle = page.getByTestId('theme-toggle');
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (await page.locator('html').getAttribute('data-theme') === theme) return;
    await toggle.click();
  }
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
}

async function assertBusUnavailableLayout(page: Page): Promise<void> {
  const provider = page.getByTestId('provider-bus');
  await expect(provider).toBeVisible();
  await expect(provider).toContainText('Colectivo');
  await expect(provider).toContainText('Sin recorridos, paradas, frecuencias ni espera verificables. VOY no calcula ni sugiere una línea.');
  await expect(provider).toContainText('Sin recomendación disponible');
  await expect(provider).toHaveAttribute('data-price-kind', 'unavailable');
  await expect(provider).toHaveClass(/disabled/);
  expect(await provider.evaluate(node => node.tagName)).toBe('ARTICLE');
  expect(await provider.locator('button').count()).toBe(0);
  expect(await provider.locator('.provider-meta > strong').count()).toBe(0);

  const metrics = await provider.evaluate(node => {
    const providerNode = node as HTMLElement;
    const main = providerNode.querySelector('.provider-main') as HTMLElement | null;
    const name = providerNode.querySelector('.provider-main > strong') as HTMLElement | null;
    const detail = providerNode.querySelector('.provider-main > small') as HTMLElement | null;
    const state = providerNode.querySelector('.provider-unavailable-state') as HTMLElement | null;
    if (!main || !name || !detail || !state) throw new Error('bus_unavailable_subject_missing');
    const pr = providerNode.getBoundingClientRect();
    const mr = main.getBoundingClientRect();
    const nr = name.getBoundingClientRect();
    const dr = detail.getBoundingClientRect();
    const sr = state.getBoundingClientRect();
    const nameStyle = getComputedStyle(name);
    const detailStyle = getComputedStyle(detail);
    const stateStyle = getComputedStyle(state);
    const lineCount = (element: HTMLElement, style: CSSStyleDeclaration) => {
      const lineHeight = parseFloat(style.lineHeight);
      return Number.isFinite(lineHeight) && lineHeight > 0 ? element.getBoundingClientRect().height / lineHeight : 99;
    };
    return {
      viewportWidth: document.documentElement.clientWidth,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      providerWidth: pr.width,
      providerLeft: pr.left,
      providerRight: pr.right,
      providerOverflow: providerNode.scrollWidth - providerNode.clientWidth,
      mainWidth: mr.width,
      mainOverflow: main.scrollWidth - main.clientWidth,
      nameWidth: nr.width,
      detailWidth: dr.width,
      stateWidth: sr.width,
      nameLines: lineCount(name, nameStyle),
      detailLines: lineCount(detail, detailStyle),
      stateLines: lineCount(state, stateStyle),
      nameFont: parseFloat(nameStyle.fontSize),
      stateFont: parseFloat(stateStyle.fontSize),
      stateWordBreak: stateStyle.wordBreak,
      stateWhiteSpace: stateStyle.whiteSpace
    };
  });

  expect(metrics.pageOverflow).toBeLessThanOrEqual(1);
  expect(metrics.providerOverflow).toBeLessThanOrEqual(1);
  expect(metrics.mainOverflow).toBeLessThanOrEqual(1);
  expect(metrics.providerLeft).toBeGreaterThanOrEqual(-1);
  expect(metrics.providerRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.mainWidth).toBeGreaterThanOrEqual(metrics.providerWidth * 0.9);
  expect(metrics.nameWidth).toBeGreaterThanOrEqual(metrics.providerWidth * 0.75);
  expect(metrics.detailWidth).toBeGreaterThanOrEqual(metrics.providerWidth * 0.75);
  expect(metrics.stateWidth).toBeGreaterThanOrEqual(metrics.providerWidth * 0.75);
  expect(metrics.nameLines).toBeLessThanOrEqual(1.5);
  expect(metrics.detailLines).toBeLessThanOrEqual(4.5);
  expect(metrics.stateLines).toBeLessThanOrEqual(2.5);
  expect(metrics.stateFont).toBeLessThan(metrics.nameFont);
  expect(metrics.stateWordBreak).toBe('normal');
  expect(metrics.stateWhiteSpace).toBe('normal');
}

test('Issue36 BUS unavailable state stays readable and subordinate on narrow mobile in light and dark', async ({ page }, testInfo: TestInfo) => {
  test.skip(!mobileBusProjects.has(testInfo.project.name), 'targeted BUS unavailable mobile gate');
  const { routeRequests } = await deterministicTripApis(page);
  await page.goto('/');
  await planTrip(page);
  const beforeBus = routeRequests.length;
  await page.locator('[data-mode="bus"]').click();
  await expect(page.getByTestId('provider-bus')).toBeVisible();
  expect(routeRequests.length).toBe(beforeBus);
  await expect(page.getByTestId('trip-sheet')).not.toContainText(/(?:Línea|Lin\.)\s*\d/i);

  await setTheme(page, 'light');
  await assertBusUnavailableLayout(page);
  await setTheme(page, 'dark');
  await assertBusUnavailableLayout(page);
});
