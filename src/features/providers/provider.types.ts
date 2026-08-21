import type { TravelMode } from '../../core/duration';
import type { OfficialHandoffPresentation } from './officialHandoffs';
export type PriceDisplay =
  | { kind: 'regulated_estimate'; value: number; source: string; verifiedAt: string }
  | { kind: 'app_only' }
  | { kind: 'unavailable'; label: string };
export interface ProviderOptionModel {
  id: 'uber' | 'didi' | 'taxi' | 'remis' | 'walk' | 'bike' | 'bus';
  name: string;
  mode: TravelMode;
  available: boolean;
  etaMin: number | null;
  price: PriceDisplay;
  detail: string;
  external: boolean;
  handoff?: OfficialHandoffPresentation | null;
  rank: number;
}
