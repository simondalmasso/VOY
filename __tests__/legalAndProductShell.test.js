/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const legalPromise = import('../legalPages.mjs');
const shellPromise = import('../productShellHtml.mjs');

test('privacy, terms, sources and contact are public, dated and mutually linked', async () => {
  const { handleLegalPage, legalContract } = await legalPromise;
  assert.deepEqual([...legalContract.paths].sort(), ['/contact', '/privacy', '/sources', '/terms']);
  for (const route of legalContract.paths) {
    const response = handleLegalPage(new Request(`https://voy.test${route}`));
    assert.equal(response.status, 200);
    const body = await response.text();
    assert.match(body, /4 de agosto de 2026/);
    assert.match(body, /href="\/privacy"/);
    assert.match(body, /href="\/terms"/);
    assert.match(body, /href="\/sources"/);
    assert.match(body, /href="\/contact"/);
    assert.match(body, /Volver a VOY/);
    assert.match(body, /Saltar al contenido/);
  }
});

test('sources page separates regulated, app-only, reference and unverified data', async () => {
  const { handleLegalPage } = await legalPromise;
  const body = await (handleLegalPage(new Request('https://voy.test/sources'))).text();
  assert.match(body, /REGULATED_CURRENT/);
  assert.match(body, /APP_ONLY/);
  assert.match(body, /REFERENCE/);
  assert.match(body, /NO_VERIFICADO/);
  assert.match(body, /la IA no calcula rutas, tarifas, distancias, tiempos ni rankings/i);
});

test('contact page exposes public issue and private security channels', async () => {
  const { handleLegalPage, legalContract } = await legalPromise;
  const body = await (handleLegalPage(new Request('https://voy.test/contact'))).text();
  assert.match(body, new RegExp(legalContract.contactUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(body, /security\/advisories\/new/);
});

test('product shell exposes only public configuration and legal UI assets', async () => {
  const { maybeInjectProductShellHtml } = await shellPromise;
  const response = await maybeInjectProductShellHtml(
    new Request('https://voy.test/'),
    new Response('<!doctype html><html><head><title>VOY</title></head><body></body></html>', { headers: { 'Content-Type': 'text/html' } }),
    { VOY_GOOGLE_CLIENT_ID: 'public-client', VOY_AUTH_SESSION_SECRET_V1: 'top-secret', VOY_VOICE_ENABLED: 'true', AI: {} }
  );
  const body = await response.text();
  assert.match(body, /productShell\.css\?v=2/);
  assert.match(body, /productShell\.js\?v=2/);
  assert.match(body, /"auth_enabled":true/);
  assert.match(body, /"google_client_id":"public-client"/);
  assert.match(body, /"voice_enabled":true/);
  assert.doesNotMatch(body, /top-secret/);
});

test('browser shell contains accessible focus management and Google redirect behavior', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'core', 'productShell.js'), 'utf8');
  assert.match(source, /role: 'dialog'/);
  assert.match(source, /aria-modal/);
  assert.match(source, /trapFocus/);
  assert.match(source, /aria-expanded/);
  assert.match(source, /data-voy-skip-link/);
  assert.match(source, /\/api\/auth\/session/);
  assert.match(source, /\/api\/auth\/logout/);
  assert.match(source, /ux_mode: 'redirect'/);
  assert.match(source, /accounts\.google\.com\/gsi\/client/);
  assert.match(source, /VOY no guarda historial de viajes ni crea un perfil permanente/);
  assert.match(source, /if \(!cfg\.auth_enabled\) return/);
});
