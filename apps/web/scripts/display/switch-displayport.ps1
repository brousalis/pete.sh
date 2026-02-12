# switch-displayport.ps1
# Switches the target monitor to DisplayPort input
# Uses ControlMyMonitor (NirSoft) to send DDC/CI commands

$monitorTool = "D:\applications\ControlMyMonitor.exe"

# Target monitor - DISPLAY2 = Dell U2713H
$targetMonitor = "\\.\DISPLAY2"

# VCP code 60 = Input Source
# Dell U2713H: Value 15 = DisplayPort
& $monitorTool /SetValue $targetMonitor 60 15
