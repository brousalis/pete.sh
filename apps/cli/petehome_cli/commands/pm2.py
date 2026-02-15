"""PM2 commands: start, stop, restart, status, logs.

Handlers write output to a RichLog widget.
"""

import shutil

from rich.table import Table
from textual.widgets import RichLog

from petehome_cli.config import PM2_PROCESSES, WEB_APP_PATH
from petehome_cli.services.pm2 import PM2Service

_NEXT_CACHE = WEB_APP_PATH / ".next"


def _clear_next_cache(output: RichLog) -> None:
    """Delete .next cache so NEXT_PUBLIC_* env changes take effect."""
    if _NEXT_CACHE.exists():
        shutil.rmtree(_NEXT_CACHE, ignore_errors=True)
        output.write("[dim]Cleared .next cache[/]")


def _resolve_service_name(name: str) -> str | None:
    """Resolve short name to PM2 process name."""
    name = name.lower().strip()
    if name in PM2_PROCESSES:
        return PM2_PROCESSES[name]
    for full_name in PM2_PROCESSES.values():
        if name == full_name:
            return full_name
    return None


async def cmd_status(_args: list[str], output: RichLog) -> None:
    """Show PM2 process status."""
    processes = await PM2Service.get_status()

    if not processes:
        output.write("[yellow]![/] No PM2 processes running")
        return

    table = Table(
        show_header=True,
        header_style="bold dim",
        box=None,
        padding=(0, 2),
        expand=False,
    )
    table.add_column("Service")
    table.add_column("Status")
    table.add_column("PID", justify="right")
    table.add_column("Uptime", justify="right")
    table.add_column("CPU", justify="right")
    table.add_column("Memory", justify="right")
    table.add_column("Restarts", justify="right")

    for p in processes:
        status_display = {
            "online": "[green]● online[/]",
            "stopped": "[red]○ stopped[/]",
            "errored": "[red]✗ errored[/]",
            "launching": "[yellow]◐ launching[/]",
        }.get(p.status, f"[yellow]◐ {p.status}[/]")

        table.add_row(
            f"[bold]{p.name}[/]",
            status_display,
            f"[dim]{p.pid or '-'}[/]",
            f"[dim]{p.uptime_str}[/]",
            f"[dim]{p.cpu:.0f}%[/]" if p.cpu > 0 else "[dim]-[/]",
            f"[dim]{p.memory_mb:.0f}MB[/]" if p.memory_mb > 0 else "[dim]-[/]",
            f"[dim]{p.restarts}[/]" if p.restarts > 0 else "[dim]-[/]",
        )

    output.write(table)


async def cmd_start(args: list[str], output: RichLog) -> None:
    """Start a PM2 service."""
    if not args:
        output.write("[yellow]![/] Usage: start <main|notifications|all>")
        return

    _clear_next_cache(output)
    target = args[0].lower()

    if target == "all":
        for _short, name in PM2_PROCESSES.items():
            ok, _ = await PM2Service.start(name)
            if ok:
                output.write(f"[green]✓[/] Started {name}")
            else:
                output.write(f"[red]✗[/] Failed to start {name}")
        return

    name = _resolve_service_name(target)
    if not name:
        output.write(f"[red]✗[/] Unknown service: {target}")
        output.write("[dim]Options: main, notifications, all[/]")
        return

    ok, _ = await PM2Service.start(name)
    if ok:
        output.write(f"[green]✓[/] Started {name}")
    else:
        output.write(f"[red]✗[/] Failed to start {name}")


async def cmd_stop(args: list[str], output: RichLog) -> None:
    """Stop a PM2 service."""
    if not args:
        output.write("[yellow]![/] Usage: stop <main|notifications|all>")
        return

    target = args[0].lower()

    if target == "all":
        processes = await PM2Service.get_status()
        online = [p for p in processes if p.status == "online"]
        if not online:
            output.write("[dim]No services running[/]")
            return
        for p in online:
            ok, _ = await PM2Service.stop(p.name)
            if ok:
                output.write(f"[green]✓[/] Stopped {p.name}")
            else:
                output.write(f"[red]✗[/] Failed to stop {p.name}")
        return

    name = _resolve_service_name(target)
    if not name:
        output.write(f"[red]✗[/] Unknown service: {target}")
        return

    ok, _ = await PM2Service.stop(name)
    if ok:
        output.write(f"[green]✓[/] Stopped {name}")
    else:
        output.write(f"[red]✗[/] Failed to stop {name}")


async def cmd_restart(args: list[str], output: RichLog) -> None:
    """Restart a PM2 service."""
    if not args:
        output.write("[yellow]![/] Usage: restart <main|notifications|all>")
        return

    _clear_next_cache(output)
    target = args[0].lower()

    if target == "all":
        processes = await PM2Service.get_status()
        for p in processes:
            ok, _ = await PM2Service.restart(p.name)
            if ok:
                output.write(f"[green]✓[/] Restarted {p.name}")
            else:
                output.write(f"[red]✗[/] Failed to restart {p.name}")
        return

    name = _resolve_service_name(target)
    if not name:
        output.write(f"[red]✗[/] Unknown service: {target}")
        return

    ok, _ = await PM2Service.restart(name)
    if ok:
        output.write(f"[green]✓[/] Restarted {name}")
    else:
        output.write(f"[red]✗[/] Failed to restart {name}")


async def cmd_logs(args: list[str], output: RichLog) -> None:
    """Stream PM2 logs into the output panel."""
    target = args[0].lower() if args else "all"

    if target == "all":
        process_name = None
    else:
        process_name = _resolve_service_name(target)
        if not process_name:
            output.write(f"[red]✗[/] Unknown service: {target}")
            return

    output.write(f"[dim]Streaming{f' {process_name}' if process_name else ''} logs (last 30 lines)...[/]")

    count = 0
    async for line in PM2Service.stream_logs(process_name, lines=30):
        if count > 100:
            break
        if "error" in line.lower():
            output.write(f"[red]{line}[/]")
        elif "warn" in line.lower():
            output.write(f"[yellow]{line}[/]")
        elif any(kw in line.lower() for kw in ("ready", "success", "compiled")):
            output.write(f"[green]{line}[/]")
        else:
            output.write(line)
        count += 1


def register(registry: dict) -> None:
    """Register PM2 commands into the command registry."""
    registry["status"] = cmd_status
    registry["s"] = cmd_status
    registry["start"] = cmd_start
    registry["stop"] = cmd_stop
    registry["restart"] = cmd_restart
    registry["logs"] = cmd_logs
