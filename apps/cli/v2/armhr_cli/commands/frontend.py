"""Frontend commands -- wraps the armhr-frontend package.json scripts.

All commands run in FRONTEND_ROOT via `yarn <script>`.
Handlers write output to a RichLog widget.
"""

from rich.markup import escape
from textual.widgets import RichLog

from armhr_cli.config import FRONTEND_APPS, FRONTEND_ROOT
from armhr_cli.services.process import stream_command


async def _stream_yarn(script: str, label: str, output: RichLog):
    """Run a yarn script and stream output to the RichLog."""
    output.write(f"[dim]Running yarn {script}...[/]")
    try:
        async for line in stream_command("yarn", script, cwd=FRONTEND_ROOT):
            if line.strip():
                output.write(_colorize(line))
        output.write(f"[green]✓[/] {label} complete")
    except Exception as e:
        output.write(f"[red]✗[/] {e}")


def _colorize(line: str) -> str:
    lower = line.lower()
    escaped = escape(line)
    if "error" in lower:
        return f"[red]{escaped}[/]"
    if "warn" in lower:
        return f"[yellow]{escaped}[/]"
    if any(kw in lower for kw in ("success", "compiled", "done", "passed", "ready")):
        return f"[green]{escaped}[/]"
    return escaped


def _resolve_app_script(base: str, app: str | None) -> str:
    if app and app in FRONTEND_APPS:
        return f"{base}:{app}"
    return base


# ---------------------------------------------------------------------------
# Handlers
# ---------------------------------------------------------------------------


async def cmd_fe(args: list[str], output: RichLog):
    if not args:
        output.write("[yellow]![/] Usage: fe <command> [app]")
        output.write(
            f"[dim]Commands: start, build, lint, test, watch, tsc, prettier, setup. Apps: {', '.join(FRONTEND_APPS)}[/]"
        )
        return
    subcmd = args[0].lower()
    subargs = args[1:]
    handler = _SUBCOMMANDS.get(subcmd)
    if handler:
        await handler(subargs, output)
    else:
        output.write(f"[red]✗[/] Unknown frontend command: {subcmd}")


async def _start(args: list[str], o: RichLog):
    app = args[0].lower() if args else None
    script = _resolve_app_script("start", app)
    await _stream_yarn(script, f"frontend dev server ({app or 'all'})", o)


async def _build(args: list[str], o: RichLog):
    app = None
    variant = None
    for arg in args:
        lower = arg.lower().lstrip("-")
        if lower in FRONTEND_APPS:
            app = lower
        elif lower in ("staging", "sourcemap", "analyze"):
            variant = lower
    script = _resolve_app_script("build", app)
    if variant:
        script = f"{script}:{variant}"
    await _stream_yarn(script, f"frontend build ({app or 'all'}{f' {variant}' if variant else ''})", o)


async def _lint(args: list[str], o: RichLog):
    app = args[0].lower() if args and args[0].lower() in FRONTEND_APPS else None
    script = _resolve_app_script("lint", app)
    await _stream_yarn(script, f"frontend lint ({app or 'all'})", o)


async def _lint_ci(_a, o: RichLog):
    await _stream_yarn("lint:ci", "frontend lint (CI)", o)


async def _test(args: list[str], o: RichLog):
    app = args[0].lower() if args and args[0].lower() in FRONTEND_APPS else None
    script = _resolve_app_script("test", app)
    await _stream_yarn(script, f"frontend test ({app or 'all'})", o)


async def _watch(args: list[str], o: RichLog):
    app = args[0].lower() if args and args[0].lower() in FRONTEND_APPS else None
    if not app:
        o.write("[yellow]![/] Usage: fe watch <hcm|marketing|quote>")
        return
    await _stream_yarn(f"watch:{app}", f"frontend test:watch ({app})", o)


async def _tsc(_a, o: RichLog):
    await _stream_yarn("tsc", "frontend type check", o)


async def _prettier(_a, o: RichLog):
    await _stream_yarn("prettier", "frontend prettier", o)


async def _setup(_a, o: RichLog):
    o.write("[dim]Running frontend setup...[/]")
    try:
        async for line in stream_command("./setup.sh", cwd=FRONTEND_ROOT):
            if line.strip():
                o.write(escape(line))
        o.write("[green]✓[/] setup complete")
    except Exception as e:
        o.write(f"[red]✗[/] {e}")


async def _install(_a, o: RichLog):
    o.write("[dim]Running yarn install...[/]")
    try:
        async for line in stream_command("yarn", "install", cwd=FRONTEND_ROOT):
            if line.strip():
                o.write(escape(line))
        o.write("[green]✓[/] install complete")
    except Exception as e:
        o.write(f"[red]✗[/] {e}")


# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------

_SUBCOMMANDS: dict = {
    "start": _start,
    "build": _build,
    "lint": _lint,
    "lint:ci": _lint_ci,
    "test": _test,
    "watch": _watch,
    "tsc": _tsc,
    "prettier": _prettier,
    "format": _prettier,
    "setup": _setup,
    "install": _install,
}


def register(registry: dict):
    registry["fe"] = cmd_fe
    registry["frontend"] = cmd_fe
