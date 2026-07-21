const baseURL = process.env.VOY_BASE_URL;
const versionId = process.env.VOY_CANDIDATE_VERSION_ID;
const workerName = process.env.VOY_WORKER_NAME || 'voy-app';

if (!baseURL) throw new Error('VOY_BASE_URL is required');
if (!versionId) throw new Error('VOY_CANDIDATE_VERSION_ID is required');

const base = new URL(baseURL);
const overrideValue = `${workerName}="${versionId}"`;
const analyticsOptOutState = {
  cookies: [{
    name: 'voy_analytics',
    value: 'off',
    domain: base.hostname,
    path: '/',
    expires: -1,
    httpOnly: true,
    secure: base.protocol === 'https:',
    sameSite: 'Lax'
  }],
  origins: []
};

module.exports = {
  testDir: '.',
  testMatch: 'cloudflare-candidate.spec.js',
  outputDir: process.env.VOY_OUTPUT_DIR || 'test-results/cloudflare-candidate-playwright',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['line'], ['html', {
    outputFolder: process.env.VOY_REPORT_DIR || 'playwright-report-cloudflare-candidate',
    open: 'never'
  }]],
  use: {
    baseURL,
    browserName: 'chromium',
    serviceWorkers: 'block',
    storageState: analyticsOptOutState,
    extraHTTPHeaders: {
      'Cloudflare-Workers-Version-Overrides': overrideValue,
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
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }
  ]
};
