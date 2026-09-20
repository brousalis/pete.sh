# mac-lan.local.example.ps1
# Copy to mac-lan.local.ps1 (gitignored) and fill in your Mac.
#
# One-time Mac setup:
#   1. System Settings -> General -> Sharing -> Remote Login = ON
#   2. Note hostname (e.g. petebook.local) or LAN IP
#
# One-time Windows setup:
#   ssh-keygen -t ed25519 -N "" -f $env:USERPROFILE\.ssh\id_ed25519_mac
#   type $env:USERPROFILE\.ssh\id_ed25519_mac.pub | ssh YOU@MAC.local "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
#   ssh -i $env:USERPROFILE\.ssh\id_ed25519_mac YOU@MAC.local "echo ok"

@{
    # SSH target: user@host  (prefer .local mDNS name)
    SshTarget = 'you@your-mac.local'

    # Optional: path to private key (omit to use ssh-agent / default keys)
    # IdentityFile = "$env:USERPROFILE\.ssh\id_ed25519_mac"

    # Absolute path ON THE MAC to the script (clone or copy the repo there)
    MacScriptPath = '/Users/you/petehome/apps/desktop/display/mac/mac-dell-to-pc.sh'

    # Optional: force m1ddc display index (from `m1ddc display list` on the Mac)
    # M1ddcDisplay = '1'
}
