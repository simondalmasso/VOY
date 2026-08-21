import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const target = 'https://santafeciudad.gov.ar/secretaria-de-gobierno-control-movilidad-seguridadciudadana/colectivos/';
const expectedHost = 'santafeciudad.gov.ar';
const sourcePath = new URL('../src/features/providers/officialHandoffs.ts', import.meta.url);
const checkedAt = () => new Date().toISOString();

function emit(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function fail(code, details = {}) {
  emit({
    result: 'FAIL',
    failure: code,
    target,
    authority: 'Municipalidad de Santa Fe',
    verifier: 'chromium_browser_navigation',
    authentication_supplied: false,
    cookies_supplied: false,
    proxy_used: false,
    anti_bot_bypass_used: false,
    stale_substitution: false,
    checked_at: checkedAt(),
    ...details
  });
  process.stderr.write(`${code}\n`);
  process.exitCode = 1;
}

const configuredTarget = new URL(target);
if (
  configuredTarget.protocol !== 'https:' ||
  configuredTarget.hostname !== expectedHost ||
  configuredTarget.search !== '' ||
  configuredTarget.hash !== ''
) {
  fail('official_handoff_config_not_allowlisted', { final_url: configuredTarget.href });
} else {
  const source = await readFile(sourcePath, 'utf8');
  if (!source.includes(target)) {
    fail('official_handoff_code_target_drift');
  } else {
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();
      const page = await context.newPage();
      const response = await page.goto(target, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000
      });

      if (!response) {
        fail('official_handoff_navigation_no_response', { final_url: page.url() });
      } else {
        const status = response.status();
        const finalUrl = new URL(page.url());
        const baseEvidence = {
          status,
          final_url: finalUrl.href,
          final_protocol: finalUrl.protocol,
          final_host: finalUrl.hostname
        };

        if (status < 200 || status >= 300) {
          fail(`official_handoff_unreachable:${status}`, baseEvidence);
        } else if (finalUrl.protocol !== 'https:' || finalUrl.hostname !== expectedHost) {
          fail('official_handoff_redirect_not_allowlisted', baseEvidence);
        } else {
          const bodyText = await page.locator('body').innerText({ timeout: 10_000 });
          const normalized = bodyText
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .replace(/\s+/g, ' ')
            .trim();
          const transitSurface = /\bColectivos\b/i.test(normalized);
          const currentInformationReference = /\bCuando\s+Pasa\b/i.test(normalized);

          if (!transitSurface) {
            fail('official_handoff_transit_surface_missing', {
              ...baseEvidence,
              transit_surface: false,
              current_information_reference: currentInformationReference
            });
          } else if (!currentInformationReference) {
            fail('official_handoff_current_information_reference_missing', {
              ...baseEvidence,
              transit_surface: true,
              current_information_reference: false
            });
          } else {
            emit({
              result: 'PASS',
              target,
              final_url: finalUrl.href,
              final_protocol: finalUrl.protocol,
              final_host: finalUrl.hostname,
              status,
              authority: 'Municipalidad de Santa Fe',
              verifier: 'chromium_browser_navigation',
              browser_engine: 'chromium',
              browser_network_stack: 'normal',
              authentication_supplied: false,
              cookies_supplied: false,
              proxy_used: false,
              anti_bot_bypass_used: false,
              transit_surface: true,
              current_information_reference: true,
              checked_at: checkedAt(),
              stale_substitution: false
            });
          }
        }
      }
      await context.close();
    } catch (error) {
      if (process.exitCode !== 1) {
        fail('official_handoff_browser_navigation_error', {
          error_name: error?.name ?? 'Error',
          error_message: String(error?.message ?? error)
        });
      }
    } finally {
      await browser?.close().catch(() => {});
    }
  }
}
