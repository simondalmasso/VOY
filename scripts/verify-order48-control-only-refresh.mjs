import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CONTROL_ONLY_REFRESH_PATHS = Object.freeze([
  'config/source-attestations/santa-fe-official-transit-handoff.json',
  'docs/CURRENT_STATE.md'
]);

const allowed = new Set(CONTROL_ONLY_REFRESH_PATHS);
const attestationReference = 'config/source-attestations/santa-fe-official-transit-handoff.json';
const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const runtimeRoots = ['src', 'worker', 'public'];
const runtimeFiles = [
  'vite.config.ts',
  'package.json',
  'scripts/build-static-manifest.mjs',
  'scripts/check-bundle-budgets.mjs',
  'scripts/verify-production-assets.mjs'
];
const textExtensions = new Set(['.ts', '.js', '.mjs', '.cjs', '.json', '.jsonc', '.html', '.css', '.svelte', '.md']);

export function classifyControlOnlyPaths(paths) {
  const normalized = [...new Set(paths.filter(Boolean))].sort();
  const rejected = normalized.filter(path => !allowed.has(path));
  return {
    ok: rejected.length === 0,
    paths: normalized,
    rejected,
    allowed: [...CONTROL_ONLY_REFRESH_PATHS]
  };
}

async function collectTextFiles(root) {
  const files = [];
  async function walk(path) {
    let entries;
    try {
      entries = await readdir(path, { withFileTypes: true });
    } catch (error) {
      if (error?.code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) await walk(child);
      else if (entry.isFile() && textExtensions.has(extname(entry.name))) files.push(child);
    }
  }
  await walk(root);
  return files;
}

export async function findRuntimeAttestationReferences(root = repoRoot) {
  const candidates = [];
  for (const relativeRoot of runtimeRoots) {
    candidates.push(...await collectTextFiles(join(root, relativeRoot)));
  }
  candidates.push(...runtimeFiles.map(path => join(root, path)));

  const references = [];
  for (const path of candidates) {
    let source;
    try {
      source = await readFile(path, 'utf8');
    } catch (error) {
      if (error?.code === 'ENOENT') continue;
      throw error;
    }
    if (source.includes(attestationReference)) {
      references.push(path.slice(root.length + 1).replaceAll('\\', '/'));
    }
  }
  return references.sort();
}

function emit(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

async function runCli() {
  const args = process.argv.slice(2);
  const staticOnly = args.includes('--static-only');
  const baseIndex = args.indexOf('--base');
  const base = baseIndex >= 0 ? args[baseIndex + 1] : process.env.CANDIDATE_SOURCE_SHA;
  const references = await findRuntimeAttestationReferences(repoRoot);
  if (references.length) {
    emit({ result: 'FAIL', failure: 'runtime_imports_source_attestation', references });
    process.exitCode = 1;
    return;
  }

  if (staticOnly) {
    emit({ result: 'PASS', mode: 'STATIC_ONLY', runtime_attestation_references: [] });
    return;
  }

  if (!base) {
    emit({ result: 'FAIL', failure: 'control_only_base_sha_missing' });
    process.exitCode = 1;
    return;
  }

  let output;
  try {
    output = execFileSync('git', ['diff', '--name-only', `${base}..HEAD`], { cwd: repoRoot, encoding: 'utf8' });
  } catch (error) {
    emit({ result: 'FAIL', failure: 'control_only_git_diff_failed', error_message: String(error?.message ?? error) });
    process.exitCode = 1;
    return;
  }

  const classification = classifyControlOnlyPaths(output.split(/\r?\n/));
  if (!classification.ok) {
    emit({ result: 'FAIL', failure: 'runtime_or_control_change_requires_fresh_candidate', ...classification });
    process.exitCode = 1;
    return;
  }

  emit({
    result: 'PASS',
    mode: 'CONTROL_ONLY_REFRESH',
    candidate_source_sha: base,
    ...classification,
    runtime_attestation_references: []
  });
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath && invokedPath === fileURLToPath(import.meta.url)) {
  await runCli();
}
