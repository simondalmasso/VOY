import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function sourceFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.(?:ts|js|svelte)$/.test(entry.name) ? [path] : [];
  });
}

describe('ORDER-046 retired interaction contract', () => {
  test('browser harness never targets retired #mode-walk and current walk contract is data-mode', () => {
    const findings = sourceFiles('browser-tests')
      .filter(path => readFileSync(path, 'utf8').includes('#mode-walk'));
    expect(findings).toEqual([]);

    const selector = readFileSync('src/components/ModeSelector.svelte', 'utf8');
    expect(selector).toContain("{ id: 'walk', label: 'A pie' }");
    expect(selector).toContain('data-mode={mode.id}');
  });
});
