#!/bin/bash
# Use iptables to redirect port 53 to dnsmasq on 5353

if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run with sudo: sudo ./setup-dns-redirect.sh"
    exit 1
fi

echo "🔧 Setting up DNS port redirect (53 -> 5353)..."

# Make sure dnsmasq is on port 5353
if ! grep -q "^port=5353" /etc/dnsmasq.conf; then
    echo "📋 Setting dnsmasq to port 5353..."
    sed -i '/^port=/d' /etc/dnsmasq.conf
    echo "port=5353" >> /etc/dnsmasq.conf
    systemctl restart dnsmasq
fi

# Install iptables if needed
if ! command -v iptables &> /dev/null; then
    echo "📦 Installing iptables..."
    apt-get update
    apt-get install -y iptables
fi

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')

# Add iptables rules to redirect port 53 to 5353
echo "📋 Adding iptables redirect rules..."

# Remove existing rules if any
iptables -t nat -D PREROUTING -p udp --dport 53 -j REDIRECT --to-port 5353 2>/dev/null || true
iptables -t nat -D PREROUTING -p tcp --dport 53 -j REDIRECT --to-port 5353 2>/dev/null || true
iptables -t nat -D OUTPUT -p udp --dport 53 -d 127.0.0.1 -j REDIRECT --to-port 5353 2>/dev/null || true
iptables -t nat -D OUTPUT -p tcp --dport 53 -d 127.0.0.1 -j REDIRECT --to-port 5353 2>/dev/null || true

# Add new rules
iptables -t nat -A PREROUTING -p udp --dport 53 -j REDIRECT --to-port 5353
iptables -t nat -A PREROUTING -p tcp --dport 53 -j REDIRECT --to-port 5353
iptables -t nat -A OUTPUT -p udp --dport 53 -d 127.0.0.1 -j REDIRECT --to-port 5353
iptables -t nat -A OUTPUT -p tcp --dport 53 -d 127.0.0.1 -j REDIRECT --to-port 5353

# Save iptables rules (install iptables-persistent if needed)
if command -v netfilter-persistent &> /dev/null; then
    netfilter-persistent save
elif command -v iptables-save &> /dev/null; then
    iptables-save > /etc/iptables/rules.v4 2>/dev/null || mkdir -p /etc/iptables && iptables-save > /etc/iptables/rules.v4
fi

echo "   ✅ iptables rules added"

# Verify dnsmasq is running
if systemctl is-active --quiet dnsmasq; then
    echo "   ✅ dnsmasq is running on port 5353"
else
    echo "   🔄 Starting dnsmasq..."
    systemctl start dnsmasq
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📱 Now configure your devices to use $SERVER_IP as their DNS server:"
echo "   - Router DNS (recommended): Set router DNS to $SERVER_IP"
echo "   - Per-device: WiFi settings > DNS > $SERVER_IP"
echo ""
echo "Port 53 queries will be automatically redirected to dnsmasq on 5353"
echo "Then pete.home should resolve on your devices!"
