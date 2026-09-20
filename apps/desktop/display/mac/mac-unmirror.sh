#!/bin/zsh
# mac-unmirror.sh
#
# Restores independent (non-mirrored) arrangement so you can use Mac
# on the Alienware ultrawide again (or dual Mac displays).
#
# Setup (once):
#   1. brew install displayplacer
#   2. Arrange displays how you want for "Mac on Alienware" mode
#      (Alienware primary, Dell beside it or disabled — your choice)
#   3. Run: displayplacer list
#   4. Copy the suggested `displayplacer "id:..."` line into
#      MAC_UNMIRROR_OVERRIDE below (or export it in your shell profile)
#
# Until you set an override, this script turns mirroring off by placing
# both displays side-by-side with Alienware as primary when detectable.

set -euo pipefail

MAC_UNMIRROR_OVERRIDE="${MAC_UNMIRROR_OVERRIDE:-}"

if ! command -v displayplacer >/dev/null 2>&1; then
  echo "displayplacer not found. Install with: brew install displayplacer" >&2
  exit 1
fi

if [[ -n "$MAC_UNMIRROR_OVERRIDE" ]]; then
  echo "Applying saved un-mirror layout..."
  eval displayplacer $MAC_UNMIRROR_OVERRIDE
  echo "Done."
  exit 0
fi

list="$(displayplacer list)"

dell_id="$(
  print -r -- "$list" | awk '
    /^Persistent screen id:/ { id=$4 }
    /^Resolution:/ {
      res=$2
      gsub(/@.*/, "", res)
      if (res == "2560x1440" || res == "1440x2560") print id
    }
  ' | head -n 1
)"

alien_id="$(
  print -r -- "$list" | awk '
    /^Persistent screen id:/ { id=$4 }
    /^Resolution:/ {
      res=$2
      gsub(/@.*/, "", res)
      if (res == "3440x1440") print id
    }
  ' | head -n 1
)"

if [[ -z "${dell_id}" || -z "${alien_id}" ]]; then
  echo "Could not auto-detect both screens. Set MAC_UNMIRROR_OVERRIDE from \`displayplacer list\`." >&2
  exit 1
fi

dell_res="$(
  print -r -- "$list" | awk -v want="$dell_id" '
    /^Persistent screen id:/ { cur=$4 }
    cur == want && /^Resolution:/ {
      res=$2; gsub(/@.*/, "", res); print res; exit
    }
  '
)"
alien_res="$(
  print -r -- "$list" | awk -v want="$alien_id" '
    /^Persistent screen id:/ { cur=$4 }
    cur == want && /^Resolution:/ {
      res=$2; gsub(/@.*/, "", res); print res; exit
    }
  '
)"

# Dell is vertical 27"; Alienware is ultrawide
dell_res="1440x2560"
dell_degree=270
alien_res="3440x1440"

# Alienware primary at origin; Dell portrait to the left
echo "Restoring side-by-side (Alienware primary, Dell vertical)..."
displayplacer \
  "id:${alien_id} res:${alien_res} scaling:off origin:(0,0) degree:0" \
  "id:${dell_id} res:${dell_res} scaling:off origin:(-1440,0) degree:${dell_degree}" || true

echo "Done. Prefer saving this exact layout:"
echo "  displayplacer list"
echo "then export MAC_UNMIRROR_OVERRIDE='\"id:...\" \"id:...\"'"
