/**
 * normalizer.ts — Normalizes raw provider records into the output schema.
 *
 * Part of voy-scraper (legal-only, non-intrusive skeleton).
 *
 * The normalizer is a PURE function module: no I/O, no fetch, no side effects.
 * It takes `RawProviderRecord` (from sources.ts) and returns a `Provider`
 * matching the normalized output schema declared in the spec.
 */

import type { RawProviderRecord } from "./sources.ts";

/** Normalized output schema (shared by taxis + remises). */
export interface Provider {
  /** slug, e.g. "radiotaxi-santafe" */
  id: string;
  /** Display name, e.g. "Radiotaxi Santa Fe" */
  name: string;
  type: "taxi" | "remis";
  /** E.164 or local format, if publicly published */
  phone?: string;
  /** WhatsApp contact, if publicly published */
  whatsapp?: string;
  /** ARS, if publicly published */
  base_fare?: number;
  /** Neighborhoods or ["citywide"] */
  coverage?: string[];
  /** URL or catalog name where the record was sourced from */
  source: string;
  /** ISO 8601 timestamp of normalization */
  updated_at: string;
}

/**
 * Normalize a single raw record. Trims strings, drops empty arrays,
 * coerces numeric fares, and stamps `updated_at` with the provided timestamp
 * (defaults to `new Date().toISOString()`).
 */
export function normalizeOne(
  raw: RawProviderRecord,
  now: Date = new Date(),
): Provider {
  const trim = (s: string | undefined): string | undefined => {
    if (s == null) return undefined;
    const t = s.trim();
    return t.length === 0 ? undefined : t;
  };

  const phone = trim(raw.phone);
  const whatsapp = trim(raw.whatsapp);
  const source = trim(raw.source) ?? "unknown";

  let base_fare: number | undefined;
  if (typeof raw.base_fare === "number" && Number.isFinite(raw.base_fare) && raw.base_fare >= 0) {
    base_fare = Math.round(raw.base_fare);
  }

  let coverage: string[] | undefined;
  if (Array.isArray(raw.coverage) && raw.coverage.length > 0) {
    const cleaned = raw.coverage
      .map((c) => (typeof c === "string" ? c.trim() : ""))
      .filter((c) => c.length > 0);
    coverage = cleaned.length > 0 ? cleaned : undefined;
  }

  const id = (raw.id ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const name = (raw.name ?? "").trim();

  return {
    id: id.length > 0 ? id : `provider-${Math.random().toString(36).slice(2, 10)}`,
    name: name.length > 0 ? name : "Unknown provider",
    type: raw.type === "remis" ? "remis" : "taxi",
    ...(phone ? { phone } : {}),
    ...(whatsapp ? { whatsapp } : {}),
    ...(base_fare != null ? { base_fare } : {}),
    ...(coverage ? { coverage } : {}),
    source,
    updated_at: now.toISOString(),
  };
}

/** Normalize an array of raw records, splitting by type. */
export function normalizeBatch(
  raws: RawProviderRecord[],
  now: Date = new Date(),
): { taxis: Provider[]; remises: Provider[] } {
  const taxis: Provider[] = [];
  const remises: Provider[] = [];
  for (const r of raws) {
    const p = normalizeOne(r, now);
    if (p.type === "remis") remises.push(p);
    else taxis.push(p);
  }
  return { taxis, remises };
}
