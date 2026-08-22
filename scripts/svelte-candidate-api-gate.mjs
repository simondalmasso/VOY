#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
const base = process.env.WORKER_URL?.replace(/\/$/,'');
const worker = process.env.WORKER_NAME; const versionId = process.env.CANDIDATE_VERSION_ID; const hash = process.env.SHORT_SHA; const out = process.env.EVIDENCE_DIR;
if (!base || !worker || !versionId || !hash || !out) throw new Error('candidate_api_environment_missing');
const headers = { 'Cloudflare-Workers-Version-Overrides': `${worker}="${versionId}"`, 'Cache-Control': 'no-cache, no-store', Accept: 'application/json' };
async function json(path, options={}) { const response=await fetch(`${base}${path}`,{...options,headers:{...headers,...(options.headers||{})},signal:AbortSignal.timeout(25000)}); const body=await response.json(); return {response,body}; }
async function retryJson(path, predicate, attempts=3){ let result=null; for(let attempt=1;attempt<=attempts;attempt+=1){ result=await json(path); if(predicate(result))return result; await new Promise(r=>setTimeout(r,attempt*1000)); } return result; }
const health=await json('/api/health?api_gate=1');
if (health.response.status!==200 || health.body.version!=='V8.0.0' || health.body.build_hash!==hash || health.body.features?.collective_recommendations!==false || health.body.features?.core_without_login_voice_ai!==true || health.body.features?.national_territory!==true) throw new Error('health_contract_failed');
const auth=await json('/api/auth/session');
if (auth.response.status!==200 || auth.body.enabled!==false || auth.body.authenticated!==false || auth.body.trip_history_persisted!==false || auth.response.headers.get('set-cookie')) throw new Error('auth_safe_disabled_failed');
const invalid=await json('/api/route',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
if (invalid.response.status!==400 || invalid.body.error!=='invalid_route_request') throw new Error('route_invalid_gate_failed');
const cordoba=await retryJson('/api/territory?lat=-31.4201&lon=-64.1888', value=>value?.response?.status===200&&value?.body?.territory?.provinceId==='14');
if (!cordoba || cordoba.response.status!==200 || cordoba.body.ok!==true || cordoba.body.territory?.provinceId!=='14' || cordoba.body.territory?.provinceIsoId!=='AR-X' || cordoba.body.territory?.coverageKey!=='_default') throw new Error('national_territory_gate_failed');
const outside=await retryJson('/api/territory?lat=0&lon=0', value=>value?.response?.status===422);
if (!outside || outside.response.status!==422 || outside.body.error!=='territory_unresolved') throw new Error('non_argentina_fail_closed_gate_failed');
let valid=null;
for(let attempt=1;attempt<=3;attempt+=1){ valid=await json('/api/route',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({origin:{lat:-31.633,lon:-60.706},destination:{lat:-31.648,lon:-60.710},profile:'driving'})}); if(valid.response.status===200&&valid.body.ok===true)break; await new Promise(r=>setTimeout(r,attempt*1000)); }
if(!valid || valid.response.status!==200 || valid.body.ok!==true || valid.body.country!=='AR' || !Number.isFinite(valid.body.distance_km) || valid.body.distance_km<0 || !Array.isArray(valid.body.geometry) || valid.body.geometry.length<2) throw new Error('route_real_gate_failed');
const root=await fetch(`${base}/?api_gate=1`,{headers:{...headers,Accept:'text/html'},signal:AbortSignal.timeout(25000)}); const rootText=await root.text();
if(root.status!==200 || !rootText.includes('<div id="app"></div>') || !rootText.includes(`content="${hash}"`) || root.headers.get('set-cookie') || !String(root.headers.get('content-security-policy')).includes("frame-ancestors 'none'") || !String(root.headers.get('content-security-policy')).includes('https://accounts.google.com')) throw new Error('root_security_contract_failed');
const voice=await json('/api/voice/capabilities');
if(health.body.features.voice===true && (voice.response.status!==200 || voice.body.enabled!==true || voice.body.audio_persisted!==false || voice.body.transcript_logged!==false)) throw new Error('voice_capability_gate_failed');
const result={result:'PASS',health:health.body,auth:auth.body,territory:{cordoba:{province_id:cordoba.body.territory.provinceId,province_iso_id:cordoba.body.territory.provinceIsoId,coverage_key:cordoba.body.territory.coverageKey},non_argentina_status:outside.response.status},route:{distance_km:valid.body.distance_km,duration_min:valid.body.duration_min,geometry_points:valid.body.geometry.length},root:{status:root.status,csp:root.headers.get('content-security-policy'),set_cookie:false},voice_status:voice.response.status,verified_at:new Date().toISOString()};
writeFileSync(`${out}/api-gate.json`,JSON.stringify(result,null,2)+'\n'); console.log(JSON.stringify(result,null,2));
