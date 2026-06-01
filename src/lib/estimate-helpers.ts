/**
 * Estimate Helpers — Haversine, pricing, duration, and factor utilities
 * for the mobility assistant price estimation system.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PriceBreakdown {
  low: number;
  high: number;
  estimate: number;
}

export interface EstimateFactors {
  weather: boolean;
  rushHour: boolean;
  weekendNight: boolean;
}

export interface EstimateResult {
  uber: PriceBreakdown;
  didi: PriceBreakdown;
  distanceKm: number;
  durationMin: number;
  confidence: "high" | "medium" | "low";
  factors: EstimateFactors;
  cheaper: "uber" | "didi" | "similar";
  deepLinks: {
    uber: string;
    didi: string;
  };
  advice: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Approximate Santa Fe, Argentina rates */
export const UBER_BASE = 150;
export const UBER_PER_KM = 120;
export const UBER_PER_MIN = 15;

export const DIDI_BASE = 130;
export const DIDI_PER_KM = 110;
export const DIDI_PER_MIN = 13;

/** Average city speed in km/h */
export const AVG_CITY_SPEED_KMH = 25;

/** Proximity threshold in km for matching historical rides */
export const PROXIMITY_KM = 0.5; // 500 m

/** Surge multipliers */
export const WEATHER_SURGE = 1.15;
export const RUSH_HOUR_SURGE = 1.2;
export const WEEKEND_NIGHT_SURGE = 1.3;

/** Range multipliers */
export const RANGE_LOW = 0.85;
export const RANGE_HIGH = 1.25;

/** Confidence thresholds */
export const CONFIDENCE_HIGH_THRESHOLD = 3;

// ─── Haversine ────────────────────────────────────────────────────────────────

/**
 * Calculate the great-circle distance between two coordinates using the
 * Haversine formula. Returns distance in kilometres.
 */
export function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Duration ─────────────────────────────────────────────────────────────────

/** Estimate duration in minutes based on distance and average city speed. */
export function estimateDuration(distanceKm: number): number {
  if (distanceKm <= 0) return 0;
  return (distanceKm / AVG_CITY_SPEED_KMH) * 60;
}

// ─── Base Price Calculation (distance-based) ─────────────────────────────────

export function calculateUberBasePrice(
  distanceKm: number,
  durationMin: number
): number {
  return UBER_BASE + UBER_PER_KM * distanceKm + UBER_PER_MIN * durationMin;
}

export function calculateDidiBasePrice(
  distanceKm: number,
  durationMin: number
): number {
  return DIDI_BASE + DIDI_PER_KM * distanceKm + DIDI_PER_MIN * durationMin;
}

// ─── Factor Detection ─────────────────────────────────────────────────────────

/**
 * Determine which surge factors apply based on current time and weather.
 * @param now       Current date/time (defaults to `new Date()`)
 * @param precipMm  Precipitation in mm from Open-Meteo (0 = no rain)
 */
export function detectFactors(
  now: Date = new Date(),
  precipMm: number = 0
): EstimateFactors {
  // Use Argentina timezone for consistent factor detection
  const timezone = 'America/Argentina/Buenos_Aires';
  const hourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false,
  }).format(now);
  const hour = parseInt(hourStr, 10);
  if (isNaN(hour)) {
    // Fallback to UTC - 3 (Argentina)
    const utcHour = now.getUTCHours();
    return detectFactorsFromHourDay((utcHour - 3 + 24) % 24, now.getUTCDay(), precipMm);
  }

  const dayName = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
  }).format(now);
  const dayMap: Record<string, number> = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
    Thursday: 4, Friday: 5, Saturday: 6,
  };
  const day = dayMap[dayName] ?? now.getDay();
  return detectFactorsFromHourDay(hour, day, precipMm);
}

function detectFactorsFromHourDay(
  hour: number,
  day: number,
  precipMm: number
): EstimateFactors {

  const weather = precipMm > 0;

  // Rush hour: 7-9 am or 5-7 pm on weekdays
  const rushHour =
    (hour >= 7 && hour < 9) || (hour >= 17 && hour < 19);

  // Weekend night: Fri or Sat, 22:00 – 01:59 (next day)
  // We treat 0-1 am as still belonging to the previous "night"
  const weekendNight =
    ((day === 5 || day === 6) && hour >= 22) ||
    ((day === 6 || day === 0) && hour < 2);

  return { weather, rushHour, weekendNight };
}

// ─── Composite Surge Multiplier ───────────────────────────────────────────────

/**
 * Apply all applicable surge multipliers. Factors are multiplied
 * cumulatively so combined conditions stack.
 */
export function applySurge(
  basePrice: number,
  factors: EstimateFactors
): number {
  let price = basePrice;
  if (factors.weather) price *= WEATHER_SURGE;
  if (factors.rushHour) price *= RUSH_HOUR_SURGE;
  if (factors.weekendNight) price *= WEEKEND_NIGHT_SURGE;
  return price;
}

// ─── Price Breakdown ─────────────────────────────────────────────────────────

export function buildPriceBreakdown(estimate: number): PriceBreakdown {
  return {
    low: Math.round(estimate * RANGE_LOW * 100) / 100,
    high: Math.round(estimate * RANGE_HIGH * 100) / 100,
    estimate: Math.round(estimate * 100) / 100,
  };
}

// ─── Which Is Cheaper? ───────────────────────────────────────────────────────

export function determineCheaper(
  uberEstimate: number,
  didiEstimate: number
): "uber" | "didi" | "similar" {
  const diff = Math.abs(uberEstimate - didiEstimate);
  const avg = (uberEstimate + didiEstimate) / 2;
  // If the difference is less than 5 % of the average, they're "similar"
  if (avg > 0 && diff / avg < 0.05) return "similar";
  return uberEstimate < didiEstimate ? "uber" : "didi";
}

// ─── Advice ───────────────────────────────────────────────────────────────────

export function generateAdvice(factors: EstimateFactors): string {
  if (factors.weekendNight) return "Precios normales para el horario";
  if (factors.rushHour && !factors.weather) return "Conviene esperar";
  if (!factors.rushHour && factors.weather) return "Pedí ahora";
  return "Precios normales";
}

// ─── Deep Links ───────────────────────────────────────────────────────────────

export function buildDeepLinks(
  originLat: number,
  originLon: number,
  originName: string,
  destLat: number,
  destLon: number,
  destName: string
): { uber: string; didi: string } {
  const uberLink =
    `https://m.uber.com/ul/?action=setPickup` +
    `&pickup[latitude]=${originLat}` +
    `&pickup[longitude]=${originLon}` +
    `&pickup[formatted_address]=${encodeURIComponent(originName)}` +
    `&dropoff[latitude]=${destLat}` +
    `&dropoff[longitude]=${destLon}` +
    `&dropoff[formatted_address]=${encodeURIComponent(destName)}`;

  const didiLink =
    `https://web.didiglobal.com/rider/?action=setPickup` +
    `&pickupLat=${originLat}` +
    `&pickupLng=${originLon}` +
    `&dropoffLat=${destLat}` +
    `&dropoffLng=${destLon}`;

  return { uber: uberLink, didi: didiLink };
}

// ─── Confidence Level ────────────────────────────────────────────────────────

export function determineConfidence(
  historicalCount: number
): "high" | "medium" | "low" {
  if (historicalCount >= CONFIDENCE_HIGH_THRESHOLD) return "high";
  if (historicalCount >= 1) return "medium";
  return "low";
}
