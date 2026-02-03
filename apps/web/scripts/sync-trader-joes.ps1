# petehome Trader Joe's Recipe Sync Script
# This script scrapes and caches all Trader Joe's recipes from their website.
# It uses Puppeteer to scrape the recipes, so it may take a while (535 recipes).
#
# Usage:
#   .\scripts\sync-trader-joes.ps1                    # Run once
#   .\scripts\sync-trader-joes.ps1 -SkipExisting     # Skip already cached recipes (default)
#   .\scripts\sync-trader-joes.ps1 -Force             # Re-scrape all recipes
#   .\scripts\sync-trader-joes.ps1 -Debug             # Show debug output
#
# Prerequisites:
#   - Puppeteer must be installed: yarn add puppeteer
#   - Supabase credentials in .env or .env.local
#   - dotenv package: yarn add dotenv

param(
    [string]$BaseUrl = "http://localhost:3000",
    [switch]$SkipExisting = $true,  # Skip recipes that are already cached
    [switch]$Force = $false,         # Force re-scrape all recipes (overrides SkipExisting)
    [switch]$Debug
)

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "ERROR" { "Red" }
        "WARN"  { "Yellow" }
        "SUCCESS" { "Green" }
        "PROGRESS" { "Cyan" }
        default { "White" }
    }
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

function Invoke-TraderJoesSync {
    try {
        # Build node command with arguments
        $nodeArgs = @("scripts/sync-trader-joes.js")

        if ($Force) {
            $nodeArgs += "--force"
        } elseif ($SkipExisting) {
            $nodeArgs += "--skip-existing"
        }

        if ($Debug) {
            Write-Log "Running: node $($nodeArgs -join ' ')" "INFO"
        }

        # Run the Node.js script directly
        $process = Start-Process -FilePath "node" -ArgumentList $nodeArgs -NoNewWindow -Wait -PassThru -RedirectStandardOutput "sync-tj-output.log" -RedirectStandardError "sync-tj-error.log"

        # Read the output
        if (Test-Path "sync-tj-output.log") {
            $output = Get-Content "sync-tj-output.log" -Raw
            Write-Host $output
        }

        if (Test-Path "sync-tj-error.log") {
            $errors = Get-Content "sync-tj-error.log" -Raw
            if ($errors) {
                Write-Host $errors -ForegroundColor Red
            }
        }

        # Clean up log files
        if (Test-Path "sync-tj-output.log") { Remove-Item "sync-tj-output.log" -ErrorAction SilentlyContinue }
        if (Test-Path "sync-tj-error.log") { Remove-Item "sync-tj-error.log" -ErrorAction SilentlyContinue }

        if ($process.ExitCode -eq 0) {
            return $true
        } else {
            Write-Log "Sync script exited with code $($process.ExitCode)" "ERROR"
            return $false
        }
    }
    catch {
        $errorMessage = $_.Exception.Message
        Write-Log "Sync failed: $errorMessage" "ERROR"

        # Check if Node.js is installed
        if ($errorMessage -match "cannot find") {
            Write-Log "Node.js is required. Make sure it's installed and in your PATH." "WARN"
        }

        # Check if Puppeteer is installed
        if ($errorMessage -match "Cannot find module 'puppeteer'") {
            Write-Log "Puppeteer is required. Install it with: yarn add puppeteer" "WARN"
        }

        # Check if dotenv is installed
        if ($errorMessage -match "Cannot find module 'dotenv'") {
            Write-Log "dotenv is required. Install it with: yarn add dotenv" "WARN"
        }

        return $false
    }
}

# Main execution
Write-Log "petehome Trader Joe's Recipe Sync Script Started" "INFO"
Write-Log "Skip Existing: $(if ($Force) { 'No (Force mode)' } else { $SkipExisting })" "INFO"
Write-Log "---" "INFO"
Write-Log "This will scrape all ~535 Trader Joe's recipes." "PROGRESS"
Write-Log "This may take 20-30 minutes due to rate limiting (2s between requests)." "PROGRESS"
Write-Log "You can stop at any time with Ctrl+C." "PROGRESS"
Write-Log "---" "INFO"

# Confirm before starting (unless in non-interactive mode)
if (-not $Force -and -not $SkipExisting) {
    $confirmation = Read-Host "This will re-scrape all recipes. Continue? (y/N)"
    if ($confirmation -ne "y" -and $confirmation -ne "Y") {
        Write-Log "Sync cancelled by user" "WARN"
        exit 0
    }
}

$startTime = Get-Date
$success = Invoke-TraderJoesSync
$endTime = Get-Date
$duration = $endTime - $startTime

Write-Log "---" "INFO"
if ($success) {
    Write-Log "Sync completed in $($duration.ToString('mm\:ss'))" "SUCCESS"
} else {
    Write-Log "Sync failed after $($duration.ToString('mm\:ss'))" "ERROR"
    exit 1
}
