import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const baseURL = process.env.VOY_SMOKE_URL || 'https://voy-app.simondalmasso44.workers.dev';
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

try {
  const response = await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  assert.equal(response?.status(), 200, 'application shell must return HTTP 200');
  await page.locator('#quick-lines').waitFor({ state: 'visible', timeout: 15000 });
  assert.equal(await page.locator('#map-shell').isVisible(), true, 'map remains the primary surface');
  assert.equal(await page.locator('#quick-lines-wrap #bus-line-control').count(), 1, 'line picker belongs to Lines action');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile must not overflow horizontally');

  await page.locator('#quick-lines').click();
  await page.locator('#bus-line-control').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelectorAll('#bus-line-picker option').length > 1, null, { timeout: 15000 });
  const mobileGeometry = await page.evaluate(() => {
    const button = document.querySelector('#quick-lines').getBoundingClientRect();
    const picker = document.querySelector('#bus-line-control').getBoundingClientRect();
    return { buttonTop: button.top, pickerBottom: picker.bottom, pickerTop: picker.top, width: picker.width };
  });
  assert.ok(mobileGeometry.pickerBottom <= mobileGeometry.buttonTop + 1, 'mobile picker opens above Lines button');
  assert.ok(mobileGeometry.pickerTop >= 0 && mobileGeometry.width <= 390, 'mobile picker remains in viewport');

  const chosen = await page.locator('#bus-line-picker option').nth(1).getAttribute('value');
  assert.ok(chosen, 'published line option exists');
  await page.locator('#bus-line-picker').selectOption(chosen);
  assert.equal(await page.locator('#bus-line-control').isHidden(), true, 'selection closes popover');
  assert.equal(await page.evaluate(() => localStorage.getItem('voy.sf.line')), chosen, 'selection persists');
  assert.match(await page.locator('#quick-lines-label').innerText(), /Línea/, 'button names selected line');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#quick-lines').waitFor({ state: 'visible' });
  await page.waitForFunction(value => document.querySelector('#quick-lines-label')?.textContent.includes('Línea') &&
    document.querySelector('#bus-line-picker')?.value === value, chosen, { timeout: 15000 });
  await page.locator('#quick-lines').click();
  await page.locator('#bus-line-control').waitFor({ state: 'visible' });
  await page.waitForTimeout(10300);
  assert.equal(await page.locator('#bus-line-control').isHidden(), true, 'popover auto-closes after ten seconds');

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('#quick-lines').click();
  await page.locator('#bus-line-control').waitFor({ state: 'visible' });
  const desktopGeometry = await page.evaluate(() => {
    const button = document.querySelector('#quick-lines').getBoundingClientRect();
    const picker = document.querySelector('#bus-line-control').getBoundingClientRect();
    return { buttonTop: button.top, pickerBottom: picker.bottom, pickerLeft: picker.left, pickerRight: picker.right };
  });
  assert.ok(desktopGeometry.pickerBottom <= desktopGeometry.buttonTop + 1, 'desktop picker opens above Lines button');
  assert.ok(desktopGeometry.pickerLeft >= 0 && desktopGeometry.pickerRight <= 1440, 'desktop picker stays in viewport');
  assert.deepEqual(pageErrors, [], 'no uncaught browser exceptions');

  console.log(JSON.stringify({
    result: 'PASS',
    status: response.status(),
    mobile: '390x844',
    desktop: '1440x900',
    selectedLine: chosen,
    persistence: 'PASS',
    opensUpward: 'PASS',
    closesOnSelection: 'PASS',
    closesAfter10Seconds: 'PASS',
    horizontalOverflow: false,
    pageErrors
  }, null, 2));
} finally {
  await context.close();
  await browser.close();
}
