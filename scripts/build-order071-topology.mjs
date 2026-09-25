import {readFile,writeFile,mkdir} from 'node:fs/promises';
import crypto from 'node:crypto';
const source=JSON.parse(await readFile(new URL('../order071/source/santa-fe-osm-snapshot.json',import.meta.url),'utf8'));
const center={lon:-60.71,lat:-31.6555};
const metersPerDegLat=111320;
const metersPerDegLon=111320*Math.cos(center.lat*Math.PI/180);
const project=([lon,lat])=>[(lon-center.lon)*metersPerDegLon,(lat-center.lat)*metersPerDegLat];
function numericHeight(item){
  const tagged=Number.parseFloat(String(item.height||'').replace(',','.'));
  if(Number.isFinite(tagged)&&tagged>1&&tagged<300)return {height_m:tagged,height_source:'osm_tag_height'};
  const levels=Number.parseFloat(item.levels);
  if(Number.isFinite(levels)&&levels>0&&levels<100)return {height_m:Math.max(3,levels*3),height_source:'levels_inferred_3m'};
  return {height_m:9,height_source:'generic_inferred'};
}
const buildings=source.elements.filter(x=>x.kind==='building').map((item,index)=>({
  id:`osm-way-${item.osm_id}`,
  source:{osm_type:'way',osm_id:item.osm_id,osm_version:item.osm_version,osm_timestamp:item.osm_timestamp},
  footprint_m:item.coordinates.map(project),...numericHeight(item),lod_group:index%2
}));
const roads=source.elements.filter(x=>x.kind==='road').map(item=>({
  id:`osm-way-${item.osm_id}`,
  source:{osm_type:'way',osm_id:item.osm_id,osm_version:item.osm_version,osm_timestamp:item.osm_timestamp},
  class:item.highway||'road',line_m:item.coordinates.map(project)
}));
const chunk={schema_version:1,id:'santa-fe-centro-0',center,extent_m:[-180,-150,380,180],buildings,roads,draw_groups:{buildings:2,roads:1},generated_from:'order071/source/santa-fe-osm-snapshot.json'};
const chunkText=JSON.stringify(chunk);
const chunkSha=crypto.createHash('sha256').update(chunkText).digest('hex');
const manifest={schema_version:1,renderer:'three-lazy',lru_max:16,initial_chunks:[{id:chunk.id,url:'./chunk-santa-fe-centro-0.json',sha256:chunkSha}],geometry_source:{authority:source.provenance.authority,source_url:source.provenance.source_url,bbox:source.provenance.bbox,snapshot_at:source.provenance.fetched_at,osm_base_timestamp:source.provenance.osm_base_timestamp,license:source.provenance.license,attribution:source.provenance.attribution,runtime_queries:false},height_policy:{actual_height:'osm_tag_height',inferred_height:'levels_inferred_3m',missing_height_class:'generic_inferred',generic_height_m:9,claim:'Heights are source-tagged, inferred from levels, or generic; generic/inferred heights are never presented as measured.'}};
await mkdir(new URL('../public/3d/topology/',import.meta.url),{recursive:true});
await writeFile(new URL('../public/3d/topology/chunk-santa-fe-centro-0.json',import.meta.url),chunkText+'\n');
await writeFile(new URL('../public/3d/topology/manifest.json',import.meta.url),JSON.stringify(manifest,null,2)+'\n');
console.log(`BUILDINGS=${buildings.length}`);
console.log(`ROADS=${roads.length}`);
console.log(`CHUNK_SHA256=${chunkSha}`);
