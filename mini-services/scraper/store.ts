/**
 * store.ts — Persists normalized Provider JSON to disk + reads it back.
 *
 * Part of voy-scraper (legal-only, non-intrusive skeleton).
 *
 * Output files (created on first write):
 *   /home/z/my-project/mini-services/scraper/data/taxis.json
 *   /home/z/my-project/mini-services/scraper/data/remises.json
 *
 * Both files contain a JSON array of `Provider` objects (see normalizer.ts).
 */

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Provider } from "./normalizer.ts";

const DATA_DIR = "/home/z/my-project/mini-services/scraper/data";
const TAXIS_FILE = join(DATA_DIR, "taxis.json");
const REMISES_FILE = join(DATA_DIR, "remises.json");

async function ensureDir(): Promise<void> {
  await mkdir(dirname(TAXIS_FILE), { recursive: true });
}

/** Atomically-ish write: write then rename would be ideal; here we write directly
 *  since the data volume is small and the API is read-after-write consistent. */
export async function writeProviders(
  taxis: Provider[],
  remises: Provider[],
): Promise<{ taxisPath: string; remisesPath: string }> {
  await ensureDir();
  const taxisJson = JSON.stringify(taxis, null, 2);
  const remisesJson = JSON.stringify(remises, null, 2);
  await Promise.all([writeFile(TAXIS_FILE, taxisJson, "utf8"), writeFile(REMISES_FILE, remisesJson, "utf8")]);
  return { taxisPath: TAXIS_FILE, remisesPath: REMISES_FILE };
}

async function readJsonArray(file: string): Promise<Provider[]> {
  try {
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as Provider[];
    return [];
  } catch {
    // File missing or invalid → empty array. The next scrape cycle will
    // repopulate it.
    return [];
  }
}

export async function readTaxis(): Promise<Provider[]> {
  return readJsonArray(TAXIS_FILE);
}

export async function readRemises(): Promise<Provider[]> {
  return readJsonArray(REMISES_FILE);
}

export const STORE_PATHS = {
  dataDir: DATA_DIR,
  taxisFile: TAXIS_FILE,
  remisesFile: REMISES_FILE,
} as const;
