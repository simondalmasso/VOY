import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DATASET_SLUG='estaciones-de-trenes-y-servicios-activos-a-2022';
const DATASET_API=`https://datos.gob.ar/api/3/action/package_show?id=${DATASET_SLUG}`;

async function json(url){
  const r=await fetch(url,{headers:{accept:'application/json','user-agent':'VOY-ORDER057-RailCatalogGenerator/1.0'}});
  if(!r.ok)throw new Error(`fetch_failed ${r.status} ${url}`);
  return r.json();
}

function finite(v){const n=Number(v);return Number.isFinite(n)?n:null}

const metaPayload=await json(DATASET_API);
if(!metaPayload?.success||!metaPayload?.result)throw new Error('dataset_metadata_invalid');
const dataset=metaPayload.result;
if(String(dataset.license_title).toUpperCase()!=='CC-BY-4.0')throw new Error(`unexpected_license ${dataset.license_title}`);
const resource=(dataset.resources||[]).find(r=>String(r.format).toUpperCase()==='JSON'&&/Estaciones FFCC 2022/i.test(String(r.name||'')));
if(!resource?.url)throw new Error('json_resource_missing');
const geo=await json(resource.url);
const stations=(geo.features||[]).map(feature=>{
  const p=feature?.properties||{};
  const lat=finite(p.lat??feature?.geometry?.coordinates?.[1]);
  const lon=finite(p.long??feature?.geometry?.coordinates?.[0]);
  if(p.gna!=='Estación'||!p.nam||!p['línea']||lat===null||lon===null)return null;
  return {
    catalog_id:Number.isFinite(Number(p.id))?Number(p.id):String(p.id??feature.id),
    name:String(p.nam).trim(),
    line:String(p['línea']).trim(),
    branch:null,
    operator:p.caa==null?null:String(p.caa).trim(),
    lat,
    lon,
    source_id:'src_rail_station_catalog_2022'
  };
}).filter(Boolean).sort((a,b)=>String(a.catalog_id).localeCompare(String(b.catalog_id),undefined,{numeric:true})||a.name.localeCompare(b.name,'es'));
if(stations.length<350)throw new Error(`station_count_too_low ${stations.length}`);
const outMeta={
  schema_version:1,
  dataset_id:String(dataset.id),
  dataset_slug:DATASET_SLUG,
  title:String(dataset.title),
  canonical_dataset_url:`https://datos.gob.ar/api/3/action/package_show?id=${dataset.id}`,
  resource_id:String(resource.id),
  resource_url:String(resource.url),
  license:String(dataset.license_title).replace('CC-BY-4.0','CC-BY-4.0'),
  data_as_of:'2022',
  resource_last_modified:resource.last_modified??null,
  metadata_modified:dataset.metadata_modified??null,
  station_count:stations.length,
  scope:'IDENTITY_GEOMETRY_ONLY_NO_CURRENT_SERVICE_CLAIMS'
};
const body=`export const RAIL_STATION_CATALOG_META=${JSON.stringify(outMeta)};\nexport const RAIL_STATIONS=${JSON.stringify(stations)};\n`;
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const target=path.join(root,'src','rail-stations.generated.js');
await writeFile(target,body,'utf8');
console.log(JSON.stringify({target,station_count:stations.length,license:outMeta.license,resource_id:outMeta.resource_id},null,2));
