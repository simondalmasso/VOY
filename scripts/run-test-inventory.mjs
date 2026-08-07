import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const inventoryPath = resolve(root, 'tests/test-inventory.json');
const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
const active = inventory.legacy_javascript_tests?.active ?? [];
const archived = inventory.legacy_javascript_tests?.archived ?? {};
const discoveredLegacy = readdirSync(resolve(root, '__tests__'))
  .filter(name => name.endsWith('.test.js'))
  .sort();
const activeSorted = [...active].sort();
const archivedNames = Object.keys(archived).sort();
const classified = [...activeSorted, ...archivedNames].sort();

const duplicates = classified.filter((name, index) => classified.indexOf(name) !== index);
if (duplicates.length) throw new Error(`Duplicate test inventory entries: ${[...new Set(duplicates)].join(', ')}`);
if (JSON.stringify(classified) !== JSON.stringify(discoveredLegacy)) {
  const missing = discoveredLegacy.filter(name => !classified.includes(name));
  const unknown = classified.filter(name => !discoveredLegacy.includes(name));
  throw new Error(`Test inventory mismatch; unclassified=${missing.join(',') || 'none'}; missing_files=${unknown.join(',') || 'none'}`);
}
for (const [name, reason] of Object.entries(archived)) {
  if (typeof reason !== 'string' || reason.trim().length < 20) throw new Error(`Archived test requires a material reason: ${name}`);
}
for (const name of active) {
  if (!discoveredLegacy.includes(name)) throw new Error(`Active test is absent: ${name}`);
}

const currentTests = readdirSync(resolve(root, 'tests'))
  .filter(name => name.endsWith('.test.ts'))
  .sort()
  .map(name => `tests/${name}`);
const activeLegacy = active.map(name => `__tests__/${name}`);
const executable = [...currentTests, ...activeLegacy];

console.log(JSON.stringify({
  result: 'TEST_INVENTORY_RECONCILED',
  current_typescript_files: currentTests.length,
  active_legacy_files: activeLegacy.length,
  archived_legacy_files: archivedNames.length,
  total_discovered_files: currentTests.length + discoveredLegacy.length,
  executable_files: executable.length,
  archived_files: archivedNames
}, null, 2));

const run = spawnSync('bun', ['test', ...executable], { cwd: root, stdio: 'inherit' });
if (run.error) throw run.error;
process.exit(run.status ?? 1);
