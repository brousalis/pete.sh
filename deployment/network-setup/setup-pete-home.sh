#!/bin/bash
# Setup script for pete.home domain alias
# This sets up nginx reverse proxy and dnsmasq for .home domain resolution

set -e

echo "🏠 Setting up pete.home domain alias..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run with sudo: sudo ./setup-pete-home.sh"
    exit 1
fi

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Get the server's IP address
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "📍 Server IP: $SERVER_IP"

# Install nginx if not installed
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing nginx..."
    apt-get update
    apt-get install -y nginx
fi

# Install dnsmasq if not installed
if ! command -v dnsmasq &> /dev/null; then
    echo "📦 Installing dnsmasq..."
    apt-get install -y dnsmasq
fi

# Check if systemd-resolved is running (common conflict)
if systemctl is-active --quiet systemd-resolved; then
    echo "⚠️  systemd-resolved is running. Configuring to work with dnsmasq..."
    
    # Configure systemd-resolved to listen on a different interface or disable stub
    # We'll configure dnsmasq to listen on 127.0.0.1:5353 and systemd-resolved to forward to it
    # Actually, simpler: disable systemd-resolved's stub listener on port 53
    RESOLVED_CONF="/etc/systemd/resolved.conf"
    if ! grep -q "^DNSStubListener=no" "$RESOLVED_CONF" 2>/dev/null; then
        echo "📋 Configuring systemd-resolved to not use port 53..."
        # Backup
        cp "$RESOLVED_CONF" "$RESOLVED_CONF.backup" 2>/dev/null || true
        # Add or update DNSStubListener setting
        if grep -q "^DNSStubListener=" "$RESOLVED_CONF" 2>/dev/null; then
            sed -i 's/^DNSStubListener=.*/DNSStubListener=no/' "$RESOLVED_CONF"
        else
            echo "DNSStubListener=no" >> "$RESOLVED_CONF"
        fi
        systemctl restart systemd-resolved
        echo "   ✅ systemd-resolved configured"
    fi
fi

# Configure nginx
echo "📋 Configuring nginx..."
cp "$SCRIPT_DIR/nginx-petehome.conf" /etc/nginx/sites-available/petehome
ln -sf /etc/nginx/sites-available/petehome /etc/nginx/sites-enabled/

# Remove default nginx site if it exists
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

# Configure dnsmasq
echo "📋 Configuring dnsmasq..."
# Backup original config
cp /etc/dnsmasq.conf /etc/dnsmasq.conf.backup 2>/dev/null || true

# Check if our config already exists
if ! grep -q "# Petehome .home domain configuration" /etc/dnsmasq.conf 2>/dev/null; then
    # Add our configuration
    cat >> /etc/dnsmasq.conf << EOF

# Petehome .home domain configuration
address=/home/$SERVER_IP
EOF
else
    echo "   ℹ️  Configuration already exists, updating..."
    # Update the IP if it changed
    sed -i "s|address=/home/.*|address=/home/$SERVER_IP|" /etc/dnsmasq.conf
fi

# Start and enable services
echo "🔄 Starting services..."
systemctl restart nginx
systemctl enable nginx

# Try to start dnsmasq, with better error handling
echo "🔄 Starting dnsmasq..."
if systemctl restart dnsmasq; then
    systemctl enable dnsmasq
    echo "   ✅ dnsmasq started successfully"
else
    echo "   ❌ dnsmasq failed to start. Checking error..."
    systemctl status dnsmasq --no-pager -l | head -15
    echo ""
    echo "   💡 If port 53 is still in use, you may need to:"
    echo "      1. Ensure systemd-resolved DNSStubListener is disabled (already attempted)"
    echo "      2. Or manually stop systemd-resolved: sudo systemctl stop systemd-resolved"
    echo "      3. Then run: sudo systemctl start dnsmasq"
    exit 1
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🌐 Your app is now accessible at:"
echo "   http://pete.home"
echo ""
echo "📱 To use on your phone and other devices:"
echo ""
echo "Option 1: Configure your router's DNS (Recommended)"
echo "   Set your router's DNS server to: $SERVER_IP"
echo "   This will make pete.home work for all devices on your network"
echo ""
echo "Option 2: Configure DNS on individual devices"
echo "   Android: Settings > Network > WiFi > [Your Network] > Advanced > DNS > $SERVER_IP"
echo "   iOS: Settings > WiFi > [Your Network] > Configure DNS > Manual > $SERVER_IP"
echo "   Windows: Network Settings > Change adapter options > [Your Adapter] > Properties > IPv4 > DNS: $SERVER_IP"
echo ""
echo "Option 3: Use /etc/hosts (Linux/Mac only, per-device)"
echo "   Add this line to /etc/hosts:"
echo "   $SERVER_IP pete.home"
echo ""
echo "🔍 Test locally:"
echo "   dig @$SERVER_IP pete.home"
echo "   or: nslookup pete.home $SERVER_IP"
