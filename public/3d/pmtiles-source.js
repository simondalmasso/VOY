import {PMTiles,Protocol} from '/vendor/pmtiles.mjs';
const MAX_RANGE=4*1024*1024;
const ATTRIBUTION='\u00A9 OpenStreetMap contributors; \u00A9 Overture Maps Foundation';
let activeProtocol=null;
class QueryRangeSource {
  constructor(url){this.url=url;}
  getKey(){return this.url;}
  async getBytes(offset,length,signal){
    if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(length)||length<1||length>MAX_RANGE)throw new Error('pmtiles_range_invalid');
    const end=offset+length-1;
    if(!Number.isSafeInteger(end)||end<offset)throw new Error('pmtiles_range_invalid');
    const url=new URL(this.url);
    url.searchParams.set('pmtilesOffset',String(offset));
    url.searchParams.set('pmtilesLength',String(length));
    const response=await fetch(url,{signal,headers:{Range:'bytes='+offset+'-'+end,Accept:'application/vnd.pmtiles, application/octet-stream','Accept-Encoding':'identity'}});
    if(response.status!==206)throw new Error('pmtiles_range_http_'+response.status);
    const range=response.headers.get('content-range')||'';
    const match=/^bytes ([0-9]+)-([0-9]+)\/([0-9]+)$/.exec(range);
    if(!match||Number(match[1])!==offset||Number(match[2])!==end||Number(match[3])<=end)throw new Error('pmtiles_content_range_invalid');
    const data=await response.arrayBuffer();
    if(data.byteLength!==length)throw new Error('pmtiles_range_length_mismatch');
    return {data,etag:response.headers.get('etag')||undefined,expires:response.headers.get('expires')||undefined,cacheControl:response.headers.get('cache-control')||undefined};
  }
}
export async function addVoyPmtilesSources(MapLibreMap,assets,expectedLayer='santa_fe_buildings_3d'){
  if(!Array.isArray(assets)||assets.length!==4)throw new Error('pmtiles_asset_count_invalid');
  const prepared=[];
  for(const asset of assets){
    if(!asset||typeof asset.path!=='string'||!/^\/data\/santa-fe-3d\/santa-fe-buildings-3d-[a-z-]+\.[a-f0-9]{16}\.pmtiles$/.test(asset.path))throw new Error('pmtiles_asset_path_invalid');
    const url=new URL(asset.path,location.origin).href;
    let archive=activeProtocol?.get(url);
    if(!archive)archive=new PMTiles(new QueryRangeSource(url));
    const header=await archive.getHeader();
    const metadata=await archive.getMetadata();
    const layers=Array.isArray(metadata.vector_layers)?metadata.vector_layers.map(layer=>layer.id):[];
    if(header.tileType!==1||!layers.includes(expectedLayer))throw new Error('pmtiles_archive_schema_invalid');
    if(header.maxLon<=-60.775||header.minLon>=-60.615||header.maxLat<=-31.74||header.minLat>=-31.535)throw new Error('pmtiles_archive_bounds_invalid');
    prepared.push({url,archive,id:asset.id});
  }
  if(!activeProtocol){activeProtocol=new Protocol({metadata:true});MapLibreMap.addProtocol('pmtiles',activeProtocol.tile);}
  const sources=[];
  for(const item of prepared){
    if(!activeProtocol.get(item.url))activeProtocol.add(item.archive);
    sources.push({id:item.id,url:'pmtiles://'+item.url,attribution:ATTRIBUTION});
  }
  return sources;
}
export const VOY_3D_ATTRIBUTION=ATTRIBUTION;