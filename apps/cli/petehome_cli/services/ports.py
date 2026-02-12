"""Port scanning and process cleanup utilities.

Scans monitored port ranges for listening processes and provides
kill functionality for orphaned dev servers.
"""

import asyncio
import os
import signal
import sys
from dataclasses import dataclass


@dataclass
class PortInfo:
    """A process listening on a monitored port."""

    service: str
    group: str
    port: int
    pid: int
    command: str


def _build_port_lookup(monitored_ports: dict) -> dict[int, tuple[str, str]]:
    """Build a port -> (service, group) lookup from MONITORED_PORTS config."""
    lookup: dict[int, tuple[str, str]] = {}
    for service, meta in monitored_ports.items():
        base = int(meta["base"])
        rng = int(meta["range"])
        group = str(meta["group"])
        for offset in range(rng):
            lookup[base + offset] = (service, group)
    return lookup


async def scan_ports(monitored_ports: dict) -> list[PortInfo]:
    """Scan all monitored port ranges for listening processes.

    Uses platform-appropriate tools: netstat on Windows,
    ss on Linux, lsof on macOS.
    """
    lookup = _build_port_lookup(monitored_ports)
    results: list[PortInfo] = []

    if sys.platform == "win32":
        parsed = await _scan_with_netstat(lookup)
    else:
        parsed = await _scan_with_ss(lookup)
        if parsed is None:
            parsed = await _scan_with_lsof(lookup)

    if parsed:
        results.extend(parsed)

    results.sort(key=lambda p: (p.group, p.port))
    return results


async def _scan_with_netstat(
    lookup: dict[int, tuple[str, str]],
) -> list[PortInfo] | None:
    """Parse netstat output on Windows for monitored ports."""
    try:
        proc = await asyncio.create_subprocess_shell(
            "netstat -ano -p TCP",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        if proc.returncode != 0:
            return None
    except Exception:
        return None

    results: list[PortInfo] = []
    seen: set[tuple[int, int]] = set()

    for line in stdout.decode("utf-8", errors="replace").splitlines():
        if "LISTENING" not in line:
            continue
        parts = line.split()
        if len(parts) < 5:
            continue

        local_addr = parts[1]
        port_str = local_addr.rsplit(":", 1)[-1]
        try:
            port = int(port_str)
        except ValueError:
            continue

        if port not in lookup:
            continue

        try:
            pid = int(parts[4])
        except ValueError:
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
                command="unknown",
            )
        )

    return results


async def _scan_with_ss(
    lookup: dict[int, tuple[str, str]],
) -> list[PortInfo] | None:
    """Parse ss -tlnp output for monitored ports (Linux)."""
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
        parts = line.split()
        if len(parts) < 5:
            continue

        local_addr = parts[3]
        port_str = local_addr.rsplit(":", 1)[-1]
        try:
            port = int(port_str)
        except ValueError:
            continue

        if port not in lookup:
            continue

        pid = 0
        command = ""
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
    """Parse lsof output for monitored ports (macOS)."""
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
    seen: set[tuple[int, int]] = set()

    for line in stdout.decode("utf-8", errors="replace").splitlines():
        parts = line.split()
        if len(parts) < 9:
            continue

        command = parts[0]
        try:
            pid = int(parts[1])
        except ValueError:
            continue

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
    """Kill a process by PID. Returns (success, message)."""
    try:
        os.kill(pid, 0)
    except OSError:
        return False, f"Process {pid} not found"

    if sys.platform == "win32":
        # Use taskkill on Windows
        proc = await asyncio.create_subprocess_shell(
            f"taskkill /F /PID {pid}",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        await proc.communicate()
        await asyncio.sleep(0.3)
        try:
            os.kill(pid, 0)
            return False, f"Process {pid} did not exit"
        except OSError:
            return True, f"Killed process {pid}"
    else:
        # SIGTERM then SIGKILL on Unix
        try:
            os.kill(pid, signal.SIGTERM)
        except OSError as e:
            return False, f"Failed to signal {pid}: {e}"

        for _ in range(30):
            await asyncio.sleep(0.1)
            try:
                os.kill(pid, 0)
            except OSError:
                return True, f"Killed process {pid}"

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
