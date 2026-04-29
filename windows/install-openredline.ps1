param(
  [string]$InstallRoot = (Join-Path $env:LOCALAPPDATA "OpenRedline"),
  [string]$CatalogName = "OpenRedlineOfficeAddins",
  [switch]$SkipCatalogShare
)

$ErrorActionPreference = "Stop"

$SourceRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ManifestSource = Join-Path $SourceRoot "manifest.xml"
$CatalogDir = Join-Path ([Environment]::GetFolderPath("MyDocuments")) $CatalogName
$ManifestTarget = Join-Path $CatalogDir "manifest.xml"
$TaskName = "OpenRedline Backend"
$CatalogGuid = "{7f5c9f74-26f6-47c8-8c73-4db5d44c8f29}"
$UninstallRegistryPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\OpenRedline"

function Assert-Command($Name, $InstallHint) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name was not found. $InstallHint"
  }
}

function Copy-Project {
  New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null
  $exclude = @(".git", ".env", "data", "dist", "node_modules", ".DS_Store", "openredline-helper.log")
  Get-ChildItem -LiteralPath $SourceRoot -Force | Where-Object {
    $exclude -notcontains $_.Name
  } | ForEach-Object {
    $target = Join-Path $InstallRoot $_.Name
    if (Test-Path $target) {
      Remove-Item $target -Recurse -Force
    }
    Copy-Item $_.FullName $target -Recurse -Force
  }
}

function Install-Dependencies {
  Push-Location $InstallRoot
  try {
    npm install
    npm run certs
  } finally {
    Pop-Location
  }
}

function Install-ManifestCatalog {
  New-Item -ItemType Directory -Force -Path $CatalogDir | Out-Null
  Copy-Item $ManifestSource $ManifestTarget -Force

  if (-not $SkipCatalogShare) {
    $existing = Get-SmbShare -Name $CatalogName -ErrorAction SilentlyContinue
    if (-not $existing) {
      New-SmbShare -Name $CatalogName -Path $CatalogDir -FullAccess $env:USERNAME | Out-Null
    }
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

function Create-Shortcuts {
  $programs = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\OpenRedline"
  New-Item -ItemType Directory -Force -Path $programs | Out-Null

  $openScript = Join-Path $InstallRoot "windows\start-openredline.ps1"
  $stopScript = Join-Path $InstallRoot "windows\stop-openredline.ps1"
  $uninstallScript = Join-Path $InstallRoot "windows\openredline-uninstaller.ps1"
  $shell = New-Object -ComObject WScript.Shell

  $openShortcut = $shell.CreateShortcut((Join-Path $programs "OpenRedline.lnk"))
  $openShortcut.TargetPath = "powershell.exe"
  $openShortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$openScript`" -OpenConfig"
  $openShortcut.WorkingDirectory = $InstallRoot
  $openShortcut.Save()

  $stopShortcut = $shell.CreateShortcut((Join-Path $programs "Stop OpenRedline.lnk"))
  $stopShortcut.TargetPath = "powershell.exe"
  $stopShortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$stopScript`""
  $stopShortcut.WorkingDirectory = $InstallRoot
  $stopShortcut.Save()

  $uninstallShortcut = $shell.CreateShortcut((Join-Path $programs "Uninstall OpenRedline.lnk"))
  $uninstallShortcut.TargetPath = "powershell.exe"
  $uninstallShortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$uninstallScript`""
  $uninstallShortcut.WorkingDirectory = $InstallRoot
  $uninstallShortcut.Save()
}

function Register-Uninstaller {
  $uninstallScript = Join-Path $InstallRoot "windows\openredline-uninstaller.ps1"
  $quietUninstallScript = Join-Path $InstallRoot "windows\uninstall-openredline.ps1"
  $uninstallCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$uninstallScript`""
  $quietUninstallCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$quietUninstallScript`""

  New-Item -Path $UninstallRegistryPath -Force | Out-Null
  New-ItemProperty -Path $UninstallRegistryPath -Name "DisplayName" -Value "OpenRedline" -PropertyType String -Force | Out-Null
  New-ItemProperty -Path $UninstallRegistryPath -Name "DisplayVersion" -Value "0.1.0" -PropertyType String -Force | Out-Null
  New-ItemProperty -Path $UninstallRegistryPath -Name "Publisher" -Value "OpenRedline" -PropertyType String -Force | Out-Null
  New-ItemProperty -Path $UninstallRegistryPath -Name "InstallLocation" -Value $InstallRoot -PropertyType String -Force | Out-Null
  New-ItemProperty -Path $UninstallRegistryPath -Name "DisplayIcon" -Value "powershell.exe" -PropertyType String -Force | Out-Null
  New-ItemProperty -Path $UninstallRegistryPath -Name "UninstallString" -Value $uninstallCommand -PropertyType String -Force | Out-Null
  New-ItemProperty -Path $UninstallRegistryPath -Name "QuietUninstallString" -Value $quietUninstallCommand -PropertyType String -Force | Out-Null
  New-ItemProperty -Path $UninstallRegistryPath -Name "NoModify" -Value 1 -PropertyType DWord -Force | Out-Null
  New-ItemProperty -Path $UninstallRegistryPath -Name "NoRepair" -Value 1 -PropertyType DWord -Force | Out-Null
}

Assert-Command "node" "Install Node.js LTS from https://nodejs.org/"
Assert-Command "npm" "Install Node.js LTS from https://nodejs.org/"

Copy-Project
Install-Dependencies
Install-ManifestCatalog
Register-StartupTask
Create-Shortcuts
Register-Uninstaller

& (Join-Path $InstallRoot "windows\start-openredline.ps1")

Write-Host ""
Write-Host "OpenRedline installed."
Write-Host "Backend: https://localhost:3000"
Write-Host "Word add-in catalog: \\localhost\$CatalogName"
Write-Host "Restart Word, then open Home > Add-ins > Advanced > Shared Folder and add OpenRedline."
