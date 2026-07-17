const baseURL = process.env.VOY_BASE_URL || 'http://127.0.0.1:8787';
const reportDirectory = process.env.VOY_REPORT_DIR || 'playwright-report';
const outputDirectory = process.env.VOY_OUTPUT_DIR || 'test-results/playwright-local';

module.exports = {
  testDir: './browser-tests',
  outputDir: outputDirectory,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['line'], ['html', { outputFolder: reportDirectory, open: 'never' }]],
  use: {
    baseURL,
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1365, height: 768 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }
  ]
};
