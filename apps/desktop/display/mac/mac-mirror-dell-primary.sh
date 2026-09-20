#!/bin/zsh
# mac-mirror-dell-primary.sh
#
# Mode: Mac on Dell U2713H, PC on Alienware
#
# Mirrors Alienware onto the Dell so macOS has one desktop.
# Dell is "Optimize for" (keeps its normal resolution).
# Alienware still receives Mac HDMI, but you ignore that panel
# because it's showing the PC over DisplayPort.
#
# Setup (once):
#   brew install displayplacer
#   chmod +x mac-mirror-dell-primary.sh mac-unmirror.sh
#
# Tip: after a successful mirror, run `displayplacer list` and copy the
# suggested config line into MAC_MIRROR_OVERRIDE below if auto-detect
# ever picks the wrong screens.

set -euo pipefail

MAC_MIRROR_OVERRIDE="${MAC_MIRROR_OVERRIDE:-}"

if ! command -v displayplacer >/dev/null 2>&1; then
  echo "displayplacer not found. Install with: brew install displayplacer" >&2
  exit 1
fi

if [[ -n "$MAC_MIRROR_OVERRIDE" ]]; then
  echo "Applying override mirror config..."
  eval displayplacer $MAC_MIRROR_OVERRIDE
  echo "Done. Dell is primary; Alienware mirrors it."
  exit 0
fi

list="$(displayplacer list)"

# Persistent IDs are stable across reconnects.
# Match by resolution signatures from this desk setup:
#   Dell U2713H  -> 2560x1440 (landscape) or 1440x2560 (portrait)
#   Alienware    -> 3440x1440 ultrawide
dell_id="$(
  print -r -- "$list" | awk '
    /^Persistent screen id:/ { id=$4; res=""; next }
    /^Resolution:/ {
      res=$2
      gsub(/@.*/, "", res)
      if (res == "2560x1440" || res == "1440x2560") print id
    }
  ' | head -n 1
)"

alien_id="$(
  print -r -- "$list" | awk '
    /^Persistent screen id:/ { id=$4; res=""; next }
    /^Resolution:/ {
      res=$2
      gsub(/@.*/, "", res)
      if (res == "3440x1440") print id
    }
  ' | head -n 1
)"

if [[ -z "${dell_id}" || -z "${alien_id}" ]]; then
  echo "Could not auto-detect Dell + Alienware from displayplacer list." >&2
  echo "" >&2
  echo "Connected screens:" >&2
  print -r -- "$list" | awk '
    /^Persistent screen id:/ { id=$4 }
    /^Type:/ { type=$0 }
    /^Resolution:/ { print "  " id "  " $0 "  " type }
  ' >&2
  echo "" >&2
  echo "Fix: set MAC_MIRROR_OVERRIDE to the mirror args from \`displayplacer list\`," >&2
  echo "with Dell id FIRST (Optimize for), e.g.:" >&2
  echo '  export MAC_MIRROR_OVERRIDE='\''"id:DELL-ID+ALIEN-ID res:1440x2560 scaling:off origin:(0,0) degree:0"'\''' >&2
  exit 1
fi

# Prefer Dell's current mode resolution for the mirror set.
dell_res="$(
  print -r -- "$list" | awk -v want="$dell_id" '
    /^Persistent screen id:/ { cur=$4 }
    cur == want && /^Resolution:/ {
      res=$2
      gsub(/@.*/, "", res)
      print res
      exit
    }
  '
)"

# Dell U2713H is mounted vertical — always Optimize-for portrait
dell_res="1440x2560"
degree=270

echo "Dell (primary/optimize): $dell_id @ $dell_res degree:$degree (vertical 27\")"
echo "Alienware (mirror):      $alien_id"
echo "Enabling mirror..."

displayplacer "id:${dell_id}+${alien_id} res:${dell_res} scaling:off origin:(0,0) degree:${degree}" || true

echo "Done. Mac desktop lives on vertical Dell; Alienware HDMI is a mirror you can ignore."
