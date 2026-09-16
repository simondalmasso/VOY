$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root
$sha=(git rev-parse HEAD).Trim()
$tracked=git ls-files | Sort-Object
$lines=@()
foreach($f in $tracked){if(Test-Path $f -PathType Leaf){$h=(Get-FileHash $f -Algorithm SHA256).Hash.ToLowerInvariant();$lines += "$f`0$h"}}
$sourceBytes=[Text.Encoding]::UTF8.GetBytes(($lines -join "`n"))
$sha256=[Security.Cryptography.SHA256]::Create();$sourceDigest=([BitConverter]::ToString($sha256.ComputeHash($sourceBytes))).Replace('-','').ToLowerInvariant()
$configDigest=(Get-FileHash public\runtime-config.js -Algorithm SHA256).Hash.ToLowerInvariant()
$registryDigest='1f1f2f0bdb3fad8a56dfa66b1d2bfcdd3b9ea9c8216bcb67bfcde56907b88f9f'
$buildId=$sourceDigest.Substring(0,24);$releaseId="order057-$($sha.Substring(0,12))-$($buildId.Substring(0,8))"
Remove-Item dist -Recurse -Force -ErrorAction SilentlyContinue;New-Item -ItemType Directory -Force dist,dist\client | Out-Null
$publicFiles=@('_headers','app.js','contracts.js','coverage.html','index.html','manifest.json','offline.html','privacy.html','runtime-config.js','sources.html','styles.css','sw.js','terms.html')
foreach($f in $publicFiles){Copy-Item (Join-Path 'public' $f) (Join-Path 'dist\client' $f) -Force}
New-Item -ItemType Directory -Force dist\client\icons | Out-Null
Copy-Item public\icons\* dist\client\icons -Force
$textClientFiles=@('index.html','styles.css','app.js','contracts.js','runtime-config.js','sw.js')
foreach($tf in $textClientFiles){
  $tp=Join-Path $root ('dist\client\'+$tf)
  $txt=[IO.File]::ReadAllText($tp,[Text.Encoding]::UTF8).Replace('__BUILD_ID__',$buildId)
  [IO.File]::WriteAllText($tp,$txt,(New-Object Text.UTF8Encoding($false)))
}
$authority=[IO.File]::ReadAllText((Join-Path $root 'src\georef-authority.generated.js'),[Text.Encoding]::UTF8)
if($authority -notmatch 'OFFICIAL_GEOREF_RUNTIME_AUTHORITY_META'){throw 'Pinned GeoRef runtime authority missing metadata'}
$authority=$authority.Replace('export const ','const ')
$railCatalog=[IO.File]::ReadAllText((Join-Path $root 'src\rail-stations.generated.js'),[Text.Encoding]::UTF8)
if($railCatalog -notmatch 'RAIL_STATION_CATALOG_META'){throw 'Pinned rail station catalog missing metadata'}
$railCatalog=$railCatalog.Replace('export const ','const ')
$worker=[IO.File]::ReadAllText((Join-Path $root 'src\worker.template.js'),[Text.Encoding]::UTF8)
$worker=[regex]::Replace($worker,"^import \{OFFICIAL_GEOREF_RUNTIME_AUTHORITY_META,OFFICIAL_LOCALITY_CANON,OFFICIAL_PROVINCE_BOUNDARIES,OFFICIAL_LOCALITY_PARENT_BOUNDARIES\} from './georef-authority\.generated\.js';\r?\n",'',1)
$worker=[regex]::Replace($worker,"^import \{RAIL_STATION_CATALOG_META,RAIL_STATIONS\} from './rail-stations\.generated\.js';\r?\n",'',1)
$worker=$authority+"`r`n"+$railCatalog+"`r`n"+$worker
$meta='var RELEASE_META = { "release_id": "'+$releaseId+'", "build_id": "'+$buildId+'", "source_commit": "'+$sha+'", "source_digest": "'+$sourceDigest+'", "config_digest": "'+$configDigest+'", "registry_digest": "'+$registryDigest+'" };'
$worker=[regex]::Replace($worker,'var RELEASE_META = \{[^\r\n]+\};',$meta,1)
[IO.File]::WriteAllText((Join-Path $root 'dist\worker.js'),$worker,(New-Object Text.UTF8Encoding($false)))
$files=@();Get-ChildItem dist\client -File -Recurse | Sort-Object FullName | ForEach-Object {$rel=$_.FullName.Substring((Resolve-Path dist\client).Path.Length+1).Replace('\\','/');$files += [ordered]@{path=$rel;size=$_.Length;sha256=(Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}}
$manifest=[ordered]@{schema_version=1;source_commit=$sha;release_id=$releaseId;build_id=$buildId;source_digest=$sourceDigest;config_digest=$configDigest;registry_digest=$registryDigest;worker_sha256=(Get-FileHash dist\worker.js -Algorithm SHA256).Hash.ToLowerInvariant();client_file_count=$files.Count;client_files=$files;generated_at=(Get-Date).ToUniversalTime().ToString('o')}
[IO.File]::WriteAllText((Join-Path $root 'dist\BUILD_MANIFEST.json'),($manifest|ConvertTo-Json -Depth 10)+"`n",(New-Object Text.UTF8Encoding($false)))
Write-Output "SOURCE_COMMIT=$sha";Write-Output "RELEASE_ID=$releaseId";Write-Output "BUILD_ID=$buildId";Write-Output "CLIENT_FILES=$($files.Count)"
