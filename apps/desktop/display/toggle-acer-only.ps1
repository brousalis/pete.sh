# toggle-acer-only.ps1
# Toggle Windows Acer-only mode (PC "mirror").
# MX button 3: mx-console\3-swap-screens.cmd

. "$PSScriptRoot\_display-common.ps1"

if (Test-AcerOnlyModeActive) {
    Disable-AcerOnlyMode
} else {
    Enable-AcerOnlyMode
}
