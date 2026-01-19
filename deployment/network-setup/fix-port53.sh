#!/bin/bash
# Find and stop what's using port 53

if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run with sudo: sudo ./fix-port53.sh"
    exit 1
fi

echo "🔍 Checking what's using port 53..."

# Find what's using port 53
PROCESS=$(lsof -i :53 2>/dev/null | tail -n +2 | awk '{print $2}' | head -1)
if [ -z "$PROCESS" ]; then
    PROCESS=$(ss -tulpn | grep :53 | awk '{print $6}' | cut -d',' -f2 | cut -d'=' -f2 | head -1)
fi

if [ -n "$PROCESS" ]; then
    echo "   Found process using port 53: PID $PROCESS"
    ps -p $PROCESS -o comm=,pid= 2>/dev/null || echo "   Process may have exited"
else
    echo "   ⚠️  Could not identify process (may need manual check)"
fi

echo ""
echo "🔄 Stopping systemd-resolved completely..."
systemctl stop systemd-resolved
systemctl disable systemd-resolved

echo ""
echo "🔄 Waiting a moment..."
sleep 2

echo ""
echo "🔄 Starting dnsmasq..."
if systemctl start dnsmasq; then
    systemctl enable dnsmasq
    echo "   ✅ dnsmasq started successfully!"
    systemctl status dnsmasq --no-pager | head -10
else
    echo "   ❌ Still failing. Checking what's on port 53 now..."
    lsof -i :53 2>/dev/null || ss -tulpn | grep :53
    exit 1
fi

echo ""
echo "✅ Done! dnsmasq should now be running."
echo ""
echo "Note: systemd-resolved is now disabled. If you need it back, run:"
echo "   sudo systemctl enable systemd-resolved"
echo "   sudo systemctl start systemd-resolved"
