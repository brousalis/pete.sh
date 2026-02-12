"""Port scanning and process cleanup utilities.

Scans monitored port ranges for listening processes and provides
one-click kill functionality for orphaned dev servers.
"""

import asyncio
import os
import signal
from dataclasses import dataclass

from armhr_cli.config import MONITORED_PORTS


@dataclass
class PortInfo:
    """A process listening on a monitored port."""

    service: str  # e.g. "hcm", "backend"
    group: str  # "backend" or "frontend"
    port: int
    pid: int
    command: str  # truncated process command name


def _build_port_lookup() -> dict[int, tuple[str, str]]:
    """Build a port → (service, group) lookup from MONITORED_PORTS config."""
    lookup: dict[int, tuple[str, str]] = {}
    for service, meta in MONITORED_PORTS.items():
        base = int(meta["base"])  # type: ignore[arg-type]
        rng = int(meta["range"])  # type: ignore[arg-type]
        group = str(meta["group"])
        for offset in range(rng):
            lookup[base + offset] = (service, group)
    return lookup


async def scan_ports() -> list[PortInfo]:
    """Scan all monitored port ranges for listening processes.

    Tries ``ss -tlnp`` first (Linux), falls back to
    ``lsof -iTCP -sTCP:LISTEN -n -P`` (macOS / fallback).

    Returns a list of :class:`PortInfo` for every monitored port
    that has an active listener, sorted by group then port.
    """
    lookup = _build_port_lookup()
    results: list[PortInfo] = []

    # Try ss first (available on most Linux systems)
    parsed = await _scan_with_ss(lookup)
    if parsed is None:
        # Fallback to lsof
        parsed = await _scan_with_lsof(lookup)

    if parsed:
        results.extend(parsed)

    # Sort: backend group first, then by port
    results.sort(key=lambda p: (0 if p.group == "backend" else 1, p.port))
    return results


async def _scan_with_ss(
    lookup: dict[int, tuple[str, str]],
) -> list[PortInfo] | None:
    """Parse ``ss -tlnp`` output for monitored ports."""
    try:
        proc = await asyncio.create_subprocess_shell(
            "ss -tlnp",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        if proc.returncode != 0:
            return None
    except Exception:
        return None

    results: list[PortInfo] = []
    for line in stdout.decode("utf-8", errors="replace").splitlines():
        if "LISTEN" not in line:
            continue
        # ss output format:
        # LISTEN  0  511  *:3200  *:*  users:(("node",pid=12345,fd=20))
        parts = line.split()
        if len(parts) < 5:
            continue

        # Extract port from local address (4th column, e.g. "*:3200" or "0.0.0.0:3200")
        local_addr = parts[3]
        port_str = local_addr.rsplit(":", 1)[-1]
        try:
            port = int(port_str)
        except ValueError:
            continue

        if port not in lookup:
            continue

        # Extract PID and command from users field
        pid = 0
        command = ""
        # Look for users:(...) in the remaining fields
        for part in parts[4:]:
            if "pid=" in part:
                try:
                    pid_segment = part.split("pid=")[1]
                    pid = int(pid_segment.split(",")[0].split(")")[0])
                except (IndexError, ValueError):
                    pass
            if '("' in part:
                try:
                    command = part.split('("')[1].split('"')[0]
                except IndexError:
                    pass

        if pid == 0:
            continue

        service, group = lookup[port]
        results.append(
            PortInfo(
                service=service,
                group=group,
                port=port,
                pid=pid,
                command=command[:30] if command else "unknown",
            )
        )

    return results


async def _scan_with_lsof(
    lookup: dict[int, tuple[str, str]],
) -> list[PortInfo] | None:
    """Parse ``lsof -iTCP -sTCP:LISTEN -n -P`` output for monitored ports."""
    try:
        proc = await asyncio.create_subprocess_shell(
            "lsof -iTCP -sTCP:LISTEN -n -P 2>/dev/null",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        if proc.returncode != 0:
            return None
    except Exception:
        return None

    results: list[PortInfo] = []
    seen: set[tuple[int, int]] = set()  # (port, pid) dedup

    for line in stdout.decode("utf-8", errors="replace").splitlines():
        # lsof output:
        # COMMAND  PID  USER  FD  TYPE  DEVICE  SIZE/OFF  NODE  NAME
        # node    1234  pete  20u  IPv4  ...     0t0       TCP  *:3200 (LISTEN)
        parts = line.split()
        if len(parts) < 9:
            continue

        command = parts[0]
        try:
            pid = int(parts[1])
        except ValueError:
            continue

        # NAME field contains address:port
        name_field = parts[8]
        port_str = name_field.rsplit(":", 1)[-1]
        try:
            port = int(port_str)
        except ValueError:
            continue

        if port not in lookup:
            continue

        key = (port, pid)
        if key in seen:
            continue
        seen.add(key)

        service, group = lookup[port]
        results.append(
            PortInfo(
                service=service,
                group=group,
                port=port,
                pid=pid,
                command=command[:30],
            )
        )

    return results


async def kill_port(pid: int) -> tuple[bool, str]:
    """Kill a process by PID. Sends SIGTERM, escalates to SIGKILL if needed.

    Returns (success, message).
    """
    # Verify the process exists first
    try:
        os.kill(pid, 0)
    except OSError:
        return False, f"Process {pid} not found"

    # Send SIGTERM
    try:
        os.kill(pid, signal.SIGTERM)
    except OSError as e:
        return False, f"Failed to signal {pid}: {e}"

    # Wait up to 3 seconds for graceful exit
    for _ in range(30):
        await asyncio.sleep(0.1)
        try:
            os.kill(pid, 0)
        except OSError:
            return True, f"Killed process {pid}"

    # Escalate to SIGKILL
    try:
        os.kill(pid, signal.SIGKILL)
    except OSError:
        pass

    await asyncio.sleep(0.2)
    try:
        os.kill(pid, 0)
        return False, f"Process {pid} did not exit"
    except OSError:
        return True, f"Force-killed process {pid}"
