const BASE = process.env.TEST_URL || 'http://localhost:3000';

async function main() {
  // Health check first
  console.log("=== HEALTH ===");
  const health = await fetch(`${BASE}/api/health`);
  console.log("Status:", health.status, await health.text());
  
  // Single ride
  console.log("\n=== SINGLE RIDE ===");
  const ride = await fetch(`${BASE}/api/rides`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({originLat:-33.5,originLon:-59.5,originName:"Test1",destLat:-33.51,destLon:-59.51,destName:"Dest1_"+Date.now(),transport:"other"})
  });
  console.log("Status:", ride.status, await ride.text());
  
  // Duplicate ride (should be 409)
  console.log("\n=== DUPLICATE RIDE ===");
  const dup = await fetch(`${BASE}/api/rides`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({originLat:-33.5,originLon:-59.5,originName:"Test1",destLat:-33.51,destLon:-59.51,destName:"Dest1_same",transport:"other"})
  });
  const dup2 = await fetch(`${BASE}/api/rides`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({originLat:-33.5,originLon:-59.5,originName:"Test1",destLat:-33.51,destLon:-59.51,destName:"Dest1_same",transport:"other"})
  });
  console.log("Status:", dup.status, await dup.text());
  console.log("Status:", dup2.status, await dup2.text());
  
  // Concurrency (10 parallel)
  console.log("\n=== CONCURRENCY (10 parallel) ===");
  const payload = {originLat:-33.5,originLon:-59.5,originName:"ConcTest",destLat:-33.51,destLon:-59.51,destName:"ConcDest_"+Date.now(),transport:"other"};
  const concPromises = Array.from({length:10}, () =>
    fetch(`${BASE}/api/rides`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)})
      .then(r => r.status)
      .catch(() => 0)
  );
  const concResults = await Promise.all(concPromises);
  const counts: Record<number, number> = {};
  concResults.forEach(s => { counts[s] = (counts[s]||0)+1; });
  console.log("Status counts:", JSON.stringify(counts));
  
  // Predict
  console.log("\n=== PREDICT ===");
  const pred = await fetch(`${BASE}/api/predict?lat=-31.6256&lon=-60.7087`);
  console.log("Status:", pred.status, (await pred.text()).substring(0, 200));
  
  // Failure injection (10 invalid payloads)
  console.log("\n=== FAILURE INJECTION ===");
  const failPromises = Array.from({length:10}, () =>
    fetch(`${BASE}/api/rides`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({originLat:null,originLon:null})})
      .then(r => r.status)
      .catch(() => 0)
  );
  const failResults = await Promise.all(failPromises);
  const failCounts: Record<number, number> = {};
  failResults.forEach(s => { failCounts[s] = (failCounts[s]||0)+1; });
  console.log("Status counts:", JSON.stringify(failCounts));
}

main().catch(console.error);
