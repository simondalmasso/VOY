#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const sourceRoot = resolve(process.env.SOURCE_ROOT || 'source');
const outputDir = join(sourceRoot, 'production-second-promotion-tests');
mkdirSync(outputDir, { recursive: true });

let candidate = readFileSync(join(sourceRoot, 'candidate-tests', 'cloudflare-candidate.spec.js'), 'utf8');
candidate = candidate.replace(
  /function assertRelevantHeaders\(evidence\) \{[\s\S]*?\n\}/,
  `function assertRelevantHeaders(evidence) {
  const relevant = evidence.requests.filter(entry => entry.relevant);
  expect(relevant.length).toBeGreaterThan(0);
  for (const request of relevant) {
    expect(request.overrideHeader, \`no override header for \${request.url}\`).toBeNull();
    expect(request.candidateMarker, \`no candidate marker for \${request.url}\`).toBeNull();
  }
}`
);
candidate = candidate.replace("test.describe('Cloudflare exact-version candidate'", "test.describe('Cloudflare normal production City Platform'");
writeFileSync(join(outputDir, 'production-city-platform.spec.js'), candidate);

let cache = readFileSync(join(sourceRoot, 'candidate-tests', 'cache-isolation.spec.js'), 'utf8');
cache = cache.replace("test.describe('City Platform candidate clean-cache acquisition'", "test.describe('City Platform production clean-cache acquisition'");
cache = cache.replace('expect(request.override).toContain(candidateVersionId);', 'expect(request.override).toBeNull();');
writeFileSync(join(outputDir, 'production-cache-isolation.spec.js'), cache);

const baseURL = process.env.VOY_BASE_URL || 'https://voy-app.simondalmasso44.workers.dev';
const base = new URL(baseURL);
const config = `const baseURL = process.env.VOY_BASE_URL;
const base = new URL(baseURL);
module.exports = {
  testDir: '.',
  testMatch: ['production-city-platform.spec.js', 'production-cache-isolation.spec.js'],
  outputDir: process.env.VOY_OUTPUT_DIR || 'test-results/production-second-promotion-playwright',
  timeout: 120_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['line'], ['html', { outputFolder: process.env.VOY_REPORT_DIR || 'playwright-report-production-second-promotion', open: 'never' }]],
  use: {
    baseURL,
    browserName: 'chromium',
    serviceWorkers: 'block',
    storageState: {
      cookies: [{ name: 'voy_analytics', value: 'off', domain: base.hostname, path: '/', expires: -1, httpOnly: true, secure: base.protocol === 'https:', sameSite: 'Lax' }],
      origins: []
    },
    extraHTTPHeaders: { 'Cache-Control': 'no-cache, no-store, max-age=0', Pragma: 'no-cache' },
    trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure'
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1365, height: 768 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }
  ]
};
`;
writeFileSync(join(outputDir, 'playwright.config.cjs'), config);
console.log(outputDir);
