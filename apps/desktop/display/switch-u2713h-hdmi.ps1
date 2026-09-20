# switch-u2713h-hdmi.ps1
# Switches the Dell U2713H to HDMI (Mac)
#
# VCP code 60 = Input Select (MCCS)
#   15 = DisplayPort-1 (PC)
#   17 = HDMI-1        (Mac)
#
# After this, on the Mac run:
#   apps/desktop/display/mac/mac-mirror-dell-primary.sh
# so Alienware HDMI mirrors Dell and Mac windows stay visible.

. "$PSScriptRoot\_display-common.ps1"

$monitorTool = Get-MonitorTool
$targetMonitor = Get-U2713HMonitorId -Tool $monitorTool

Set-MonitorInput -Tool $monitorTool -MonitorId $targetMonitor -Value 17 -Label "HDMI (Mac)" -MonitorLabel "U2713H"
