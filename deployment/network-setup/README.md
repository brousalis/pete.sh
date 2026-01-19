# Network Setup Files

This directory contains all scripts and configuration files related to DNS and network setup for Petehome.

## Files Overview

### Setup Scripts
- **setup-mdns.sh** - Sets up mDNS (Bonjour) for `.local` hostname access
- **setup-pete-home.sh** - Main setup script for `pete.home` domain (nginx + dnsmasq)
- **setup-dnsmasq-alt.sh** - Alternative setup using systemd-resolved with dnsmasq on port 5353
- **setup-dns-redirect.sh** - Sets up iptables redirect for port 53 to 5353

### Fix Scripts
- **fix-dnsmasq.sh** - Fixes dnsmasq/systemd-resolved conflict
- **fix-dnsmasq-network.sh** - Configures dnsmasq to listen on network interface
- **fix-port53.sh** - Attempts to free port 53 from systemd-resolved
- **fix-port53-final.sh** - Final attempt to clear port 53
- **move-dnsmasq-to-port53.sh** - Moves dnsmasq from 5353 to 53

### Configuration Files
- **petehome.service.avahi** - Avahi mDNS service configuration
- **nginx-petehome.conf** - Nginx reverse proxy configuration for pete.home
- **dnsmasq.conf** - dnsmasq configuration template

### Documentation
- **WSL-NETWORKING.md** - Special instructions for WSL users

## Quick Start

For most users, start with:
```bash
sudo ./deployment/network-setup/setup-pete-home.sh
```

For WSL users, see `WSL-NETWORKING.md` first.
