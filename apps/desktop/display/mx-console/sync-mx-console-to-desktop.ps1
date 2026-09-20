# sync-mx-console-to-desktop.ps1
# Regenerates the Desktop "Display KVM" launcher folder Logi Options+ uses.
#
# Canonical folder:
#   <Desktop>\Display KVM
# (typically C:\Users\brous\OneDrive\Desktop\Display KVM)

$ErrorActionPreference = 'Stop'

$scriptsDir = Resolve-Path (Join-Path $PSScriptRoot '..')
$desktopKvm = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Display KVM'
$ps = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'

New-Item -ItemType Directory -Path $desktopKvm -Force | Out-Null

$buttons = @(
    @{ Name = '1-ultrawide-to-pc';  Label = 'Ultrawide to PC';  Script = 'switch-ultrawide-displayport.ps1' }
    @{ Name = '2-ultrawide-to-mac'; Label = 'Ultrawide to Mac'; Script = 'switch-ultrawide-hdmi.ps1' }
    @{ Name = '3-swap-screens';    Label = 'Swap Screens';     Script = 'screen-swap.ps1' }
    @{ Name = '4-dell-to-pc';      Label = 'Dell to PC';       Script = 'switch-u2713h-displayport.ps1' }
    @{ Name = '5-dell-to-mac';     Label = 'Dell to Mac';      Script = 'switch-u2713h-hdmi.ps1' }
)

$shell = New-Object -ComObject WScript.Shell

foreach ($b in $buttons) {
    $scriptPath = Join-Path $scriptsDir $b.Script
    if (-not (Test-Path $scriptPath)) {
        throw "Missing script: $scriptPath"
    }

    $cmdPath = Join-Path $desktopKvm "$($b.Name).cmd"
    @"
@echo off
rem $($b.Label)
"$ps" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$scriptPath"
"@ | Set-Content -Path $cmdPath -Encoding ASCII

    $lnkPath = Join-Path $desktopKvm "$($b.Label).lnk"
    $sc = $shell.CreateShortcut($lnkPath)
    $sc.TargetPath = $cmdPath
    $sc.WorkingDirectory = "$scriptsDir"
    $sc.Description = $b.Label
    $sc.WindowStyle = 7
    $sc.Save()

    Write-Host "Updated $($b.Name)"
}

$layoutPath = Join-Path $desktopKvm 'LAYOUT.txt'
@"
MX Creative Console / 3x3 Action Keys
=====================================
CANONICAL FOLDER (edit / update here):
  $desktopKvm

Scripts live in the repo; these .cmd files only launch them:
  $scriptsDir\*.ps1

Bind each button in Logi Options+ to the matching .cmd below.

Suggested layout (top-left = button 1):

  +------------------+------------------+------------------+
  | 1 Ultrawide->PC  | 2 Ultrawide->Mac | 3 Swap Screens   |
  | 1-ultrawide-...  | 2-ultrawide-...  | 3-swap-screens   |
  +------------------+------------------+------------------+
  | 4 Dell->PC       | 5 Dell->Mac      | 6 (free)         |
  | 4-dell-to-pc     | 5-dell-to-mac    |                  |
  +------------------+------------------+------------------+
  | 7 (free)         | 8 (free)         | 9 (free)         |
  +------------------+------------------+------------------+

Mental model:
  Left column   = bring that monitor to PC
  Middle column = send that monitor to Mac
  Top-right     = toggle Dell PC<->Mac

After Dell->Mac, run on the Mac:
  apps/desktop/display/mac/mac-mirror-dell-primary.sh
"@ | Set-Content -Path $layoutPath -Encoding UTF8

Write-Host "`nSynced launchers -> $desktopKvm"
