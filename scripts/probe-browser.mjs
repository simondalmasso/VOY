import { chromium } from 'playwright-core';

const CANDIDATES = [
  process.env.CHROMIUM_PATH,
  `${process.env.HOME}/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`,
  `${process.env.HOME}/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome`,
].filter(Boolean);

let launched = null;
for (const executablePath of CANDIDATES) {
  try {
    launched = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    console.log('LAUNCH_OK', executablePath);
    break;
  } catch (error) {
    console.log('LAUNCH_FAIL', executablePath, String(error).slice(0, 120));
  }
}
if (!launched) { console.log('NO_BROWSER'); process.exit(1); }
const page = await launched.newPage({ viewport: { width: 390, height: 844 } });
await page.goto('about:blank');
console.log('VIEWPORT_OK', await page.evaluate(() => [window.innerWidth, window.innerHeight].join('x')));
const webgl = await page.evaluate(() => {
  const c = document.createElement('canvas');
  return { webgl2: Boolean(c.getContext('webgl2')), renderer: (() => { const gl = c.getContext('webgl2'); return gl ? gl.getParameter(gl.RENDERER) : 'none'; })() };
});
console.log('WEBGL2', JSON.stringify(webgl));
await launched.close();
