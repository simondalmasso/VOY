const base = require('./playwright.config.js');

module.exports = {
  ...base,
  testMatch: 'cache-isolation.spec.js',
  outputDir: process.env.VOY_OUTPUT_DIR || 'test-results/cache-isolation-playwright',
  reporter: [['line'], ['html', {
    outputFolder: process.env.VOY_REPORT_DIR || 'playwright-report-cache-isolation',
    open: 'never'
  }]],
  use: {
    ...base.use,
    serviceWorkers: 'block',
    storageState: {
      cookies: base.use.storageState.cookies,
      origins: []
    }
  }
};
