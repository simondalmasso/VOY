import type { Coordinates } from '../../core/coordinates';
import type { TravelMode } from '../../core/duration';
export interface RouteResult {
  source: 'osrm_route' | 'straight_line_estimate';
  distanceKm: number;
  durationMin: number;
  geometry: Coordinates[];
}
export interface TripState {
  origin: Coordinates | null;
  originLabel: string;
  route: RouteResult | null;
  mode: TravelMode;
  loading: boolean;
  error: string;
}
