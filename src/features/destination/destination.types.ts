import type { Coordinates } from '../../core/coordinates';
export type DestinationKind = 'poi' | 'address' | 'zone' | 'approximate';
export interface Destination {
  id: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  kind: DestinationKind;
  verified: boolean;
  source: string;
  verifiedAt?: string;
}
