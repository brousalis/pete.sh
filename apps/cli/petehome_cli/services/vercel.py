"""Vercel deployment service."""

import asyncio
import sys
from dataclasses import dataclass
from datetime import datetime
from typing import Literal

import aiohttp

from petehome_cli.config import VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_TEAM_ID


# On Windows, commands need shell execution
IS_WINDOWS = sys.platform == "win32"


DeploymentState = Literal[
    "QUEUED", "INITIALIZING", "BUILDING", "READY", "ERROR", "CANCELED"
]


async def run_command(
    *args: str,
    cwd: str | None = None,
) -> tuple[int, str, str]:
    """Run a command and return exit code, stdout, stderr."""
    if IS_WINDOWS:
        cmd = " ".join(f'"{a}"' if " " in a else a for a in args)
        proc = await asyncio.create_subprocess_shell(
            cmd,
            cwd=cwd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
    else:
        proc = await asyncio.create_subprocess_exec(
            *args,
            cwd=cwd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

    stdout, stderr = await proc.communicate()
    return (
        proc.returncode or 0,
        stdout.decode("utf-8", errors="replace"),
        stderr.decode("utf-8", errors="replace"),
    )


@dataclass
class Deployment:
    """Vercel deployment information."""

    uid: str
    name: str
    url: str
    state: DeploymentState
    created_at: datetime
    ready_at: datetime | None
    alias_error: str | None = None
    alias_assigned: bool = False
    inspector_url: str | None = None

    @property
    def status_emoji(self) -> str:
        """Get emoji for deployment status."""
        return {
            "QUEUED": "⏳",
            "INITIALIZING": "🔄",
            "BUILDING": "🔨",
            "READY": "✅",
            "ERROR": "❌",
            "CANCELED": "🚫",
        }.get(self.state, "❓")

    @property
    def deployment_url(self) -> str:
        """Get the full deployment URL."""
        return f"https://{self.url}"

    @property
    def created_str(self) -> str:
        """Human-readable creation time."""
        return self.created_at.strftime("%Y-%m-%d %H:%M:%S")


class VercelService:
    """Service for interacting with Vercel API."""

    API_BASE = "https://api.vercel.com"

    def __init__(self) -> None:
        """Initialize Vercel service."""
        self.token = VERCEL_TOKEN
        self.project_id = VERCEL_PROJECT_ID
        self.team_id = VERCEL_TEAM_ID

    @property
    def is_configured(self) -> bool:
        """Check if Vercel is properly configured."""
        return bool(self.token)

    def _get_headers(self) -> dict[str, str]:
        """Get authorization headers."""
        return {"Authorization": f"Bearer {self.token}"}

    def _get_params(self) -> dict[str, str]:
        """Get common query parameters."""
        params: dict[str, str] = {}
        if self.project_id:
            params["projectId"] = self.project_id
        if self.team_id:
            params["teamId"] = self.team_id
        return params

    async def get_deployments(self, limit: int = 10) -> list[Deployment]:
        """Get recent deployments.

        Args:
            limit: Maximum number of deployments to return.

        Returns:
            List of Deployment objects.
        """
        if not self.is_configured:
            return []

        try:
            async with aiohttp.ClientSession() as session:
                params = self._get_params()
                params["limit"] = str(limit)

                async with session.get(
                    f"{self.API_BASE}/v6/deployments",
                    headers=self._get_headers(),
                    params=params,
                ) as resp:
                    if resp.status != 200:
                        return []

                    data = await resp.json()
                    deployments = []

                    for d in data.get("deployments", []):
                        created_at = datetime.fromtimestamp(d["created"] / 1000)
                        ready_at = None
                        if d.get("ready"):
                            ready_at = datetime.fromtimestamp(d["ready"] / 1000)

                        deployments.append(Deployment(
                            uid=d["uid"],
                            name=d.get("name", "unknown"),
                            url=d.get("url", ""),
                            state=d.get("state", "QUEUED"),
                            created_at=created_at,
                            ready_at=ready_at,
                            alias_error=d.get("aliasError"),
                            alias_assigned=d.get("aliasAssigned", False),
                            inspector_url=d.get("inspectorUrl"),
                        ))

                    return deployments
        except Exception:
            return []

    async def get_latest_deployment(self) -> Deployment | None:
        """Get the most recent deployment."""
        deployments = await self.get_deployments(limit=1)
        return deployments[0] if deployments else None

    async def trigger_deployment(self) -> tuple[bool, str]:
        """Trigger a new deployment using Vercel CLI.

        Returns:
            Tuple of (success, output).
        """
        returncode, stdout, stderr = await run_command(
            "vercel", "--prod", "--yes",
        )
        success = returncode == 0
        output = stdout if success else stderr
        return success, output

    async def get_project_info(self) -> dict | None:
        """Get project information."""
        if not self.is_configured or not self.project_id:
            return None

        try:
            async with aiohttp.ClientSession() as session:
                params = {}
                if self.team_id:
                    params["teamId"] = self.team_id

                async with session.get(
                    f"{self.API_BASE}/v9/projects/{self.project_id}",
                    headers=self._get_headers(),
                    params=params,
                ) as resp:
                    if resp.status != 200:
                        return None
                    return await resp.json()
        except Exception:
            return None
