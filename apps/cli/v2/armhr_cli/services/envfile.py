"""Environment file (.env) parser, writer, and preset management.

Handles:
- Reading/writing .env files while preserving comments, blank lines, and order
- Loading preset definitions from ~/.armhr/presets.toml (via stdlib tomllib)
- Swapping a variable group in .env to a named preset (with backup)
- Seeding presets.toml from the existing .env commented blocks
"""

import os
import re
import shutil
import stat
import tomllib
from datetime import datetime
from pathlib import Path

from armhr_cli.config import BACKUPS_DIR, ENV_FILE, GROUP_PREFIXES, PRESETS_FILE

# Pattern for section header comments: # ############### LABEL
_SECTION_RE = re.compile(r"^#\s*#{3,}\s+(.+)$")

# Pattern for an active (uncommented) key=value line
_KV_RE = re.compile(r"^([A-Za-z_][A-Za-z0-9_]*)=(.*)$")

# Pattern for a commented-out key=value line: # KEY=value
_COMMENTED_KV_RE = re.compile(r"^#\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$")

# Known group keywords used in section headers → group name
_HEADER_KEYWORDS: dict[str, str] = {
    "AUTH0": "auth0",
    "PRISM": "prism",
    "PRISMHR": "prism",
    "DB": "db",
}


# ---------------------------------------------------------------------------
# .env reading
# ---------------------------------------------------------------------------


def read_env_lines(env_path: Path | None = None) -> list[str]:
    """Read the .env file and return raw lines (preserving newlines)."""
    path = env_path or ENV_FILE
    if not path.exists():
        return []
    return path.read_text().splitlines(keepends=True)


def parse_active_vars(lines: list[str], prefix: str) -> dict[str, str]:
    """Extract active (uncommented) key=value pairs matching a prefix."""
    result: dict[str, str] = {}
    for line in lines:
        m = _KV_RE.match(line.strip())
        if m and m.group(1).startswith(prefix):
            result[m.group(1)] = m.group(2)
    return result


# ---------------------------------------------------------------------------
# Preset TOML loading
# ---------------------------------------------------------------------------


def load_presets(presets_path: Path | None = None) -> dict[str, dict[str, dict[str, str]]]:
    """Load presets.toml and return {group: {preset_name: {KEY: value}}}.

    Keys starting with ``_`` (e.g. ``_full``) are reserved for metadata
    sections and are excluded from the returned group presets.
    """
    path = presets_path or PRESETS_FILE
    if not path.exists():
        return {}
    with open(path, "rb") as f:
        data = tomllib.load(f)
    # Ensure all values are strings
    result: dict[str, dict[str, dict[str, str]]] = {}
    for group, presets in data.items():
        if group.startswith("_"):
            continue  # skip metadata sections like [_full]
        if not isinstance(presets, dict):
            continue
        result[group] = {}
        for preset_name, kvs in presets.items():
            if not isinstance(kvs, dict):
                continue
            result[group][preset_name] = {k: str(v) for k, v in kvs.items()}
    return result


def get_preset(group: str, preset_name: str) -> dict[str, str] | None:
    """Get a single preset's key-value map, or None if not found."""
    presets = load_presets()
    return presets.get(group, {}).get(preset_name)


def list_presets() -> dict[str, list[str]]:
    """Return {group: [preset_name, ...]} for all defined presets."""
    presets = load_presets()
    return {group: sorted(names.keys()) for group, names in presets.items()}


# ---------------------------------------------------------------------------
# Identify which preset is currently active
# ---------------------------------------------------------------------------


def identify_active_preset(group: str) -> tuple[str, str | None]:
    """Return (preset_name, representative_value) or ("custom", None).

    Compares the current .env active vars for the group against all
    known presets. A match requires every key in the preset to be
    present with the same value in the .env.
    """
    prefix = GROUP_PREFIXES.get(group)
    if not prefix:
        return "custom", None

    lines = read_env_lines()
    active = parse_active_vars(lines, prefix)
    presets = load_presets()

    for preset_name, preset_vars in presets.get(group, {}).items():
        if all(active.get(k) == v for k, v in preset_vars.items()):
            # Pick a representative value for display
            rep_key = _representative_key(group)
            rep_val = active.get(rep_key, next(iter(active.values()), ""))
            return preset_name, f"{rep_key}={rep_val}" if rep_key else None
    return "custom", None


def _representative_key(group: str) -> str:
    """Pick a human-readable representative key for status display."""
    return {
        "auth0": "HCM_AUTH0_DOMAIN",
        "prism": "HCM_PRISMHR_ENVIRONMENT",
        "db": "DB_ENDPOINT",
    }.get(group, "")


# ---------------------------------------------------------------------------
# Full (combined) presets
# ---------------------------------------------------------------------------


def load_full_presets(presets_path: Path | None = None) -> dict[str, dict[str, str]]:
    """Load the ``[_full]`` section from presets.toml.

    Returns ``{preset_name: {group: group_preset_name}}``, e.g.::

        {"local": {"auth0": "local", "prism": "local", "db": "local"}}
    """
    path = presets_path or PRESETS_FILE
    if not path.exists():
        return {}
    with open(path, "rb") as f:
        data = tomllib.load(f)
    raw = data.get("_full")
    if not isinstance(raw, dict):
        return {}
    result: dict[str, dict[str, str]] = {}
    for name, mapping in raw.items():
        if not isinstance(mapping, dict):
            continue
        result[name] = {str(k): str(v) for k, v in mapping.items()}
    return result


def list_full_presets() -> list[str]:
    """Return sorted list of full-preset names defined in ``[_full]``."""
    return sorted(load_full_presets().keys())


# Keys shown in the full-preset summary bar
_SUMMARY_KEYS: list[tuple[str, str]] = [
    ("DB_ENDPOINT", "db"),
    ("HCM_PRISMHR_USER_NAME", "prism"),
    ("HCM_AUTH0_DOMAIN", "auth0"),
]


def env_summary_values() -> list[tuple[str, str]]:
    """Return ``[(label, truncated_value), ...]`` for the full-preset summary.

    Reads the current ``.env`` and pulls out the three representative
    keys.  Values longer than 28 chars are truncated with ``…``.
    """
    lines = read_env_lines()
    # Collect all active vars in one pass
    active: dict[str, str] = {}
    for line in lines:
        m = _KV_RE.match(line.strip())
        if m:
            active[m.group(1)] = m.group(2)

    result: list[tuple[str, str]] = []
    for key, label in _SUMMARY_KEYS:
        val = active.get(key, "–")
        if len(val) > 28:
            val = val[:27] + "…"
        result.append((label, val))
    return result


def identify_active_full_preset() -> str | None:
    """Return the full-preset name if *all* groups match, else ``None``.

    Iterates over every defined full preset and checks whether each
    group's currently active preset matches the mapping.
    """
    full = load_full_presets()
    if not full:
        return None

    # Cache per-group active presets so we only read .env once per group
    active_by_group: dict[str, str] = {}
    for group in GROUP_PREFIXES:
        active_name, _ = identify_active_preset(group)
        active_by_group[group] = active_name

    for preset_name, mapping in full.items():
        if all(active_by_group.get(group) == group_preset for group, group_preset in mapping.items()):
            return preset_name
    return None


# ---------------------------------------------------------------------------
# Backup
# ---------------------------------------------------------------------------


def backup_env(env_path: Path | None = None) -> Path:
    """Copy .env to ~/.armhr/backups/.env.<timestamp>. Returns backup path."""
    path = env_path or ENV_FILE
    BACKUPS_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    dest = BACKUPS_DIR / f".env.{ts}"
    shutil.copy2(path, dest)
    return dest


# ---------------------------------------------------------------------------
# Swap logic
# ---------------------------------------------------------------------------


def swap_group(group: str, preset_name: str) -> tuple[bool, str]:
    """Replace all active vars for a group with a preset's values.

    Returns (success, message).
    """
    prefix = GROUP_PREFIXES.get(group)
    if not prefix:
        return False, f"Unknown group: {group}"

    preset_vars = get_preset(group, preset_name)
    if preset_vars is None:
        available = list_presets().get(group, [])
        hint = f" Available: {', '.join(available)}" if available else ""
        return False, f"Preset '{preset_name}' not found for group '{group}'.{hint}"

    if not ENV_FILE.exists():
        return False, f".env not found at {ENV_FILE}"

    # 1. Backup
    backup_path = backup_env()

    # 2. Read lines
    lines = read_env_lines()

    # 3. Find all active (uncommented) lines matching the prefix
    removal_indices: list[int] = []
    for i, line in enumerate(lines):
        stripped = line.strip()
        m = _KV_RE.match(stripped)
        if m and m.group(1).startswith(prefix):
            removal_indices.append(i)

    if not removal_indices:
        # No existing lines — append at the end of the managed block area
        insert_at = _find_insert_position(lines, prefix)
    else:
        insert_at = removal_indices[0]

    # 4. Build replacement block
    header = f"# --- {group}: {preset_name} ---\n"
    new_lines = [header]
    for key, value in preset_vars.items():
        new_lines.append(f"{key}={value}\n")

    # 5. Reconstruct the file: remove old lines, insert new block
    result_lines: list[str] = []
    inserted = False
    for i, line in enumerate(lines):
        if i in set(removal_indices):
            if not inserted:
                result_lines.extend(new_lines)
                inserted = True
            # Skip the old line
            continue
        result_lines.append(line)

    # If nothing was removed (no existing vars), insert at computed position
    if not inserted:
        result_lines[insert_at:insert_at] = new_lines

    # 6. Write back
    ENV_FILE.write_text("".join(result_lines))

    return True, f"Swapped {group} → {preset_name} (backup: {backup_path.name})"


def _find_insert_position(lines: list[str], prefix: str) -> int:
    """Find a reasonable position to insert a new group block.

    Looks for commented-out lines matching the prefix and inserts after
    the last one. Falls back to end of file.
    """
    last_commented = -1
    for i, line in enumerate(lines):
        m = _COMMENTED_KV_RE.match(line.strip())
        if m and m.group(1).startswith(prefix):
            last_commented = i
    if last_commented >= 0:
        return last_commented + 1
    return len(lines)


# ---------------------------------------------------------------------------
# Seed presets.toml from .env commented blocks (env init)
# ---------------------------------------------------------------------------


def seed_presets_from_env() -> tuple[bool, str]:
    """Parse the .env section headers and generate ~/.armhr/presets.toml.

    Returns (success, message).
    """
    if PRESETS_FILE.exists():
        return False, f"Presets file already exists: {PRESETS_FILE}\nDelete it first to re-seed."

    lines = read_env_lines()
    if not lines:
        return False, f".env not found or empty at {ENV_FILE}"

    # Collect sections: list of (group, preset, {key: value})
    sections: list[tuple[str, str, dict[str, str]]] = []
    current_group: str | None = None
    current_preset: str | None = None
    current_vars: dict[str, str] = {}

    for line in lines:
        stripped = line.strip()

        # Check for section header
        header_match = _SECTION_RE.match(stripped)
        if header_match:
            # Save previous section if any
            if current_group and current_preset and current_vars:
                sections.append((current_group, current_preset, current_vars))

            # Parse the label
            label = header_match.group(1).strip()
            group, preset = _parse_section_label(label)
            if group:
                current_group = group
                current_preset = preset
                current_vars = {}
            else:
                current_group = None
                current_preset = None
                current_vars = {}
            continue

        if current_group and current_preset:
            # Try commented-out key=value
            cm = _COMMENTED_KV_RE.match(stripped)
            if cm:
                key, val = cm.group(1), cm.group(2)
                if key.startswith(GROUP_PREFIXES.get(current_group, "\x00")):
                    current_vars[key] = val
                continue

            # Try active key=value
            am = _KV_RE.match(stripped)
            if am:
                key, val = am.group(1), am.group(2)
                if key.startswith(GROUP_PREFIXES.get(current_group, "\x00")):
                    current_vars[key] = val
                continue

            # Blank line or non-matching line ends the current section
            if stripped == "" or (am is None and cm is None):
                if current_vars:
                    sections.append((current_group, current_preset, current_vars))
                current_group = None
                current_preset = None
                current_vars = {}

    # Don't forget the last section
    if current_group and current_preset and current_vars:
        sections.append((current_group, current_preset, current_vars))

    if not sections:
        return False, "No preset sections found in .env"

    # Build TOML string
    toml_parts: list[str] = []
    for group, preset, kvs in sections:
        toml_parts.append(f"[{group}.{preset}]")
        for key, val in kvs.items():
            # Quote the value for valid TOML
            escaped = val.replace("\\", "\\\\").replace('"', '\\"')
            toml_parts.append(f'{key} = "{escaped}"')
        toml_parts.append("")

    PRESETS_FILE.parent.mkdir(parents=True, exist_ok=True)
    PRESETS_FILE.write_text("\n".join(toml_parts) + "\n")

    # Set restrictive permissions (owner read/write only)
    os.chmod(PRESETS_FILE, stat.S_IRUSR | stat.S_IWUSR)

    return True, f"Created {PRESETS_FILE} with {len(sections)} presets"


def _parse_section_label(label: str) -> tuple[str | None, str | None]:
    """Parse a section header label like 'AUTH0 PROD' or 'PROD DB'.

    Returns (group, preset) or (None, None) if unrecognized.
    """
    words = label.upper().split()
    matched_group: str | None = None
    remaining: list[str] = []

    for word in words:
        if word in _HEADER_KEYWORDS and matched_group is None:
            matched_group = _HEADER_KEYWORDS[word]
        else:
            remaining.append(word)

    if matched_group and remaining:
        preset = "_".join(remaining).lower()
        return matched_group, preset

    return None, None
