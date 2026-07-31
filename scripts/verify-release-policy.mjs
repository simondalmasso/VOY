#!/usr/bin/env node
import fs from'node:fs';
import path from'node:path';
import{
pathToFileURL}
from'node:url';
import{
TextDecoder}
from'node:util';
const WD='.github/workflows',
PD='docs/control/release-policy.yaml',
SELF='scripts/verify-release-policy.mjs',
BS=/^[|>](?:(?:[1-9][+-]?)|(?:[+-][1-9]?)|[+-]?)$/;
const E=s=>s.replace(/[.*+?^${}()|[\]\\]/g,
'\\$&'),
I=s=>s.match(/^ */)?.[0].length??0,
P=s=>s.split(path.sep).join('/'),
R=f=>new TextDecoder('utf-8',
{
fatal:true}
).decode(fs.readFileSync(f));
function C(l){
let s=false,
d=false;
for(let i=0;
i<l.length;
i++){
const c=l[i];
if(c==="'"&&!d){
if(s&&l[i+1]==="'"){
i++;
continue}
s=!s}
else if(c==='"'&&!s&&l[i-1]!=='\\')d=!d;
else if(c==='#'&&!s&&!d)return l.slice(0,
i)}
return l}
function D(x){
let s=false,
d=false;
for(let i=0;
i<x.length;
i++){
const c=x[i];
if(c==="'"&&!d){
if(s&&x[i+1]==="'"){
i++;
continue}
s=!s;
continue}
if(c==='"'&&!s){
let n=0;
for(let j=i-1;
j>=0&&x[j]==='\\';
j--)n++;
if(n%2===0)d=!d;
continue}
if(d&&c==='\\')return true}
return false}
function M(x){
for(const raw of x.split(/\r?\n/)){
const l=C(raw);
let s=false,
d=false;
for(let i=0;
i<l.length;
i++){
const c=l[i];
if(c==="'"&&!d){
if(s&&l[i+1]==="'"){
i++;
continue}
s=!s;
continue}
if(c==='"'&&!s&&l[i-1]!=='\\'){
d=!d;
continue}
if(s||d)continue;
const p=i?l[i-1]:'',
b=i===0||/[\s[{,:-]/.test(p);
if(b&&(c==='&'||c==='*')&&/[\w.-]/.test(l[i+1]??''))return true;
if(b&&c==='!'&&/[\w.!/-]/.test(l[i+1]??''))return true;
if(c==='<'&&l[i+1]==='<'&&/^\s*:/.test(l.slice(i+2)))return true}
}
return false}
function T(t,
k){
const a=t.split(/\r?\n/),
q=new RegExp(`^(?:${E(k)}|'${E(k)}'|"${E(k)}")\\s*:\\s*(.*)$`),
n=a.findIndex(l=>q.test(C(l)));
if(n<0)return null;
const v=C(a[n]).match(q)?.[1]?.trim()??'',
b=[a[n]];
for(let i=n+1;
i<a.length;
i++){
if(C(a[i]).trim()&&I(a[i])===0)break;
b.push(a[i])}
return{
v,
b}
}
const Q=t=>t.split(/\r?\n/).some(l=>I(l)===0&&/^\s*"(?:[^"\\]|\\.)*"\s*:/.test(C(l))&&D(C(l)));
function parseYamlFlowValue(src){
const x=src.trim();
if(BS.test(x))throw Error('YAML block scalar is unsupported');
if(D(x))throw Error('double-quoted YAML escape sequences are unsupported');
if(M(x))throw Error('anchors, aliases, tags or merge keys are unsupported');
const z=[];
for(let i=0;
i<x.length;
){
const c=x[i];
if(/\s/.test(c)){
i++;
continue}
if('{}[],:'.includes(c)){
z.push([c,
c]);
i++;
continue}
if(c==="'"||c==='"'){
const q=c;
let v='',
ok=false;
i++;
while(i<x.length){
const y=x[i];
if(q==="'"&&y==="'"&&x[i+1]==="'"){
v+="'";
i+=2;
continue}
if(y===q){
ok=true;
i++;
break}
if(q==='"'&&y==='\\')throw Error('double-quoted YAML escape sequences are unsupported');
v+=y;
i++}
if(!ok)throw Error('unterminated quote');
z.push(['s',
v]);
continue}
const n=i;
while(i<x.length&&!/[\s{}\[\],:]/.test(x[i]))i++;
if(n===i)throw Error(`unsupported ${x[i]}`);
z.push(['s',
x.slice(n,
i)])}
let i=0;
const g=k=>{
const t=z[i];
if(!t||t[0]!==k)throw Error(`expected ${k}`);
i++;
return t[1]}
,
v=()=>{
const k=z[i]?.[0];
if(k==='{'){
i++;
const o={
}
;
if(z[i]?.[0]==='}'){
i++;
return o}
while(i<z.length){
const n=g('s');
if(Object.hasOwn(o,
n))throw Error(`duplicate key ${n}`);
g(':');
o[n]=v();
if(z[i]?.[0]==='}'){
i++;
return o}
g(',')}
throw Error('unterminated mapping')}
if(k==='['){
i++;
const a=[];
if(z[i]?.[0]===']'){
i++;
return a}
while(i<z.length){
a.push(v());
if(z[i]?.[0]===']'){
i++;
return a}
g(',')}
throw Error('unterminated sequence')}
const s=g('s');
return/^(?:null|~)$/i.test(s)?null:/^true$/i.test(s)?true:/^false$/i.test(s)?false:s}
;
const out=v();
if(i!==z.length)throw Error('trailing token');
return out}
function G(x){
if(typeof x!=='string'||x.startsWith('!'))return false;
const r=E(x).replace(/\*\*/g,
'.*').replace(/\*/g,
'[^/]*').replace(/\?/g,
'.');
return new RegExp(`^${r}$`).test('main')}
const V=x=>typeof x==='string'?[x]:Array.isArray(x)&&x.every(y=>typeof y==='string')?x:null;
function analyzePushConfiguration(x){
if(x===null||x===true)return{
root:true,
errors:[]}
;
if(x===false)return{
root:false,
errors:[]}
;
if(!x||typeof x!=='object'||Array.isArray(x))return{
root:true,
errors:['push configuration is not safely analyzable']}
;
const b=Object.hasOwn(x,
'branches'),
n=Object.hasOwn(x,
'branches-ignore');
if(b&&n)return{
root:true,
errors:['push has branches and branches-ignore']}
;
if(b){
const a=V(x.branches);
return a?{
root:a.some(G),
errors:[]}
:{
root:true,
errors:['branches filter is not safely analyzable']}
}
if(n){
const a=V(x['branches-ignore']);
return a?{
root:!a.some(G),
errors:[]}
:{
root:true,
errors:['branches-ignore filter is not safely analyzable']}
}
return{
root:true,
errors:[]}
}
function S(x){
x=x.trim();
if(!x)return null;
if(BS.test(x))throw Error('YAML block scalar is unsupported');
if(D(x))throw Error('double-quoted YAML escape sequences are unsupported');
if(M(x))throw Error('anchors, aliases, tags or merge keys are unsupported');
if(/^[\[{"']/.test(x))return parseYamlFlowValue(x);
if(/[\[\]{}:,]/.test(x))throw Error('unsupported YAML punctuation');
return x}
function L(lines,
key,
min){
const q=new RegExp(`^\\s{${min},}(?:${E(key)}|'${E(key)}'|"${E(key)}")\\s*:\\s*(.*)$`);
for(let i=0;
i<lines.length;
i++){
const m=C(lines[i]).match(q);
if(!m)continue;
const ind=I(lines[i]),
rhs=m[1].trim();
try{
if(rhs){
if(BS.test(rhs))return{
p:true,
a:null,
e:`${key} uses a YAML block scalar that is not safely analyzable`}
;
if((rhs[0]==='['&&!rhs.endsWith(']'))||(rhs[0]==='{'&&!rhs.endsWith('}')))return{
p:true,
a:null,
e:`${key} uses a multiline flow collection that is not safely analyzable`}
;
const a=V(S(rhs));
return a?{
p:true,
a,
e:null}
:{
p:true,
a:null,
e:`${key} filter is not safely analyzable`}
}
const a=[];
let seen=false;
for(let j=i+1;
j<lines.length;
j++){
const c=C(lines[j]);
if(!c.trim())continue;
if(I(lines[j])<=ind)break;
seen=true;
const m=c.trim().match(/^-\s+(.+)$/);
if(!m)return{
p:true,
a:null,
e:`${key} block is not a plain scalar sequence`}
;
const y=S(m[1]);
if(typeof y!=='string')return{
p:true,
a:null,
e:`${key} block contains a non-scalar item`}
;
a.push(y)}
return!seen||!a.length?{
p:true,
a:null,
e:`${key} filter is empty or not safely analyzable`}
:{
p:true,
a,
e:null}
}
catch(e){
return{
p:true,
a:null,
e:`${key} filter is not safely analyzable (${e.message})`}
}
}
return{
p:false,
a:null,
e:null}
}
function analyzeOnTrigger(text){
const on=T(text,
'on');
if(!on)return Q(text)?{
root:true,
errors:['top-level YAML key uses a double-quoted escape and is not safely analyzable']}
:{
root:false,
errors:['workflow has no readable top-level on key']}
;
const src=on.b.map(C).join('\n');
if(D(src))return{
root:true,
errors:['on trigger uses a double-quoted YAML escape that is not safely analyzable']}
;
if(M(src))return{
root:true,
errors:['on trigger uses YAML anchors, aliases, tags or merge keys that are not safely analyzable']}
;
if(on.v){
if(BS.test(on.v))return{
root:true,
errors:['on trigger uses a YAML block scalar that is not safely analyzable']}
;
try{
const x=parseYamlFlowValue(on.v);
return typeof x==='string'?{
root:x==='push',
errors:[]}
:Array.isArray(x)?{
root:x.includes('push'),
errors:x.every(y=>typeof y==='string')?[]:['on sequence has non-scalar event']}
:x&&typeof x==='object'?Object.hasOwn(x,
'push')?analyzePushConfiguration(x.push):{
root:false,
errors:[]}
:{
root:true,
errors:['inline on is not safely analyzable']}
}
catch(e){
return{
root:true,
errors:[`inline on flow is not safely analyzable (${e.message})`]}
}
}
const rows=on.b.slice(1).map((l,
n)=>({
l,
n,
c:C(l)}
)).filter(x=>x.c.trim());
if(!rows.length)return{
root:true,
errors:['on mapping is empty']}
;
const lev=Math.min(...rows.map(x=>I(x.l))),
ps=rows.filter(x=>I(x.l)===lev&&/^\s*(?:push|'push'|"push")\s*:/.test(x.c));
if(ps.length>1)return{
root:true,
errors:['on mapping has duplicate push keys']}
;
if(!ps.length)return{
root:false,
errors:[]}
;
const p=ps[0],
pi=I(p.l),
iv=p.c.split(':').slice(1).join(':').trim();
if(iv){
if(BS.test(iv))return{
root:true,
errors:['push trigger uses a YAML block scalar that is not safely analyzable']}
;
try{
return analyzePushConfiguration(parseYamlFlowValue(iv))}
catch(e){
return{
root:true,
errors:[`inline push flow is not safely analyzable (${e.message})`]}
}
}
const b=[p.l];
for(let j=p.n+1;
j<on.b.length-1;
j++){
const l=on.b[j+1];
if(C(l).trim()&&I(l)<=pi)break;
b.push(l)}
const br=L(b,
'branches',
pi+1),
ig=L(b,
'branches-ignore',
pi+1),
er=[br.e,
ig.e].filter(Boolean);
if(br.p&&ig.p)er.push('push has branches and branches-ignore');
return er.length?{
root:true,
errors:er}
:br.p?{
root:br.a.some(G),
errors:[]}
:ig.p?{
root:!ig.a.some(G),
errors:[]}
:{
root:true,
errors:[]}
}
export const allowsGenericMainPush=t=>analyzeOnTrigger(t).root;
function shape(f,
t){
const e=[];
if(!t.trim())e.push('workflow is empty');
if(t.includes('\0'))e.push('workflow contains NUL');
if(/^[ ]*\t/m.test(t))e.push('workflow contains tab indentation');
if(/^(?:<<<<<<<|=======|>>>>>>>)/m.test(t))e.push('workflow contains conflict markers');
if(!T(t,
'on')&&!Q(t))e.push('workflow has no readable top-level on key');
if(!T(t,
'jobs'))e.push('workflow has no readable top-level jobs key');
e.push(...analyzeOnTrigger(t).errors);
return e.map(x=>`${f}: ${x}`)}
const refs=(t,
r,
m=x=>x)=>[...t.matchAll(r)].map(x=>m(x[1])),
W=t=>refs(t,
/uses\s*:\s*['"]?(\.\/\.github\/workflows\/[^'"\s#]+)/g,
x=>x.slice(2)),
A=t=>refs(t,
/uses\s*:\s*['"]?(\.\/[^'"\s#]+)/g,
x=>x.slice(2)).filter(x=>!x.startsWith('.github/workflows/')),
K=t=>[...new Set(refs(t,
/(?:^|[\s;&|])(?:bash|sh|node|bun|python3?|ruby|perl)?\s*((?:\.\/)?(?:scripts|\.github)\/[\w./-]+)/gm,
x=>x.replace(/^\.\//,
'')))],
N=t=>[...new Set([...t.matchAll(/\b(?:npm|bun|pnpm)\s+run\s+([\w:-]+)|\byarn\s+([\w:-]+)/g)].map(x=>x[1]||x[2]))];
function runs(t){
const l=t.split(/\r?\n/),
o=[];
for(let i=0;
i<l.length;
i++){
const m=C(l[i]).match(/^(\s*)(?:-\s*)?(?:run|'run'|"run")\s*:\s*(.*)$/);
if(!m)continue;
const n=m[1].length,
v=m[2].trim();
if(BS.test(v)){
const b=[];
for(let j=i+1;
j<l.length;
j++){
if(C(l[j]).trim()&&I(l[j])<=n)break;
b.push(l[j].slice(Math.min(l[j].length,
n+2)));
i=j}
o.push(b.join('\n'))}
else if(v)o.push(v.replace(/^(['"])([\s\S]*)\1$/,
'$2'))}
return o}
function stm(t){
const o=[];
let n=0,
s=false,
d=false,
b=false;
for(let i=0;
i<t.length;
i++){
const c=t[i];
if(c==="'"&&!d&&!b)s=!s;
else if(c==='"'&&!s&&!b&&t[i-1]!=='\\')d=!d;
else if(c==='`'&&!s&&!d&&t[i-1]!=='\\')b=!b;
if(s||d||b)continue;
const p=t.slice(i,
i+2);
if(c==='\n'||c===';'||p==='&&'||p==='||'){
const x=t.slice(n,
i).trim();
if(x)o.push(x);
if(p==='&&'||p==='||')i++;
n=i+1}
}
const x=t.slice(n).trim();
if(x)o.push(x);
return o}
function words(t){
const o=[];
let w='',
s=false,
d=false;
for(let i=0;
i<t.length;
i++){
const c=t[i];
if(c==="'"&&!d){
s=!s;
continue}
if(c==='"'&&!s&&t[i-1]!=='\\'){
d=!d;
continue}
if(!s&&!d&&/\s/.test(c)){
if(w)o.push(w);
w=''}
else w+=c}
if(w)o.push(w);
return o}
function install(s){
const a=words(s.toLowerCase());
while(a[0]&&/^[A-Za-z_][A-Za-z0-9_]*=/.test(a[0]))a.shift();
if(a[0]==='sudo'||a[0]==='command')a.shift();
return a[0]==='npm'&&['install',
'i',
'add'].includes(a[1])||a[0]==='pnpm'&&['install',
'i',
'add'].includes(a[1])||a[0]==='yarn'&&a[1]==='add'||a[0]==='bun'&&['install',
'i',
'add'].includes(a[1])}
function qa(t,
n){
let s=false,
d=false,
b=false,
k=-1;
for(let i=0;
i<n;
i++){
const c=t[i];
if(c==="'"&&!d&&!b){
s=!s;
k=s?i:-1}
else if(c==='"'&&!s&&!b&&t[i-1]!=='\\'){
d=!d;
k=d?i:-1}
else if(c==='`'&&!s&&!d&&t[i-1]!=='\\'){
b=!b;
k=b?i:-1}
}
return{
s,
d,
b,
k}
}
function active(t,
n){
const q=qa(t,
n);
if(!q.s&&!q.d&&!q.b||q.b)return true;
const p=t.slice(0,
n),
x=t.slice(0,
q.k);
return p.lastIndexOf('$(')>p.lastIndexOf(')')||/(?:^|\s)(?:bash|sh|zsh|dash|ksh)\s+(?:[^;]*\s)?-c\s*$/i.test(x)||/(?:^|\s)eval\s*$/i.test(x)}
function after(t,
n){
const x=t.slice(n),
k=x.search(/(?:&&|\|\||;|\n|\))/),
a=words(k>=0?x.slice(0,
k):x).filter(Boolean);
while(a[0]==='--')a.shift();
return a}
function classifyWranglerCommand(f,
a){
if(!a.length)return`${f}: Wrangler reference is not provably read-only`;
const c=a[0].toLowerCase();
if(['--version',
'-v',
'version',
'--help',
'-h',
'help'].includes(c))return null;
if(c==='deploy')return a.some(x=>/^--dry-run(?:=true)?$/i.test(x))?null:`${f}: non-dry-run wrangler deploy`;
if(c==='dev'){
const l=a.some(x=>/^--local(?:=true)?$/i.test(x)),
r=a.some(x=>/^--remote(?:=true)?$/i.test(x));
return l&&!r?null:`${f}: wrangler dev is not provably local-only`}
if(c==='versions'&&a[1]?.toLowerCase()==='deploy')return`${f}: wrangler versions deploy`;
if(c==='secret'||c==='versions'&&a[1]?.toLowerCase()==='secret')return`${f}: wrangler secret mutation`;
if(c==='rollback'||c==='delete'||c==='versions'&&a[1]?.toLowerCase()==='upload'||c==='deployments'&&a[1]?.toLowerCase()==='create')return`${f}: other mutating wrangler command`;
return`${f}: Wrangler command is not provably read-only (${a.slice(0,
3).join(' ')})`}
const WRANGLER_EXECUTABLE_PATTERN = /(?:^|[\s"'`$()&;|])((?:(?:\.{0,2}[\\/])?(?:[\w.@+-]+[\\/])*)?(?:wrangler(?:@[\w*.+-]+)?[\\/]bin[\\/]wrangler\.(?:js|cjs|mjs)|wrangler-dist[\\/](?:cli|index)\.(?:js|cjs|mjs)|wrangler(?:@[\w*.+-]+)?(?:\.(?:cmd|exe))?))(?=$|[\s"'`$()&;|])/gi;
function findUnsafeReferences(f,
t){
if(f===SELF)return[];
const o=[];
for(const cmd of/\.ya?ml$/i.test(f)?runs(t):[t]){
for(const s of stm(cmd.replace(/\\\r?\n\s*/g,
' '))){
const ins=install(s);
for(const m of s.matchAll(WRANGLER_EXECUTABLE_PATTERN)){
if(ins)continue;
const n=m.index+m[0].lastIndexOf(m[1]);
if(!active(s,
n))continue;
const x=classifyWranglerCommand(f,
after(s,
n+m[1].length));
if(x)o.push(x)}
}
if(/api\.cloudflare\.com\/client\/v4/i.test(cmd)){
const m=/(?:-X|--request)\s*(?:POST|PUT|PATCH|DELETE)\b/i.test(cmd)||/(?:--data(?:-raw|-binary)?|-d)\s+/i.test(cmd)||/method\s*[:=]\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i.test(cmd);
o.push(`${f}: Cloudflare API reference is ${m?'mutating':'not provably read-only'}`)}
for(const m of cmd.matchAll(/(?:^|[\s"'`$()&;|])(?:cloudflare|cloudflared)(?=$|[\s"'`$()&;|])/gi)){
const n=m.index+m[0].search(/cloudflare/i);
if(active(cmd,
n))o.push(`${f}: executable Cloudflare command is not provably read-only`)}
}
for(const k of['CLOUDFLARE_API_TOKEN',
'CLOUDFLARE_ACCOUNT_ID',
'CLOUDFLARE_ZONE_ID',
'CF_API_TOKEN'])if(t.includes(k))o.push(`${f}: references ${k}`);
if(/\bsecrets\s*:\s*inherit\b/i.test(t))o.push(`${f}: uses secrets: inherit`);
if(/uses\s*:\s*['"]?[^'"\s#]*(?:cloudflare|wrangler-action)/i.test(t))o.push(`${f}: uses a Cloudflare or Wrangler action`);
return[...new Set(o)]}
function policy(root){
const f=path.join(root,
PD);
if(!fs.existsSync(f))return[`${PD}: missing policy document`];
let t;
try{
t=R(f)}
catch(e){
return[`${PD}: unreadable UTF-8 (${e.message})`]}
const q=[['generic_main_push_production_write: false',
/generic_main_push_production_write\s*:\s*false\b/],
['candidate_required: true',
/candidate_required\s*:\s*true\b/],
['candidate_traffic_percent: 0',
/candidate_traffic_percent\s*:\s*0\b/],
['exact_source_sha_required: true',
/exact_source_sha_required\s*:\s*true\b/],
['production_promotion: mission_specific',
/production_promotion\s*:\s*mission_specific\b/],
['aud_pass_required: true',
/aud_pass_required\s*:\s*true\b/],
['current_cloudflare_state_required: true',
/current_cloudflare_state_required\s*:\s*true\b/],
['rollback_requires_separate_authorization: true',
/rollback_requires_separate_authorization\s*:\s*true\b/]];
return q.filter(([,
r])=>!r.test(t)).map(([n])=>`${PD}: missing ${n}`)}
function ra(root,
x){
const a=path.join(root,
x);
if(!fs.existsSync(a))return null;
if(fs.statSync(a).isFile())return x;
for(const n of['action.yml',
'action.yaml'])if(fs.existsSync(path.join(a,
n)))return path.join(x,
n);
return null}
export function analyzeRepository(root=process.cwd()){
const e=policy(root),
dir=path.join(root,
WD);
if(!fs.existsSync(dir))return{
ok:false,
roots:[],
inspected:[],
violations:[...e,
`${WD}: missing`]}
;
const fsx=fs.readdirSync(dir).filter(n=>/\.ya?ml$/i.test(n)).sort().map(n=>`${WD}/${n}`),
ct=new Map,
an=new Map;
for(const f of fsx)try{
const t=R(path.join(root,
f));
ct.set(f,
t);
an.set(f,
analyzeOnTrigger(t));
e.push(...shape(f,
t))}
catch(x){
e.push(`${f}: unreadable UTF-8 (${x.message})`)}
const roots=fsx.filter(f=>an.get(f)?.root);
if(!roots.length)e.push('No workflow guards generic pushes to main');
const done=new Set,
live=new Set;
let pkg=null;
function inspect(f){
if(done.has(f))return;
if(live.has(f)){
e.push(`${f}: local reference cycle is not safely analyzable`);
return}
live.add(f);
const a=path.join(root,
f);
if(!fs.existsSync(a)||!fs.statSync(a).isFile()){
e.push(`${f}: referenced local file is missing`);
live.delete(f);
return}
let t;
try{
t=R(a)}
catch(x){
e.push(`${f}: unreadable UTF-8 (${x.message})`);
live.delete(f);
return}
e.push(...findUnsafeReferences(f,
t));
for(const x of W(t))ct.has(x)?inspect(x):e.push(`${f}: unresolved local workflow ${x}`);
for(const x of A(t)){
const y=ra(root,
x);
y?inspect(P(y)):e.push(`${f}: unresolved local action ${x}`)}
for(const x of K(t))if(x!==f)inspect(P(x));
for(const n of N(t)){
if(!pkg)try{
pkg=JSON.parse(R(path.join(root,
'package.json')))}
catch(x){
e.push(`package.json: unreadable package scripts (${x.message})`);
continue}
const c=pkg?.scripts?.[n];
if(typeof c!=='string')e.push(`${f}: unresolved package script ${n}`);
else{
e.push(...findUnsafeReferences(`package.json#scripts.${n}`,
c));
for(const x of K(c))inspect(P(x))}
}
live.delete(f);
done.add(f)}
for(const f of roots)inspect(f);
const v=[...new Set(e)].sort();
return{
ok:!v.length,
roots,
inspected:[...done].sort(),
violations:v}
}
function cli(){
const r=analyzeRepository();
console.log(JSON.stringify({
ok:r.ok,
genericMainPushWorkflows:r.roots,
inspectedFiles:r.inspected,
violations:r.violations,
claims:{
currentTreeGenericMainPushProductionWrite:r.ok?'NO':'NOT_PROVEN',
prRegressionDetection:r.ok?'YES':'NOT_PROVEN',
futureDirectPushPrevention:'UNVERIFIED'}
}
,
null,
2));
if(!r.ok)process.exitCode=1}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)cli();
