import type { Coordinates } from '../../core/coordinates';
import type { TerritoryContext } from '../../core/territory';

export type DestinationKind = 'poi' | 'address' | 'zone' | 'approximate';
export type DestinationConfidence = 'authoritative' | 'unverified';

export interface DestinationProvenance {
  status: 'authoritative';
  issuer: string;
  sourceTitle: string;
  sourceUrl: string;
  license: string;
  coordinateMethod: string;
  coordinateSourceUrl: string;
}

export interface Destination {
  id: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  kind: DestinationKind;
  verified: boolean;
  operational: boolean;
  confidence: DestinationConfidence;
  routeEligible: boolean;
  territoryVerified: boolean;
  territory: TerritoryContext | null;
  coverageKey: '_default' | 'santa-fe';
  source: string;
  verifiedAt?: string;
  provenance?: DestinationProvenance;
}
