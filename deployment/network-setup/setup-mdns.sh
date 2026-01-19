#!/bin/bash
# Setup script for mDNS (network alias) support
# This allows accessing the app as petehome.local on your network

set -e

echo "🌐 Setting up mDNS for Petehome..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run with sudo: sudo ./setup-mdns.sh"
    exit 1
fi

# Check if avahi-daemon is installed
if ! command -v avahi-daemon &> /dev/null; then
    echo "📦 Installing avahi-daemon..."
    apt-get update
    apt-get install -y avahi-daemon avahi-utils
fi

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Copy the service file
echo "📋 Installing mDNS service file..."
cp "$SCRIPT_DIR/petehome.service.avahi" /etc/avahi/services/petehome.service

# Restart avahi-daemon
echo "🔄 Restarting avahi-daemon..."
systemctl restart avahi-daemon
systemctl enable avahi-daemon

# Verify
echo ""
echo "✅ mDNS setup complete!"
echo ""
echo "🌐 Your app should now be accessible at:"
echo "   http://petehome.local:3000"
echo ""
echo "📱 Test from your phone or another device on the same network."
echo ""
echo "To verify it's working, run:"
echo "   avahi-browse -a | grep petehome"
