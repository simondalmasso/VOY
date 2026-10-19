import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const baseURL = process.env.VOY_SMOKE_URL || 'http://127.0.0.1:8797';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const pageErrors = [];
const apiResponses = [];
page.on('pageerror', error => pageErrors.push(error.message));
page.on('response', response => {
  if (new URL(response.url()).pathname.startsWith('/api/')) {
    apiResponses.push({ path: new URL(response.url()).pathname, status: response.status() });
  }
});

try {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#city-picker');
  await page.waitForTimeout(2500);

  assert.equal(await page.locator('#truth-pill').isVisible(), true, 'truth pill must be visible');
  assert.equal(await page.locator('#transport-mode-picker').isVisible(), true, 'transport mode control must be visible');
  assert.equal(await page.locator('.map-shell').isVisible(), true, 'map must be visible before interaction');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'mobile viewport must not overflow horizontally');

  await page.locator('#city-picker').selectOption('rosario');
  await page.waitForTimeout(250);
  assert.match(await page.locator('.map-shell').getAttribute('aria-label'), /Rosario/);
  assert.match(await page.locator('#truth-pill').innerText(), /Tiempo real no disponible/);
  assert.match(await page.locator('#transit-context-status').innerText(), /por validar/);

  await page.locator('#transport-mode-picker').selectOption('train');
  await page.waitForTimeout(1200);
  assert.match(await page.locator('.map-shell').getAttribute('aria-label'), /Rosario.*trenes/);
  assert.match(await page.locator('#truth-pill').innerText(), /Trenes · Rosario/);
  assert.match(await page.locator('#transit-context-status').innerText(), /servicio en vivo no confirmado/);

  await page.locator('#city-picker').selectOption('caba');
  await page.locator('#transport-mode-picker').selectOption('bus');
  await page.waitForTimeout(250);
  assert.match(await page.locator('#transit-context-status').innerText(), /acceso pendiente de respuesta/);
  assert.match(await page.locator('#truth-pill').innerText(), /Tiempo real no disponible/);

  await page.locator('#city-picker').selectOption('santa-fe');
  await page.locator('#transport-mode-picker').selectOption('bus');
  await page.waitForTimeout(250);
  assert.match(await page.locator('.map-shell').getAttribute('aria-label'), /Santa Fe.*colectivos/);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no horizontal overflow after switching cities');
  assert.deepEqual(pageErrors, [], 'no uncaught page errors');

  console.log(JSON.stringify({
    result: 'PASS',
    viewport: '390x844',
    cityModes: ['Rosario/colectivos', 'Rosario/trenes', 'Buenos Aires/colectivos', 'Santa Fe/colectivos'],
    truthPillVisible: true,
    horizontalOverflow: false,
    pageErrors,
    apiResponses
  }, null, 2));
} finally {
  await context.close();
  await browser.close();
}
