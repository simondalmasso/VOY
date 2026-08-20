import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { ARGENTINA_PROVINCES } from '../src/core/territory';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Issue43 national public packaging', () => {
  test('root metadata positions VOY nationally without claiming nationwide local mobility coverage', () => {
    const html = read('index.html');
    expect(html).toContain('<title>VOY — Movilidad urbana para Argentina</title>');
    expect(html).toContain('Movilidad urbana para Argentina');
    expect(html).toContain('Santa Fe es la primera ciudad validada');
    expect(html).toContain('property="og:title"');
    expect(html).toContain('name="twitter:card"');
    expect(html).toContain('/social-card.svg');
    expect(html).not.toContain('Movilidad en Santa Fe</title>');
  });

  test('PWA manifest is national and keeps VOY as short name', () => {
    const manifest = JSON.parse(read('public/manifest.json')) as { name?: string; short_name?: string; description?: string; lang?: string };
    expect(manifest.name).toBe('VOY — Movilidad urbana para Argentina');
    expect(manifest.short_name).toBe('VOY');
    expect(manifest.lang).toBe('es-AR');
    expect(manifest.description).toContain('Santa Fe es la primera ciudad validada');
  });

  test('social preview is a hand-authored VOY SVG asset, not generated imagery', () => {
    const svg = read('public/social-card.svg');
    expect(svg).toContain('<svg');
    expect(svg).toContain('VOY — Movilidad urbana para Argentina');
    expect(svg).toContain('HECHO EN SANTA FE, ARGENTINA');
    expect(existsSync('public/social-card.png')).toBe(false);
  });

  test('README documents national base, Santa Fe reference city and deterministic policy', () => {
    const readme = read('README.md');
    expect(readme).toContain('Movilidad urbana para Argentina');
    expect(readme).toContain('Santa Fe ciudad');
    expect(readme).toContain('Resto del país');
    expect(readme).toContain('NO_VERIFIED_DATA != SERVICE_DOES_NOT_EXIST');
    expect(readme).toContain('La lógica canónica es determinista');
  });

  test('source matrix contains all 24 jurisdictions but authorizes no local operational coverage', () => {
    const matrix = read('docs/research/argentina-national-mobility-source-matrix-2026-08-20.md');
    for (const province of ARGENTINA_PROVINCES) {
      expect(matrix).toContain(`| ${province.id} | ${province.isoId} | ${province.name} |`);
    }
    expect(matrix).toContain('SOURCE_FOUND != OPERATIONAL_USE');
    expect(matrix).not.toMatch(/\|\s*YES\s*\|/);
  });

  test('production asset contract ships the social card and repository no longer tracks a root .env', () => {
    const assets = JSON.parse(read('config/production-assets.json')) as { public_source_allowlist?: { required_static_assets?: string[] } };
    expect(assets.public_source_allowlist?.required_static_assets).toContain('social-card.svg');
    expect(existsSync('.env')).toBe(false);
  });
});
