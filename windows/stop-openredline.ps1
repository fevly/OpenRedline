$ErrorActionPreference = "SilentlyContinue"

$LogDir = Join-Path $env:LOCALAPPDATA "OpenRedline\logs"
$PidPath = Join-Path $LogDir "openredline-server.pid"

if (Test-Path $PidPath) {
  $pidValue = Get-Content $PidPath | Select-Object -First 1
  if ($pidValue) {
    Stop-Process -Id ([int]$pidValue) -Force
  }
  Remove-Item $PidPath -Force
}

$connections = Get-NetTCPConnection -LocalPort 3000 -State Listen
foreach ($connection in $connections) {
  Stop-Process -Id $connection.OwningProcess -Force
}
