"""Persistent settings backed by ~/.petehome/settings.toml.

Provides read/write access to CLI preferences and keybindings.
Env vars (PETEHOME_*) override file values for backward compatibility.
"""

import os
from pathlib import Path

import tomllib

STATE_DIR: Path = Path.home() / ".petehome"
SETTINGS_FILE: Path = STATE_DIR / "settings.toml"

# -- Defaults -----------------------------------------------------------------

PREF_DEFAULTS: dict[str, bool] = {
    "clear_output_on_cmd": True,
    "input_at_top": False,
}

# Maps pref key -> env var name for backward compat overrides
_PREF_ENV_MAP: dict[str, str] = {
    "clear_output_on_cmd": "PETEHOME_CLEAR_OUTPUT",
    "input_at_top": "PETEHOME_INPUT_TOP",
}

KEYBINDING_DEFAULTS: dict[str, str] = {
    "quit": "ctrl+q",
    "clear_output": "ctrl+l",
    "focus_logs": "f1",
    "focus_output": "f2",
    "restore_panels": "escape",
}

# -- In-memory cache ----------------------------------------------------------

_cache: dict | None = None


def _invalidate() -> None:
    global _cache
    _cache = None


# -- Read ---------------------------------------------------------------------


def load_settings() -> dict:
    """Load settings.toml and return the raw dict. Uses in-memory cache."""
    global _cache
    if _cache is not None:
        return _cache

    if not SETTINGS_FILE.exists():
        ensure_defaults()

    with open(SETTINGS_FILE, "rb") as f:
        _cache = tomllib.load(f)
    return _cache


def get_pref(key: str) -> bool:
    """Return a boolean preference value.

    Priority: env var override > settings.toml > hardcoded default.
    """
    # 1. Env var override
    env_name = _PREF_ENV_MAP.get(key)
    if env_name:
        env_val = os.environ.get(env_name)
        if env_val is not None:
            default = PREF_DEFAULTS.get(key, False)
            if default is True:
                return env_val.lower() != "false"
            else:
                return env_val.lower() == "true"

    # 2. settings.toml
    data = load_settings()
    prefs = data.get("preferences", {})
    if key in prefs:
        return bool(prefs[key])

    # 3. Hardcoded default
    return PREF_DEFAULTS.get(key, False)


def get_keybinding(action: str) -> str:
    """Return the key string for an action."""
    data = load_settings()
    bindings = data.get("keybindings", {})
    return str(bindings.get(action, KEYBINDING_DEFAULTS.get(action, "")))


# -- Write --------------------------------------------------------------------


def _build_toml(data: dict) -> str:
    """Serialize a settings dict to TOML string."""
    lines: list[str] = []

    prefs = data.get("preferences", {})
    if prefs:
        lines.append("[preferences]")
        for k, v in prefs.items():
            if isinstance(v, bool):
                lines.append(f"{k} = {str(v).lower()}")
            else:
                lines.append(f"{k} = {str(v).lower()}")
        lines.append("")

    bindings = data.get("keybindings", {})
    if bindings:
        lines.append("[keybindings]")
        for k, v in bindings.items():
            escaped = str(v).replace("\\", "\\\\").replace('"', '\\"')
            lines.append(f'{k} = "{escaped}"')
        lines.append("")

    return "\n".join(lines) + "\n"


def save_settings(data: dict) -> None:
    """Write the full settings dict to settings.toml."""
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    SETTINGS_FILE.write_text(_build_toml(data))
    try:
        SETTINGS_FILE.chmod(0o600)
    except OSError:
        pass
    _invalidate()


def set_pref(key: str, value: bool) -> None:
    """Update a single preference and save."""
    data = load_settings().copy()
    prefs = dict(data.get("preferences", {}))
    prefs[key] = value
    data["preferences"] = prefs
    save_settings(data)


def set_keybinding(action: str, key: str) -> None:
    """Update a single keybinding and save."""
    data = load_settings().copy()
    bindings = dict(data.get("keybindings", {}))
    bindings[action] = key
    data["keybindings"] = bindings
    save_settings(data)


# -- Bootstrap ----------------------------------------------------------------


def ensure_defaults() -> None:
    """Create settings.toml with default values if it doesn't exist."""
    if SETTINGS_FILE.exists():
        return
    data = {
        "preferences": dict(PREF_DEFAULTS),
        "keybindings": dict(KEYBINDING_DEFAULTS),
    }
    save_settings(data)
