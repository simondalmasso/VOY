const points={
 c016:{lat:-31.7082249,lon:-60.8094188,claim:'Sauce Viejo / Santa Fe'},
 c076:{lat:-32.8946844,lon:-68.8302139,claim:'Guaymallén / Mendoza'},
 c080:{lat:-32.9011023,lon:-68.7991067,claim:'Guaymallén / Mendoza'},
 c089:{lat:-34.5594554,lon:-58.4143637,claim:'province id 02 Ciudad Autónoma de Buenos Aires'},
 c092:{lat:-34.6388581,lon:-58.3605058,claim:'province id 02 Ciudad Autónoma de Buenos Aires'},
 c123:{lat:-32.8946844,lon:-68.8302139,claim:'Guaymallén / Mendoza'}
};
const out={generated_at:new Date().toISOString(),authority:'Argentina.gob.ar / GeoRef API v2.0',endpoint:'https://apis.datos.gob.ar/georef/api/v2.0/ubicacion',proofs:{}};
for(const [id,p] of Object.entries(points)){
 const u=new URL(out.endpoint);u.searchParams.set('lat',p.lat);u.searchParams.set('lon',p.lon);
 const r=await fetch(u);out.proofs[id]={status:r.status,coordinates:{lat:p.lat,lon:p.lon},claim:p.claim,response:await r.json()};
}
{
 const q=new URL('https://photon.komoot.io/api');q.searchParams.set('q','Ciudad Universitaria Santa Fe');q.searchParams.set('countrycode','AR');q.searchParams.set('limit','1');
 const pr=await fetch(q);const pj=await pr.json();const c=pj.features?.[0]?.geometry?.coordinates; if(c){const u=new URL(out.endpoint);u.searchParams.set('lat',c[1]);u.searchParams.set('lon',c[0]);const r=await fetch(u);out.proofs.c032={status:r.status,coordinates:{lat:c[1],lon:c[0]},claim:'Santa Fe / Santa Fe',discovery_reference:'Ciudad Universitaria Santa Fe',response:await r.json()};}
}
await import('node:fs/promises').then(fs=>fs.writeFile('order056/corpus/corpus-v2-corrections-official-proof.json',JSON.stringify(out,null,2)+'\n'));
console.log(JSON.stringify(Object.fromEntries(Object.entries(out.proofs).map(([k,v])=>[k,{status:v.status,ubicacion:v.response?.ubicacion}])) ,null,2));
