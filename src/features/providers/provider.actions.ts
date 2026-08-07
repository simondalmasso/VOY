import type { Coordinates } from '../../core/coordinates';
export interface ExternalAction { id: string; provider: 'uber' | 'didi'; url: string; expiresAt: number; used: boolean }
export function createExternalAction(provider: 'uber' | 'didi', origin: Coordinates, destination: Coordinates): ExternalAction {
  const url = provider === 'uber'
    ? `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${origin.lat}&pickup[longitude]=${origin.lon}&dropoff[latitude]=${destination.lat}&dropoff[longitude]=${destination.lon}`
    : 'https://web.didiglobal.com/ar/ciudades/santa-fe/';
  return { id: crypto.randomUUID(), provider, url, expiresAt: Date.now() + 60_000, used: false };
}
export function consumeExternalAction(action: ExternalAction): string {
  if (action.used || action.expiresAt < Date.now()) throw new Error('confirmation_expired_or_used');
  action.used = true;
  return action.url;
}
