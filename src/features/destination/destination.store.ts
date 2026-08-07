import { writable } from 'svelte/store';
import type { Destination } from './destination.types';
export const destination = writable<Destination | null>(null);
export const destinationResults = writable<Destination[]>([]);
export const destinationStatus = writable<'idle' | 'searching' | 'ready' | 'error'>('idle');
