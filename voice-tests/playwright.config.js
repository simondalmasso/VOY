const baseURL = process.env.VOY_BASE_URL || 'http://127.0.0.1:8787';
const versionId = process.env.VOY_CANDIDATE_VERSION_ID || '';
const workerName = process.env.VOY_WORKER_NAME || 'voy-app';
const headers = {
  'X-VOY-Voice-Test': 'synthetic-ci-v1',
  'Cache-Control': 'no-cache, no-store, max-age=0',
  Pragma: 'no-cache'
};
if (versionId) headers['Cloudflare-Workers-Version-Overrides'] = `${workerName}="${versionId}"`;

module.exports = {
  testDir: '.',
  testMatch: 'voice-copilot.spec.js',
  outputDir: process.env.VOY_OUTPUT_DIR || 'test-results/voice-playwright',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['line'], ['html', {
    outputFolder: process.env.VOY_REPORT_DIR || 'playwright-report-voice',
    open: 'never'
  }]],
  use: {
    baseURL,
    browserName: 'chromium',
    serviceWorkers: 'block',
    storageState: { cookies: [], origins: [] },
    extraHTTPHeaders: headers,
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
