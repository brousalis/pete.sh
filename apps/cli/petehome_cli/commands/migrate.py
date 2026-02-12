"""Migrate commands: Supabase migration management.

Handlers write output to a RichLog widget.
"""

from rich.table import Table
from textual.widgets import RichLog

from petehome_cli.services.supabase import (
    is_configured as supabase_configured,
)
from petehome_cli.services.supabase import (
    mark_applied as supabase_mark_applied,
)
from petehome_cli.services.supabase import (
    migration_status,
    run_migrations,
)


async def cmd_migrate(args: list[str], output: RichLog) -> None:
    """Handle migration commands."""
    dry_run = "dry-run" in args or "dry_run" in args
    subcmd = (args[0].lower() if args else "run").strip()
    if subcmd in ("dry-run", "dry_run"):
        subcmd = "run"

    if subcmd == "status":
        if not supabase_configured():
            output.write("[red]✗[/] SUPABASE_DB_URL not set")
            output.write("[dim]Set it in apps/web/.env (Postgres URI from Supabase dashboard)[/]")
            return

        ok, rows = migration_status()
        if not ok:
            output.write("[red]✗[/] Could not read migration status")
            return
        if not rows:
            output.write("[dim]No migration files found[/]")
            return

        table = Table(
            show_header=True,
            header_style="bold dim",
            box=None,
            padding=(0, 2),
        )
        table.add_column("Migration")
        table.add_column("Status")
        for r in rows:
            status = "[green]● applied[/]" if r["applied"] else "[yellow]○ pending[/]"
            table.add_row(r["name"], status)
        output.write(table)

    elif subcmd == "mark-applied":
        rest = [a for a in args[1:] if a not in ("dry-run", "dry_run")]
        if not rest:
            output.write("[yellow]![/] Usage: migrate mark-applied 001-014")
            return
        success, msg = supabase_mark_applied(rest)
        if success:
            output.write(f"[green]✓[/] {msg}")
        else:
            output.write(f"[red]✗[/] {msg}")

    elif subcmd in ("run", "up", "") or dry_run:
        success, msg = run_migrations(dry_run=dry_run)
        if success:
            output.write(f"[green]✓[/] {msg}")
        else:
            output.write(f"[red]✗[/] {msg}")

    else:
        output.write(f"[red]✗[/] Unknown: migrate {subcmd}")
        output.write("[dim]Use: migrate · migrate status · migrate mark-applied 001-014 · migrate dry-run[/]")


async def cmd_supabase(args: list[str], output: RichLog) -> None:
    """Supabase alias for migrate."""
    if not args:
        await cmd_migrate(["run"], output)
        return
    subcmd = args[0].lower()
    if subcmd == "migrate":
        await cmd_migrate(args[1:], output)
    elif subcmd == "status":
        await cmd_migrate(["status"], output)
    else:
        output.write(f"[red]✗[/] Unknown: supabase {subcmd}")


def register(registry: dict) -> None:
    """Register migration commands into the command registry."""
    registry["migrate"] = cmd_migrate
    registry["supabase"] = cmd_supabase
