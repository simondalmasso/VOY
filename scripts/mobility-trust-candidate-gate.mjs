#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
const base = process.env.WORKER_URL?.replace(/\/$/, '');
const worker = process.env.WORKER_NAME;
const versionId = process.env.CANDIDATE_VERSION_ID;
const out = process.env.EVIDENCE_DIR;
if (!base || !worker || !versionId || !out) throw new Error('mobility_trust_candidate_environment_missing');
const headers = { 'Cloudflare-Workers-Version-Overrides': `${worker}="${versionId}"`, 'Cache-Control': 'no-cache, no-store', Accept: 'application/json' };
const response = await fetch(`${base}/api/mobility/trust?candidate_gate=1`, { headers, signal: AbortSignal.timeout(25000) });
const body = await response.json();
if (response.status !== 200 || body.ok !== true) throw new Error('mobility_trust_http_failed');
if (body.operational_bus_activation !== false || body.santa_fe?.bus_activation !== false) throw new Error('bus_fail_closed_contract_failed');
if (body.mobility_database_role !== 'DISCOVERY_ONLY') throw new Error('mobility_database_role_failed');
if (body.gtfs_validator?.version !== '8.0.1' || body.gtfs_validator?.sha256 !== '19293ddd9b6f954f216d4f12054bd8a3232921751c4484339e339764a91000e2') throw new Error('gtfs_validator_pin_failed');
const bus = body.santa_fe?.sources?.find(source => source.source_id === 'santa-fe-urban-bus-public-feed');
if (!bus || bus.trust_status !== 'UNAVAILABLE' || bus.license_status !== 'UNKNOWN') throw new Error('santa_fe_bus_source_gate_failed');
const result = { result: 'PASS', status: response.status, bus_activation: false, validator: body.gtfs_validator, bus_source: { trust_status: bus.trust_status, license_status: bus.license_status }, verified_at: new Date().toISOString() };
writeFileSync(`${out}/mobility-trust-api-gate.json`, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
