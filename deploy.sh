#!/bin/bash
# Deployment script for Petehome
# This script builds and starts the application

set -e

echo "🚀 Deploying Petehome..."

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed. Installing..."
    npm install -g pm2
fi

# Install dependencies
echo "📦 Installing dependencies..."
yarn install --frozen-lockfile

# Build the application
echo "🔨 Building application..."
yarn build

# Create logs directory if it doesn't exist
mkdir -p logs

# Stop existing instance if running
echo "🛑 Stopping existing instance (if any)..."
pm2 stop petehome 2>/dev/null || true
pm2 delete petehome 2>/dev/null || true

# Start the application
echo "✅ Starting application..."
pm2 start ecosystem.config.js

# Save PM2 process list for auto-restart on reboot
pm2 save

echo ""
echo "✨ Deployment complete!"
echo ""
echo "📊 View status: pm2 status"
echo "📝 View logs: pm2 logs petehome"
echo "🔄 Restart: pm2 restart petehome"
echo "🛑 Stop: pm2 stop petehome"
echo ""
echo "🌐 Application should be available at:"
echo "   http://$(hostname -I | awk '{print $1}'):3000"
echo "   or http://localhost:3000"
