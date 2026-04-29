# OpenRedline for Windows

This folder contains the Windows local installer scripts.

## Requirements

- Windows 10 or Windows 11
- Microsoft Word for Windows
- Node.js LTS
- PowerShell

## Install

Open PowerShell as Administrator from the extracted OpenRedline folder:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\windows\install-openredline.ps1
```

The installer copies OpenRedline to `%LOCALAPPDATA%\OpenRedline`, installs dependencies, trusts the local HTTPS certificate, registers a startup task, creates Start Menu shortcuts, starts the backend, and registers a Word shared-folder add-in catalog.

After installation, restart Word, then open:

```text
Home > Add-ins > Advanced > Shared Folder
```

Choose OpenRedline and add it to Word.

## Start and stop

Use the Start Menu shortcuts:

- OpenRedline
- Stop OpenRedline
- Uninstall OpenRedline

The backend runs at:

```text
https://localhost:3000
```

## Uninstall

OpenRedline can be uninstalled from Windows Settings:

```text
Settings > Apps > Installed apps > OpenRedline > Uninstall
```

You can also use the Start Menu shortcut:

```text
OpenRedline > Uninstall OpenRedline
```

Command-line uninstall is also available:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\windows\uninstall-openredline.ps1
```

Keep local model and Prompt settings while uninstalling:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\windows\uninstall-openredline.ps1 -KeepSettings
```
