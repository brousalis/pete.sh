#!/bin/zsh
# mac-toggle-mirror.sh
#
# Toggle: Dell U2713H (portrait 27") primary + Alienware mirror
#       <-> Alienware primary + Dell portrait beside it
#
# Dell is ALWAYS 1440x2560 degree:270 (vertical) — never landscape.
# Usage: mac-toggle-mirror.sh [on|off|toggle]
# Requires: brew install displayplacer

set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

if ! command -v displayplacer >/dev/null 2>&1; then
  echo "displayplacer not found. Install with: brew install displayplacer" >&2
  exit 1
fi

# Dell U2713H — vertical 27"
DELL_RES="1440x2560"
DELL_DEGREE=270
# Alienware AW3423DWF ultrawide
ALIEN_RES="3440x1440"

MAC_MIRROR_OVERRIDE="${MAC_MIRROR_OVERRIDE:-}"
MAC_UNMIRROR_OVERRIDE="${MAC_UNMIRROR_OVERRIDE:-}"

notify() {
  osascript -e "display notification \"$1\" with title \"Mac display toggle\"" >/dev/null 2>&1 || true
}

refresh_list() {
  list="$(displayplacer list)"
  mirror_pair="$(
    print -r -- "$list" | grep -Eo 'id:[0-9A-Fa-f-]+\+[0-9A-Fa-f-]+' | head -n 1 || true
  )"
  is_mirrored=0
  if [[ -n "$mirror_pair" ]]; then
    is_mirrored=1
  fi
}

resolve_ids() {
  if [[ -n "${mirror_pair:-}" ]]; then
    local pair="${mirror_pair#id:}"
    dell_id="${pair%%+*}"
    alien_id="${pair#*+}"
    return
  fi

  dell_id="$(
    print -r -- "$list" | awk '
      /^Persistent screen id:/ { id=$4; next }
      /^Resolution:/ {
        res=$2; gsub(/@.*/, "", res)
        if (res == "1440x2560") print id
      }
    ' | head -n 1
  )"
  if [[ -z "${dell_id:-}" ]]; then
    # Dell may currently be wrongly landscape (2560x1440)
    dell_id="$(
      print -r -- "$list" | awk '
        /^Persistent screen id:/ { id=$4; next }
        /^Resolution:/ {
          res=$2; gsub(/@.*/, "", res)
          if (res == "2560x1440") print id
        }
      ' | head -n 1
    )"
  fi
  alien_id="$(
    print -r -- "$list" | awk '
      /^Persistent screen id:/ { id=$4; next }
      /^Resolution:/ {
        res=$2; gsub(/@.*/, "", res)
        if (res == "3440x1440") print id
      }
    ' | head -n 1
  )"
}

run_displayplacer() {
  set +e
  displayplacer "$@"
  set -e
  return 0
}

do_mirror() {
  if [[ -n "$MAC_MIRROR_OVERRIDE" ]]; then
    eval $MAC_MIRROR_OVERRIDE
    notify "Mirrored — Dell vertical primary"
    return
  fi

  resolve_ids
  if [[ -z "${dell_id:-}" || -z "${alien_id:-}" ]]; then
    echo "Could not auto-detect Dell + Alienware for mirror." >&2
    notify "Mirror failed — screens not found"
    exit 1
  fi

  echo "Mirror ON — Dell vertical ($dell_id @ ${DELL_RES} deg ${DELL_DEGREE})"
  run_displayplacer \
    "id:${dell_id}+${alien_id} res:${DELL_RES} hz:60 color_depth:8 scaling:off origin:(0,0) degree:${DELL_DEGREE}"
  notify "Mirrored — Dell vertical primary"
}

do_unmirror() {
  if [[ -n "$MAC_UNMIRROR_OVERRIDE" ]]; then
    eval $MAC_UNMIRROR_OVERRIDE
    notify "Unmirrored"
    return
  fi

  resolve_ids
  if [[ -z "${dell_id:-}" || -z "${alien_id:-}" ]]; then
    echo "Could not auto-detect screens for unmirror." >&2
    notify "Unmirror failed"
    exit 1
  fi

  # Always force Dell portrait — never trust a saved landscape layout
  echo "Mirror OFF — Alienware primary, Dell vertical (${DELL_RES} deg ${DELL_DEGREE})"
  run_displayplacer \
    "id:${alien_id} res:${ALIEN_RES} hz:60 color_depth:8 scaling:off origin:(0,0) degree:0" \
    "id:${dell_id} res:${DELL_RES} hz:60 color_depth:8 scaling:off origin:(-1440,0) degree:${DELL_DEGREE}"
  notify "Unmirrored — Dell vertical"
}

refresh_list

if [[ "${1:-}" == "on" ]]; then
  if (( is_mirrored )); then
    echo "Already mirrored — nothing to do"
    exit 0
  fi
  do_mirror
elif [[ "${1:-}" == "off" ]]; then
  # Always run unmirror so a wrongly-landscape Dell gets corrected
  do_unmirror
elif [[ -z "${1:-}" || "${1:-}" == "toggle" ]]; then
  if (( is_mirrored )); then
    do_unmirror
  else
    do_mirror
  fi
else
  echo "Usage: $0 [on|off|toggle]" >&2
  exit 2
fi
