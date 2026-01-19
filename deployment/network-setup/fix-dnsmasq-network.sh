#!/bin/bash
# Configure dnsmasq to listen on network interface for client devices

if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run with sudo: sudo ./fix-dnsmasq-network.sh"
    exit 1
fi

SERVER_IP=$(hostname -I | awk '{print $1}')
echo "📍 Server IP: $SERVER_IP"
echo "📋 Configuring dnsmasq to listen on network interface..."

# Add or update listen-address to include the server's IP
if grep -q "^listen-address=" /etc/dnsmasq.conf; then
    # Update existing listen-address
    sed -i "s/^listen-address=.*/listen-address=127.0.0.1,$SERVER_IP/" /etc/dnsmasq.conf
else
    # Add new listen-address
    echo "listen-address=127.0.0.1,$SERVER_IP" >> /etc/dnsmasq.conf
fi

echo "   ✅ Updated /etc/dnsmasq.conf"

# Restart dnsmasq
echo "🔄 Restarting dnsmasq..."
systemctl restart dnsmasq

sleep 2

# Verify it's listening on the network interface
echo "🔍 Verifying dnsmasq is listening on network interface..."
if ss -tulpn | grep -q "$SERVER_IP:5353"; then
    echo "   ✅ dnsmasq is now listening on $SERVER_IP:5353"
    ss -tulpn | grep "$SERVER_IP:5353"
else
    echo "   ⚠️  dnsmasq may not be listening on network interface"
    ss -tulpn | grep ":5353" | head -3
fi

echo ""
echo "✅ Configuration complete!"
echo ""
echo "📱 Now configure your devices to use $SERVER_IP as their DNS server:"
echo "   - Router DNS (recommended): Set router DNS to $SERVER_IP"
echo "   - Per-device: WiFi settings > DNS > $SERVER_IP"
echo ""
echo "Then pete.home should resolve on your devices!"
