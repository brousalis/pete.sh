#!/bin/bash
# Alternative setup: Use systemd-resolved with dnsmasq on different port

if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run with sudo: sudo ./setup-dnsmasq-alt.sh"
    exit 1
fi

echo "🔧 Setting up dnsmasq with systemd-resolved (alternative approach)..."

# Re-enable systemd-resolved
echo "🔄 Re-enabling systemd-resolved..."
systemctl enable systemd-resolved
systemctl start systemd-resolved

# Configure dnsmasq to use port 5353 instead
echo "📋 Configuring dnsmasq to use port 5353..."
sed -i 's/^port=53/port=5353/' /etc/dnsmasq.conf 2>/dev/null || true
if ! grep -q "^port=5353" /etc/dnsmasq.conf; then
    echo "port=5353" >> /etc/dnsmasq.conf
fi

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')

# Ensure .home domain config exists
if ! grep -q "# Petehome .home domain configuration" /etc/dnsmasq.conf; then
    cat >> /etc/dnsmasq.conf << EOF

# Petehome .home domain configuration
address=/home/$SERVER_IP
EOF
fi

# Configure systemd-resolved to forward .home to dnsmasq
echo "📋 Configuring systemd-resolved to forward .home to dnsmasq..."
RESOLVED_CONF="/etc/systemd/resolved.conf"
cp "$RESOLVED_CONF" "$RESOLVED_CONF.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true

# Add DNS override for .home
if ! grep -q "^Domains=.*home" "$RESOLVED_CONF"; then
    if grep -q "^\[Resolve\]" "$RESOLVED_CONF"; then
        if grep -q "^Domains=" "$RESOLVED_CONF"; then
            sed -i '/^Domains=/ s/$/ home/' "$RESOLVED_CONF"
        else
            sed -i '/^\[Resolve\]/a Domains=home' "$RESOLVED_CONF"
        fi
    else
        echo "" >> "$RESOLVED_CONF"
        echo "[Resolve]" >> "$RESOLVED_CONF"
        echo "Domains=home" >> "$RESOLVED_CONF"
    fi
fi

# Add DNS server for .home domain
if ! grep -q "^DNS=127.0.0.1:5353" "$RESOLVED_CONF"; then
    if grep -q "^DNS=" "$RESOLVED_CONF"; then
        sed -i '/^DNS=/a DNS=127.0.0.1:5353' "$RESOLVED_CONF"
    else
        sed -i '/^\[Resolve\]/a DNS=127.0.0.1:5353' "$RESOLVED_CONF"
    fi
fi

systemctl restart systemd-resolved

# Start dnsmasq
echo "🔄 Starting dnsmasq on port 5353..."
if systemctl start dnsmasq; then
    systemctl enable dnsmasq
    echo "   ✅ dnsmasq started successfully on port 5353!"
    systemctl status dnsmasq --no-pager | head -10
    echo ""
    echo "✅ Setup complete!"
    echo "   systemd-resolved will forward .home queries to dnsmasq on port 5353"
else
    echo "   ❌ dnsmasq failed to start"
    exit 1
fi
