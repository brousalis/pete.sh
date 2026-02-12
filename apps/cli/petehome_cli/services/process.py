"""Shared async subprocess utilities.

Single source for all command execution -- no duplication across services.
Handles Windows shell execution automatically.
"""

import asyncio
import os
import sys
from collections.abc import AsyncIterator
from pathlib import Path

IS_WINDOWS = sys.platform == "win32"


async def run_command(
    *args: str,
    cwd: str | Path | None = None,
    env: dict[str, str] | None = None,
) -> tuple[int, str, str]:
    """Run a command and return (exit_code, stdout, stderr).

    On Windows, uses shell execution for compatibility with .cmd files.
    """
    run_env = None
    if env:
        run_env = {**os.environ, **env}

    if IS_WINDOWS:
        cmd = " ".join(f'"{a}"' if " " in str(a) else str(a) for a in args)
        proc = await asyncio.create_subprocess_shell(
            cmd,
            cwd=str(cwd) if cwd else None,
            env=run_env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
    else:
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

    Yields output lines as they arrive, with trailing whitespace stripped.
    """
    run_env = None
    if env:
        run_env = {**os.environ, **env}

    if IS_WINDOWS:
        cmd = " ".join(f'"{a}"' if " " in str(a) else str(a) for a in args)
        proc = await asyncio.create_subprocess_shell(
            cmd,
            cwd=str(cwd) if cwd else None,
            env=run_env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
    else:
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
