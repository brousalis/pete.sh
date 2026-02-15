"""Dev commands: lint, format, build, clean, typecheck, sync.

Handlers write output to a RichLog widget.
"""

from rich.markup import escape
from textual.widgets import RichLog

from petehome_cli.services.dev_server import DevServerService


async def cmd_lint(args: list[str], output: RichLog) -> None:
    """Run ESLint."""
    fix = "fix" in args
    dev = DevServerService()
    output.write(f"[dim]Running lint{'--fix' if fix else ''}...[/]")

    try:
        async for line in dev.lint(fix=fix):
            if line.strip():
                output.write(escape(line))
        output.write("[green]✓[/] Lint complete")
    except Exception as e:
        output.write(f"[red]✗[/] {e}")


async def cmd_format(_args: list[str], output: RichLog) -> None:
    """Run Prettier."""
    dev = DevServerService()
    output.write("[dim]Running prettier...[/]")

    try:
        async for line in dev.format_code():
            if line.strip():
                output.write(escape(line))
        output.write("[green]✓[/] Format complete")
    except Exception as e:
        output.write(f"[red]✗[/] {e}")


async def cmd_build(_args: list[str], output: RichLog) -> None:
    """Build the web app."""
    dev = DevServerService()
    output.write("[dim]Building...[/]")

    try:
        async for line in dev.build():
            if line.strip():
                if "error" in line.lower():
                    output.write(f"[red]{escape(line)}[/]")
                elif "warn" in line.lower():
                    output.write(f"[yellow]{escape(line)}[/]")
                elif any(kw in line.lower() for kw in ("success", "compiled", "done")):
                    output.write(f"[green]{escape(line)}[/]")
                else:
                    output.write(escape(line))
        output.write("[green]✓[/] Build complete")
    except Exception as e:
        output.write(f"[red]✗[/] {e}")


async def cmd_clean(_args: list[str], output: RichLog) -> None:
    """Clean build artifacts."""
    dev = DevServerService()
    ok, _ = await dev.clean()
    if ok:
        output.write("[green]✓[/] Cleaned")
    else:
        output.write("[red]✗[/] Failed to clean")


async def cmd_typecheck(_args: list[str], output: RichLog) -> None:
    """Run TypeScript type checking."""
    dev = DevServerService()
    output.write("[dim]Type checking...[/]")

    try:
        async for line in dev.type_check():
            if line.strip():
                if "error" in line.lower():
                    output.write(f"[red]{escape(line)}[/]")
                else:
                    output.write(escape(line))
        output.write("[green]✓[/] Type check complete")
    except Exception as e:
        output.write(f"[red]✗[/] {e}")


async def cmd_sync(_args: list[str], output: RichLog) -> None:
    """Run sync worker."""
    dev = DevServerService()
    output.write("[dim]Syncing data...[/]")

    try:
        async for line in dev.sync_once():
            if line.strip():
                output.write(escape(line))
        output.write("[green]✓[/] Sync complete")
    except Exception as e:
        output.write(f"[red]✗[/] {e}")


def register(registry: dict) -> None:
    """Register dev commands into the command registry."""
    registry["lint"] = cmd_lint
    registry["format"] = cmd_format
    registry["build"] = cmd_build
    registry["clean"] = cmd_clean
    registry["typecheck"] = cmd_typecheck
    registry["tsc"] = cmd_typecheck
    registry["sync"] = cmd_sync
