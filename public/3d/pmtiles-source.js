import {PMTiles,Protocol} from '/vendor/pmtiles.mjs?v=__BUILD_ID__';
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
export function addVoyPmtilesSources(maplibre,assets,expectedLayer='santa_fe_buildings_3d'){
  if(!Array.isArray(assets)||assets.length!==4||expectedLayer!=='santa_fe_buildings_3d')throw new Error('pmtiles_asset_count_or_layer_invalid');
  if(!activeProtocol){activeProtocol=new Protocol({metadata:true});maplibre.addProtocol('pmtiles',activeProtocol.tile);}
  const sources=[];
  for(const asset of assets){
    if(!asset||typeof asset.path!=='string'||!/^\/data\/santa-fe-3d\/santa-fe-buildings-3d-[a-z-]+\.[a-f0-9]{16}\.pmtiles$/.test(asset.path))throw new Error('pmtiles_asset_path_invalid');
    if(typeof asset.sha256!=='string'||!/^[a-f0-9]{64}$/.test(asset.sha256)||!asset.path.endsWith('.'+asset.sha256.slice(0,16)+'.pmtiles'))throw new Error('pmtiles_asset_digest_invalid');
    if(!Array.isArray(asset.bounds)||asset.bounds.length!==4||!asset.bounds.every(Number.isFinite)||
       asset.bounds[0]>=asset.bounds[2]||asset.bounds[1]>=asset.bounds[3]||
       asset.bounds[0]<-60.80||asset.bounds[2]>-60.60||asset.bounds[1]<-31.75||asset.bounds[3]>-31.52)throw new Error('pmtiles_asset_bounds_invalid');
    const url=new URL(asset.path,location.origin).href;
    let archive=activeProtocol.get(url);
    if(!archive){archive=new PMTiles(new QueryRangeSource(url));activeProtocol.add(archive);}
    sources.push({id:asset.id,url:'pmtiles://'+url,bounds:asset.bounds,attribution:ATTRIBUTION});
  }
  return sources;
}
export const VOY_3D_ATTRIBUTION=ATTRIBUTION;