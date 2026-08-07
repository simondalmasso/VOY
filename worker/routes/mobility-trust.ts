import { GTFS_VALIDATOR } from '../../src/core/mobilityTrust';
import { SANTA_FE_MOBILITY_TRUST_SUMMARY } from '../../src/core/santaFeMobilityRegistry';

export function handleMobilityTrust(request: Request): Response {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json; charset=utf-8', Allow: 'GET', 'Cache-Control': 'no-store' }
    });
  }
  return new Response(JSON.stringify({
    ok: true,
    operational_bus_activation: false,
    mobility_database_role: 'DISCOVERY_ONLY',
    gtfs_validator: { name: GTFS_VALIDATOR.name, version: GTFS_VALIDATOR.version, sha256: GTFS_VALIDATOR.sha256 },
    santa_fe: SANTA_FE_MOBILITY_TRUST_SUMMARY
  }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
