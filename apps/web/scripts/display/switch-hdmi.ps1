# switch-hdmi.ps1
# Switches the Dell U2713H to HDMI 1 (Mac)

. "$PSScriptRoot\_display-common.ps1"

$monitorTool = Get-MonitorTool
$targetMonitor = Get-U2713HMonitorId -Tool $monitorTool

Set-U2713HInput -Tool $monitorTool -MonitorId $targetMonitor -Value 17 -Label "HDMI (Mac)"
