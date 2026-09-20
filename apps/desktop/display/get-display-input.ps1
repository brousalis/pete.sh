# get-display-input.ps1
# Reads the current input source from the Dell U2713H
# Returns: 15 = DisplayPort (PC), 17 = HDMI (Mac)

. "$PSScriptRoot\_display-common.ps1"

$monitorTool = Get-MonitorTool
$targetMonitor = Get-U2713HMonitorId -Tool $monitorTool
$value = & $monitorTool /GetValue $targetMonitor 60

if ($value) {
    Write-Output $value.Trim()
} else {
    Write-Output (Get-U2713HInput -Tool $monitorTool -MonitorId $targetMonitor)
}
