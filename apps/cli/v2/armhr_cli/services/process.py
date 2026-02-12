"""Shared async subprocess utilities.

Single source for all command execution -- no duplication across services.
"""

import asyncio
import os
from collections.abc import AsyncIterator
from pathlib import Path


async def run_command(
    *args: str,
    cwd: str | Path | None = None,
    env: dict[str, str] | None = None,
) -> tuple[int, str, str]:
    """Run a command and return (exit_code, stdout, stderr).

    Args:
        args: Command and its arguments.
        cwd: Working directory.
        env: Extra environment variables (merged with os.environ).

    Returns:
        Tuple of (return_code, stdout_text, stderr_text).
    """
    run_env = None
    if env:
        run_env = {**os.environ, **env}

    proc = await asyncio.create_subprocess_exec(
        *args,
        cwd=str(cwd) if cwd else None,
        env=run_env,
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
    cwd: str | Path | None = None,
    env: dict[str, str] | None = None,
) -> AsyncIterator[str]:
    """Run a command and stream output lines (stdout + stderr merged).

    Args:
        args: Command and its arguments.
        cwd: Working directory.
        env: Extra environment variables (merged with os.environ).

    Yields:
        Output lines as they arrive, with trailing whitespace stripped.
    """
    run_env = None
    if env:
        run_env = {**os.environ, **env}

    proc = await asyncio.create_subprocess_exec(
        *args,
        cwd=str(cwd) if cwd else None,
        env=run_env,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    if proc.stdout:
        async for line in proc.stdout:
            yield line.decode("utf-8", errors="replace").rstrip()
    await proc.wait()


async def run_shell(
    cmd: str,
    cwd: str | Path | None = None,
    env: dict[str, str] | None = None,
) -> tuple[int, str, str]:
    """Run a shell command string and return (exit_code, stdout, stderr).

    Use this for commands that need shell features (pipes, &&, etc.).
    """
    run_env = None
    if env:
        run_env = {**os.environ, **env}

    proc = await asyncio.create_subprocess_shell(
        cmd,
        cwd=str(cwd) if cwd else None,
        env=run_env,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    return (
        proc.returncode or 0,
        stdout.decode("utf-8", errors="replace"),
        stderr.decode("utf-8", errors="replace"),
    )


async def stream_shell(
    cmd: str,
    cwd: str | Path | None = None,
    env: dict[str, str] | None = None,
) -> AsyncIterator[str]:
    """Run a shell command string and stream output lines."""
    run_env = None
    if env:
        run_env = {**os.environ, **env}

    proc = await asyncio.create_subprocess_shell(
        cmd,
        cwd=str(cwd) if cwd else None,
        env=run_env,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    if proc.stdout:
        async for line in proc.stdout:
            yield line.decode("utf-8", errors="replace").rstrip()
    await proc.wait()


async def exec_interactive(
    *args: str,
    cwd: str | Path | None = None,
    env: dict[str, str] | None = None,
) -> int:
    """Run a command with inherited stdio (for interactive tools like ptpython).

    Returns:
        The process exit code.
    """
    run_env = None
    if env:
        run_env = {**os.environ, **env}

    proc = await asyncio.create_subprocess_exec(
        *args,
        cwd=str(cwd) if cwd else None,
        env=run_env,
        stdin=None,  # inherit
        stdout=None,  # inherit
        stderr=None,  # inherit
    )
    await proc.wait()
    return proc.returncode or 0
