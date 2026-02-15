"""PM2 process management service."""

import json
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Literal

from petehome_cli.config import PM2_PROCESSES, REPO_ROOT
from petehome_cli.services.process import run_command, stream_command


@dataclass
class ProcessInfo:
    """Information about a PM2 process."""

    name: str
    pm_id: int
    status: Literal["online", "stopped", "errored", "launching"]
    memory: int  # bytes
    cpu: float  # percentage
    uptime: int  # milliseconds
    restarts: int
    pid: int | None = None

    @property
    def memory_mb(self) -> float:
        """Memory usage in MB."""
        return self.memory / (1024 * 1024)

    @property
    def uptime_str(self) -> str:
        """Human-readable uptime string."""
        seconds = self.uptime // 1000
        if seconds < 60:
            return f"{seconds}s"
        minutes = seconds // 60
        if minutes < 60:
            return f"{minutes}m {seconds % 60}s"
        hours = minutes // 60
        if hours < 24:
            return f"{hours}h {minutes % 60}m"
        days = hours // 24
        return f"{days}d {hours % 24}h"


class PM2Service:
    """Service for interacting with PM2 process manager."""

    @staticmethod
    async def get_status() -> list[ProcessInfo]:
        """Get status of all PM2 processes."""
        try:
            returncode, stdout, stderr = await run_command("pm2", "jlist")

            if returncode != 0:
                return []

            data = json.loads(stdout)
            processes = []

            for item in data:
                env = item.get("pm2_env", {})
                monit = item.get("monit", {})

                processes.append(ProcessInfo(
                    name=item.get("name", "unknown"),
                    pm_id=item.get("pm_id", -1),
                    status=env.get("status", "stopped"),
                    memory=monit.get("memory", 0),
                    cpu=monit.get("cpu", 0),
                    uptime=env.get("pm_uptime", 0),
                    restarts=env.get("restart_time", 0),
                    pid=item.get("pid"),
                ))

            return processes
        except Exception:
            return []

    @staticmethod
    async def get_process(name: str) -> ProcessInfo | None:
        """Get status of a specific PM2 process."""
        processes = await PM2Service.get_status()
        for proc in processes:
            if proc.name == name:
                return proc
        return None

    @staticmethod
    async def start(name: str) -> tuple[bool, str]:
        """Start a PM2 process."""
        returncode, stdout, stderr = await run_command(
            "pm2", "start", "ecosystem.config.js", "--only", name,
            cwd=str(REPO_ROOT),
        )
        success = returncode == 0
        output = stdout if success else stderr
        return success, output

    @staticmethod
    async def stop(name: str) -> tuple[bool, str]:
        """Stop a PM2 process."""
        returncode, stdout, stderr = await run_command("pm2", "stop", name)
        success = returncode == 0
        output = stdout if success else stderr
        return success, output

    @staticmethod
    async def restart(name: str) -> tuple[bool, str]:
        """Restart a PM2 process."""
        returncode, stdout, stderr = await run_command("pm2", "restart", name)
        success = returncode == 0
        output = stdout if success else stderr
        return success, output

    @staticmethod
    async def delete(name: str) -> tuple[bool, str]:
        """Delete a PM2 process."""
        returncode, stdout, stderr = await run_command("pm2", "delete", name)
        success = returncode == 0
        output = stdout if success else stderr
        return success, output

    @staticmethod
    async def stream_logs(
        name: str | None = None,
        lines: int = 100,
    ) -> AsyncIterator[str]:
        """Stream logs from PM2 processes."""
        if name:
            args = ("pm2", "logs", name, "--raw", "--lines", str(lines))
        else:
            args = ("pm2", "logs", "--raw", "--lines", str(lines))

        async for line in stream_command(*args):
            yield line

    @staticmethod
    async def flush_logs(name: str | None = None) -> tuple[bool, str]:
        """Flush PM2 logs."""
        if name:
            args = ("pm2", "flush", name)
        else:
            args = ("pm2", "flush",)

        returncode, stdout, stderr = await run_command(*args)
        success = returncode == 0
        output = stdout if success else stderr
        return success, output

    @staticmethod
    def get_process_names() -> dict[str, str]:
        """Get mapping of short names to PM2 process names."""
        return PM2_PROCESSES.copy()
