# Shared helpers for display KVM scripts (latency-tuned)

# Known stable ControlMyMonitor short IDs — skip /smonitors round-trips
$script:KnownMonitorIds = @{
    Ultrawide = 'DELA212'   # Alienware AW3423DWF
    Acer      = 'ACR081B'   # XV272U V
    Dell27    = 'DELA092'   # U2713H
}

function Get-MonitorTool {
    $tool = @(
        "C:\tools\ControlMyMonitor.exe"
        "D:\applications\ControlMyMonitor.exe"
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1

    if (-not $tool) {
        throw "ControlMyMonitor.exe not found at C:\tools or D:\applications"
    }

    return $tool
}

function Get-MonitorIdByMatch {
    param(
        [string]$Tool,
        [string]$Match
    )

    $listFile = Join-Path $env:TEMP "cmm-monitors.txt"
    & $Tool /smonitors $listFile 2>&1 | Out-Null

    if (-not (Test-Path $listFile)) {
        throw "No DDC/CI monitors found. Is ControlMyMonitor working?"
    }

    $blocks = (Get-Content $listFile -Raw) -split '(?=Monitor Device Name:)'
    foreach ($block in $blocks) {
        if ($block -notmatch [regex]::Escape($Match)) { continue }

        if ($block -match 'Short Monitor ID: "([^"]+)"') {
            return $Matches[1]
        }
        if ($block -match 'Monitor Device Name: "([^"]+)"') {
            return $Matches[1]
        }
    }

    return $null
}

function Get-MonitorInput {
    param(
        [string]$Tool,
        [string]$MonitorId
    )

    # /GetValue returns the VCP value as the process exit code (NirSoft convention)
    $proc = Start-Process -FilePath $Tool -ArgumentList @('/GetValue', $MonitorId, '60') -Wait -PassThru -WindowStyle Hidden
    if ($null -eq $proc) { return $null }
    if ($proc.ExitCode -ge 0 -and $proc.ExitCode -le 255) {
        return [string]$proc.ExitCode
    }
    return $null
}

<#
.SYNOPSIS
Set VCP 60. Default is fire-and-forget (no /stab verify) — Alienware switches reliably.
#>
function Set-MonitorInput {
    param(
        [string]$Tool,
        [string]$MonitorId,
        [int]$Value,
        [string]$Label,
        [string]$MonitorLabel = "monitor",
        [switch]$Verify
    )

    & $Tool /SetValue $MonitorId 60 $Value 2>&1 | Out-Null

    if (-not $Verify) {
        return
    }

    Start-Sleep -Milliseconds 800
    $current = Get-MonitorInput -Tool $Tool -MonitorId $MonitorId
    if ($current -ne "$Value") {
        throw @"
Failed to switch $MonitorLabel to $Label (VCP $Value). Still on input $current.
"@
    }
}

function Get-UltrawideMonitorId {
    param([string]$Tool)
    # Stable short id — avoid /smonitors (~seconds)
    return $script:KnownMonitorIds.Ultrawide
}

function Get-U2713HMonitorId {
    param([string]$Tool)

    $id = Get-MonitorIdByMatch -Tool $Tool -Match 'U2713H'
    if ($id) { return $id }

    Add-Type -AssemblyName System.Windows.Forms
    $display3 = [System.Windows.Forms.Screen]::AllScreens |
        Where-Object { $_.DeviceName -eq '\\.\DISPLAY3' }

    if ($display3) {
        return '\\.\DISPLAY3\Monitor0'
    }

    $connectedCount = [System.Windows.Forms.Screen]::AllScreens.Count

    throw @"
Dell U2713H is not reachable from this PC (Windows sees $connectedCount monitor(s)).
"@
}

function Get-U2713HInput {
    param([string]$Tool, [string]$MonitorId)
    return Get-MonitorInput -Tool $Tool -MonitorId $MonitorId
}

function Set-U2713HInput {
    param([string]$Tool, [string]$MonitorId, [int]$Value, [string]$Label)
    Set-MonitorInput -Tool $Tool -MonitorId $MonitorId -Value $Value -Label $Label -MonitorLabel "U2713H" -Verify
}

# --- MultiMonitorTool --------------------------------------------------------

function Get-MultiMonitorTool {
    $tool = @(
        'C:\tools\MultiMonitorTool.exe'
        'D:\applications\MultiMonitorTool.exe'
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1

    if (-not $tool) {
        throw 'MultiMonitorTool.exe not found at C:\tools\'
    }
    return $tool
}

function Get-MmtMonitorTable {
    param(
        [string]$Tool,
        [int]$SettleMs = 0
    )

    $csv = Join-Path $env:TEMP ("mmt-{0}.csv" -f [guid]::NewGuid().ToString('N'))
    & $Tool /scomma $csv 2>&1 | Out-Null
    if ($SettleMs -gt 0) {
        Start-Sleep -Milliseconds $SettleMs
    }
    if (-not (Test-Path $csv)) {
        Start-Sleep -Milliseconds 200
    }
    if (-not (Test-Path $csv)) {
        throw 'MultiMonitorTool failed to export monitor list.'
    }
    try {
        return @(Import-Csv $csv)
    } finally {
        Remove-Item $csv -Force -ErrorAction SilentlyContinue
    }
}

function Ensure-WindowsMonitorEnabled {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ShortId,
        [switch]$SetPrimary
    )

    $mmt = Get-MultiMonitorTool
    $table = Get-MmtMonitorTable -Tool $mmt
    $row = $table | Where-Object { $_.'Short Monitor ID' -eq $ShortId } | Select-Object -First 1

    if (-not $row) { return }

    if ($row.Active -eq 'No') {
        if ($row.Name) {
            & $mmt /enable $row.Name
            Start-Sleep -Milliseconds 600
        } else {
            Start-Process -FilePath "$env:SystemRoot\System32\DisplaySwitch.exe" -ArgumentList '3' -WindowStyle Hidden -Wait
            Start-Sleep -Milliseconds 800
        }

        $table = Get-MmtMonitorTable -Tool $mmt
        $row = $table | Where-Object { $_.'Short Monitor ID' -eq $ShortId } | Select-Object -First 1
        if (-not $row -or $row.Active -eq 'No') {
            throw "Could not re-enable monitor $ShortId in Windows."
        }
        Remove-Item (Get-AcerOnlyStatePath) -Force -ErrorAction SilentlyContinue
    }

    if ($SetPrimary -and $row.Name) {
        & $mmt /SetPrimary $row.Name
    }
}

# --- Mac SSH -----------------------------------------------------------------

function Get-MacLanConfig {
    $path = Join-Path $PSScriptRoot 'mac-lan.local.ps1'
    if (-not (Test-Path $path)) {
        throw "Missing $path. Copy mac-lan.local.example.ps1 to mac-lan.local.ps1"
    }
    return & $path
}

function Get-SshMuxPath {
    $dir = Join-Path $env:USERPROFILE '.ssh'
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    # %C = hash of remote; works on Windows OpenSSH
    return (Join-Path $dir 'cm-%C')
}

function Get-SshBaseArgs {
    param($cfg)

    # ControlMaster is flaky on Windows OpenSSH ("getsockname failed: Not a socket")
    $sshOpts = @(
        '-o', 'BatchMode=yes'
        '-o', 'ConnectTimeout=5'
        '-o', 'StrictHostKeyChecking=accept-new'
    )
    if ($cfg.IdentityFile) {
        $sshOpts += @('-i', $cfg.IdentityFile)
    }
    return $sshOpts
}

function Invoke-MacRemote {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RemoteCommand
    )

    $cfg = Get-MacLanConfig
    if (-not $cfg.SshTarget) {
        throw 'mac-lan.local.ps1 must set SshTarget'
    }

    $ssh = Get-Command ssh -ErrorAction SilentlyContinue
    if (-not $ssh) {
        throw 'ssh.exe not found. Install Windows OpenSSH Client.'
    }

    $sshArgs = @(Get-SshBaseArgs -cfg $cfg) + @($cfg.SshTarget, $RemoteCommand)
    & $ssh.Source @sshArgs
    if ($LASTEXITCODE -ne 0) {
        throw "SSH to $($cfg.SshTarget) failed (exit $LASTEXITCODE)."
    }
}

function Invoke-MacDellToPc {
    $cfg = Get-MacLanConfig
    if (-not $cfg.MacScriptPath) {
        throw 'mac-lan.local.ps1 must set MacScriptPath'
    }

    $displayExport = ''
    if ($cfg.M1ddcDisplay) {
        $displayExport = "export M1DDC_DISPLAY='$($cfg.M1ddcDisplay)'; "
    }

    $remote = 'bash -lc "{0}exec ''{1}''"' -f $displayExport, $cfg.MacScriptPath
    Invoke-MacRemote -RemoteCommand $remote
}

function Invoke-MacMirrorToggle {
    Invoke-MacMirror -Mode toggle
}

function Invoke-MacMirror {
    param(
        [ValidateSet('on', 'off', 'toggle')]
        [string]$Mode = 'toggle',
        [switch]$Wait
    )

    $cfg = Get-MacLanConfig
    $scriptPath = $cfg.MacMirrorTogglePath
    if (-not $scriptPath) {
        $scriptPath = '/Users/petebrousalis/dev/mac-toggle-mirror.sh'
    }

    if ($Wait) {
        Invoke-MacRemote -RemoteCommand "zsh -f '$scriptPath' $Mode"
    } else {
        # Sync SSH + remote nohup: reliable launch, returns as soon as job is backgrounded
        $remote = "nohup zsh -f '$scriptPath' $Mode >/tmp/petehome-mac-mirror.log 2>&1 & echo started"
        Invoke-MacRemote -RemoteCommand $remote
    }
}

# --- Acer-only (PC "mirror") -------------------------------------------------

function Get-AcerOnlyStatePath {
    Join-Path $env:TEMP 'petehome-acer-only-state.json'
}

function Get-AcerMonitorRow {
    param($Table)
    $Table | Where-Object { $_.'Short Monitor ID' -eq 'ACR081B' } | Select-Object -First 1
}

function Get-NonAcerActiveMonitors {
    param($Table)
    $Table | Where-Object {
        $_.'Short Monitor ID' -ne 'ACR081B' -and
        $_.Active -eq 'Yes'
    }
}

function Test-AcerOnlyModeActive {
    param($Table)

    if (-not $Table) {
        $Table = Get-MmtMonitorTable -Tool (Get-MultiMonitorTool)
    }
    $acer = Get-AcerMonitorRow -Table $Table
    if (-not $acer -or $acer.Active -ne 'Yes') { return $false }
    return (@(Get-NonAcerActiveMonitors -Table $Table).Count -eq 0)
}

function Enable-AcerOnlyMode {
    $mmt = Get-MultiMonitorTool
    $table = Get-MmtMonitorTable -Tool $mmt

    if (Test-AcerOnlyModeActive -Table $table) {
        return
    }

    $acer = Get-AcerMonitorRow -Table $table
    if (-not $acer) {
        throw 'Acer XV272U V (ACR081B) not found.'
    }

    & $mmt /SetPrimary $acer.Name

    $table = Get-MmtMonitorTable -Tool $mmt
    $others = @(Get-NonAcerActiveMonitors -Table $table)
    if ($others.Count -eq 0) {
        return
    }

    $disabledNames = @()
    $awName = $null
    foreach ($mon in $others) {
        if ($mon.'Short Monitor ID' -eq 'DELA212') { $awName = $mon.Name }
        & $mmt /disable $mon.Name
        $disabledNames += $mon.Name
    }

    @{
        disabledNames = @($disabledNames)
        alienwareName = $awName
        savedAt       = (Get-Date).ToString('o')
    } | ConvertTo-Json | Set-Content -Path (Get-AcerOnlyStatePath) -Encoding UTF8
}

function Disable-AcerOnlyMode {
    $mmt = Get-MultiMonitorTool
    $statePath = Get-AcerOnlyStatePath

    # Fastest path: saved names from Enable-AcerOnlyMode (skip CSV)
    if (Test-Path $statePath) {
        try {
            $state = Get-Content $statePath -Raw | ConvertFrom-Json
            foreach ($name in @($state.disabledNames)) {
                if (-not $name) { continue }
                & $mmt /enable $name
            }
            if ($state.alienwareName) {
                Start-Sleep -Milliseconds 250
                & $mmt /SetPrimary $state.alienwareName
                Remove-Item $statePath -Force -ErrorAction SilentlyContinue
                return
            }
        } catch { }
        Remove-Item $statePath -Force -ErrorAction SilentlyContinue
    }

    $table = Get-MmtMonitorTable -Tool $mmt
    $aw = $table | Where-Object { $_.'Short Monitor ID' -eq 'DELA212' } | Select-Object -First 1
    if ($aw -and $aw.Active -eq 'Yes') {
        if ($aw.Primary -ne 'Yes' -and $aw.Name) {
            & $mmt /SetPrimary $aw.Name
        }
        return
    }

    if ($aw -and $aw.Name) {
        & $mmt /enable $aw.Name
        Start-Sleep -Milliseconds 300
        & $mmt /SetPrimary $aw.Name
        return
    }

    Start-Process -FilePath "$env:SystemRoot\System32\DisplaySwitch.exe" -ArgumentList '3' -WindowStyle Hidden -Wait
    Start-Sleep -Milliseconds 400
    $table = Get-MmtMonitorTable -Tool $mmt
    $aw = $table | Where-Object { $_.'Short Monitor ID' -eq 'DELA212' -and $_.Active -eq 'Yes' } | Select-Object -First 1
    if ($aw -and $aw.Name) {
        & $mmt /SetPrimary $aw.Name
    }
}
