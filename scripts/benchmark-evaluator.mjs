const fold=(value)=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const STOP=new Set(['de','del','la','las','el','los','y','en','a','al','av','avda','avenida','calle','bv','blvd','boulevard','ruta','autopista']);

function rawTokens(value){return fold(value).split(/\s+/).filter(Boolean)}
function damerauAtMostOne(a,b){
  if(a===b)return true;
  if(Math.abs(a.length-b.length)>1)return false;
  if(a.length===b.length){
    const dif=[];for(let i=0;i<a.length;i++)if(a[i]!==b[i])dif.push(i);
    if(dif.length<=1)return true;
    if(dif.length===2&&dif[1]===dif[0]+1&&a[dif[0]]===b[dif[1]]&&a[dif[1]]===b[dif[0]])return true;
  }
  let i=0,j=0,d=0;
  while(i<a.length&&j<b.length){
    if(a[i]===b[j]){i++;j++;continue}
    if(++d>1)return false;
    if(a.length>b.length)i++;else if(b.length>a.length)j++;else{i++;j++}
  }
  return d+(i<a.length||j<b.length?1:0)<=1;
}
function tokenMatches(q,c){
  if(q===c)return true;
  if(q.length>=4&&c.length>=4&&(q.startsWith(c)||c.startsWith(q))&&Math.abs(q.length-c.length)<=2)return true;
  return q.length>=3&&c.length>=3&&damerauAtMostOne(q,c);
}
function queryEntityTokens(query,territoryHints=[]){
  const territory=new Set(territoryHints.flatMap(rawTokens));
  return rawTokens(query).filter(t=>!STOP.has(t)&&!territory.has(t)&&!(/^\d{3,}$/.test(t)));
}
function candidateEntityTokens(candidate){return rawTokens(candidate?.display_primary??'').filter(t=>!STOP.has(t));}

export function entityRelevant(query,queryClass,candidate,territoryHints=[]){
  const q=queryEntityTokens(query,territoryHints), c=candidateEntityTokens(candidate);
  if(!q.length||!c.length)return false;
  const matched=q.filter(qt=>c.some(ct=>tokenMatches(qt,ct))).length;
  if(q.length===1)return matched===1;
  if(q.length===2)return matched===2;
  return matched>=2&&matched/q.length>=0.6;
}

export function territoryMatchesExpected(candidate,expected){
  if(!candidate||!expected)return false;
  const cp=fold(candidate.province?.name??candidate.province), ep=fold(expected.province);
  const cid=String(candidate.province?.id??''), eid=String(expected.province_id??'');
  const cl=canonicalLocality(candidate.locality?.name??candidate.locality), el=canonicalLocality(expected.locality);
  return (!!eid?cid===eid:cp===ep)&&cl===el;
}

function canonicalLocality(value){
  const v=fold(value);
  if(['caba','buenos aires','ciudad autonoma de buenos aires'].includes(v))return 'ciudad autonoma de buenos aires';
  if(['san nicolas','san nicolas de los arroyos'].includes(v))return 'san nicolas de los arroyos';
  if(v==='santa fe capital')return 'santa fe';
  return v;
}

export function territoryMatchesAuthority(candidate,authority){
  if(!candidate||!authority)return false;
  const outputProvinceId=String(candidate.province?.id??'');
  const authorityProvinceId=String(authority.province?.id??'');
  const provinceOk=authorityProvinceId?outputProvinceId===authorityProvinceId:fold(candidate.province?.name)===fold(authority.province?.name);
  return provinceOk&&canonicalLocality(candidate.locality?.name)===canonicalLocality(authority.locality?.name);
}

export function acceptableResult(query,queryClass,candidate,expected,territoryHints=[]){
  return entityRelevant(query,queryClass,candidate,territoryHints)&&territoryMatchesExpected(candidate,expected);
}
