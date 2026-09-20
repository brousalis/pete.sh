# screen-swap.ps1
# Toggles the Dell U2713H between PC (DisplayPort) and Mac (HDMI)
# Run once to swap, run again to swap back.

. "$PSScriptRoot\_display-common.ps1"

$monitorTool = Get-MonitorTool
$targetMonitor = Get-U2713HMonitorId -Tool $monitorTool

$displayPort = 15   # PC
$hdmi = 17          # Mac

$currentInput = Get-U2713HInput -Tool $monitorTool -MonitorId $targetMonitor

if ($currentInput -eq "$displayPort") {
    Set-U2713HInput -Tool $monitorTool -MonitorId $targetMonitor -Value $hdmi -Label "HDMI (Mac)"
} else {
    Set-U2713HInput -Tool $monitorTool -MonitorId $targetMonitor -Value $displayPort -Label "DisplayPort (PC)"
}
