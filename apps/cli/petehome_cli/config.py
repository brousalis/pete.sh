"""Configuration for petehome-cli."""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Project paths
REPO_ROOT = Path(__file__).parent.parent.parent.parent
WEB_APP_PATH = REPO_ROOT / "apps" / "web"
SCRIPTS_PATH = WEB_APP_PATH / "scripts"

# PM2 process names
PM2_PROCESSES = {
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
