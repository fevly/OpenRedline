param(
  [string]$InstallRoot = (Join-Path $env:LOCALAPPDATA "OpenRedline"),
  [string]$CatalogName = "OpenRedlineOfficeAddins",
  [switch]$KeepSettings,
  [switch]$SkipInstallRootRemoval
)

$ErrorActionPreference = "SilentlyContinue"

$TaskName = "OpenRedline Backend"
$CatalogGuid = "{7f5c9f74-26f6-47c8-8c73-4db5d44c8f29}"
$CatalogDir = Join-Path ([Environment]::GetFolderPath("MyDocuments")) $CatalogName
$ProgramsDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\OpenRedline"
$UninstallRegistryPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\OpenRedline"

if (Test-Path (Join-Path $InstallRoot "windows\stop-openredline.ps1")) {
  & (Join-Path $InstallRoot "windows\stop-openredline.ps1")
}

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
Remove-Item "HKCU:\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\$CatalogGuid" -Recurse -Force
Remove-SmbShare -Name $CatalogName -Force
Remove-Item $ProgramsDir -Recurse -Force
Remove-Item $CatalogDir -Recurse -Force
Remove-Item $UninstallRegistryPath -Recurse -Force

if (-not $SkipInstallRootRemoval) {
  if ($KeepSettings) {
    Get-ChildItem -LiteralPath $InstallRoot -Force | Where-Object { $_.Name -ne "data" } | Remove-Item -Recurse -Force
  } else {
    Remove-Item $InstallRoot -Recurse -Force
  }
}

Write-Host "OpenRedline uninstalled."
