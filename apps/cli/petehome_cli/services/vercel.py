"""Vercel deployment service."""

from dataclasses import dataclass
from datetime import datetime
from typing import Literal

import httpx

from petehome_cli.config import VERCEL_PROJECT_ID, VERCEL_TEAM_ID, VERCEL_TOKEN
from petehome_cli.services.process import run_command

DeploymentState = Literal[
    "QUEUED", "INITIALIZING", "BUILDING", "READY", "ERROR", "CANCELED"
]


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
    def deployment_url(self) -> str:
        return f"https://{self.url}"

    @property
    def created_str(self) -> str:
        return self.created_at.strftime("%Y-%m-%d %H:%M:%S")


class VercelService:
    """Service for interacting with Vercel API."""

    API_BASE = "https://api.vercel.com"

    def __init__(self) -> None:
        self.token = VERCEL_TOKEN
        self.project_id = VERCEL_PROJECT_ID
        self.team_id = VERCEL_TEAM_ID

    @property
    def is_configured(self) -> bool:
        return bool(self.token)

    def _get_headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.token}"}

    def _get_params(self) -> dict[str, str]:
        params: dict[str, str] = {}
        if self.project_id:
            params["projectId"] = self.project_id
        if self.team_id:
            params["teamId"] = self.team_id
        return params

    async def get_deployments(self, limit: int = 10) -> list[Deployment]:
        """Get recent deployments."""
        if not self.is_configured:
            return []

        try:
            async with httpx.AsyncClient() as client:
                params = self._get_params()
                params["limit"] = str(limit)

                resp = await client.get(
                    f"{self.API_BASE}/v6/deployments",
                    headers=self._get_headers(),
                    params=params,
                )
                if resp.status_code != 200:
                    return []

                data = resp.json()
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
        """Trigger a new deployment using Vercel CLI."""
        returncode, stdout, stderr = await run_command(
            "vercel", "--prod", "--yes",
        )
        success = returncode == 0
        output = stdout if success else stderr
        return success, output
