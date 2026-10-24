// Published Santa Fe route geometry is not evidence of vehicle activity.
const validSegment=segment=>Array.isArray(segment)&&segment.length>=2&&
  segment.every(pair=>Array.isArray(pair)&&pair.length===2&&pair.every(Number.isFinite));
const lineId=value=>{
  const raw=String(value??'').trim().replace(/^l[ií]nea\s*/i,'').replace(/_(ida|vuelta)$/i,'');
  const ronda=/^ronda\s*([a-z])$/i.exec(raw);
  return ronda?'Ronda '+ronda[1].toUpperCase():raw;
};
export const labelSantaFeLine=line=>{const value=String(line??'').trim();const match=/^l[ií]nea\s+(\d+)$/i.exec(value);return match?'Línea '+match[1]:/^\d+$/.test(value)?'Línea '+value:value};

export function listSantaFeLines(routes){
  if(!Array.isArray(routes))return[];
  return [...new Set(routes.map(route=>lineId(route?.short_name)).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b,'es-AR',{numeric:true}));
}
export function geometriesForSantaFeLine(routes,selected=''){
  if(!Array.isArray(routes))return[];
  return routes.filter(route=>!selected||lineId(route?.short_name)===selected)
    .flatMap(route=>Array.isArray(route?.segments)?route.segments:[])
    .filter(validSegment);
}
