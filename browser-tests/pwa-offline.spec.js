/* eslint-disable @typescript-eslint/no-require-imports */
const { test, expect } = require('@playwright/test');

test('installed PWA shell is available from the owned cache while offline', async ({ page, context }) => {
  test.setTimeout(90_000);
  await page.goto('/?city=santafe', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(async () => {
    if (!('serviceWorker' in navigator)) return false;
    await navigator.serviceWorker.ready;
    return true;
  });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker && navigator.serviceWorker.controller));
  const onlineShell = await page.evaluate(async () => {
    const response = await caches.match('/');
    return response ? response.text() : '';
  });
  expect(onlineShell).toContain('destInput');
  await context.setOffline(true);
  try {
    const offlineState = await page.evaluate(async () => {
      const response = await caches.match('/');
      return {
        online: navigator.onLine,
        status: response ? response.status : 0,
        body: response ? await response.text() : ''
      };
    });
    expect(offlineState.online).toBe(false);
    expect(offlineState.status).toBe(200);
    expect(offlineState.body).toContain('destInput');
    await expect(page.locator('#destInput')).toBeVisible();
    await expect(page).toHaveTitle(/VOY/);
  } finally {
    await context.setOffline(false);
  }
});
