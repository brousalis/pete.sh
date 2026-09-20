# switch-u2713h-displayport.ps1
# Switches the Dell U2713H to DisplayPort (PC)
#
# When the Dell is on HDMI (Mac), Windows has no DDC link — so this asks the
# Mac over SSH (same LAN) to run m1ddc via mac/mac-dell-to-pc.sh.
#
# Setup: copy mac-lan.local.example.ps1 -> mac-lan.local.ps1

. "$PSScriptRoot\_display-common.ps1"

Invoke-MacDellToPc
