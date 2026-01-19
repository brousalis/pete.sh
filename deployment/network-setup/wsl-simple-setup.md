# Simple WSL Setup (Recommended)

Since `netsh interface portproxy` doesn't support UDP, here's the simplest approach for WSL:

## Step 1: Configure dnsmasq to use port 53 directly

In WSL, we need dnsmasq on port 53 (not 5353). The easiest way is to reboot Windows/WSL first to clear any stuck sockets, then:

```bash
# In WSL
sudo ./deployment/network-setup/move-dnsmasq-to-port53.sh
```

If that fails due to port conflicts, reboot Windows first, then try again.

## Step 2: Find Windows Host IP

In PowerShell:
```powershell
ipconfig | findstr "IPv4"
```

Note your WiFi/Ethernet adapter IP (e.g., `192.168.1.100`)

## Step 3: Set up Windows Port Forwarding (TCP only)

In **PowerShell as Administrator**:

```powershell
# Forward HTTP (port 80)
netsh interface portproxy add v4tov4 listenport=80 listenaddress=0.0.0.0 connectport=80 connectaddress=172.30.99.70

# Forward DNS TCP (UDP will work directly if dnsmasq is on port 53)
netsh interface portproxy add v4tov4 listenport=53 listenaddress=0.0.0.0 connectport=53 connectaddress=172.30.99.70
```

## Step 4: Allow Through Windows Firewall

```powershell
# Allow HTTP
netsh advfirewall firewall add rule name="Petehome HTTP" dir=in action=allow protocol=TCP localport=80

# Allow DNS (both UDP and TCP)
netsh advfirewall firewall add rule name="Petehome DNS UDP" dir=in action=allow protocol=UDP localport=53
netsh advfirewall firewall add rule name="Petehome DNS TCP" dir=in action=allow protocol=TCP localport=53
```

## Step 5: Configure Devices

Use your **Windows host IP** (from Step 2) as DNS on your devices:
- Router DNS: Set to Windows host IP
- Per-device: WiFi settings > DNS > [Windows host IP]

## Why This Works

- dnsmasq on port 53 in WSL can receive UDP directly (no forwarding needed for UDP)
- Windows forwards TCP DNS queries to WSL
- HTTP (port 80) is forwarded via TCP (which netsh supports)

## Alternative: If Port 53 is Still Blocked

If you can't get dnsmasq on port 53, you can:
1. Use your router's DNS settings to point `.home` domains to your Windows IP
2. Or use `/etc/hosts` on each device (not scalable)
3. Or use a third-party UDP proxy tool (more complex)
