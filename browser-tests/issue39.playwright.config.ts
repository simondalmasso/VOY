import { defineConfig } from '@playwright/test';

const viewports = [
  ['mobile-360x800', { width: 360, height: 800 }],
  ['mobile-390x844', { width: 390, height: 844 }],
  ['mobile-412x915', { width: 412, height: 915 }],
  ['mobile-430x932', { width: 430, height: 932 }],
  ['tablet-768x1024', { width: 768, height: 1024 }],
  ['desktop-1280x720', { width: 1280, height: 720 }],
  ['desktop-1366x768', { width: 1366, height: 768 }],
  ['desktop-1440x900', { width: 1440, height: 900 }],
  ['desktop-1920x1080', { width: 1920, height: 1080 }]
] as const;

const externalCandidate = process.env.VOY_EXTERNAL_SERVER === '1';

export default defineConfig({
  testDir: '.',
  testMatch: [
    /map-first-interaction\.spec\.ts/,
    /issue36-design\.spec\.ts/,
    /svelte-mobile\.spec\.ts/,
    /issue39-ux\.spec\.ts/,
    /issue39-visual-identity\.spec\.ts/
  ],
  outputDir: process.env.VOY_OUTPUT_DIR || '../test-results/issue39-browser',
  reporter: [['list'], ['html', { outputFolder: process.env.VOY_REPORT_DIR || '../playwright-report-issue39', open: 'never' }]],
  timeout: 45_000,
  expect: { timeout: 8_000 },
  workers: 2,
  use: {
    extraHTTPHeaders: process.env.VOY_CANDIDATE_VERSION_ID && process.env.VOY_WORKER_NAME ? { 'Cloudflare-Workers-Version-Overrides': `${process.env.VOY_WORKER_NAME}="${process.env.VOY_CANDIDATE_VERSION_ID}"` } : undefined,
    baseURL: process.env.VOY_BASE_URL || 'http://127.0.0.1:8787',
    serviceWorkers: externalCandidate ? 'block' : 'allow',
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
  webServer: externalCandidate ? undefined : {
    command: 'BUILD_HASH=issue39-browser bun run build && wrangler dev --local --port 8787',
    url: 'http://127.0.0.1:8787/api/health',
    timeout: 120_000,
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe'
  }
});
