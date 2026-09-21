# petehome-cli Installation Script for Windows
# Run this script from the apps/cli directory

param(
    [switch]$Dev,
    [switch]$UseUv
)

$ErrorActionPreference = "Stop"

Write-Host "petehome-cli Installation" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

# Check Python version
Write-Host "Checking Python version..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Python 3.11 or later" -ForegroundColor Red
    exit 1
}

Write-Host "Found: $pythonVersion" -ForegroundColor Green

# Navigate to cli directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$cliDir = Split-Path -Parent $scriptDir
Set-Location $cliDir

Write-Host "Installing petehome-cli from: $cliDir" -ForegroundColor Yellow

if ($UseUv) {
    # Use uv for faster installation
    Write-Host "Using uv for installation..." -ForegroundColor Yellow

    if ($Dev) {
        uv pip install -e ".[dev]"
    } else {
        uv pip install -e .
    }
} else {
    # Use pip
    Write-Host "Using pip for installation..." -ForegroundColor Yellow

    if ($Dev) {
        pip install -e ".[dev]"
    } else {
        pip install -e .
    }
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Installation failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Usage:" -ForegroundColor Cyan
Write-Host "  petehome           # Run the TUI" -ForegroundColor White
Write-Host "  python -m petehome_cli  # Alternative" -ForegroundColor White
Write-Host ""

if ($Dev) {
    Write-Host "Development tools installed:" -ForegroundColor Cyan
    Write-Host "  textual run --dev petehome_cli.app:PetehomeApp  # Run with Textual dev tools" -ForegroundColor White
    Write-Host ""
}

Write-Host "Environment (optional, usually from apps/web/.env):" -ForegroundColor Cyan
Write-Host "  COACH_API_KEY     # For CLI coach today/ask against local /api/coach" -ForegroundColor White
Write-Host "  COACH_CLI_BASE_URL / COACH_CLI_UI_URL  # Override local origins" -ForegroundColor White
