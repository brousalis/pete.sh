# get-display-input.ps1
# Reads the current input source from the target monitor
# Uses ControlMyMonitor (NirSoft) to query DDC/CI values

$monitorTool = "D:\applications\ControlMyMonitor.exe"

# Target monitor - DISPLAY2 = Dell U2713H
$targetMonitor = "\\.\DISPLAY2"

# VCP code 60 = Input Source
# Returns: 15 = DisplayPort, 17 = HDMI
$value = & $monitorTool /GetValue $targetMonitor 60
Write-Output $value.Trim()
