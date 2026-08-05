import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
describe('Svelte mobile-first architecture', () => {
  test('monolithic HTML and heavy frameworks are not active', () => {
    expect(existsSync('public/VOY-Lite.html')).toBe(false);
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { dependencies: Record<string,string>; devDependencies: Record<string,string> };
    const names = new Set([...Object.keys(pkg.dependencies), ...Object.keys(pkg.devDependencies)]);
    for (const forbidden of ['react', 'next', 'tailwindcss', '@sveltejs/kit']) expect(names.has(forbidden)).toBe(false);
    expect(names.has('svelte')).toBe(true); expect(names.has('maplibre-gl')).toBe(true);
  });
});
