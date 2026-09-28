import type { Coordinates } from '../../core/coordinates';
import { officialHandoffTarget, type OfficialHandoffKind } from './officialHandoffs';

export type ExternalActionKind = 'provider_app' | 'official_information';
export interface ExternalAction {
  id: string;
  kind: ExternalActionKind;
  provider: 'uber' | 'didi' | null;
  handoff: OfficialHandoffKind | null;
  authority: string | null;
  url: string;
  expiresAt: number;
  used: boolean;
}

export function createExternalAction(provider: 'uber' | 'didi', origin: Coordinates, destination: Coordinates): ExternalAction {
  const url = provider === 'uber'
    ? `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${origin.lat}&pickup[longitude]=${origin.lon}&dropoff[latitude]=${destination.lat}&dropoff[longitude]=${destination.lon}`
    : 'https://web.didiglobal.com/ar/ciudades/santa-fe/';
  return { id: crypto.randomUUID(), kind: 'provider_app', provider, handoff: null, authority: null, url, expiresAt: Date.now() + 60_000, used: false };
}

export function createOfficialHandoffAction(kind: OfficialHandoffKind): ExternalAction {
  const target = officialHandoffTarget(kind);
  return {
    id: crypto.randomUUID(),
    kind: 'official_information',
    provider: null,
    handoff: target.kind,
    authority: target.authority,
    url: target.url,
    expiresAt: Date.now() + 60_000,
    used: false
  };
}

export function consumeExternalAction(action: ExternalAction): string {
  if (action.used || action.expiresAt < Date.now()) throw new Error('confirmation_expired_or_used');
  action.used = true;
  return action.url;
}
