import { writable } from 'svelte/store';
import type { TripState } from './trip.types';
export const trip = writable<TripState>({ origin: null, originLabel: 'Elegí tu origen', route: null, mode: 'app', loading: false, error: '' });
