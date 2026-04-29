$ErrorActionPreference = "Stop"

$title = "OpenRedline Uninstaller"
$message = "Do you want to uninstall OpenRedline from this computer?"
$choice = $true

try {
  Add-Type -AssemblyName PresentationFramework
  $result = [System.Windows.MessageBox]::Show($message, $title, "YesNo", "Question")
  $choice = $result -eq "Yes"
} catch {
  $answer = Read-Host "$message [y/N]"
  $choice = $answer -match "^(y|yes)$"
}

if (-not $choice) {
  exit 0
}

$script = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "uninstall-openredline.ps1"
& $script

try {
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show("OpenRedline has been uninstalled.", $title, "OK", "Information") | Out-Null
} catch {
  Write-Host "OpenRedline has been uninstalled."
}
