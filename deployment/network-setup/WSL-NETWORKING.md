# WSL Networking Setup for Petehome

Since you're running in WSL, the WSL IP (`172.30.99.70`) is only accessible from your Windows machine, not from other devices on your network.

## Solution: Use Windows Host IP + Port Forwarding

### Step 1: Find Your Windows Host IP

On your **Windows machine** (PowerShell or CMD), run:
```powershell
ipconfig | findstr "IPv4"
```

Look for the IP address on your WiFi/Ethernet adapter (usually something like `192.168.x.x` or `10.x.x.x`). This is the IP your phone and other devices should use.

### Step 2: Set Up Port Forwarding on Windows

You need to forward ports from Windows to WSL. Run these commands in **PowerShell as Administrator**:

```powershell
# Forward port 80 (HTTP) from Windows to WSL (TCP)
netsh interface portproxy add v4tov4 listenport=80 listenaddress=0.0.0.0 connectport=80 connectaddress=172.30.99.70

# Forward port 53 (DNS) TCP from Windows to WSL
netsh interface portproxy add v4tov4 listenport=53 listenaddress=0.0.0.0 connectport=5353 connectaddress=172.30.99.70
```

**Important**: `netsh interface portproxy` only supports TCP, not UDP. For DNS UDP forwarding, you have two options:

**Option A: Use a UDP proxy tool (Recommended)**
Download and use a UDP proxy tool like `socat` or use PowerShell with a custom script. The simplest is to use a small UDP proxy utility.

**Option B: Run DNS on port 53 directly in WSL (Easier)**
Instead of forwarding, configure dnsmasq to use port 53 directly. This requires stopping systemd-resolved or using the alternative setup:

```bash
# In WSL, run:
sudo ./deployment/network-setup/move-dnsmasq-to-port53.sh
# Or if that fails due to port conflict, reboot Windows/WSL first
```

Then forward only TCP (UDP will work directly if dnsmasq is on port 53):
```powershell
# Only forward TCP DNS (UDP works directly if dnsmasq uses port 53)
netsh interface portproxy add v4tov4 listenport=53 listenaddress=0.0.0.0 connectport=53 connectaddress=172.30.99.70
```

### Step 3: Allow Through Windows Firewall

```powershell
# Allow HTTP (port 80)
netsh advfirewall firewall add rule name="Petehome HTTP" dir=in action=allow protocol=TCP localport=80

# Allow DNS (port 53)
netsh advfirewall firewall add rule name="Petehome DNS UDP" dir=in action=allow protocol=UDP localport=53
netsh advfirewall firewall add rule name="Petehome DNS TCP" dir=in action=allow protocol=TCP localport=53
```

### Step 4: Configure Your Devices

Use your **Windows host IP** (from Step 1) as the DNS server on your devices:
- **Router DNS** (recommended): Set to your Windows host IP
- **Per-device**: WiFi settings > DNS > [Windows host IP]

Then access your app at: `http://pete.home` (or `http://[Windows-host-IP]`)

### Step 5: Make Port Forwarding Persistent

The port forwarding will be lost after Windows restarts. To make it persistent, create a startup script or use Task Scheduler.

**Quick PowerShell script to run at startup:**
```powershell
# Save as: C:\Users\[YourUser]\start-petehome-forwarding.ps1
netsh interface portproxy add v4tov4 listenport=80 listenaddress=0.0.0.0 connectport=80 connectaddress=172.30.99.70
# Note: UDP forwarding requires dnsmasq on port 53, or use a UDP proxy tool
netsh interface portproxy add v4tov4 listenport=53 listenaddress=0.0.0.0 connectport=53 connectaddress=172.30.99.70
```

Then add it to Task Scheduler to run at startup.

### Alternative: WSL2 with Mirrored Networking (Windows 11)

If you're on Windows 11, you can enable WSL2 mirrored networking mode:
```powershell
# In PowerShell as Admin
wsl --shutdown
# Edit: C:\Users\[YourUser]\.wslconfig
# Add:
# [wsl2]
# networkingMode=mirrored
```

This makes WSL use the Windows host IP directly, but requires Windows 11.

## Verify Setup

1. Check port forwarding:
   ```powershell
   netsh interface portproxy show all
   ```

2. Test DNS from your phone:
   - Set phone DNS to Windows host IP
   - Try: `nslookup pete.home [Windows-host-IP]`

3. Test HTTP:
   - From phone browser: `http://pete.home` or `http://[Windows-host-IP]`
