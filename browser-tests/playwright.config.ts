import { defineConfig } from '@playwright/test';

const viewports = [
  ['mobile-360x800', { width: 360, height: 800 }],
  ['mobile-360x780', { width: 360, height: 780 }],
  ['mobile-390x844', { width: 390, height: 844 }],
  ['mobile-412x915', { width: 412, height: 915 }],
  ['mobile-430x932', { width: 430, height: 932 }],
  ['desktop-1280x800', { width: 1280, height: 800 }]
] as const;

export default defineConfig({
  testDir: '.',
  outputDir: process.env.VOY_OUTPUT_DIR || '../test-results/svelte-browser',
  reporter: [['list'], ['html', { outputFolder: process.env.VOY_REPORT_DIR || '../playwright-report', open: 'never' }]],
  timeout: 45_000,
  expect: { timeout: 8_000 },
  use: {
    extraHTTPHeaders: process.env.VOY_CANDIDATE_VERSION_ID && process.env.VOY_WORKER_NAME ? { 'Cloudflare-Workers-Version-Overrides': `${process.env.VOY_WORKER_NAME}="${process.env.VOY_CANDIDATE_VERSION_ID}"` } : undefined,
    baseURL: process.env.VOY_BASE_URL || 'http://127.0.0.1:8787',
    serviceWorkers: 'allow',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off'
  },
  projects: viewports.map(([name, viewport]) => ({
    name,
    use: {
      viewport,
      userAgent: name.startsWith('mobile')
        ? 'Mozilla/5.0 (Linux; Android 13; SM-A225M) AppleWebKit/537.36 Chrome/150 Mobile Safari/537.36'
        : undefined,
      isMobile: name.startsWith('mobile'),
      hasTouch: name.startsWith('mobile')
    }
  })),
  webServer: process.env.VOY_EXTERNAL_SERVER === '1' ? undefined : {
    command: 'BUILD_HASH=browser bun run build && wrangler dev --local --port 8787',
    url: 'http://127.0.0.1:8787/api/health',
    timeout: 120_000,
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe'
  }
});
