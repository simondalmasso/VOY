$ErrorActionPreference='Continue'
Set-Location 'C:\ProgramData\SentinelX\workspace\voy056-final-gate'
$log='C:\Users\Simon\AppData\Local\Temp\voy056-browser-matrix-user.log'
$exit='C:\Users\Simon\AppData\Local\Temp\voy056-browser-matrix-user.exit'
$out='C:\Users\Simon\AppData\Local\Temp\voy056-browser-evidence'
$report='C:\Users\Simon\AppData\Local\Temp\voy056-browser-matrix.json'
Remove-Item $log,$exit,$report -Force -ErrorAction SilentlyContinue
Remove-Item $out -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $out | Out-Null
$env:VOY_BROWSER_OUT=$out
$env:VOY_BROWSER_REPORT=$report
& 'C:\Program Files\nodejs\node.exe' 'order056\evidence\browser-matrix.mjs' *> $log
$LASTEXITCODE | Out-File -FilePath $exit -Encoding ascii -Force
