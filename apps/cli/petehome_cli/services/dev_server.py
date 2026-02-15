"""Development server management service."""

from collections.abc import AsyncIterator

from petehome_cli.config import REPO_ROOT
from petehome_cli.services.process import run_command, stream_command


class DevServerService:
    """Service for managing development servers and build tools."""

    def __init__(self) -> None:
        self.repo_root = str(REPO_ROOT)

    async def run_yarn_command(
        self,
        command: str,
        cwd: str | None = None,
    ) -> AsyncIterator[str]:
        """Run a yarn command and stream output."""
        work_dir = cwd or self.repo_root
        async for line in stream_command("yarn", command, cwd=work_dir):
            yield line

    async def run_simple_command(
        self,
        command: str,
        args: list[str] | None = None,
        cwd: str | None = None,
    ) -> tuple[bool, str]:
        """Run a command and return result."""
        work_dir = cwd or self.repo_root
        cmd_args = (command,) + tuple(args or [])
        returncode, stdout, stderr = await run_command(*cmd_args, cwd=work_dir)
        success = returncode == 0
        output = stdout if success else stderr
        return success, output

    async def lint(self, fix: bool = False) -> AsyncIterator[str]:
        """Run ESLint."""
        command = "lint:fix" if fix else "lint"
        async for line in self.run_yarn_command(command):
            yield line

    async def format_code(self, check_only: bool = False) -> AsyncIterator[str]:
        """Run Prettier."""
        command = "format:check" if check_only else "format"
        async for line in self.run_yarn_command(command):
            yield line

    async def type_check(self) -> AsyncIterator[str]:
        """Run TypeScript type checking."""
        async for line in self.run_yarn_command("type-check"):
            yield line

    async def build(self) -> AsyncIterator[str]:
        """Build the web app."""
        async for line in self.run_yarn_command("build"):
            yield line

    async def clean(self) -> tuple[bool, str]:
        """Clean build artifacts."""
        return await self.run_simple_command("yarn", ["clean"])

    async def sync_once(self) -> AsyncIterator[str]:
        """Run sync worker once."""
        async for line in self.run_yarn_command("sync"):
            yield line
