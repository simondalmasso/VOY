export interface Env {
  ASSETS: Fetcher;
  AI?: Ai;
  VOY_METRICS?: AnalyticsEngineDataset;
  NOMINATIM_COORDINATOR?: DurableObjectNamespace;
  VOY_VOICE_ENABLED?: string;
  VOY_BUILD_HASH?: string;
  VOY_GOOGLE_CLIENT_ID?: string;
  VOY_AUTH_SESSION_SECRET_V1?: string;
  [key: string]: unknown;
}
