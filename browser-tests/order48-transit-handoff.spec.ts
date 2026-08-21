import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { santaFeOrigin } from './helpers/territory';

const projects = new Set(['mobile-390x844', 'desktop-1280x800']);
const tilePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const officialTarget = 'https://santafeciudad.gov.ar/secretaria-de-gobierno-control-movilidad-seguridadciudadana/colectivos/';
const terminal = {
  canonicalId: 'santafe:landmark:terminal-omnibus', nombre: 'Terminal de Ómnibus', aliases: ['terminal'],
  verified: true, source: 'authoritative', precision: 'poi', lat: -31.643533, lon: -60.700503,
  address: 'Belgrano 2910', verified_at: '2026-08-05',
  provenance: { status: 'authoritative', issuer: 'Municipalidad de Santa Fe', source_title: 'Estación Terminal de Ómnibus de Santa Fe', source_url: 'https://santafeciudad.gov.ar/terminal-de-colectivos/', license: 'Información pública institucional; sin licencia de reutilización explícita', coordinate_method: 'Dirección oficial municipal cruzada con geodato público gubernamental de la misma dirección', coordinate_source_url: 'https://www.bcra.gob.ar/' }
};
const transport = { schema_version: 2, city_id: 'santafe', verified_at: '2026-08-05', landmarks: [terminal], bus_routes: [], bus_stops: [], bike_stations: [] };

async function setup(page: Page): Promise<void> {
  await page.route('**/cities/santa-fe/transport.json', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(transport) }));
  await page.route('**/api/geocode?*', route => {
    const q = new URL(route.request().url()).searchParams.get('q') || '';
    const results = q.includes('Origen 48') ? [santaFeOrigin('order48:origin')] : [];
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results }) });
  });
  await page.route('**/api/route', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, source: 'osrm_route', distance_km: 3.2, duration_min: 10.5, geometry: [[-60.706, -31.633], [-60.7, -31.64], [-60.700503, -31.643533]] }) }));
  await page.route('https://*.basemaps.cartocdn.com/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: tilePng }));
  await page.route('https://santafeciudad.gov.ar/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Municipalidad de Santa Fe</title><main>Colectivos</main>' }));
}

async function plan(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByTestId('origin-manual-trigger').click();
  await page.getByTestId('origin-input').fill('Origen 48');
  await page.getByTestId('origin-input').press('Enter');
  await expect(page.getByTestId('origin-control')).toContainText('Plaza 25 de Mayo');
  await page.getByTestId('destination-input').fill('Terminal');
  const destination = page.getByTestId('destination-result-verified').first();
  await expect(destination).toContainText('Terminal de Ómnibus');
  await destination.click();
  const bus = page.locator('[data-mode="bus"]');
  await bus.scrollIntoViewIfNeeded();
  await bus.click();
  await expect(bus).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('provider-bus')).toBeVisible();
}

test('ORDER-048 Santa Fe bus stays unavailable but offers a confirmed no-data official handoff', async ({ page }, testInfo: TestInfo) => {
  test.skip(!projects.has(testInfo.project.name), 'representative official handoff browser gate');
  await setup(page);
  await plan(page);

  const provider = page.getByTestId('provider-bus');
  await expect(provider).toHaveAttribute('data-disabled', 'true');
  await expect(provider).toHaveAttribute('data-price-kind', 'unavailable');
  await expect(provider).toContainText('Sin planificación verificada');
  await expect(provider).toContainText('VOY no afirma líneas, paradas, frecuencias ni tarifas');
  await expect(page.getByTestId('trip-sheet')).not.toContainText(/(?:Línea|Lin\.)\s*\d/i);

  const handoff = page.getByTestId('provider-bus-handoff');
  await expect(handoff).toBeVisible();
  await expect(page.getByTestId('provider-bus-handoff-source')).toContainText('Municipalidad de Santa Fe');
  const box = await handoff.boundingBox();
  expect(box?.height || 0).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

  await handoff.click();
  const confirmation = page.getByTestId('external-confirmation');
  await expect(confirmation).toHaveAttribute('data-action-kind', 'official_information');
  await expect(confirmation).toContainText('Abrir información oficial');
  await expect(confirmation).toContainText('Municipalidad de Santa Fe');
  await expect(confirmation).toContainText('VOY no comparte tu origen, destino ni búsqueda');
  await expect(page.getByTestId('app-shell')).toHaveAttribute('data-interaction-state', 'EXTERNAL_CONFIRMATION');

  await confirmation.getByRole('button', { name: 'Cancelar' }).click();
  await expect(confirmation).toHaveCount(0);
  await handoff.click();
  await confirmation.getByRole('button', { name: 'Continuar' }).click();
  await page.waitForURL('https://santafeciudad.gov.ar/**');
  expect(page.url()).toBe(officialTarget);
  const target = new URL(page.url());
  expect(target.search).toBe('');
  expect(target.hash).toBe('');
});
