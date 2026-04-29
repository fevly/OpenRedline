# OpenRedline for Windows

This folder contains the Windows installer scripts and EXE installer definition.

## Requirements

- Windows 10 or Windows 11
- Microsoft Word for Windows
- PowerShell

## Install

For normal users, download and run:

```text
OpenRedline-windows-preview.exe
```

The EXE installer includes a bundled Node.js runtime. Users do not need to install Node.js manually.

After installation, restart Word, then open:

```text
Home > Add-ins > Advanced > Shared Folder
```

Choose OpenRedline and add it to Word.

## Script Install

The PowerShell installer is still available for development builds. It requires Node.js LTS.

Open PowerShell as Administrator from the extracted OpenRedline folder:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\windows\install-openredline.ps1
```

The script installer copies OpenRedline to `%LOCALAPPDATA%\OpenRedline`, installs dependencies, trusts the local HTTPS certificate, registers a startup task, creates Start Menu shortcuts, starts the backend, and registers a Word shared-folder add-in catalog.

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
