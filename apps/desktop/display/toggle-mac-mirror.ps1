# toggle-mac-mirror.ps1
# Asks Apollo to toggle Dell↔Alienware mirroring.
# MX button 6: mx-console\6-toggle-mac-mirror.cmd

. "$PSScriptRoot\_display-common.ps1"

Invoke-MacMirror -Mode toggle
