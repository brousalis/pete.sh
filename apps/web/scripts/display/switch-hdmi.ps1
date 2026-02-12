# switch-hdmi.ps1
# Switches the target monitor to HDMI input
# Uses ControlMyMonitor (NirSoft) to send DDC/CI commands

$monitorTool = "D:\applications\ControlMyMonitor.exe"

# Target monitor - DISPLAY2 = Dell U2713H
$targetMonitor = "\\.\DISPLAY2"

# VCP code 60 = Input Source
# Value 17 = HDMI
& $monitorTool /SetValue $targetMonitor 60 17
