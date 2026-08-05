/* eslint-disable @typescript-eslint/no-require-imports */
const { test, expect } = require('@playwright/test');

test('installed PWA shell survives an offline navigation after cache convergence', async ({ page, context }) => {
  test.setTimeout(90_000);
  await page.goto('/?city=santafe', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(async () => {
    if (!('serviceWorker' in navigator)) return false;
    await navigator.serviceWorker.ready;
    return true;
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker && navigator.serviceWorker.controller));
  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.locator('#destInput')).toBeVisible();
    await expect(page).toHaveTitle(/VOY/);
  } finally {
    await context.setOffline(false);
  }
});
