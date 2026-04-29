#define AppName "OpenRedline"
#define AppVersion "0.1.0"
#ifndef SourceDir
#define SourceDir "..\dist\OpenRedline-windows-staging"
#endif
#ifndef OutputDir
#define OutputDir "..\dist"
#endif

[Setup]
AppId={{7F5C9F74-26F6-47C8-8C73-4DB5D44C8F29}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher=OpenRedline
DefaultDirName={autopf}\OpenRedline
DefaultGroupName=OpenRedline
DisableProgramGroupPage=yes
OutputDir={#OutputDir}
OutputBaseFilename=OpenRedline-windows-preview
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
UninstallDisplayName=OpenRedline

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\OpenRedline"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\windows\start-openredline.ps1"" -OpenConfig"; WorkingDir: "{app}"
Name: "{group}\Stop OpenRedline"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\windows\stop-openredline.ps1"""; WorkingDir: "{app}"
Name: "{group}\Uninstall OpenRedline"; Filename: "{uninstallexe}"

[Run]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\windows\register-openredline.ps1"" -InstallRoot ""{app}"""; Flags: runhidden waituntilterminated

[UninstallRun]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\windows\uninstall-openredline.ps1"" -InstallRoot ""{app}"" -SkipInstallRootRemoval"; Flags: runhidden waituntilterminated
