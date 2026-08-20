#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
const base = process.env.WORKER_URL?.replace(/\/$/,'');
const worker = process.env.WORKER_NAME; const versionId = process.env.CANDIDATE_VERSION_ID; const hash = process.env.SHORT_SHA; const out = process.env.EVIDENCE_DIR;
if (!base || !worker || !versionId || !hash || !out) throw new Error('candidate_api_environment_missing');
const headers = { 'Cloudflare-Workers-Version-Overrides': `${worker}="${versionId}"`, 'Cache-Control': 'no-cache, no-store', Accept: 'application/json' };
async function json(path, options={}) { const response=await fetch(`${base}${path}`,{...options,headers:{...headers,...(options.headers||{})},signal:AbortSignal.timeout(25000)}); const body=await response.json(); return {response,body}; }
async function retry(label, operation, accept, attempts=3) {
  let last=null;
  for(let attempt=1;attempt<=attempts;attempt+=1){
    last=await operation();
    if(accept(last)) return last;
    if(attempt<attempts) await new Promise(r=>setTimeout(r,attempt*1000));
  }
  throw new Error(`${label}_failed:${last?.response?.status ?? 'unknown'}`);
}
const health=await json('/api/health?api_gate=1');
if (health.response.status!==200 || health.body.version!=='V8.0.0' || health.body.build_hash!==hash || health.body.features?.collective_recommendations!==false || health.body.features?.core_without_login_voice_ai!==true) throw new Error('health_contract_failed');
const auth=await json('/api/auth/session');
if (auth.response.status!==200 || auth.body.enabled!==false || auth.body.authenticated!==false || auth.response.headers.get('set-cookie')) throw new Error('auth_safe_disabled_failed');
const invalid=await json('/api/route',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
if (invalid.response.status!==400 || invalid.body.error!=='invalid_route_request') throw new Error('route_invalid_gate_failed');

const territoryCases=[
  ['santa_fe','-31.633','-60.706','AR-S'],
  ['cordoba','-31.4167','-64.1833','AR-X'],
  ['caba','-34.6037','-58.3816','AR-C'],
  ['la_plata','-34.9214','-57.9544','AR-B']
];
const territoryProof={};
for(const [label,lat,lon,iso] of territoryCases){
  const result=await retry(`territory_${label}`,()=>json(`/api/territory?lat=${lat}&lon=${lon}&api_gate=1`),r=>r.response.status===200&&r.body.ok===true&&r.body.territory?.countryId==='AR'&&r.body.territory?.provinceIsoId===iso);
  territoryProof[label]={province_iso_id:result.body.territory.provinceIsoId,province_name:result.body.territory.provinceName,locality_name:result.body.territory.localityName||null,coverage_key:result.body.territory.coverageKey};
}
if(territoryProof.caba.province_iso_id===territoryProof.la_plata.province_iso_id) throw new Error('caba_pba_identity_collapsed');

const outside=await retry('route_outside_argentina',()=>json('/api/route',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({origin:{lat:-34.9011,lon:-56.1645},destination:{lat:-34.6037,lon:-58.3816},profile:'driving'})}),r=>r.response.status===422&&r.body.error==='territory_unresolved');
if(outside.body.fallback!=='straight_line_estimate') throw new Error('outside_argentina_fallback_contract_failed');

const valid=await retry('route_cross_province',()=>json('/api/route',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({origin:{lat:-34.6037,lon:-58.3816},destination:{lat:-34.9214,lon:-57.9544},profile:'driving'})}),r=>r.response.status===200&&r.body.ok===true&&r.body.country==='AR'&&r.body.origin_territory?.province_iso_id==='AR-C'&&r.body.destination_territory?.province_iso_id==='AR-B'&&Number.isFinite(r.body.distance_km)&&r.body.distance_km>=0&&Array.isArray(r.body.geometry)&&r.body.geometry.length>=2);

const geocode=await retry('geocode_caba',()=>json('/api/geocode?q=Av.%20Corrientes%201000%2C%20Ciudad%20Aut%C3%B3noma%20de%20Buenos%20Aires&province=Ciudad%20Aut%C3%B3noma%20de%20Buenos%20Aires&api_gate=1'),r=>r.response.status===200&&r.body.country==='AR'&&Array.isArray(r.body.results)&&r.body.results.some(item=>item.routeEligible===true&&item.territoryVerified===true&&item.territory?.provinceIsoId==='AR-C'));
const geocodeCandidate=geocode.body.results.find(item=>item.routeEligible===true&&item.territoryVerified===true&&item.territory?.provinceIsoId==='AR-C');

const root=await fetch(`${base}/?api_gate=1`,{headers:{...headers,Accept:'text/html'},signal:AbortSignal.timeout(25000)}); const rootText=await root.text();
if(root.status!==200 || !rootText.includes('<div id="app"></div>') || !rootText.includes(`content="${hash}"`) || !rootText.includes('VOY — Movilidad urbana para Argentina') || root.headers.get('set-cookie') || !String(root.headers.get('content-security-policy')).includes("frame-ancestors 'none'")) throw new Error('root_security_contract_failed');
const voice=await json('/api/voice/capabilities');
if(health.body.features.voice===true && (voice.response.status!==200 || voice.body.enabled!==true || voice.body.audio_persisted!==false || voice.body.transcript_logged!==false)) throw new Error('voice_capability_gate_failed');
const result={result:'PASS',health:health.body,auth:auth.body,territories:territoryProof,geocode:{name:geocodeCandidate.name,province_iso_id:geocodeCandidate.territory.provinceIsoId,route_eligible:true},route:{distance_km:valid.body.distance_km,duration_min:valid.body.duration_min,geometry_points:valid.body.geometry.length,origin_province_iso_id:valid.body.origin_territory.province_iso_id,destination_province_iso_id:valid.body.destination_territory.province_iso_id},outside_argentina:{status:outside.response.status,error:outside.body.error},root:{status:root.status,csp:root.headers.get('content-security-policy'),set_cookie:false,national_branding:true},voice_status:voice.response.status,verified_at:new Date().toISOString()};
writeFileSync(`${out}/api-gate.json`,JSON.stringify(result,null,2)+'\n'); console.log(JSON.stringify(result,null,2));
