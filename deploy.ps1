# Deployment script for Petehome (Windows PowerShell)
# This script builds and starts the application

$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploying Petehome..." -ForegroundColor Cyan

# Get the directory where the script is located
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Check if PM2 is installed
try {
    $null = Get-Command pm2 -ErrorAction Stop
    Write-Host "✅ PM2 is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ PM2 is not installed. Installing..." -ForegroundColor Yellow
    npm install -g pm2
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install PM2" -ForegroundColor Red
        exit 1
    }
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
yarn install --frozen-lockfile
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Build the application
Write-Host "🔨 Building application..." -ForegroundColor Cyan
yarn build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

# Create logs directory if it doesn't exist
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
    Write-Host "📁 Created logs directory" -ForegroundColor Green
}

# Stop existing instance if running
Write-Host "🛑 Stopping existing instance (if any)..." -ForegroundColor Cyan
try {
    pm2 stop petehome 2>$null
} catch {
    # Ignore errors if process doesn't exist
}
try {
    pm2 delete petehome 2>$null
} catch {
    # Ignore errors if process doesn't exist
}

# Start the application
Write-Host "✅ Starting application..." -ForegroundColor Cyan
pm2 start ecosystem.config.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start application" -ForegroundColor Red
    exit 1
}

# Save PM2 process list for auto-restart on reboot
pm2 save
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Warning: Failed to save PM2 process list" -ForegroundColor Yellow
}

# Get local IP address
$LocalIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike "127.*" -and
    $_.IPAddress -notlike "169.254.*"
} | Select-Object -First 1).IPAddress

Write-Host ""
Write-Host "✨ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 View status: pm2 status" -ForegroundColor Cyan
Write-Host "📝 View logs: pm2 logs petehome" -ForegroundColor Cyan
Write-Host "🔄 Restart: pm2 restart petehome" -ForegroundColor Cyan
Write-Host "🛑 Stop: pm2 stop petehome" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Application should be available at:" -ForegroundColor Cyan
if ($LocalIP) {
    Write-Host "   http://$LocalIP:3000" -ForegroundColor Yellow
}
Write-Host "   http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
