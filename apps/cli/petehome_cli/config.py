"""Configuration for petehome-cli."""

import os
from pathlib import Path

from dotenv import load_dotenv

# Project paths
REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
WEB_APP_PATH = REPO_ROOT / "apps" / "web"
SCRIPTS_PATH = WEB_APP_PATH / "scripts"
COACH_WORKER_DIR = REPO_ROOT / "apps" / "coach-worker"

# Load environment variables from web app .env file
load_dotenv(WEB_APP_PATH / ".env")

# State directories
STATE_DIR = Path.home() / ".petehome"
COACH_CONVERSATION_FILE = STATE_DIR / "coach-cli-conversation.json"

# PM2 process names
PM2_PROCESSES: dict[str, str] = {
    "main": "petehome",
    "coach": "petehome-worker",
}

# Dev server settings
DEV_SERVER_PORT = int(os.getenv("PORT", "3000"))
DEV_SERVER_HOST = os.getenv("HOSTNAME", "0.0.0.0")

# petehome
COACH_WORKER_PORT = int(os.getenv("COACH_WORKER_PORT", "3021"))
COACH_API_KEY = os.getenv("COACH_API_KEY", "")
COACH_API_BASE = os.getenv(
    "COACH_CLI_BASE_URL",
    f"http://localhost:{DEV_SERVER_PORT}",
).rstrip("/")
COACH_HEALTHZ_URL = f"http://localhost:{COACH_WORKER_PORT}/healthz"
COACH_UI_URL = os.getenv(
    "COACH_CLI_UI_URL",
    f"http://localhost:{DEV_SERVER_PORT}/coach",
)

# Monitored ports for process cleanup
MONITORED_PORTS: dict[str, dict[str, object]] = {
    "dev-server": {"base": 3000, "range": 5, "group": "web"},
    "coach-worker": {"base": 3021, "range": 1, "group": "coach"},
}


# -- Preferences (backed by ~/.petehome/settings.toml, env vars override) -----


def _get_pref(key: str) -> bool:
    """Lazy import to avoid circular dependency at module level."""
    from petehome_cli.services.settings import get_pref

    return get_pref(key)


CLEAR_OUTPUT_ON_CMD: bool = _get_pref("clear_output_on_cmd")
INPUT_AT_TOP: bool = _get_pref("input_at_top")
