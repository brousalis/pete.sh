#!/bin/bash
# Move dnsmasq to port 53 for external device access

if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run with sudo: sudo ./move-dnsmasq-to-port53.sh"
    exit 1
fi

echo "🔧 Moving dnsmasq to port 53..."

# Stop dnsmasq first
echo "🛑 Stopping dnsmasq..."
systemctl stop dnsmasq

# Stop systemd-resolved to free port 53
echo "🛑 Stopping systemd-resolved..."
systemctl stop systemd-resolved

# Wait for sockets to clear
echo "⏳ Waiting for sockets to clear..."
sleep 3

# Change dnsmasq port from 5353 to 53
echo "📋 Updating dnsmasq configuration..."
sed -i 's/^port=5353/port=53/' /etc/dnsmasq.conf
if ! grep -q "^port=53" /etc/dnsmasq.conf; then
    # Remove any port line and add port 53
    sed -i '/^port=/d' /etc/dnsmasq.conf
    echo "port=53" >> /etc/dnsmasq.conf
fi

# Update systemd-resolved to use dnsmasq on port 53
echo "📋 Updating systemd-resolved configuration..."
sed -i 's/^DNS=127.0.0.1:5353/DNS=127.0.0.1/' /etc/systemd/resolved.conf
if ! grep -q "^DNS=127.0.0.1" /etc/systemd/resolved.conf; then
    sed -i '/^\[Resolve\]/a DNS=127.0.0.1' /etc/systemd/resolved.conf
fi

# Start dnsmasq on port 53
echo "🔄 Starting dnsmasq on port 53..."
if systemctl start dnsmasq; then
    systemctl enable dnsmasq
    echo "   ✅ dnsmasq started on port 53"
    sleep 2
    
    # Verify it's listening on port 53
    if ss -tulpn | grep -q ":53 " | grep -v "5353" | grep dnsmasq; then
        echo "   ✅ Verified: dnsmasq is listening on port 53"
        ss -tulpn | grep ":53 " | grep dnsmasq
    fi
else
    echo "   ❌ Failed to start dnsmasq"
    echo "   Checking what's using port 53..."
    ss -tulpn | grep ":53 " | grep -v "5353"
    exit 1
fi

# Start systemd-resolved (it will use dnsmasq as upstream)
echo "🔄 Starting systemd-resolved..."
systemctl start systemd-resolved
systemctl enable systemd-resolved

echo ""
echo "✅ Configuration complete!"
echo ""
echo "📱 Now configure your devices to use 172.30.99.70 as their DNS server:"
echo "   - Router DNS (recommended): Set router DNS to 172.30.99.70"
echo "   - Per-device: WiFi settings > DNS > 172.30.99.70"
echo ""
echo "Then pete.home should resolve on your devices!"
