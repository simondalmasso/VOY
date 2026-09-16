import {execFileSync} from 'node:child_process';
import {readdirSync, readFileSync} from 'node:fs';
import {join, relative} from 'node:path';

const mode=process.argv[2];
const root=process.cwd();
const readJson=p=>JSON.parse(readFileSync(join(root,p),'utf8').replace(/^\uFEFF/,''));
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const fail=m=>{console.error(`R2_VERIFY_FAIL=${m}`);process.exit(1)};
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);

if(mode==='provenance'){
  const p=readJson('ci/r2-source-provenance.json');
  const expected={
    original_source_commit:'9d0f3b4704c3cdb63f1ea5e306a1ca273b6f90db',
    original_source_tree:'001caa48937b25107ea3d3028bcc534e351eff4c',
    sealed_zip_sha256:'8BA559AB26F467D12D4807B5FC2396E742EB689CA182DD5ADC5FBF32365E7073',
    sealed_zip_bytes:1254524,sealed_tracked_files:59,
    materialized_gitlab_commit:'2f05b87aa0d9c2282f10b8c41eaff29f82927410',
    materialized_gitlab_tree:'742db7b886bfc4b4743aa323d36e468f7822eb5e'
  };
  for(const [k,v] of Object.entries(expected)) if(p[k]!==v) fail(`PROVENANCE_${k}`);
  try{execFileSync('git',['merge-base','--is-ancestor',p.materialized_gitlab_commit,'HEAD'],{cwd:root,stdio:'ignore'})}catch{fail('SOURCE_COMMIT_NOT_ANCESTOR')}
  const tree=git('rev-parse',`${p.materialized_gitlab_commit}^{tree}`);
  if(tree!==p.materialized_gitlab_tree) fail(`SOURCE_TREE_${tree}`);
  const files=git('ls-tree','-r','--name-only',p.materialized_gitlab_commit).split(/\r?\n/).filter(Boolean);
  if(files.length!==p.sealed_tracked_files) fail(`SOURCE_FILE_COUNT_${files.length}`);
  console.log(`R2_PROVENANCE=PASS SOURCE=${p.materialized_gitlab_commit} TREE=${tree} FILES=${files.length}`);
  process.exit(0);
}

if(mode==='audit'){
  const auditPath=process.argv[3]||'npm-audit.json';
  const a=JSON.parse(readFileSync(join(root,auditPath),'utf8').replace(/^\uFEFF/,''));
  const c=readJson('ci/npm-audit-classification.json');
  const vulns=a.vulnerabilities||{};
  const names=Object.keys(vulns).sort();
  const expected=[...c.full_audit_expected.packages].sort();
  if(JSON.stringify(names)!==JSON.stringify(expected)) fail(`AUDIT_PACKAGE_SET_${names.join(',')}`);
  if(a.metadata?.vulnerabilities?.high!==c.full_audit_expected.high) fail('AUDIT_HIGH_COUNT');
  if((a.metadata?.vulnerabilities?.critical||0)!==0) fail('AUDIT_CRITICAL_PRESENT');
  const sharp=vulns.sharp;
  const advisory=(sharp?.via||[]).find(v=>typeof v==='object'&&String(v.url||'').includes(c.advisory.id));
  if(!advisory) fail('EXPECTED_SHARP_ADVISORY_MISSING');
  const lock=readJson('package-lock.json');
  if(lock.packages?.['']?.dependencies&&Object.keys(lock.packages[''].dependencies).length) fail('RUNTIME_DEPENDENCIES_ADDED');
  for(const name of ['wrangler','miniflare','sharp']){
    const d=lock.packages?.[`node_modules/${name}`];
    if(!d||d.dev!==true) fail(`${name.toUpperCase()}_NOT_DEV_ONLY`);
  }
  const sourceFiles=[...walk(join(root,'src')),...walk(join(root,'public'))].filter(p=>!p.endsWith('.png'));
  for(const p of sourceFiles){
    const text=readFileSync(p,'utf8');
    if(/(?:from\s+['"]|require\(['"])(?:wrangler|miniflare|sharp)(?:['"]|\/)/i.test(text)) fail(`VULNERABLE_PACKAGE_IMPORTED_${relative(root,p)}`);
  }
  const tracked=git('ls-files').split(/\r?\n/).filter(Boolean);
  const avif=tracked.filter(p=>/\.avif$/i.test(p));
  if(avif.length) fail(`AVIF_INPUT_PRESENT_${avif.length}`);
  console.log(`R2_NPM_AUDIT_CLASSIFICATION=PASS HIGH=${a.metadata.vulnerabilities.high} CRITICAL=0 RUNTIME_REACHABLE=NO DEV_TOOLCHAIN_REACHABLE=YES`);
  process.exit(0);
}

if(mode==='package'){
  const manifest=readJson('dist/BUILD_MANIFEST.json');
  const head=git('rev-parse','HEAD');
  const manifestText=JSON.stringify(manifest);
  if(!manifestText.includes(head)) fail(`BUILD_MANIFEST_SOURCE_MISMATCH_${head}`);
  const files=walk(join(root,'dist')).map(p=>relative(join(root,'dist'),p).replaceAll('\\','/'));
  if(!files.includes('worker.js')||!files.includes('client/index.html')) fail('DIST_REQUIRED_FILES_MISSING');
  if(files.some(p=>p.startsWith('node_modules/')||/\.(avif)$/i.test(p))) fail('DIST_UNEXPECTED_RUNTIME_DEPENDENCY');
  console.log(`R2_PACKAGE=PASS SOURCE_SHA=${head} DIST_FILES=${files.length}`);
  process.exit(0);
}

fail(`UNKNOWN_MODE_${mode||'missing'}`);
