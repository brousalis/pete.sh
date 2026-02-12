"""Server lifecycle management: up, down, status.

Servers are launched via a shell wrapper that double-forks so the actual
server process is reparented to init/PID 1. This ensures zero parent-child
relationship between the CLI and the server — no SIGCHLD, no zombie reaping,
no event-loop interference. PIDs are tracked via pidfiles.
"""

import os
import shlex
import signal
import subprocess
import time
from pathlib import Path

from rich.table import Table
from textual.widgets import RichLog

from armhr_cli.config import FRONTEND_APPS, MANAGED_SERVERS

STATE_DIR = Path.home() / ".armhr"
LOG_DIR = STATE_DIR / "logs"
PID_DIR = STATE_DIR / "pids"


def _get_descendants(pid: int) -> list[int]:
    """Return all descendant PIDs of *pid* (children, grandchildren, ...)."""
    descendants: list[int] = []
    try:
        result = subprocess.run(
            ["pgrep", "-P", str(pid)],
            capture_output=True,
            text=True,
        )
        for line in result.stdout.strip().splitlines():
            if line.strip():
                child = int(line.strip())
                descendants.append(child)
                descendants.extend(_get_descendants(child))
    except Exception:
        pass
    return descendants


class ManagedProcess:
    """A fully detached server process tracked by pidfile."""

    def __init__(
        self,
        key: str,
        name: str,
        cmd: list[str],
        cwd: Path,
        env: dict[str, str],
    ):
        self.key = key
        self.name = name
        self.cmd = cmd
        self.cwd = cwd
        self.env = env
        self.started_at: float = 0.0
        self.log_file: Path = LOG_DIR / f"{key.replace(':', '-')}.log"
        self._pid_file: Path = PID_DIR / f"{key.replace(':', '-')}.pid"

    @property
    def pid(self) -> int | None:
        """Read the PID from the pidfile."""
        try:
            return int(self._pid_file.read_text().strip())
        except (FileNotFoundError, ValueError):
            return None

    @property
    def is_running(self) -> bool:
        pid = self.pid
        if pid is None:
            return False
        try:
            os.kill(pid, 0)
            return True
        except OSError:
            return False

    @property
    def uptime(self) -> str:
        if not self.is_running or self.started_at == 0:
            return "-"
        elapsed = time.time() - self.started_at
        if elapsed < 60:
            return f"{elapsed:.0f}s"
        if elapsed < 3600:
            return f"{elapsed / 60:.0f}m"
        return f"{elapsed / 3600:.1f}h"

    def start(self) -> tuple[bool, str]:
        """Launch the server fully detached via double-fork shell wrapper."""
        if self.is_running:
            return True, f"{self.name} already running (pid {self.pid})"

        LOG_DIR.mkdir(parents=True, exist_ok=True)
        PID_DIR.mkdir(parents=True, exist_ok=True)

        # Clear old log so the panel starts fresh
        from armhr_cli.services.settings import get_pref

        if get_pref("clear_logs_on_start") and self.log_file.exists():
            self.log_file.write_text("")

        # Build environment exports for the wrapper
        env_exports = ""
        merged_env = {**self.env, "PYTHONUNBUFFERED": "1"}
        for k, v in merged_env.items():
            env_exports += f"export {k}={shlex.quote(v)}; "

        # Shell command that:
        # 1. cd to the right directory
        # 2. set env vars
        # 3. launch in a subshell with & (background)
        # 4. write $! (child PID) to pidfile
        # 5. exit immediately — the server is reparented to init
        cmd_str = " ".join(shlex.quote(str(a)) for a in self.cmd)
        log_path = shlex.quote(str(self.log_file))
        pid_path = shlex.quote(str(self._pid_file))
        cwd_path = shlex.quote(str(self.cwd))

        wrapper = f"cd {cwd_path} && {env_exports}nohup {cmd_str} >> {log_path} 2>&1 & echo $! > {pid_path}"

        try:
            # Run the wrapper — it exits immediately after backgrounding
            result = subprocess.run(
                ["bash", "-c", wrapper],
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
                timeout=10,
            )
            if result.returncode != 0:
                err = result.stderr.decode().strip()
                return False, f"Failed to start {self.name}: {err}"

            self.started_at = time.time()
            # Brief pause to let pidfile be written
            time.sleep(0.1)
            pid = self.pid
            return True, f"Started {self.name} (pid {pid}) · cwd: {self.cwd}"
        except Exception as e:
            return False, f"Failed to start {self.name}: {e}"

    def stop(self) -> tuple[bool, str]:
        """Stop the server by killing its entire process tree.

        Recursively collects all descendant PIDs *before* sending any
        signals — once the root dies its children are re-parented to
        init and we can no longer discover them via ppid.
        """
        pid = self.pid
        if pid is None or not self.is_running:
            return True, f"{self.name} not running"

        # Snapshot the full process tree before sending any signals.
        tree_pids = _get_descendants(pid) + [pid]

        # Graceful: SIGTERM the whole tree
        for p in tree_pids:
            try:
                os.kill(p, signal.SIGTERM)
            except (ProcessLookupError, OSError):
                pass

        # Wait up to 3 seconds for clean exit
        for _ in range(30):
            if not self.is_running:
                break
            time.sleep(0.1)
        else:
            # Force kill any survivors
            for p in tree_pids:
                try:
                    os.kill(p, signal.SIGKILL)
                except (ProcessLookupError, OSError):
                    pass

        # Clean up pidfile
        try:
            self._pid_file.unlink(missing_ok=True)
        except OSError:
            pass

        return True, f"Stopped {self.name}"


# ---------------------------------------------------------------------------
# Global registry
# ---------------------------------------------------------------------------

_processes: dict[str, ManagedProcess] = {}


def _get_or_create(key: str, fe_app: str | None = None) -> ManagedProcess:
    effective_key = f"{key}:{fe_app}" if key == "fe" and fe_app else key
    if effective_key in _processes:
        return _processes[effective_key]

    server_def = MANAGED_SERVERS[key]
    cmd = list(server_def["cmd"])
    if key == "fe" and fe_app:
        cmd = ["yarn", f"start:{fe_app}"]

    mp = ManagedProcess(
        key=effective_key,
        name=server_def["name"] + (f":{fe_app}" if fe_app else ""),
        cmd=cmd,
        cwd=Path(server_def["cwd"]),
        env=dict(server_def.get("env", {})),
    )
    _processes[effective_key] = mp
    return mp


def _resolve_target(args: list[str]) -> list[tuple[str, str | None]]:
    if not args:
        return [("be", None), ("fe", None)]
    target = args[0].lower()
    if target not in ("be", "fe", "backend", "frontend"):
        return []
    key = "be" if target in ("be", "backend") else "fe"
    fe_app = None
    if key == "fe" and len(args) > 1 and args[1].lower() in FRONTEND_APPS:
        fe_app = args[1].lower()
    return [(key, fe_app)]


# ---------------------------------------------------------------------------
# Command handlers (write to RichLog)
# ---------------------------------------------------------------------------


async def cmd_up(args: list[str], output: RichLog):
    targets = _resolve_target(args)
    if not targets:
        output.write("[red]✗[/] Unknown target. Options: be, fe")
        return
    for key, fe_app in targets:
        mp = _get_or_create(key, fe_app)
        ok, msg = mp.start()
        output.write(f"[green]✓[/] {msg}" if ok else f"[red]✗[/] {msg}")


async def cmd_down(args: list[str], output: RichLog):
    targets = _resolve_target(args)
    if not targets:
        output.write("[red]✗[/] Unknown target. Options: be, fe")
        return
    for key, fe_app in targets:
        effective_key = f"{key}:{fe_app}" if key == "fe" and fe_app else key
        mp = _processes.get(effective_key)
        if not mp or not mp.is_running:
            name = f"{key}" + (f":{fe_app}" if fe_app else "")
            output.write(f"[dim]{name} not running[/]")
            continue
        ok, msg = mp.stop()
        output.write(f"[green]✓[/] {msg}" if ok else f"[red]✗[/] {msg}")


async def cmd_status(_args: list[str], output: RichLog):
    if not _processes:
        output.write("[dim]No servers managed yet. Use 'up' to start.[/]")
        return

    table = Table(
        show_header=True,
        header_style="bold dim",
        box=None,
        padding=(0, 2),
        expand=False,
    )
    table.add_column("Server")
    table.add_column("Status")
    table.add_column("PID", justify="right")
    table.add_column("Uptime", justify="right")

    for mp in _processes.values():
        status_display = "[green]● running[/]" if mp.is_running else "[red]○ stopped[/]"
        table.add_row(
            f"[bold]{mp.name}[/]",
            status_display,
            f"[dim]{mp.pid or '-'}[/]",
            f"[dim]{mp.uptime}[/]",
        )
    output.write(table)


def stop_all():
    """Stop all managed processes. Called on CLI exit (synchronous)."""
    for mp in _processes.values():
        if mp.is_running:
            mp.stop()


def register(registry: dict):
    registry["start"] = cmd_up
    registry["up"] = cmd_up
    registry["down"] = cmd_down
    registry["status"] = cmd_status
    registry["s"] = cmd_status
