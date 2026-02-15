"""Configuration for armhr-cli."""

from pathlib import Path

# Repo roots: CLI lives at armhr-python/bin/cli/armhr_cli/
BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent.parent
FRONTEND_ROOT = BACKEND_ROOT.parent / "armhr-frontend"

# State directories
STATE_DIR = Path.home() / ".armhr"
BACKUPS_DIR = STATE_DIR / "backups"

# Environment management
ENV_FILE = BACKEND_ROOT / ".env"
PRESETS_FILE = STATE_DIR / "presets.toml"

# Variable group → env-var prefix mapping
GROUP_PREFIXES: dict[str, str] = {
    "auth0": "HCM_AUTH0_",
    "prism": "HCM_PRISMHR_",
    "db": "DB_",
}

# Server definitions used by the process manager
MANAGED_SERVERS = {
    "be": {
        "name": "backend",
        "label": "be",
        "cwd": BACKEND_ROOT,
        "cmd": ["uv", "run", "--env-file", ".env", "python", "-m", "bin.start_api"],
        "env": {"SKIP_MIGRATIONS": "true"},
    },
    "fe": {
        "name": "frontend",
        "label": "fe",
        "cwd": FRONTEND_ROOT,
        "cmd": ["yarn", "start"],
        "env": {},
    },
}


# ── Preferences (backed by ~/.armhr/settings.toml, env vars override) ──


def _get_pref(key: str) -> bool:
    """Lazy import to avoid circular dependency at module level."""
    from armhr_cli.services.settings import get_pref

    return get_pref(key)


CLEAR_LOGS_ON_START: bool = _get_pref("clear_logs_on_start")
CLEAR_OUTPUT_ON_CMD: bool = _get_pref("clear_output_on_cmd")
INPUT_AT_TOP: bool = _get_pref("input_at_top")
STACKED_LOGS: bool = _get_pref("stacked_logs")

# ── Monitored ports for process cleanup ──
# Each entry: base port + range of ports to scan (Vite auto-increments on conflict)
MONITORED_PORTS: dict[str, dict[str, object]] = {
    "backend": {"base": 8000, "range": 5, "group": "backend"},
    "hcm": {"base": 3200, "range": 5, "group": "frontend"},
    "marketing": {"base": 3100, "range": 5, "group": "frontend"},
    "quote": {"base": 3300, "range": 5, "group": "frontend"},
    "ops": {"base": 3500, "range": 5, "group": "frontend"},
}

# Frontend app scopes (used for fe start:hcm, fe build:ops, etc.)
FRONTEND_APPS = ("hcm", "marketing", "quote", "ops")

# Backend test module mapping
BACKEND_TEST_MODULES = {
    "hcm": "test/apps/hcm",
    "quote": "test/apps/quoting",
    "start": "test/apps/start",
    "ops": "test/apps/ops",
}
