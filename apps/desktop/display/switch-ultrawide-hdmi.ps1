# switch-ultrawide-hdmi.ps1
# Ultrawide → Mac + PC mirror ON + Mac mirror OFF (DDC first, then parallel)

. "$PSScriptRoot\_display-common.ps1"

# DDC must run while Windows still owns the DP link
$monitorTool = Get-MonitorTool
Set-MonitorInput -Tool $monitorTool -MonitorId (Get-UltrawideMonitorId -Tool $monitorTool) `
    -Value 17 -Label "HDMI" -MonitorLabel "AW3423DWF"

# Overlap Mac unmirror with Acer-only
try { Invoke-MacMirror -Mode off } catch { Write-Warning "Mac mirror OFF: $($_.Exception.Message)" }

try {
    Enable-AcerOnlyMode
} catch {
    Write-Warning "PC mirror ON (Acer-only) failed: $($_.Exception.Message)"
}
