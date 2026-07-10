# Shared helpers for display KVM scripts

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

function Get-U2713HMonitorId {
    param([string]$Tool)

    $listFile = Join-Path $env:TEMP "cmm-monitors.txt"
    & $Tool /smonitors $listFile 2>&1 | Out-Null

    if (-not (Test-Path $listFile)) {
        throw "No DDC/CI monitors found. Is ControlMyMonitor working?"
    }

    $blocks = (Get-Content $listFile -Raw) -split '(?=Monitor Device Name:)'
    foreach ($block in $blocks) {
        if ($block -notmatch 'U2713H') { continue }

        if ($block -match 'Short Monitor ID: "([^"]+)"') {
            return $Matches[1]
        }
        if ($block -match 'Monitor Device Name: "([^"]+)"') {
            return $Matches[1]
        }
    }

    Add-Type -AssemblyName System.Windows.Forms
    $display3 = [System.Windows.Forms.Screen]::AllScreens |
        Where-Object { $_.DeviceName -eq '\\.\DISPLAY3' }

    if ($display3) {
        return '\\.\DISPLAY3\Monitor0'
    }

    $connectedCount = [System.Windows.Forms.Screen]::AllScreens.Count

    throw @"
Dell U2713H is not connected to this PC.

Windows sees $connectedCount monitor(s), but not the U2713H. Scripts run from the PC and need an active link to the monitor.

Check:
- PC DisplayPort cable is plugged into the U2713H (DisplayPort = PC)
- Mac HDMI cable is also plugged into the U2713H (HDMI = Mac)
- Monitor is powered on and appears in Settings > System > Display
- DDC/CI is enabled in the monitor OSD (Menu > Others)

When connected, ControlMyMonitor should list 'DELL U2713H' as a third monitor.
"@
}

function Get-U2713HInput {
    param(
        [string]$Tool,
        [string]$MonitorId
    )

    $out = Join-Path $env:TEMP "cmm-u27-input.txt"
    & $Tool /stab $out $MonitorId 2>&1 | Out-Null
    $line = Get-Content $out -ErrorAction SilentlyContinue | Where-Object { $_ -match '^60\t' }
    if ($line) {
        return ($line -split "`t")[3]
    }

    return $null
}

function Set-U2713HInput {
    param(
        [string]$Tool,
        [string]$MonitorId,
        [int]$Value,
        [string]$Label
    )

    & $Tool /SetValue $MonitorId 60 $Value 2>&1 | Out-Null
    Start-Sleep -Seconds 2

    $current = Get-U2713HInput -Tool $Tool -MonitorId $MonitorId
    if ($current -ne "$Value") {
        throw @"
Failed to switch U2713H to $Label (VCP $Value). Still on input $current.

The PC cannot reach the monitor over DDC/CI. Confirm the DisplayPort cable from the PC is plugged in and DDC/CI is enabled on the monitor.
"@
    }
}
