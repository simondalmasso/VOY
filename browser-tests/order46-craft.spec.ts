import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { santaFeOrigin } from './helpers/territory';

const tilePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');

function cssTimeMs(value: string): number {
  const normalized = value.trim().toLowerCase();
  if (normalized.endsWith('ms')) return Number.parseFloat(normalized);
  if (normalized.endsWith('s')) return Number.parseFloat(normalized) * 1000;
  return Number.NaN;
}

async function deterministicApis(page: Page): Promise<void> {
  await page.route('**/api/geocode?*', async route => {
    const q = new URL(route.request().url()).searchParams.get('q') || '';
    const results = q.includes('Origen craft') ? [santaFeOrigin('order46:craft-origin')] : [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results }) });
  });
  await page.route('**/api/route', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, source: 'osrm_route', distance_km: 3.2, duration_min: 10.5, geometry: [[-60.706,-31.633],[-60.7,-31.64],[-60.700503,-31.643533]] })
  }));
  await page.route('https://*.basemaps.cartocdn.com/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: tilePng }));
}

async function planTrip(page: Page): Promise<void> {
  await page.getByTestId('origin-manual-trigger').click();
  const origin = page.getByTestId('origin-input');
  await origin.fill('Origen craft');
  await origin.press('Enter');
  await expect(page.getByTestId('origin-control')).toContainText('Plaza 25 de Mayo');
  await page.getByTestId('destination-input').fill('Terminal');
  await page.getByTestId('destination-result-verified').first().click();
  await expect(page.getByTestId('trip-sheet')).toHaveAttribute('data-snap', 'peek');
}

async function translateY(page: Page): Promise<number> {
  return page.getByTestId('trip-sheet').evaluate(element => {
    const transform = getComputedStyle(element).transform;
    if (!transform || transform === 'none') return 0;
    return new DOMMatrixReadOnly(transform).m42;
  });
}

test('ORDER-046 craft tokens, brand signal and media fallbacks are canonical', async ({ page }) => {
  await deterministicApis(page);
  await page.goto('/');
  const contract = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    const media: string[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules)) {
          if (rule instanceof CSSMediaRule) media.push(rule.conditionText.replace(/\s+/g, ''));
        }
      } catch {
        // All production styles are same-origin; ignore any browser-injected sheet.
      }
    }
    return {
      signal: style.getPropertyValue('--voy-signal').trim(),
      easeOut: style.getPropertyValue('--voy-ease-out').trim().replace(/\s+/g, ''),
      easeInOut: style.getPropertyValue('--voy-ease-in-out').trim().replace(/\s+/g, ''),
      easeDrawer: style.getPropertyValue('--voy-ease-drawer').trim().replace(/\s+/g, ''),
      press: style.getPropertyValue('--voy-motion-press').trim(),
      popover: style.getPropertyValue('--voy-motion-popover').trim(),
      modal: style.getPropertyValue('--voy-motion-modal').trim(),
      media,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });
  expect(contract.signal.toUpperCase()).toBe('#FFC533');
  expect(contract.easeOut).toBe('cubic-bezier(.23,1,.32,1)');
  expect(contract.easeInOut).toBe('cubic-bezier(.77,0,.175,1)');
  expect(contract.easeDrawer).toBe('cubic-bezier(.32,.72,0,1)');
  expect(cssTimeMs(contract.press)).toBeCloseTo(160, 3);
  expect(cssTimeMs(contract.popover)).toBeCloseTo(180, 3);
  expect(cssTimeMs(contract.modal)).toBeCloseTo(250, 3);
  expect(contract.media.some(value => value.includes('prefers-reduced-transparency:reduce'))).toBeTruthy();
  expect(contract.media.some(value => value.includes('prefers-contrast:more'))).toBeTruthy();
  expect(contract.media.some(value => value.includes('hover:hover') && value.includes('pointer:fine'))).toBeTruthy();
  expect(contract.overflow).toBeLessThanOrEqual(1);
});

test('ORDER-046 search popover and decision layers preserve spatial hierarchy', async ({ page }) => {
  await deterministicApis(page);
  await page.goto('/');
  const input = page.getByTestId('destination-input');
  await input.fill('Terminal');
  const results = page.getByTestId('destination-results');
  await expect(results).toBeVisible();
  await expect(results).toHaveAttribute('data-motion', 'origin-aware-popover');
  const origin = await results.evaluate(element => getComputedStyle(element).transformOrigin);
  expect(origin.split(' ')[1]).toBe('0px');
  await page.keyboard.press('Escape');

  await planTrip(page);
  const sheet = page.getByTestId('trip-sheet');
  const options = sheet.locator('.options');
  const methodology = sheet.locator('.methodology');
  const address = sheet.locator('.destination-address');
  await expect(sheet.getByTestId('destination-provenance')).toBeVisible();
  await expect(options).toBeHidden();
  await expect(methodology).toBeHidden();
  await expect(address).toBeHidden();

  await page.getByTestId('sheet-handle').click();
  await expect(sheet).toHaveAttribute('data-snap', 'half');
  await expect(options).toBeVisible();
  await expect(methodology).toBeHidden();
  await expect(address).toBeHidden();

  await page.getByTestId('sheet-handle').click();
  await expect(sheet).toHaveAttribute('data-snap', 'expanded');
  await expect(options).toBeVisible();
  await expect(methodology).toBeVisible();
  await expect(address).toBeVisible();
});

test('ORDER-046 sheet tracks 1:1, captures pointer, reverses and snaps by position', async ({ page }, testInfo: TestInfo) => {
  test.skip(!['mobile-390x844', 'desktop-1280x800'].includes(testInfo.project.name), 'physics browser gate runs on representative touch/desktop geometry');
  await deterministicApis(page);
  await page.goto('/');
  await planTrip(page);
  const sheet = page.getByTestId('trip-sheet');
  const handle = page.getByTestId('sheet-handle');
  await handle.click();
  await expect(sheet).toHaveAttribute('data-snap', 'half');
  await page.waitForTimeout(320);

  const box = await handle.boundingBox();
  if (!box) throw new Error('sheet_handle_missing');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const initialY = await translateY(page);
  await handle.evaluate(element => {
    (window as unknown as { __voyPointerCaptured?: boolean }).__voyPointerCaptured = false;
    element.addEventListener('gotpointercapture', () => {
      (window as unknown as { __voyPointerCaptured?: boolean }).__voyPointerCaptured = true;
    }, { once: true });
  });
  await page.mouse.move(x, y);
  await page.mouse.down();
  await expect(sheet).toHaveAttribute('data-motion-state', 'dragging');
  await expect.poll(() => page.evaluate(() => Boolean((window as unknown as { __voyPointerCaptured?: boolean }).__voyPointerCaptured))).toBeTruthy();
  await page.mouse.move(x, y - 30);
  await page.waitForTimeout(20);
  const movedY = await translateY(page);
  expect(movedY - initialY).toBeCloseTo(-30, 0);

  await page.mouse.move(x, y - 12);
  await page.waitForTimeout(20);
  const reversedY = await translateY(page);
  expect(reversedY - initialY).toBeCloseTo(-12, 0);
  await page.waitForTimeout(150);
  await page.mouse.up();
  await expect(sheet).toHaveAttribute('data-snap', 'half');

  const settleHandle = page.getByTestId('sheet-handle');
  await page.waitForTimeout(320);
  const settleBox = await settleHandle.boundingBox();
  if (!settleBox) throw new Error('sheet_handle_missing_for_position_snap');
  const sx = settleBox.x + settleBox.width / 2;
  const sy = settleBox.y + settleBox.height / 2;
  const halfY = await translateY(page);
  const lift = Math.max(120, halfY * 0.8);
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx, sy - lift, { steps: 5 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await expect(sheet).toHaveAttribute('data-snap', 'expanded');
});

test('ORDER-046 reduced motion removes sheet travel animation but retains short state feedback', async ({ page }, testInfo: TestInfo) => {
  test.skip(testInfo.project.name !== 'mobile-390x844', 'single reduced-motion contract viewport');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await deterministicApis(page);
  await page.goto('/');
  await planTrip(page);
  const sheet = page.getByTestId('trip-sheet');
  await page.getByTestId('sheet-handle').click();
  await expect(sheet).toHaveAttribute('data-snap', 'half');
  const transition = await sheet.evaluate(element => {
    const style = getComputedStyle(element);
    return { property: style.transitionProperty, duration: style.transitionDuration };
  });
  expect(transition.property).toContain('opacity');
  expect(transition.property).not.toContain('transform');
  expect(cssTimeMs(transition.duration.split(',')[0] ?? '')).toBeCloseTo(120, 3);
});
