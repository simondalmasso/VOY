import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

interface AssetPolicy {
  public_source_allowlist: {
    current_runtime_data: string[];
    required_static_assets: string[];
  };
  retired_public_paths: string[];
  retired_public_prefixes: string[];
}

function walk(root: string): string[] {
  const visit = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = join(directory, entry.name);
    return entry.isDirectory() ? visit(absolute) : [relative(root, absolute).replaceAll('\\', '/')];
  });
  return visit(root).sort();
}

describe('Svelte mobile-first architecture', () => {
  test('no alternate monolithic VOY application can ship', () => {
    const publicFiles = walk('public');
    expect(publicFiles.filter(path => path.endsWith('.html'))).toEqual([]);
    expect(existsSync('public/navigator')).toBe(false);
    const root = readFileSync('index.html', 'utf8');
    expect(root).toContain('<div id="app"></div>');
    expect(root).not.toContain('window.VOY_BUILD_HASH');
    expect(root).not.toContain('VOY-Lite.html');
    expect(root).not.toContain('Belgrano y Freyre');
  });

  test('every public source file is explicitly classified', () => {
    const policy = JSON.parse(readFileSync('config/production-assets.json', 'utf8')) as AssetPolicy;
    const expected = [...policy.public_source_allowlist.current_runtime_data, ...policy.public_source_allowlist.required_static_assets].sort();
    expect(walk('public')).toEqual(expected);
    for (const path of policy.retired_public_paths) expect(existsSync(`public/${path.replace(/^\//, '')}`)).toBe(false);
    for (const prefix of policy.retired_public_prefixes) expect(existsSync(`public/${prefix.replace(/^\//, '').replace(/\/$/, '')}`)).toBe(false);
  });

  test('heavy frameworks remain outside the active product', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
    const names = new Set([...Object.keys(pkg.dependencies), ...Object.keys(pkg.devDependencies)]);
    for (const forbidden of ['react', 'next', 'tailwindcss', '@sveltejs/kit']) expect(names.has(forbidden)).toBe(false);
    expect(names.has('svelte')).toBe(true);
    expect(names.has('maplibre-gl')).toBe(true);
  });
});
