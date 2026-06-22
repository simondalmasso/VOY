/**
 * sources.ts — Source registry + seed data for voy-scraper.
 *
 * LEGAL-ONLY / NON-INTRUSIVE POLICY
 * --------------------------------
 * This module declares *source descriptors* only. It does NOT trigger any
 * outbound network request. Real fetching against any URL listed here is a
 * TODO pending legal review (robots.txt, ToS, public-data status) by the
 * product/legal team.
 *
 * The descriptors below are *documented placeholders*: they describe where
 * public Santa Fe taxi/remis information is *expected* to live, so that when
 * legal clearance is granted the fetcher in index.ts can be pointed at them.
 *
 * Nothing here bypasses authentication, payswalls, captchas, or anti-bot
 * protections. There are no credentials, cookies, or auth headers stored.
 */

export type SourceType =
  | "public_municipal_website"
  | "official_whatsapp_catalog"
  | "published_phone_directory";

export interface SourceDescriptor {
  /** Stable id, e.g. "muni-santafe-transporte" */
  id: string;
  /** Human-readable name */
  name: string;
  /** Which kind of public source this is (matches spec.sources) */
  type: SourceType;
  /**
   * URL placeholder. May be a real public landing page, but is NOT fetched
   * in skeleton mode. Real fetching gated behind `enabled: false` until
   * legal review completes.
   */
  url: string;
  /** Provider types this source is expected to yield */
  yields: Array<"taxi" | "remis">;
  /** Whether the fetcher is allowed to call this URL yet. */
  enabled: boolean;
  /** Free-form notes: robots.txt status, ToS, format, cadence, etc. */
  notes: string;
}

/**
 * Santa Fe public source registry.
 *
 * These are documented placeholders. `enabled: false` for ALL of them in the
 * skeleton. Flipping any to `true` requires (a) legal sign-off, (b) a
 * robots.txt review logged in README.md, (c) confirmation that the data is
 * published for public reuse.
 */
export const SOURCE_REGISTRY: SourceDescriptor[] = [
  {
    id: "muni-santafe-transporte",
    name: "Municipalidad de Santa Fe — Área Transporte",
    type: "public_municipal_website",
    url: "https://www.santafeciudad.gob.ar/transporte/",
    yields: ["taxi", "remis"],
    enabled: false,
    notes:
      "Placeholder. Pending legal review of ToS + robots.txt before any GET. " +
      "Expected to publish the official register of taxi/remis license holders.",
  },
  {
    id: "muni-rosario-movilidad",
    name: "Municipalidad de Rosario — Movilidad Sustentable",
    type: "public_municipal_website",
    url: "https://www.rosario.gob.ar/web/movilidad",
    yields: ["taxi", "remis"],
    enabled: false,
    notes:
      "Placeholder. Documented for future regional expansion. Not fetched.",
  },
  {
    id: "whatsapp-catalog-radiotaxi-santafe",
    name: "Radiotaxi Santa Fe — WhatsApp Business Catalog (public link)",
    type: "official_whatsapp_catalog",
    url: "https://wa.me/5493420000000",
    yields: ["taxi"],
    enabled: false,
    notes:
      "Placeholder. Only the publicly-shared catalog link would be referenced. " +
      "No automation of WhatsApp messaging — that would violate ToS. Pending legal review.",
  },
  {
    id: "paginas-amarillas-remises-santafe",
    name: "Páginas Amarillas — Remises Santa Fe (public directory)",
    type: "published_phone_directory",
    url: "https://www.paginasamarillas.com.ar/buscar/q:remises/c:santa-fe/",
    yields: ["remis"],
    enabled: false,
    notes:
      "Placeholder. Public phone directory. ToS must be reviewed before any " +
      "automated polling; human-readable reuse may require a data license.",
  },
  {
    id: "guia-santafe-taxis",
    name: "Guía Telefónica Santa Fe — Taxis",
    type: "published_phone_directory",
    url: "https://www.guiasf.com.ar/taxis",
    yields: ["taxi"],
    enabled: false,
    notes: "Placeholder. Pending legal review of public-directory reuse rights.",
  },
];

/**
 * Raw seed record shape — what a future real fetcher would emit BEFORE
 * normalization. This mirrors what `normalizer.ts` expects to consume.
 */
export interface RawProviderRecord {
  id: string;
  name: string;
  type: "taxi" | "remis";
  phone?: string;
  whatsapp?: string;
  base_fare?: number;
  coverage?: string[];
  /** Source URL or catalog name. `seed/placeholder` for skeleton data. */
  source: string;
}

/**
 * Seed data — ~6 illustrative Santa Fe taxi/remis companies.
 *
 * These are well-known public names used as DOCUMENTED EXAMPLES only. They are
 * NOT real scraped data. Phone numbers are intentionally placeholder-shaped
 * (`+54 342 4XXX-XXXX`) to avoid implying verified contact data.
 *
 * `source: "seed/placeholder"` marks every record so downstream consumers can
 * distinguish seed data from any future real scrape output.
 */
export const SEED_PROVIDERS: RawProviderRecord[] = [
  {
    id: "radiotaxi-santafe",
    name: "Radiotaxi Santa Fe",
    type: "taxi",
    phone: "+54 342 4XXX-XXXX",
    whatsapp: "+54 9 342 4XXX-XXXX",
    base_fare: 1800,
    coverage: ["Centro", "Norte", "Sur", "Oeste"],
    source: "seed/placeholder",
  },
  {
    id: "remises-real",
    name: "Remises Real",
    type: "remis",
    phone: "+54 342 4XXX-XXXX",
    whatsapp: "+54 9 342 4XXX-XXXX",
    base_fare: 2100,
    coverage: ["citywide"],
    source: "seed/placeholder",
  },
  {
    id: "taxiapp-santafe",
    name: "TaxiApp Santa Fe",
    type: "taxi",
    phone: "+54 342 4XXX-XXXX",
    whatsapp: "+54 9 342 4XXX-XXXX",
    base_fare: 1900,
    coverage: ["Centro", "Costenlindo", "Guadalupe"],
    source: "seed/placeholder",
  },
  {
    id: "remis-centro-santafe",
    name: "Remis Centro Santa Fe",
    type: "remis",
    phone: "+54 342 4XXX-XXXX",
    base_fare: 2000,
    coverage: ["Centro"],
    source: "seed/placeholder",
  },
  {
    id: "radio-taxi-aeropuerto",
    name: "Radio Taxi Aeropuerto Santa Fe",
    type: "taxi",
    phone: "+54 342 4XXX-XXXX",
    whatsapp: "+54 9 342 4XXX-XXXX",
    base_fare: 2500,
    coverage: ["Aeropuerto Sauce Viejo", "citywide"],
    source: "seed/placeholder",
  },
  {
    id: "remises-25-de-mayo",
    name: "Remises 25 de Mayo",
    type: "remis",
    phone: "+54 342 4XXX-XXXX",
    base_fare: 1950,
    coverage: ["Sur", "Oeste"],
    source: "seed/placeholder",
  },
];

/**
 * Return the list of source descriptors that are *enabled* (i.e. cleared for
 * legal fetch). In skeleton mode this is always empty — no real fetching
 * occurs. The fetcher uses this list to decide whether to call any URL.
 */
export function getEnabledSources(): SourceDescriptor[] {
  return SOURCE_REGISTRY.filter((s) => s.enabled === true);
}
