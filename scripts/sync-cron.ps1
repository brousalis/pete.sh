# petehome Sync Cron Script
# This script calls the /api/sync endpoint periodically to keep Supabase data fresh.
# Run this when you want syncing to happen even when the browser isn't open.
#
# Usage:
#   .\scripts\sync-cron.ps1                    # Run once
#   .\scripts\sync-cron.ps1 -Interval 30      # Run every 30 seconds continuously
#   .\scripts\sync-cron.ps1 -Interval 60 -Debug  # Run every 60s with debug output
#
# To run in background:
#   Start-Job { .\scripts\sync-cron.ps1 -Interval 30 }

param(
    [int]$Interval = 0,      # Interval in seconds (0 = run once)
    [string]$BaseUrl = "http://localhost:3000",
    [switch]$Debug
)

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "ERROR" { "Red" }
        "WARN"  { "Yellow" }
        "SUCCESS" { "Green" }
        default { "White" }
    }
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

function Invoke-Sync {
    try {
        $uri = "$BaseUrl/api/sync"
        $body = @{ includeAuth = $false } | ConvertTo-Json

        if ($Debug) {
            Write-Log "Calling $uri" "INFO"
        }

        $response = Invoke-RestMethod -Uri $uri -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop

        if ($response.success) {
            $data = $response.data
            $records = $data.totalRecordsWritten
            $duration = $data.durationMs
            $services = ($data.services | ForEach-Object {
                "$($_.service): $(if ($_.success) { $_.recordsWritten } else { 'FAILED' })"
            }) -join ", "

            Write-Log "Sync completed: $records records in ${duration}ms [$services]" "SUCCESS"
        } else {
            Write-Log "Sync returned unsuccessful response" "WARN"
        }
    }
    catch {
        $errorMessage = $_.Exception.Message
        Write-Log "Sync failed: $errorMessage" "ERROR"

        # Check if server is running
        if ($errorMessage -match "Unable to connect" -or $errorMessage -match "Connection refused") {
            Write-Log "Is the dev server running? Try: yarn dev" "WARN"
        }
    }
}

# Main execution
Write-Log "petehome Sync Script Started" "INFO"
Write-Log "Base URL: $BaseUrl" "INFO"

if ($Interval -gt 0) {
    Write-Log "Running every $Interval seconds (Ctrl+C to stop)" "INFO"
    Write-Log "---" "INFO"

    while ($true) {
        Invoke-Sync
        Start-Sleep -Seconds $Interval
    }
} else {
    Write-Log "Running single sync" "INFO"
    Write-Log "---" "INFO"
    Invoke-Sync
}
