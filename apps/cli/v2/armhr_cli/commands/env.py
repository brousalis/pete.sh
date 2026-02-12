"""Environment preset commands: env, env <group> <preset>, env init, env backup."""

from rich.table import Table
from textual.widgets import RichLog

from armhr_cli.commands import servers
from armhr_cli.config import GROUP_PREFIXES, PRESETS_FILE
from armhr_cli.services.envfile import (
    backup_env,
    identify_active_preset,
    list_presets,
    seed_presets_from_env,
    swap_group,
)


async def cmd_env(args: list[str], output: RichLog) -> None:
    """Dispatch env sub-commands."""
    if not args:
        await _show_status(output)
        return

    sub = args[0].lower()

    if sub == "init":
        await _init(output)
        return

    if sub == "backup":
        await _backup(output)
        return

    # env <group> <preset>
    if len(args) >= 2:
        group = sub
        preset_name = args[1].lower()
        await _swap(group, preset_name, output)
        return

    # Single arg that's a group name → show that group's status
    if sub in GROUP_PREFIXES:
        await _show_status(output, group_filter=sub)
        return

    output.write(f"[red]✗[/] Unknown env sub-command: {sub}")
    output.write("[dim]Usage: env, env <group> <preset>, env init, env backup[/]")


# ---------------------------------------------------------------------------
# Sub-command implementations
# ---------------------------------------------------------------------------


async def _show_status(output: RichLog, group_filter: str | None = None) -> None:
    """Show which preset is active for each group."""
    if not PRESETS_FILE.exists():
        output.write("[yellow]No presets file found.[/] Run [bold]env init[/] to create one.")
        return

    table = Table(show_header=False, box=None, padding=(0, 2))
    table.add_column("Group", style="bold cyan")
    table.add_column("Preset", style="bold")
    table.add_column("Info", style="dim")

    groups = [group_filter] if group_filter else sorted(GROUP_PREFIXES.keys())
    for group in groups:
        preset_name, rep = identify_active_preset(group)
        style = "green" if preset_name != "custom" else "yellow"
        table.add_row(group, f"[{style}]{preset_name}[/]", rep or "")

    output.write(table)

    # Also show available presets
    all_presets = list_presets()
    if all_presets:
        parts: list[str] = []
        for group in groups:
            names = all_presets.get(group, [])
            if names:
                parts.append(f"  {group}: {', '.join(names)}")
        if parts:
            output.write("[dim]Available presets:[/]")
            for p in parts:
                output.write(f"[dim]{p}[/]")


async def _swap(group: str, preset_name: str, output: RichLog) -> None:
    """Swap a group to a preset and restart running servers."""
    ok, msg = swap_group(group, preset_name)
    if not ok:
        output.write(f"[red]✗[/] {msg}")
        return

    output.write(f"[green]✓[/] {msg}")

    # Restart running backend servers so they pick up the new env
    # (frontend doesn't read .env, so skip it)
    restarted: list[str] = []
    for proc_key, mp in servers._processes.items():
        if not mp.is_running or not proc_key.startswith("be:"):
            continue

        # Write a separator to the log file before restarting
        if mp.log_file.exists():
            with open(mp.log_file, "a") as f:
                f.write(f"\n--- env {group} → {preset_name} · restarting ---\n\n")

        ok_stop, stop_msg = mp.stop()
        if ok_stop:
            ok_start, start_msg = mp.start()
            if ok_start:
                restarted.append(f"{mp.name} (pid {mp.pid})")
                output.write(f"[green]✓[/] Restarted {start_msg}")
            else:
                output.write(f"[red]✗[/] Failed to restart {mp.name}: {start_msg}")
        else:
            output.write(f"[red]✗[/] Failed to stop {mp.name}: {stop_msg}")

    if not restarted:
        output.write("[dim]No backend servers were running — start with 'start' to apply.[/]")


async def _swap_all(mapping: dict[str, str], output: RichLog) -> None:
    """Swap every group according to *mapping* and restart BE servers once.

    *mapping* is ``{group: preset_name}`` — typically from a full preset.
    All groups are swapped first (so only one backup + one restart cycle).
    """
    # 1. Swap each group (swap_group backs up on each call, which is fine)
    any_failed = False
    for group, preset_name in mapping.items():
        ok, msg = swap_group(group, preset_name)
        if ok:
            output.write(f"[green]✓[/] {msg}")
        else:
            output.write(f"[red]✗[/] {msg}")
            any_failed = True

    if any_failed:
        return

    # 2. Restart running backend servers once
    label = ", ".join(f"{g}→{p}" for g, p in mapping.items())
    restarted: list[str] = []
    for proc_key, mp in servers._processes.items():
        if not mp.is_running or not proc_key.startswith("be:"):
            continue

        if mp.log_file.exists():
            with open(mp.log_file, "a") as f:
                f.write(f"\n--- env full swap ({label}) · restarting ---\n\n")

        ok_stop, stop_msg = mp.stop()
        if ok_stop:
            ok_start, start_msg = mp.start()
            if ok_start:
                restarted.append(f"{mp.name} (pid {mp.pid})")
                output.write(f"[green]✓[/] Restarted {start_msg}")
            else:
                output.write(f"[red]✗[/] Failed to restart {mp.name}: {start_msg}")
        else:
            output.write(f"[red]✗[/] Failed to stop {mp.name}: {stop_msg}")

    if not restarted:
        output.write("[dim]No backend servers were running — start with 'start' to apply.[/]")


async def _init(output: RichLog) -> None:
    """Seed presets.toml from .env commented blocks."""
    ok, msg = seed_presets_from_env()
    if ok:
        output.write(f"[green]✓[/] {msg}")
        output.write("[dim]Edit ~/.armhr/presets.toml to customize presets.[/]")
    else:
        output.write(f"[red]✗[/] {msg}")


async def _backup(output: RichLog) -> None:
    """Manually back up the current .env."""
    try:
        path = backup_env()
        output.write(f"[green]✓[/] Backed up .env → {path.name}")
    except Exception as e:
        output.write(f"[red]✗[/] Backup failed: {e}")


def register(registry: dict) -> None:
    registry["env"] = cmd_env
