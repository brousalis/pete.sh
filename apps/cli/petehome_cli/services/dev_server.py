"""Development server management service."""

import asyncio
import sys
from typing import AsyncIterator

from petehome_cli.config import REPO_ROOT, WEB_APP_PATH


# On Windows, commands need shell execution
IS_WINDOWS = sys.platform == "win32"


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


async def stream_command(
    *args: str,
    cwd: str | None = None,
) -> AsyncIterator[str]:
    """Run a command and stream output lines."""
    if IS_WINDOWS:
        cmd = " ".join(f'"{a}"' if " " in a else a for a in args)
        proc = await asyncio.create_subprocess_shell(
            cmd,
            cwd=cwd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
    else:
        proc = await asyncio.create_subprocess_exec(
            *args,
            cwd=cwd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )

    if proc.stdout:
        async for line in proc.stdout:
            yield line.decode("utf-8", errors="replace").rstrip()


class DevServerService:
    """Service for managing development servers and build tools."""

    def __init__(self) -> None:
        """Initialize dev server service."""
        self.repo_root = str(REPO_ROOT)
        self.web_app_path = str(WEB_APP_PATH)

    async def run_yarn_command(
        self,
        command: str,
        cwd: str | None = None,
    ) -> AsyncIterator[str]:
        """Run a yarn command and stream output.

        Args:
            command: The yarn script to run.
            cwd: Working directory. Defaults to repo root.

        Yields:
            Output lines as they come in.
        """
        work_dir = cwd or self.repo_root

        async for line in stream_command("yarn", command, cwd=work_dir):
            yield line

    async def run_simple_command(
        self,
        command: str,
        args: list[str] | None = None,
        cwd: str | None = None,
    ) -> tuple[bool, str]:
        """Run a command and return result.

        Args:
            command: Command to run.
            args: Command arguments.
            cwd: Working directory.

        Returns:
            Tuple of (success, output).
        """
        work_dir = cwd or self.repo_root
        cmd_args = (command,) + tuple(args or [])

        returncode, stdout, stderr = await run_command(*cmd_args, cwd=work_dir)
        success = returncode == 0
        output = stdout if success else stderr
        return success, output

    async def lint(self, fix: bool = False) -> AsyncIterator[str]:
        """Run ESLint.

        Args:
            fix: If True, automatically fix issues.

        Yields:
            Output lines.
        """
        command = "lint:fix" if fix else "lint"
        async for line in self.run_yarn_command(command):
            yield line

    async def format_code(self, check_only: bool = False) -> AsyncIterator[str]:
        """Run Prettier.

        Args:
            check_only: If True, only check formatting without modifying.

        Yields:
            Output lines.
        """
        command = "format:check" if check_only else "format"
        async for line in self.run_yarn_command(command):
            yield line

    async def type_check(self) -> AsyncIterator[str]:
        """Run TypeScript type checking.

        Yields:
            Output lines.
        """
        async for line in self.run_yarn_command("type-check"):
            yield line

    async def build(self) -> AsyncIterator[str]:
        """Build the web app.

        Yields:
            Output lines.
        """
        async for line in self.run_yarn_command("build"):
            yield line

    async def clean(self) -> tuple[bool, str]:
        """Clean build artifacts.

        Returns:
            Tuple of (success, output).
        """
        return await self.run_simple_command("yarn", ["clean"])

    async def sync_once(self) -> AsyncIterator[str]:
        """Run sync worker once.

        Yields:
            Output lines.
        """
        async for line in self.run_yarn_command("sync"):
            yield line

    async def sync_trader_joes(self, force: bool = False) -> AsyncIterator[str]:
        """Run Trader Joe's sync.

        Args:
            force: If True, re-scrape all recipes.

        Yields:
            Output lines.
        """
        command = "sync:tj:force" if force else "sync:tj"
        async for line in self.run_yarn_command(command):
            yield line

    async def install_deps(self) -> AsyncIterator[str]:
        """Install dependencies.

        Yields:
            Output lines.
        """
        async for line in stream_command("yarn", "install", cwd=self.repo_root):
            yield line

    async def check_port(self, port: int = 3000) -> bool:
        """Check if a port is in use.

        Args:
            port: Port number to check.

        Returns:
            True if port is in use.
        """
        try:
            if IS_WINDOWS:
                returncode, stdout, _ = await run_command(
                    "powershell", "-Command",
                    f"Get-NetTCPConnection -LocalPort {port} -ErrorAction SilentlyContinue",
                )
            else:
                returncode, stdout, _ = await run_command(
                    "lsof", "-i", f":{port}",
                )
            return bool(stdout.strip())
        except Exception:
            return False
