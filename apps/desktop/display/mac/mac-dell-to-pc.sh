#!/bin/zsh
# mac-dell-to-pc.sh
#
# Runs on the Mac (HDMI link is live). Switches Dell U2713H to DisplayPort (PC).
# Invoked from Windows over SSH by switch-u2713h-displayport.ps1.
#
# Requires: brew install m1ddc
# Optional: export M1DDC_DISPLAY=<id from `m1ddc display list`> if auto-pick is wrong

set -euo pipefail

if ! command -v m1ddc >/dev/null 2>&1; then
  echo "m1ddc not found. Install with: brew install m1ddc" >&2
  exit 1
fi

INPUT_DISPLAYPORT=15

# Prefer an explicit display id when set
if [[ -n "${M1DDC_DISPLAY:-}" ]]; then
  echo "m1ddc display $M1DDC_DISPLAY -> DisplayPort ($INPUT_DISPLAYPORT)"
  m1ddc display "$M1DDC_DISPLAY" set input "$INPUT_DISPLAYPORT"
  exit 0
fi

# Otherwise pick the first external that looks like the Dell (name varies by OS)
list="$(m1ddc display list 2>/dev/null || true)"
dell_num="$(
  print -r -- "$list" | awk '
    BEGIN { IGNORECASE=1 }
    /U2713|DELA092|Dell/ { if (match($0, /^[0-9]+/)) { print substr($0, RSTART, RLENGTH); exit } }
  '
)"

if [[ -n "${dell_num:-}" ]]; then
  echo "m1ddc display $dell_num (matched Dell) -> DisplayPort ($INPUT_DISPLAYPORT)"
  m1ddc display "$dell_num" set input "$INPUT_DISPLAYPORT"
  exit 0
fi

# Fallback: default display (fine if only the Dell is on Mac HDMI)
echo "m1ddc (default display) -> DisplayPort ($INPUT_DISPLAYPORT)"
m1ddc set input "$INPUT_DISPLAYPORT"
