#!/bin/bash
# Final fix for port 53 - handles leftover systemd-resolved sockets

if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run with sudo: sudo ./fix-port53-final.sh"
    exit 1
fi

echo "🔧 Final fix for port 53..."

# Make sure systemd-resolved is fully stopped
echo "🔄 Ensuring systemd-resolved is stopped..."
systemctl stop systemd-resolved 2>/dev/null || true
systemctl disable systemd-resolved 2>/dev/null || true

# Kill any remaining systemd-resolved processes
pkill -9 systemd-resolved 2>/dev/null || true

# Wait a moment
sleep 2

# Check if there's still something on port 53
echo "🔍 Checking port 53..."
PORT53=$(ss -tulpn | grep ":53 " | grep -v "5353")
if [ -n "$PORT53" ]; then
    echo "   ⚠️  Port 53 still in use:"
    echo "$PORT53"
    echo ""
    echo "   Attempting to clear socket..."
    
    # Try to restart network stack (gentle approach)
    systemctl restart systemd-networkd 2>/dev/null || true
    
    # Wait again
    sleep 3
fi

# Try starting dnsmasq
echo ""
echo "🔄 Starting dnsmasq..."
if systemctl start dnsmasq 2>/dev/null; then
    systemctl enable dnsmasq
    echo "   ✅ dnsmasq started successfully!"
    systemctl status dnsmasq --no-pager | head -10
    echo ""
    echo "✅ Success! dnsmasq is running."
else
    echo "   ❌ Still failing. Port 53 may need manual intervention."
    echo ""
    echo "   Try these manual steps:"
    echo "   1. Reboot the system (this will clear all sockets)"
    echo "   2. Or manually kill the process: sudo fuser -k 53/udp 53/tcp"
    echo "   3. Or configure dnsmasq to use a different port and forward"
    exit 1
fi
