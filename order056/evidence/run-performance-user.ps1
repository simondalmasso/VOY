$ErrorActionPreference='Continue'
Set-Location 'C:\ProgramData\SentinelX\workspace\voy056-final-gate'
$log='C:\Users\Simon\AppData\Local\Temp\voy056-performance-user.log'
$exit='C:\Users\Simon\AppData\Local\Temp\voy056-performance-user.exit'
$report='C:\Users\Simon\AppData\Local\Temp\voy056-performance.json'
Remove-Item $log,$exit,$report -Force -ErrorAction SilentlyContinue
$env:VOY_PERF_REPORT=$report
& 'C:\Program Files\nodejs\node.exe' 'order056\evidence\performance-matrix.mjs' *> $log
$LASTEXITCODE | Out-File -FilePath $exit -Encoding ascii -Force
