#!/usr/bin/env bash
# ORDER-075 GLM53 — Linux port of scripts/build.ps1 for LOCAL verification only.
# The canonical build script remains scripts/build.ps1 (Windows/PowerShell).
# Produces the same dist/ layout, BUILD_ID algorithm and BUILD_MANIFEST.json.
set -euo pipefail
cd "$(dirname "$0")/.."

node scripts/build-order071-topology.mjs

python3 - <<'PYEOF'
import hashlib, json, os, subprocess, shutil, sys
from pathlib import Path

root = Path.cwd()

tracked = subprocess.run(['git','ls-files'],capture_output=True,text=True,check=True).stdout.splitlines()
tracked = sorted([p for p in tracked if (root/p).is_file()], key=lambda s: s.encode())
lines = []
for f in tracked:
    h = hashlib.sha256((root/f).read_bytes()).hexdigest()
    lines.append(f'{f}\x00{h}')
source_digest = hashlib.sha256('\n'.join(lines).encode('utf-8')).hexdigest()
config_digest = hashlib.sha256((root/'public/runtime-config.js').read_bytes()).hexdigest()
registry_digest = '1f1f2f0bdb3fad8a56dfa66b1d2bfcdd3b9ea9c8216bcb67bfcde56907b88f9f'
sha = subprocess.run(['git','rev-parse','HEAD'],capture_output=True,text=True,check=True).stdout.strip()
build_id = source_digest[:24]
release_id = f'order057-{sha[:12]}-{build_id[:8]}'

dist = root/'dist'
if dist.exists(): shutil.rmtree(dist)
client = dist/'client'
(client/'icons').mkdir(parents=True)
(client/'3d').mkdir(); (client/'vendor').mkdir(); (client/'tracker').mkdir(); (client/'map').mkdir(); (client/'transit').mkdir()

public_files = ['_headers','app.js','contracts.js','coverage.html','index.html','manifest.json','offline.html','privacy.html','runtime-config.js','sources.html','styles.css','sw.js','terms.html']
for f in public_files: shutil.copy2(root/'public'/f, client/f)
for f in (root/'public/icons').iterdir(): shutil.copy2(f, client/'icons'/f.name)
for f in (root/'public/3d').rglob('*'):
    if f.is_file():
        dest = client/'3d'/f.relative_to(root/'public/3d')
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(f, dest)
for f in (root/'public/tracker').iterdir(): shutil.copy2(f, client/'tracker'/f.name)
for f in (root/'public/map').iterdir(): shutil.copy2(f, client/'map'/f.name)
for f in (root/'public/transit').iterdir(): shutil.copy2(f, client/'transit'/f.name)

three = client/'vendor'
shutil.copy2(root/'node_modules/three/build/three.module.js', three/'three.module.js')
shutil.copy2(root/'node_modules/three/build/three.core.js', three/'three.core.js')
shutil.copy2(root/'node_modules/three/LICENSE', three/'THREE-LICENSE.txt')
mlg = root/'node_modules/maplibre-gl/dist'
shutil.copy2(mlg/'maplibre-gl.mjs', three/'maplibre-gl.mjs')
shutil.copy2(mlg/'maplibre-gl-shared.mjs', three/'maplibre-gl-shared.mjs')
shutil.copy2(mlg/'maplibre-gl-worker.mjs', three/'maplibre-gl-worker.mjs')
shutil.copy2(mlg/'maplibre-gl.css', three/'maplibre-gl.css')
shutil.copy2(root/'node_modules/maplibre-gl/LICENSE.txt', three/'MAPLIBRE-LICENSE.txt')

# release-bound vendored modules (same pattern as three.core.js in build.ps1)
tm = (three/'three.module.js').read_text(encoding='utf-8').replace('./three.core.js', f'./three.core.js?v={build_id}')
(three/'three.module.js').write_text(tm, encoding='utf-8')
mm = (three/'maplibre-gl.mjs').read_text(encoding='utf-8').replace('./maplibre-gl-shared.mjs', f'./maplibre-gl-shared.mjs?v={build_id}')
(three/'maplibre-gl.mjs').write_text(mm, encoding='utf-8')

text_paths = [client/f for f in ['index.html','styles.css','app.js','contracts.js','runtime-config.js','sw.js']]
for d in ['3d','tracker','map','transit']:
    for f in (client/d).rglob('*'):
        if f.is_file() and f.suffix in ('.js','.json'): text_paths.append(f)
for p in text_paths:
    p.write_text(p.read_text(encoding='utf-8').replace('__BUILD_ID__', build_id), encoding='utf-8')

authority = (root/'src/georef-authority.generated.js').read_text(encoding='utf-8')
if 'OFFICIAL_GEOREF_RUNTIME_AUTHORITY_META' not in authority: raise SystemExit('Pinned GeoRef runtime authority missing metadata')
authority = authority.replace('export const ','const ')
rail = (root/'src/rail-stations.generated.js').read_text(encoding='utf-8')
if 'RAIL_STATION_CATALOG_META' not in rail: raise SystemExit('Pinned rail station catalog missing metadata')
rail = rail.replace('export const ','const ')
import re
worker = (root/'src/worker.template.js').read_text(encoding='utf-8')
worker = re.sub(r"^import \{OFFICIAL_GEOREF_RUNTIME_AUTHORITY_META,OFFICIAL_LOCALITY_CANON,OFFICIAL_PROVINCE_BOUNDARIES,OFFICIAL_LOCALITY_PARENT_BOUNDARIES\} from './georef-authority\.generated\.js';\r?\n",'',worker,count=1,flags=re.M)
worker = re.sub(r"^import \{RAIL_STATION_CATALOG_META,RAIL_STATIONS\} from './rail-stations\.generated\.js';\r?\n",'',worker,count=1,flags=re.M)
worker = authority+'\r\n'+rail+'\r\n'+worker
meta = f'var RELEASE_META = {{ "release_id": "{release_id}", "build_id": "{build_id}", "source_commit": "{sha}", "source_digest": "{source_digest}", "config_digest": "{config_digest}", "registry_digest": "{registry_digest}" }};'
worker = re.sub(r'var RELEASE_META = \{[^\r\n]+\};', meta, worker, count=1)
(dist/'worker.js').write_text(worker, encoding='utf-8')

files = []
for f in sorted(client.rglob('*'), key=lambda p: str(p)):
    if f.is_file():
        rel = f.relative_to(client).as_posix()
        files.append({'path':rel,'size':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
manifest = {
 'schema_version':1,'source_commit':sha,'release_id':release_id,'build_id':build_id,
 'source_digest':source_digest,'config_digest':config_digest,'registry_digest':registry_digest,
 'worker_sha256':hashlib.sha256((dist/'worker.js').read_bytes()).hexdigest(),
 'client_file_count':len(files),'client_files':files,
 'generated_at':subprocess.run(['date','-u','+%Y-%m-%dT%H:%M:%SZ'],capture_output=True,text=True).stdout.strip()
}
(dist/'BUILD_MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(f'SOURCE_COMMIT={sha}'); print(f'RELEASE_ID={release_id}'); print(f'BUILD_ID={build_id}'); print(f'CLIENT_FILES={len(files)}')
PYEOF
