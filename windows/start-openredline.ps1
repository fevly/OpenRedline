param(
  [switch]$OpenConfig
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$LogDir = Join-Path $env:LOCALAPPDATA "OpenRedline\logs"
$OutLogPath = Join-Path $LogDir "openredline-server.out.log"
$ErrLogPath = Join-Path $LogDir "openredline-server.err.log"
$PidPath = Join-Path $LogDir "openredline-server.pid"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Test-OpenRedlineHealth {
  try {
    $response = Invoke-WebRequest -Uri "https://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js was not found in PATH. Install Node.js LTS, then run the installer again."
}

if (Test-OpenRedlineHealth) {
  if ($OpenConfig) {
    Start-Process "https://localhost:3000/src/taskpane.html"
  }
  exit 0
}

$node = (Get-Command node).Source
$process = Start-Process `
  -FilePath $node `
  -ArgumentList "server.js" `
  -WorkingDirectory $Root `
  -WindowStyle Hidden `
  -RedirectStandardOutput $OutLogPath `
  -RedirectStandardError $ErrLogPath `
  -PassThru

Set-Content -Path $PidPath -Value $process.Id -Encoding ASCII

Start-Sleep -Seconds 2
if ($OpenConfig) {
  Start-Process "https://localhost:3000/src/taskpane.html"
}
