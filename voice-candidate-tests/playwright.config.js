const baseURL = process.env.WORKER_URL || 'https://voy-app.simondalmasso44.workers.dev';

module.exports = {
  testDir: '.',
  testMatch: 'voice-candidate.spec.js',
  outputDir: process.env.VOY_OUTPUT_DIR || 'test-results/voice-candidate-playwright',
  timeout: 240_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['line'], ['html', {
    outputFolder: process.env.VOY_REPORT_DIR || 'playwright-report-voice-candidate',
    open: 'never'
  }]],
  use: {
    baseURL,
    browserName: 'chromium',
    serviceWorkers: 'block',
    storageState: { cookies: [], origins: [] },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1365, height: 768 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/150 Mobile Safari/537.36' } }
  ]
};
