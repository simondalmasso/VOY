import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';

const root=path.resolve(process.env.SOURCE_DIR||process.cwd());
const outDir=path.resolve(process.env.EVIDENCE_DIR||path.join(root,'order072-evidence'));
const TEST_SHA=process.env.TEST_SHA||'9233f11ff50b329e5f81a2268627d510bc7fb90c';
const BASE_SHA='ad9e50b6f48ba444e0c4ac1b7bc2ad0f24a3cc4b';
const EXPECTED_TOPOLOGY_SHA='0c4a79f656fccd722de6cb20db504ebc09b2626b6d3caeccf2f78176788c75a2';
const sh=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const sha256=(value)=>createHash('sha256').update(value).digest('hex');
const read=async p=>readFile(path.join(root,p));
const text=async p=>(await read(p)).toString('utf8');

await mkdir(outDir,{recursive:true});
const head=sh('rev-parse','HEAD');
if(head!==TEST_SHA)throw new Error(`exact_sha_mismatch:${head}`);
const tree=sh('rev-parse','HEAD^{tree}');
const parent=sh('rev-parse','HEAD^');
execFileSync('git',['merge-base','--is-ancestor',BASE_SHA,TEST_SHA],{cwd:root,stdio:'inherit'});

const topologyRaw=(await text('public/3d/topology/chunk-santa-fe-centro-0.json')).trimEnd();
const topologySha=sha256(topologyRaw);
if(topologySha!==EXPECTED_TOPOLOGY_SHA)throw new Error(`topology_sha_mismatch:${topologySha}`);

const manifest=JSON.parse(await text('public/3d/topology/manifest.json'));
const source=JSON.parse(await text('order071/source/santa-fe-osm-snapshot.json'));
const pkg=JSON.parse(await text('package.json'));
const renderer=await text('public/3d/voy3d.js');
const temporal=await text('public/3d/temporal.js');
const app=await text('public/app.js');
const index=await text('public/index.html');
const sw=await text('public/sw.js');

const assertions={
  source_sha:head===TEST_SHA,
  source_ancestry:true,
  topology_sha:topologySha===EXPECTED_TOPOLOGY_SHA,
  three_version:pkg.devDependencies?.three==='0.186.0',
  license:manifest.geometry_source?.license==='ODbL-1.0'&&source.provenance?.license==='ODbL-1.0',
  no_runtime_overpass:!/overpass-api|\/api\/interpreter/i.test(renderer+temporal),
  no_runtime_firecrawl:!/firecrawl/i.test(renderer+temporal),
  no_3d_worker_api:!/(fetch\(|apiJson\().*\/api\//s.test(renderer+temporal),
  lazy_3d:/import\(['"]\.\/3d\/voy3d\.js/.test(app)&&!/<script[^>]+(?:three|voy3d)/i.test(index)&&!/\/3d\//.test(sw),
  webgl2_fallback:/getContext\(['"]webgl2['"]\)/.test(renderer)&&/unsupported_webgl2/.test(renderer),
  lru_bound:/LRU_MAX\s*=\s*16/.test(renderer)&&manifest.lru_max===16,
  dpr_bound:/DPR_CAP\s*=\s*1\.5/.test(renderer),
  initial_chunks:Array.isArray(manifest.initial_chunks)&&manifest.initial_chunks.length>0&&manifest.initial_chunks.length<=8,
  height_truth:manifest.height_policy?.missing_height_class==='generic_inferred'&&/never presented as measured/i.test(manifest.height_policy?.claim||''),
  no_fake_santa_fe:/current3DTransportEntities\(\)\{return \[\]\}/.test(app),
  immutable_temporal:/source_observation:next/.test(temporal)&&!/next\.[a-zA-Z_]+\s*=/.test(temporal),
  scheduled_zero:/scheduled_no_vehicle/.test(temporal),
  unknown_zero:/unknown_state/.test(temporal)
};
for(const [name,pass] of Object.entries(assertions))if(!pass)throw new Error(`assertion_failed:${name}`);

const packageLock=await read('package-lock.json');
const diffStat=sh('diff','--stat',`${BASE_SHA}..${TEST_SHA}`);
const trackedDirty=sh('status','--porcelain','--untracked-files=no');
if(trackedDirty)throw new Error(`tracked_worktree_dirty_after_build:\n${trackedDirty}`);

const summary={
  test_sha:TEST_SHA,
  tree_sha:tree,
  parent_sha:parent,
  base_sha:BASE_SHA,
  package_lock_sha256:sha256(packageLock),
  topology_sha256:topologySha,
  topology_manifest_sha256:sha256(await read('public/3d/topology/manifest.json')),
  source_snapshot_sha256:sha256(await read('order071/source/santa-fe-osm-snapshot.json')),
  buildings:JSON.parse(topologyRaw).buildings.length,
  roads:JSON.parse(topologyRaw).roads.length,
  initial_chunks:manifest.initial_chunks.length,
  lru_max:manifest.lru_max,
  dpr_cap:1.5,
  geometry_source:manifest.geometry_source?.authority,
  geometry_license:manifest.geometry_source?.license,
  assertions,
  diff_stat:diffStat
};
await writeFile(path.join(outDir,'exact-source.json'),JSON.stringify(summary,null,2)+'\n');
await writeFile(path.join(outDir,'exact-source.txt'),[
  `source_sha=${TEST_SHA}`,
  `tree_sha=${tree}`,
  `parent_sha=${parent}`,
  `base_sha=${BASE_SHA}`,
  `package_lock_sha256=${summary.package_lock_sha256}`,
  `topology_sha256=${topologySha}`,
  `buildings=${summary.buildings}`,
  `roads=${summary.roads}`
].join('\n')+'\n');
console.log(JSON.stringify(summary,null,2));
