param(
  [string]$InstallRoot = (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)),
  [string]$CatalogName = "OpenRedlineOfficeAddins"
)

$ErrorActionPreference = "Stop"

$ManifestSource = Join-Path $InstallRoot "manifest.xml"
$CatalogDir = Join-Path ([Environment]::GetFolderPath("MyDocuments")) $CatalogName
$ManifestTarget = Join-Path $CatalogDir "manifest.xml"
$TaskName = "OpenRedline Backend"
$CatalogGuid = "{7f5c9f74-26f6-47c8-8c73-4db5d44c8f29}"
$Node = Join-Path $InstallRoot "runtime\node.exe"
$CertCli = Join-Path $InstallRoot "node_modules\office-addin-dev-certs\cli.js"

function Install-LocalCertificate {
  if ((Test-Path $Node) -and (Test-Path $CertCli)) {
    Push-Location $InstallRoot
    try {
      & $Node $CertCli install
    } finally {
      Pop-Location
    }
  }
}

function Install-ManifestCatalog {
  New-Item -ItemType Directory -Force -Path $CatalogDir | Out-Null
  Copy-Item $ManifestSource $ManifestTarget -Force

  $existing = Get-SmbShare -Name $CatalogName -ErrorAction SilentlyContinue
  if (-not $existing) {
    New-SmbShare -Name $CatalogName -Path $CatalogDir -FullAccess $env:USERNAME | Out-Null
  }

  $shareUrl = "\\localhost\$CatalogName"
  $registryPath = "HKCU:\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\$CatalogGuid"
  New-Item -Path $registryPath -Force | Out-Null
  New-ItemProperty -Path $registryPath -Name "Id" -Value $CatalogGuid -PropertyType String -Force | Out-Null
  New-ItemProperty -Path $registryPath -Name "Url" -Value $shareUrl -PropertyType String -Force | Out-Null
  New-ItemProperty -Path $registryPath -Name "Flags" -Value 1 -PropertyType DWord -Force | Out-Null
}

function Register-StartupTask {
  $script = Join-Path $InstallRoot "windows\start-openredline.ps1"
  $action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
  $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Description "Starts the OpenRedline local backend." -Force | Out-Null
}

Install-LocalCertificate
Install-ManifestCatalog
Register-StartupTask
& (Join-Path $InstallRoot "windows\start-openredline.ps1")
