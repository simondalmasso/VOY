import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const baseURL = process.env.VOY_SMOKE_URL || 'http://127.0.0.1:8797';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

try {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#transport-mode-picker');
  await page.waitForTimeout(2500);

  assert.equal(await page.locator('#truth-pill').isVisible(), true, 'temporal truth must be visible');
  assert.equal(await page.locator('.map-shell').isVisible(), true, 'map must be visible');
  assert.equal(await page.locator('#city-picker').count(), 0, 'there must be no city filter');
  assert.equal(await page.locator('#bus-line-control').evaluate(el => el.parentElement.classList.contains('map-quick-lines-wrap')), true, 'line selector belongs to the Lines action popover');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'mobile viewport must not overflow horizontally');

  const mapState = await page.evaluate(() => ({
    rasterVisible: !document.querySelector('#map-tiles').hidden,
    vectorVisible: !document.querySelector('#map-canvas').hidden
  }));
  assert.ok(mapState.rasterVisible !== mapState.vectorVisible, 'only one 2D map substrate may be visible at a time');

  assert.equal(await page.locator('#bus-line-picker option').count(), 1, 'route catalog stays unloaded until Lines is opened');
  await page.locator('#quick-plan').click();
  await page.waitForTimeout(150);
  await page.locator('#quick-lines').click();
  await page.waitForTimeout(300);
  assert.equal(await page.locator('#bus-line-control').isVisible(), true, 'Lines opens the embedded line panel');
  const panelBox = await page.locator('#bus-line-control').boundingBox();
  assert.ok(panelBox && panelBox.x >= 0 && panelBox.x + panelBox.width <= 390, 'line popover must fit within the mobile viewport');
  assert.equal(await page.locator('#bus-line-control').evaluate(el => { const r=el.getBoundingClientRect(); const hit=document.elementFromPoint(r.left+Math.min(20,r.width/2),r.top+Math.min(20,r.height/2)); return Boolean(hit && (el===hit || el.contains(hit))); }), true, 'line popover must remain clickable with dashboard open');
  assert.ok(await page.locator('#bus-line-picker option').count() > 1, 'line options load only when Lines is opened');
  assert.deepEqual(pageErrors, [], 'no uncaught page errors');

  console.log(JSON.stringify({result:'PASS',viewport:'390x844',cityFilter:false,mapState,linePanelEmbedded:true,pageErrors},null,2));
} finally {
  await context.close();
  await browser.close();
}
