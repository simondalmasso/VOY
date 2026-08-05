import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
describe('PWA boundary', () => {
  test('manifest owns root scope and service worker migrates VOY caches without owning APIs', () => {
    const manifest = JSON.parse(readFileSync('public/manifest.json', 'utf8')) as { start_url: string; scope: string; display: string };
    expect(manifest.start_url).toBe('/'); expect(manifest.scope).toBe('/'); expect(manifest.display).toBe('standalone');
    const sw = readFileSync('public/sw.js', 'utf8');
    expect(sw).toContain("url.pathname.startsWith('/api/')");
    expect(sw).toContain("request.mode === 'navigate'");
    expect(sw).toContain("url.pathname.startsWith('/cities/')");
    expect(sw.indexOf("fetch(request, { cache: 'no-store' })")).toBeGreaterThan(-1);
    expect(sw).toContain('isVoyCache');
    expect(sw).toContain("event.data?.type === 'SKIP_WAITING'");
    expect(sw).not.toContain("keys.filter(key => key !== CACHE).map");
  });
});
