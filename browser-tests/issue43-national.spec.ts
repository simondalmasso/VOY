import { expect, test, type Page, type TestInfo } from '@playwright/test';

const tilePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const GEOREF_SOURCE = 'https://www.argentina.gob.ar/georef';
const TERRITORY_VERSION = 'georef-api-v2.0';

type Place = {
  query: string;
  name: string;
  lat: number;
  lon: number;
  provinceId: string;
  provinceIsoId: string;
  provinceName: string;
  locality: string;
  coverageKey?: '_default' | 'santa-fe';
};

const places = {
  cordobaOrigin: { query: 'Origen Cordoba 43', name: 'Origen Córdoba 43', lat: -31.4167, lon: -64.1833, provinceId: '14', provinceIsoId: 'AR-X', provinceName: 'Córdoba', locality: 'Córdoba' },
  cordobaDestination: { query: 'Destino Cordoba 43', name: 'Destino Córdoba 43', lat: -31.402, lon: -64.188, provinceId: '14', provinceIsoId: 'AR-X', provinceName: 'Córdoba', locality: 'Córdoba' },
  santaFeOrigin: { query: 'Origen Santa Fe 43', name: 'Origen Santa Fe 43', lat: -31.633, lon: -60.706, provinceId: '82', provinceIsoId: 'AR-S', provinceName: 'Santa Fe', locality: 'Santa Fe', coverageKey: 'santa-fe' as const },
  santaFeDestination: { query: 'Destino Santa Fe 43', name: 'Destino Santa Fe 43', lat: -31.643, lon: -60.7005, provinceId: '82', provinceIsoId: 'AR-S', provinceName: 'Santa Fe', locality: 'Santa Fe', coverageKey: 'santa-fe' as const },
  caba: { query: 'Origen CABA 43', name: 'Origen CABA 43', lat: -34.6037, lon: -58.3816, provinceId: '02', provinceIsoId: 'AR-C', provinceName: 'Ciudad Autónoma de Buenos Aires', locality: 'Ciudad Autónoma de Buenos Aires' },
  laPlata: { query: 'Destino La Plata 43', name: 'Destino La Plata 43', lat: -34.9214, lon: -57.9544, provinceId: '06', provinceIsoId: 'AR-B', provinceName: 'Buenos Aires', locality: 'La Plata' }
} satisfies Record<string, Place>;

function territory(place: Place) {
  const coverageKey = place.coverageKey || '_default';
  return {
    countryId: 'AR', countryName: 'Argentina', provinceId: place.provinceId, provinceIsoId: place.provinceIsoId,
    provinceName: place.provinceName, departmentId: `${place.provinceId}001`, departmentName: 'Departamento',
    municipalityOrLocalGovernmentId: null, municipalityOrLocalGovernmentName: null,
    localityId: `${place.provinceId}001001`, localityName: place.locality,
    cityId: coverageKey === 'santa-fe' ? 'santafe' : `ar:${place.provinceId}001001`,
    displayName: `${place.locality}, ${place.provinceName}`, timezone: null, coverageKey,
    coverageLevel: 'NATIONAL_BASE', source: 'georef_v2', sourceUrl: GEOREF_SOURCE,
    verifiedAt: '2026-08-20', territoryVersion: TERRITORY_VERSION
  };
}

function candidate(place: Place) {
  return {
    canonicalId: `issue43:${place.provinceId}:${place.name}`,
    name: place.name,
    address: `${place.name}, ${place.locality}, ${place.provinceName}`,
    lat: place.lat, lon: place.lon, precision: 'address', verified: false, operational: false,
    confidence: 'unverified', routeEligible: true, territoryVerified: true,
    source: 'georef_v2_address', territory: territory(place), coverageKey: place.coverageKey || '_default'
  };
}

async function installNationalApis(page: Page, { tilesFail = false } = {}): Promise<void> {
  await page.route('**/api/geocode?*', async route => {
    const query = new URL(route.request().url()).searchParams.get('q') || '';
    const match = Object.values(places).find(item => item.query === query);
    if (query === 'Ambiguo 43') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [candidate(places.cordobaOrigin), candidate(places.caba)] }) });
      return;
    }
    if (query === 'Outside Argentina 43') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [{
        canonicalId: 'outside:uy', name: 'Montevideo 43', address: 'Montevideo, Uruguay', lat: -34.9011, lon: -56.1645,
        precision: 'address', verified: false, operational: false, confidence: 'unverified', routeEligible: false,
        territoryVerified: false, source: 'osm_nominatim_unresolved', territory: null, coverageKey: '_default'
      }] }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: match ? [candidate(match)] : [] }) });
  });
  await page.route('**/api/route', async route => {
    const body = await route.request().postDataJSON() as { origin?: { lat: number; lon: number }; destination?: { lat: number; lon: number } };
    const origin = body.origin || { lat: -31.633, lon: -60.706 };
    const destination = body.destination || { lat: -31.643, lon: -60.7005 };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      ok: true, source: 'osrm_route', distance_km: 4.2, duration_min: 11.5,
      geometry: [[origin.lon, origin.lat], [destination.lon, destination.lat]]
    }) });
  });
  await page.route('https://*.basemaps.cartocdn.com/**', route => tilesFail
    ? route.fulfill({ status: 503, contentType: 'text/plain', body: 'tile unavailable' })
    : route.fulfill({ status: 200, contentType: 'image/png', body: tilePng }));
}

async function setManualOrigin(page: Page, place: Place): Promise<void> {
  await page.getByTestId('origin-manual-trigger').click();
  const input = page.getByTestId('origin-input');
  await input.fill(place.query);
  await input.press('Enter');
  await expect(page.getByTestId('origin-control')).toContainText(place.name);
}

async function setDestination(page: Page, place: Place): Promise<void> {
  await page.getByTestId('destination-input').fill(place.query);
  const result = page.getByTestId('destination-result-national').first();
  await expect(result).toContainText(place.name);
  await result.click();
}

function only(testInfo: TestInfo, projects: string[]): void {
  test.skip(!projects.includes(testInfo.project.name), `Issue43 scoped to ${projects.join(', ')}`);
}

test('NATIONAL_HOME is Argentina-first and preserves VOY Wayfinding primitives', async ({ page }) => {
  await installNationalApis(page);
  await page.goto('/');
  await expect(page).toHaveTitle('VOY — Movilidad urbana para Argentina');
  await expect(page.getByTestId('app-shell')).toHaveAttribute('data-coverage-key', '_default');
  await expect(page.getByText('Movilidad urbana · Argentina')).toBeVisible();
  await expect(page.getByTestId('territory-truth')).toContainText('base territorial nacional');
  await expect(page.getByTestId('journey-builder')).toBeVisible();
  await expect(page.getByTestId('map-shell')).toBeVisible();
  await expect(page.getByTestId('decision-empty')).toContainText('01');
  await expect(page.locator('footer')).toContainText('Hecho en Santa Fe, Argentina · VOY');
});

test('NATIONAL_BASE_NO_LOCAL_DATA resolves Córdoba and routes without inventing local providers', async ({ page }, testInfo) => {
  only(testInfo, ['mobile-390x844', 'desktop-1280x800']);
  await installNationalApis(page);
  await page.goto('/');
  await setManualOrigin(page, places.cordobaOrigin);
  await setDestination(page, places.cordobaDestination);
  await expect(page.getByTestId('app-shell')).toHaveAttribute('data-coverage-key', '_default');
  await expect(page.getByTestId('territory-truth')).toContainText('Córdoba, Córdoba');
  await expect(page.getByTestId('territory-truth')).toContainText('base territorial nacional');
  await expect(page.getByTestId('trip-sheet')).toBeVisible();
  await expect(page.getByText('Ruta calculada en Córdoba, Córdoba.')).toBeVisible();
  await expect(page.getByTestId('map-shell')).toHaveAttribute('data-overlay-ready', 'true');
});

test('SANTA_FE_REGRESSION keeps the verified city overlay isolated to exact Santa Fe city', async ({ page }, testInfo) => {
  only(testInfo, ['mobile-390x844', 'desktop-1280x800']);
  await installNationalApis(page);
  await page.goto('/');
  await setManualOrigin(page, places.santaFeOrigin);
  await setDestination(page, places.santaFeDestination);
  await expect(page.getByTestId('app-shell')).toHaveAttribute('data-coverage-key', 'santa-fe');
  await expect(page.getByTestId('territory-truth')).toContainText('Santa Fe, Santa Fe');
  await expect(page.getByTestId('territory-truth')).toContainText('cobertura local verificada por componente');
  await expect(page.getByTestId('trip-sheet')).toBeVisible();
});

test('cross-province CABA to La Plata remains NATIONAL_BASE and keeps CABA distinct from PBA', async ({ page }, testInfo) => {
  only(testInfo, ['desktop-1280x800']);
  await installNationalApis(page);
  await page.goto('/');
  await setManualOrigin(page, places.caba);
  await setDestination(page, places.laPlata);
  await expect(page.getByTestId('origin-control')).toContainText('Ciudad Autónoma de Buenos Aires');
  await expect(page.getByTestId('territory-truth')).toContainText('La Plata, Buenos Aires');
  await expect(page.getByTestId('app-shell')).toHaveAttribute('data-coverage-key', '_default');
  await expect(page.getByTestId('trip-sheet')).toBeVisible();
});

test('AMBIGUOUS_LOCALITY does not silently commit a manual origin', async ({ page }, testInfo) => {
  only(testInfo, ['mobile-390x844']);
  await installNationalApis(page);
  await page.goto('/');
  await page.getByTestId('origin-manual-trigger').click();
  const input = page.getByTestId('origin-input');
  await input.fill('Ambiguo 43');
  await input.press('Enter');
  await expect(page.getByTestId('origin-control')).toContainText('Hay varios resultados posibles');
  await expect(input).toBeFocused();
  await expect(page.getByTestId('origin-control')).toHaveAttribute('data-selected', 'false');
});

test('OUTSIDE_ARGENTINA is visible but disabled and cannot become a route destination', async ({ page }, testInfo) => {
  only(testInfo, ['mobile-390x844']);
  await installNationalApis(page);
  await page.goto('/');
  await page.getByTestId('destination-input').fill('Outside Argentina 43');
  const result = page.getByTestId('destination-result-unverified').first();
  await expect(result).toContainText('Montevideo 43');
  await expect(result).toBeDisabled();
  await expect(result).toContainText('Territorio no resuelto');
  await expect(page.getByTestId('app-shell')).toHaveAttribute('data-coverage-key', '_default');
});

test('map tile outage is fail-soft and the deterministic planner remains usable', async ({ page }, testInfo) => {
  only(testInfo, ['mobile-390x844']);
  await installNationalApis(page, { tilesFail: true });
  await page.goto('/');
  await expect(page.getByTestId('map-fallback')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('destination-input')).toBeEnabled();
  await expect(page.getByTestId('origin-manual-trigger')).toBeEnabled();
  await expect(page.getByTestId('map-fallback')).toContainText('comparación verificable sigue funcionando');
});

test('national shell survives dark + reduced motion + 200% base text on low-end Android viewport', async ({ page }, testInfo) => {
  only(testInfo, ['mobile-360x800']);
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await installNationalApis(page);
  await page.goto('/');
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await expect(page.getByTestId('app-shell')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByTestId('destination-input')).toBeVisible();
  await expect(page.getByTestId('origin-manual-trigger')).toBeVisible();
});
