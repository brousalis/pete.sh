"""Configuration for petehome-cli."""

import os
from pathlib import Path

from dotenv import load_dotenv

# Project paths
REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
WEB_APP_PATH = REPO_ROOT / "apps" / "web"
SCRIPTS_PATH = WEB_APP_PATH / "scripts"

# Load environment variables from web app .env file
load_dotenv(WEB_APP_PATH / ".env")

# State directories
STATE_DIR = Path.home() / ".petehome"

# PM2 process names
PM2_PROCESSES: dict[str, str] = {
    "main": "petehome",
    "notifications": "petehome-notifications",
}

# Vercel configuration
VERCEL_TOKEN = os.getenv("VERCEL_TOKEN", "")
VERCEL_PROJECT_ID = os.getenv("VERCEL_PROJECT_ID", "")
VERCEL_TEAM_ID = os.getenv("VERCEL_TEAM_ID", "")

# Dev server settings
DEV_SERVER_PORT = int(os.getenv("PORT", "3000"))
DEV_SERVER_HOST = os.getenv("HOSTNAME", "0.0.0.0")

# Monitored ports for process cleanup
MONITORED_PORTS: dict[str, dict[str, object]] = {
    "dev-server": {"base": 3000, "range": 5, "group": "web"},
}


# -- Preferences (backed by ~/.petehome/settings.toml, env vars override) -----


def _get_pref(key: str) -> bool:
    """Lazy import to avoid circular dependency at module level."""
    from petehome_cli.services.settings import get_pref

    return get_pref(key)


CLEAR_OUTPUT_ON_CMD: bool = _get_pref("clear_output_on_cmd")
INPUT_AT_TOP: bool = _get_pref("input_at_top")
