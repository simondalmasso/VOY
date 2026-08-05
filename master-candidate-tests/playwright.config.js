const baseURL = process.env.VOY_BASE_URL;
const versionId = process.env.VOY_CANDIDATE_VERSION_ID;
const workerName = process.env.VOY_WORKER_NAME || 'voy-app';
if (!baseURL) throw new Error('VOY_BASE_URL is required');
if (!versionId) throw new Error('VOY_CANDIDATE_VERSION_ID is required');
const base = new URL(baseURL);
module.exports = {
  testDir: '../browser-tests',
  testMatch: 'product-completion.spec.js',
  outputDir: process.env.VOY_OUTPUT_DIR || 'test-results/master-candidate-playwright',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['line'], ['html', { outputFolder: process.env.VOY_REPORT_DIR || 'playwright-report-master-candidate', open: 'never' }]],
  use: {
    baseURL,
    browserName: 'chromium',
    serviceWorkers: 'block',
    storageState: { cookies: [{ name: 'voy_analytics', value: 'off', domain: base.hostname, path: '/', expires: -1, httpOnly: true, secure: true, sameSite: 'Lax' }], origins: [] },
    extraHTTPHeaders: {
      'Cloudflare-Workers-Version-Overrides': `${workerName}="${versionId}"`,
      'X-VOY-Candidate-Smoke': versionId,
      'Cache-Control': 'no-cache, no-store, max-age=0',
      Pragma: 'no-cache'
    },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1365, height: 768 } } },
    { name: 'android', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/150 Mobile Safari/537.36' } },
    { name: 'iphone', use: { viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1' } }
  ]
};
