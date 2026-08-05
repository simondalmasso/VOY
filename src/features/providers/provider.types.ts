import type { TravelMode } from '../../core/duration';
export type PriceDisplay =
  | { kind: 'regulated_estimate'; value: number; source: string; verifiedAt: string }
  | { kind: 'app_only'; label: string }
  | { kind: 'unavailable'; label: string };
export interface ProviderOptionModel {
  id: 'uber' | 'didi' | 'taxi' | 'remis' | 'walk' | 'bike' | 'bus';
  name: string;
  mode: TravelMode;
  available: boolean;
  etaMin: number;
  price: PriceDisplay;
  detail: string;
  external: boolean;
  rank: number;
}
