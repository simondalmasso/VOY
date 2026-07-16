/* eslint-disable @typescript-eslint/no-require-imports */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');

const BRIDGE = { lat: -31.639764, lon: -60.682736 };
const evidenceDirectory = 'test-results/evidence';

function remoteCandidate(overrides) {
  return {
    canonicalId: 'osm:node:fixture', source: 'remote', type: 'address',
    name: 'Bv. Gálvez 1150', displayName: 'Bv. Gálvez 1150, Santa Fe',
    address: 'Bv. Gálvez 1150, Santa Fe', lat: BRIDGE.lat, lon: BRIDGE.lon,
    cityId: 'santafe', precision: 'house', confidence: 0.8, verified: false,
    aliases: [], osmType: 'node', osmId: 'fixture', ...overrides
  };
}

test.describe('Destination Resolution V2 browser smoke', () => {
  test.beforeEach(async ({ page }) => {
    const requestLog = [];
    const consoleLog = [];
    const pageErrors = [];
    let geocodeCalls = 0;
    let nominatimCalls = 0;

    page.on('console', message => consoleLog.push({ type: message.type(), text: message.text() }));
    page.on('pageerror', error => pageErrors.push(String(error && error.stack || error)));
    page.on('request', request => {
      requestLog.push({ method: request.method(), url: request.url() });
      if (request.url().includes('nominatim.openstreetmap.org')) nominatimCalls += 1;
    });
    await page.route('**nominatim.openstreetmap.org/**', route => route.abort('blockedbyclient'));
    await page.route('**/api/geocode**', async route => {
      geocodeCalls += 1;
      const query = new URL(route.request().url()).searchParams.get('q') || '';
      let results = [];
      if (/galvez 1150/i.test(query.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) {
        results = [remoteCandidate()];
      } else if (/san martin/i.test(query.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) {
        results = [
          remoteCandidate({ canonicalId: 'osm:node:1', name: 'San Martín Centro', displayName: 'San Martín Centro, Santa Fe', address: 'Centro', precision: 'street', confidence: 0.7, osmId: '1' }),
          remoteCandidate({ canonicalId: 'osm:node:2', name: 'San Martín Norte', displayName: 'San Martín Norte, Santa Fe', address: 'Norte', precision: 'street', confidence: 0.69, osmId: '2', lat: -31.638 })
        ];
      } else if (/fuera/i.test(query)) {
        results = [remoteCandidate({ canonicalId: 'osm:node:outside', name: 'Fuera', displayName: 'Fuera', lat: -34.6, lon: -58.4, osmId: 'outside' })];
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results }) });
    });

    await page.goto('/?city=santafe', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.MC && window.CURRENT_CITY && window.CURRENT_CITY.city_id === 'santafe' && !document.getElementById('splash'));
    await page.evaluate(() => window.MC.setOrigin(-31.6405, -60.6905, 'Origen de prueba', 'manual'));

    page.__voyEvidence = { requestLog, consoleLog, pageErrors, get geocodeCalls() { return geocodeCalls; }, get nominatimCalls() { return nominatimCalls; } };
  });

  test.afterEach(async ({ page }, testInfo) => {
    await fs.mkdir(evidenceDirectory, { recursive: true });
    const evidence = page.__voyEvidence;
    const slug = testInfo.project.name;
    await fs.writeFile(`${evidenceDirectory}/${slug}-console.json`, JSON.stringify(evidence.consoleLog, null, 2));
    await fs.writeFile(`${evidenceDirectory}/${slug}-requests.json`, JSON.stringify(evidence.requestLog, null, 2));
    await page.screenshot({ path: `${evidenceDirectory}/${slug}.png`, fullPage: false });
    expect(evidence.pageErrors, 'fatal page errors').toEqual([]);
    expect(evidence.nominatimCalls, 'real Nominatim calls').toBe(0);
  });

  test('local, exact, recent, remote, ambiguity and invalid-result gates', async ({ page }) => {
    const input = page.locator('#destInput');
    const dropdown = page.locator('#destDropdown');

    await input.fill('Puente Colgante');
    await expect(dropdown).toContainText('Puente Colgante');
    await expect(dropdown).toContainText('Bv. Gálvez 1150');
    expect(page.__voyEvidence.geocodeCalls).toBe(0);
    const bridgeResult = dropdown.locator('[data-candidate-index="0"]');
    await bridgeResult.click();
    await expect(dropdown).toHaveClass(/hidden/);
    await expect.poll(() => page.evaluate(() => window.MC.getEstimations())).not.toBeNull();
    expect(await page.evaluate(() => window.MC.getDest())).toMatchObject(BRIDGE);

    await page.evaluate(async () => {
      await window.MC.v5AddRecent({ name: 'Puente Colgante', lat: -31.623, lon: -60.685 });
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('voy_v5');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise((resolve, reject) => {
        const transaction = db.transaction('meta', 'readwrite');
        transaction.objectStore('meta').delete('destinationRecentsV2_santafe');
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.MC && window.CURRENT_CITY && window.CURRENT_CITY.city_id === 'santafe' && !document.getElementById('splash'));
    const reconciled = await page.evaluate(async () => (await window.MC.v5GetRecents(20)).find(item => item.name === 'Puente Colgante'));
    expect(reconciled).toMatchObject({ canonicalId: 'santafe:landmark:puente-colgante', ...BRIDGE, previousCoordinates: { lat: -31.623, lon: -60.685 } });
    await input.fill('Puente Colgante');
    await expect(dropdown.locator('[data-candidate-index="0"]')).toContainText('Verificado');

    await input.fill('Bv. Gálvez 1150');
    expect(page.__voyEvidence.geocodeCalls).toBe(0);
    await input.press('Enter');
    await expect.poll(() => page.__voyEvidence.geocodeCalls).toBe(1);
    await expect.poll(() => page.evaluate(() => window.MC.getDest() && window.MC.getDest().name)).toContain('Bv. Gálvez 1150');

    await input.fill('');
    await expect.poll(() => page.evaluate(() => window.MC.getDest())).toBeNull();
    await input.fill('San Martín');
    await input.press('Enter');
    expect(await dropdown.locator('[data-candidate-index]').count()).toBeGreaterThanOrEqual(2);
    expect(await page.evaluate(() => window.MC.getDest())).toBeNull();
    expect(await page.evaluate(() => window.MC.getEstimations())).toBeNull();

    await input.fill('');
    await input.fill('Fuera');
    await input.press('Enter');
    await expect(dropdown).toContainText('Sin coincidencias');
    expect(await page.evaluate(() => window.MC.getDest())).toBeNull();
    expect(await page.evaluate(() => window.MC.getEstimations())).toBeNull();
  });
});
