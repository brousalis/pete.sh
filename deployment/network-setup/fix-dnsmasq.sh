#!/bin/bash
# Quick fix for dnsmasq/systemd-resolved conflict

set -e

if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run with sudo: sudo ./fix-dnsmasq.sh"
    exit 1
fi

echo "🔧 Fixing dnsmasq/systemd-resolved conflict..."

# Disable systemd-resolved's DNS stub listener
RESOLVED_CONF="/etc/systemd/resolved.conf"
if [ -f "$RESOLVED_CONF" ]; then
    echo "📋 Configuring systemd-resolved..."
    # Backup
    cp "$RESOLVED_CONF" "$RESOLVED_CONF.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
    
    # Add or update DNSStubListener setting
    if grep -q "^DNSStubListener=" "$RESOLVED_CONF" 2>/dev/null; then
        sed -i 's/^DNSStubListener=.*/DNSStubListener=no/' "$RESOLVED_CONF"
    else
        # Add it if it doesn't exist
        if ! grep -q "^\[Resolve\]" "$RESOLVED_CONF" 2>/dev/null; then
            echo "" >> "$RESOLVED_CONF"
            echo "[Resolve]" >> "$RESOLVED_CONF"
        fi
        echo "DNSStubListener=no" >> "$RESOLVED_CONF"
    fi
    
    echo "   ✅ Updated $RESOLVED_CONF"
    systemctl restart systemd-resolved
    echo "   ✅ Restarted systemd-resolved"
fi

# Now try to start dnsmasq
echo "🔄 Starting dnsmasq..."
if systemctl start dnsmasq; then
    systemctl enable dnsmasq
    echo "   ✅ dnsmasq started successfully!"
    systemctl status dnsmasq --no-pager | head -10
else
    echo "   ❌ dnsmasq still failed. Checking status..."
    systemctl status dnsmasq --no-pager -l | head -15
    exit 1
fi

echo ""
echo "✅ Fix complete! dnsmasq should now be running."
