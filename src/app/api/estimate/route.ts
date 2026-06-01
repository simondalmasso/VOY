import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchPrecipitation } from "@/lib/weather";
import {
  haversine,
  estimateDuration,
  calculateUberBasePrice,
  calculateDidiBasePrice,
  detectFactors,
  applySurge,
  buildPriceBreakdown,
  determineCheaper,
  generateAdvice,
  buildDeepLinks,
  determineConfidence,
  PROXIMITY_KM,
  type EstimateResult,
} from "@/lib/estimate-helpers";

// ─── Input Validation ────────────────────────────────────────────────────────

interface EstimateInput {
  originLat: number;
  originLon: number;
  originName?: string;
  destLat: number;
  destLon: number;
  destName?: string;
}

function validateInput(body: unknown): {
  ok: true;
  data: EstimateInput;
} | {
  ok: false;
  error: string;
} {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object" };
  }

  const raw = body as Record<string, unknown>;

  const numFields: (keyof EstimateInput)[] = [
    "originLat",
    "originLon",
    "destLat",
    "destLon",
  ];

  for (const field of numFields) {
    const val = raw[field];
    if (val === undefined || val === null) {
      return { ok: false, error: `Missing required field: ${field}` };
    }
    const num = Number(val);
    if (isNaN(num)) {
      return { ok: false, error: `Field "${field}" must be a valid number` };
    }
  }

  const originLat = Number(raw.originLat);
  const originLon = Number(raw.originLon);
  const destLat = Number(raw.destLat);
  const destLon = Number(raw.destLon);

  // Latitude: -90 to 90
  if (originLat < -90 || originLat > 90) {
    return { ok: false, error: "originLat must be between -90 and 90" };
  }
  if (destLat < -90 || destLat > 90) {
    return { ok: false, error: "destLat must be between -90 and 90" };
  }

  // Longitude: -180 to 180
  if (originLon < -180 || originLon > 180) {
    return { ok: false, error: "originLon must be between -180 and 180" };
  }
  if (destLon < -180 || destLon > 180) {
    return { ok: false, error: "destLon must be between -180 and 180" };
  }

  return {
    ok: true,
    data: {
      originLat,
      originLon,
      originName: typeof raw.originName === "string" ? raw.originName : "",
      destLat,
      destLon,
      destName: typeof raw.destName === "string" ? raw.destName : "",
    },
  };
}

// ─── Historical Data Lookup ───────────────────────────────────────────────────

interface HistoricalAggregate {
  avgUber: number | null;
  avgDidi: number | null;
  avgDistance: number | null;
  count: number;
}

async function findHistoricalData(
  originLat: number,
  originLon: number,
  destLat: number,
  destLon: number
): Promise<HistoricalAggregate> {
  try {
    // Fetch recent rides — we'll filter by proximity in JS because
    // SQLite doesn't support spatial queries.
    // We fetch a generous bounding box to reduce data transfer.
    const latDelta = PROXIMITY_KM / 111; // ~1° ≈ 111 km
    const lonDelta = PROXIMITY_KM / (111 * Math.cos((originLat * Math.PI) / 180));

    const rides = await db.ride.findMany({
      where: {
        originLat: {
          gte: originLat - latDelta,
          lte: originLat + latDelta,
        },
        originLon: {
          gte: originLon - lonDelta,
          lte: originLon + lonDelta,
        },
        destLat: {
          gte: destLat - latDelta,
          lte: destLat + latDelta,
        },
        destLon: {
          gte: destLon - lonDelta,
          lte: destLon + lonDelta,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Precise proximity filter
    const nearby = rides.filter((r) => {
      const originDist = haversine(originLat, originLon, r.originLat, r.originLon);
      const destDist = haversine(destLat, destLon, r.destLat, r.destLon);
      return originDist <= PROXIMITY_KM && destDist <= PROXIMITY_KM;
    });

    if (nearby.length === 0) {
      return { avgUber: null, avgDidi: null, avgDistance: null, count: 0 };
    }

    const uberPrices = nearby
      .map((r) => r.priceUber)
      .filter((p): p is number => p !== null);
    const didiPrices = nearby
      .map((r) => r.priceDidi)
      .filter((p): p is number => p !== null);
    const distances = nearby
      .map((r) => r.distanceKm)
      .filter((d): d is number => d !== null);

    const avg = (arr: number[]) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

    return {
      avgUber: avg(uberPrices),
      avgDidi: avg(didiPrices),
      avgDistance: avg(distances),
      count: nearby.length,
    };
  } catch {
    // Database error — fall back to distance-based estimation
    return { avgUber: null, avgDidi: null, avgDistance: null, count: 0 };
  }
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // 1. Parse & validate input
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const validation = validateInput(body);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { originLat, originLon, originName, destLat, destLon, destName } =
      validation.data;

    // 2. Calculate distance
    const distanceKm = haversine(originLat, originLon, destLat, destLon);

    if (distanceKm <= 0) {
      // Same origin and destination
      return NextResponse.json(
        {
          uber: { low: 0, high: 0, estimate: 0 },
          didi: { low: 0, high: 0, estimate: 0 },
          distanceKm: 0,
          durationMin: 0,
          confidence: "low" as const,
          factors: { weather: false, rushHour: false, weekendNight: false },
          cheaper: "similar" as const,
          deepLinks: buildDeepLinks(
            originLat,
            originLon,
            originName || "",
            destLat,
            destLon,
            destName || ""
          ),
          advice: "Precios normales",
        } satisfies EstimateResult
      );
    }

    const durationMin = estimateDuration(distanceKm);

    // 3. Fetch weather & detect factors
    const precipMm = await fetchPrecipitation(
      (originLat + destLat) / 2,
      (originLon + destLon) / 2
    );
    const factors = detectFactors(new Date(), precipMm);

    // 4. Look up historical data
    const historical = await findHistoricalData(
      originLat,
      originLon,
      destLat,
      destLon
    );

    // 5. Calculate prices
    let uberEstimate: number;
    let didiEstimate: number;
    let effectiveDistance = distanceKm;
    let effectiveDuration = durationMin;

    if (historical.avgUber !== null && historical.avgDidi !== null) {
      // Use historical prices as base, then apply current surge factors
      uberEstimate = historical.avgUber;
      didiEstimate = historical.avgDidi;

      // Use historical distance if available, otherwise calculated
      if (historical.avgDistance !== null) {
        effectiveDistance = historical.avgDistance;
        effectiveDuration = estimateDuration(effectiveDistance);
      }

      // Apply surge factors to historical base prices
      uberEstimate = applySurge(uberEstimate, factors);
      didiEstimate = applySurge(didiEstimate, factors);
    } else if (historical.avgUber !== null) {
      // Partial historical data — use what we have
      uberEstimate = applySurge(historical.avgUber, factors);
      didiEstimate = applySurge(
        calculateDidiBasePrice(distanceKm, durationMin),
        factors
      );

      if (historical.avgDistance !== null) {
        effectiveDistance = historical.avgDistance;
        effectiveDuration = estimateDuration(effectiveDistance);
      }
    } else if (historical.avgDidi !== null) {
      // Partial historical data — use what we have
      uberEstimate = applySurge(
        calculateUberBasePrice(distanceKm, durationMin),
        factors
      );
      didiEstimate = applySurge(historical.avgDidi, factors);

      if (historical.avgDistance !== null) {
        effectiveDistance = historical.avgDistance;
        effectiveDuration = estimateDuration(effectiveDistance);
      }
    } else {
      // No historical data — pure distance-based estimation
      uberEstimate = applySurge(
        calculateUberBasePrice(distanceKm, durationMin),
        factors
      );
      didiEstimate = applySurge(
        calculateDidiBasePrice(distanceKm, durationMin),
        factors
      );
    }

    // 6. Build response
    const confidence = determineConfidence(historical.count);
    const cheaper = determineCheaper(uberEstimate, didiEstimate);
    const advice = generateAdvice(factors);
    const deepLinks = buildDeepLinks(
      originLat,
      originLon,
      originName || "",
      destLat,
      destLon,
      destName || ""
    );

    const result: EstimateResult = {
      uber: buildPriceBreakdown(uberEstimate),
      didi: buildPriceBreakdown(didiEstimate),
      distanceKm: Math.round(effectiveDistance * 100) / 100,
      durationMin: Math.round(effectiveDuration * 10) / 10,
      confidence,
      factors,
      cheaper,
      deepLinks,
      advice,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("[estimate] Unhandled error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
