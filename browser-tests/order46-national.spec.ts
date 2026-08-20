import { expect, test, type Page } from '@playwright/test';

const tilePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');

const cordobaTerritory = {
  countryId: 'AR', countryName: 'Argentina', provinceId: '14', provinceIsoId: 'AR-X', provinceName: 'Córdoba',
  departmentId: null, departmentName: 'Capital', municipalityOrLocalGovernmentId: null,
  municipalityOrLocalGovernmentName: 'Córdoba', localityId: '14014010', localityName: 'Córdoba', cityId: 'georef:14014010',
  displayName: 'Córdoba, Córdoba', timezone: 'America/Argentina/Cordoba', coverageKey: '_default', coverageLevel: 'NATIONAL_BASE',
  source: 'georef_v2', sourceUrl: 'https://www.argentina.gob.ar/georef', verifiedAt: '2026-08-20', territoryVersion: 'georef-api-v2.0'
};

async function mockNationalApis(page: Page): Promise<string[]> {
  const external: string[] = [];
  page.on('request', request => {
    if (/nominatim\.openstreetmap\.org|router\.project-osrm\.org/.test(request.url())) external.push(request.url());
  });
  await page.route('**/cities/santa-fe/transport.json', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ landmarks: [] }) }));
  await page.route('**/api/geocode?*', route => {
    const query = new URL(route.request().url()).searchParams.get('q') || '';
    const origin = /origen/i.test(query);
    const result = origin
      ? { id: 'cordoba-origin', name: 'Plaza San Martín', display_name: 'Plaza San Martín, Córdoba', address: 'Centro, Córdoba', lat: -31.4167, lon: -64.1833 }
      : { id: 'cordoba-destination', name: 'Terminal Córdoba', display_name: 'Terminal Córdoba', address: 'Bv. Perón 380, Córdoba', lat: -31.4212, lon: -64.1881 };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [{ ...result, routeEligible: true, territoryVerified: true, territory: cordobaTerritory, source: 'worker_geocode_unverified' }] }) });
  });
  await page.route('**/api/route', async route => {
    const payload = JSON.parse(route.request().postData() || '{}') as { origin: { lat: number; lon: number }; destination: { lat: number; lon: number } };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, source: 'osrm_route', distance_km: 1.4, duration_min: 6, geometry: [[payload.origin.lon, payload.origin.lat], [payload.destination.lon, payload.destination.lat]] })
    });
  });
  await page.route('https://*.basemaps.cartocdn.com/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: tilePng }));
  return external;
}

test('ORDER-046 national base routes without inheriting Santa Fe local claims', async ({ page }) => {
  const external = await mockNationalApis(page);
  await page.goto('/');

  await page.getByTestId('origin-manual-trigger').click();
  await page.getByTestId('origin-input').fill('Origen Córdoba');
  await page.getByTestId('origin-input').press('Enter');
  await expect(page.getByTestId('origin-control')).toContainText('Córdoba');

  await page.getByTestId('destination-input').fill('Terminal Córdoba');
  const destination = page.getByTestId('destination-result-eligible').first();
  await expect(destination).toContainText('Terminal Córdoba');
  await expect(destination).toContainText('cobertura local no asumida');
  await destination.click();

  await expect(page.getByTestId('app-shell')).toHaveAttribute('data-coverage-key', '_default');
  await expect(page.getByTestId('territory-truth')).toContainText('base territorial nacional');
  await expect(page.getByTestId('trip-sheet')).toBeVisible();
  await expect(page.getByTestId('destination-provenance')).toContainText('Territorio verificado · GeoRef Argentina V2');
  await expect(page.getByTestId('destination-provenance')).not.toContainText('Destino verificado');
  await expect(page.getByTestId('provider-uber')).toHaveCount(0);
  await expect(page.getByTestId('provider-didi')).toHaveCount(0);
  await expect(page.getByTestId('provider-taxi')).toHaveCount(0);
  await expect(page.getByTestId('provider-remis')).toHaveCount(0);

  await page.locator('[data-mode="walk"]').click();
  await expect(page.getByTestId('provider-walk')).toBeVisible();
  expect(external).toEqual([]);
});
