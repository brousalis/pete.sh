# switch-ultrawide-displayport.ps1
# Ultrawide → PC + PC mirror OFF + Mac mirror ON (parallel where safe)

. "$PSScriptRoot\_display-common.ps1"

# Kick Mac mirror early (async SSH) — overlaps with Windows work
try { Invoke-MacMirror -Mode on } catch { Write-Warning "Mac mirror ON: $($_.Exception.Message)" }

Disable-AcerOnlyMode

$monitorTool = Get-MonitorTool
Set-MonitorInput -Tool $monitorTool -MonitorId (Get-UltrawideMonitorId -Tool $monitorTool) `
    -Value 15 -Label "DisplayPort" -MonitorLabel "AW3423DWF"
