export type CoverageKey = '_default' | 'santa-fe';
export type QuoteClass =
  | 'PROVIDER_LIVE_QUOTE'
  | 'REGULATED_FARE'
  | 'VOY_MARKET_ESTIMATE'
  | 'NEGOTIATED_FARE'
  | 'APP_ONLY'
  | 'NO_VERIFIED_PRICE';
export type CapabilityFreshness = 'VERIFIED_CURRENT' | 'VERIFIED_STALE' | 'UNVERIFIED' | 'UNAVAILABLE';

export interface ProviderCapability {
  id: string;
  name: string;
  category: 'app' | 'taxi' | 'remis' | 'transit';
  availability: CapabilityFreshness;
  quoteClass: QuoteClass;
  verifiedAt: string | null;
  expiresAt: string | null;
  source: string | null;
}

export interface TerritorialCapabilitySnapshot {
  coverageKey: CoverageKey;
  level: 'NATIONAL_BASE' | 'LOCAL_VERIFIED';
  providers: ProviderCapability[];
  publicTransport: CapabilityFreshness;
}

interface ProviderRecord {
  name?: string;
  available?: boolean;
  verified?: boolean;
  availability_status?: string;
  verified_at?: string;
  expires_at?: string;
  price_status?: string;
}
interface ProviderPayload { providers?: Record<string, ProviderRecord>; source?: string }
interface MeterRecord { source?: string; verified_at?: string; status?: string }
interface FarePayload { fare_registry?: { taxi?: MeterRecord; remis?: MeterRecord; bus?: MeterRecord } }

const cache = new Map<CoverageKey, Promise<{ providers: ProviderPayload; fares: FarePayload }>>();

function date(value: unknown): string | null {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function currentUntil(value: string | null): boolean {
  if (!value) return false;
  const timestamp = Date.parse(`${value}T23:59:59Z`);
  return Number.isFinite(timestamp) && timestamp >= Date.now();
}

async function registry(coverageKey: CoverageKey): Promise<{ providers: ProviderPayload; fares: FarePayload }> {
  const existing = cache.get(coverageKey);
  if (existing) return existing;
  const pending = Promise.all([
    fetch(`/cities/${coverageKey}/providers.json`, { cache: 'no-cache' }),
    fetch(`/cities/${coverageKey}/fares.json`, { cache: 'no-cache' })
  ]).then(async ([providers, fares]) => {
    if (!providers.ok || !fares.ok) throw new Error('capability_registry_unavailable');
    return { providers: await providers.json() as ProviderPayload, fares: await fares.json() as FarePayload };
  }).catch(error => { cache.delete(coverageKey); throw error; });
  cache.set(coverageKey, pending);
  return pending;
}

function appCapability(id: string, record: ProviderRecord | undefined, source: string | null): ProviderCapability {
  const verifiedAt = date(record?.verified_at);
  const expiresAt = date(record?.expires_at);
  const current = record?.available === true
    && record?.verified === true
    && record?.availability_status === 'verified_current'
    && Boolean(verifiedAt)
    && currentUntil(expiresAt);
  return {
    id,
    name: record?.name || id,
    category: 'app',
    availability: current ? 'VERIFIED_CURRENT' : record?.verified === true ? 'VERIFIED_STALE' : 'UNVERIFIED',
    quoteClass: record?.price_status === 'app_only' ? 'APP_ONLY' : 'NO_VERIFIED_PRICE',
    verifiedAt,
    expiresAt,
    source
  };
}

function regulatedCapability(id: 'taxi' | 'remis', record: MeterRecord | undefined): ProviderCapability {
  const verifiedAt = date(record?.verified_at);
  const current = record?.status === 'regulated_current' && Boolean(record?.source) && Boolean(verifiedAt);
  return {
    id,
    name: id === 'taxi' ? 'Taxi' : 'Remis',
    category: id,
    availability: current ? 'VERIFIED_CURRENT' : record?.status ? 'UNAVAILABLE' : 'UNVERIFIED',
    quoteClass: current ? 'REGULATED_FARE' : 'NO_VERIFIED_PRICE',
    verifiedAt,
    expiresAt: null,
    source: typeof record?.source === 'string' && record.source.trim() ? record.source : null
  };
}

export async function capabilitySnapshot(coverageKey: CoverageKey): Promise<TerritorialCapabilitySnapshot> {
  if (coverageKey === '_default') {
    return { coverageKey, level: 'NATIONAL_BASE', providers: [], publicTransport: 'UNAVAILABLE' };
  }
  const { providers, fares } = await registry('santa-fe');
  const source = typeof providers.source === 'string' ? providers.source : null;
  const items = [
    regulatedCapability('taxi', fares.fare_registry?.taxi),
    regulatedCapability('remis', fares.fare_registry?.remis),
    appCapability('uber', providers.providers?.uber, source),
    appCapability('didi', providers.providers?.didi, source)
  ];
  const bus = fares.fare_registry?.bus;
  const publicTransport: CapabilityFreshness = bus?.status === 'regulated_current' ? 'VERIFIED_CURRENT' : 'UNAVAILABLE';
  return { coverageKey, level: 'LOCAL_VERIFIED', providers: items, publicTransport };
}

export function clearCapabilityCacheForTests(): void {
  cache.clear();
}
