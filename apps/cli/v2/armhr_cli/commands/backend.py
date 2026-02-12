"""Backend commands -- wraps the armhr-python Makefile targets.

All commands run in BACKEND_ROOT via `make <target>` or direct `uv run`.
Handlers write output to a RichLog widget.
"""

from rich.markup import escape
from textual.widgets import RichLog

from armhr_cli.config import BACKEND_ROOT, BACKEND_TEST_MODULES
from armhr_cli.services.process import stream_command


async def _stream_make(target: str, label: str, output: RichLog):
    """Run a make target and stream output to the RichLog."""
    output.write(f"[dim]Running {label}...[/]")
    try:
        async for line in stream_command("make", target, cwd=BACKEND_ROOT):
            if line.strip():
                output.write(_colorize(line))
        output.write(f"[green]✓[/] {label} complete")
    except Exception as e:
        output.write(f"[red]✗[/] {e}")


def _colorize(line: str) -> str:
    """Return a Rich-markup string with colorization applied."""
    lower = line.lower()
    escaped = escape(line)
    if "error" in lower:
        return f"[red]{escaped}[/]"
    if "warn" in lower:
        return f"[yellow]{escaped}[/]"
    if any(kw in lower for kw in ("success", "compiled", "done", "passed", "ok")):
        return f"[green]{escaped}[/]"
    return escaped


# ---------------------------------------------------------------------------
# Handlers
# ---------------------------------------------------------------------------


async def cmd_be(args: list[str], output: RichLog):
    if not args:
        output.write("[yellow]![/] Usage: be <command>")
        output.write(
            "[dim]Commands: serve, dev, worker, lint, test, migrate, rollback, sync, shell, sso, setup, run[/]"
        )
        return
    subcmd = args[0].lower()
    subargs = args[1:]
    handler = _SUBCOMMANDS.get(subcmd)
    if handler:
        await handler(subargs, output)
    else:
        output.write(f"[red]✗[/] Unknown backend command: {subcmd}")


async def _serve(_a, o: RichLog):
    await _stream_make("serve", "backend server", o)


async def _dev(_a, o: RichLog):
    await _stream_make("dev", "backend dev server", o)


async def _local(_a, o: RichLog):
    await _stream_make("local", "backend local server", o)


async def _worker(_a, o: RichLog):
    await _stream_make("worker", "procrastinate worker", o)


async def _subscriptions(_a, o: RichLog):
    await _stream_make("subscriptions", "subscriptions service", o)


async def _subscriptions_worker(_a, o: RichLog):
    await _stream_make("subscriptions-worker", "subscriptions worker", o)


async def _lint(_a, o: RichLog):
    await _stream_make("lint", "backend lint", o)


async def _test(args: list[str], o: RichLog):
    if args:
        module = args[0].lower()
        if module in BACKEND_TEST_MODULES:
            await _stream_make(f"test_{module}", f"pytest {module}", o)
        else:
            o.write(f"[dim]Running pytest {' '.join(args)}...[/]")
            try:
                cmd = ["uv", "run", "--env-file", ".env", "pytest", *args]
                async for line in stream_command(*cmd, cwd=BACKEND_ROOT):
                    if line.strip():
                        o.write(_colorize(line))
                o.write("[green]✓[/] tests complete")
            except Exception as e:
                o.write(f"[red]✗[/] {e}")
    else:
        await _stream_make("pytest", "pytest", o)


async def _migrate(_a, o: RichLog):
    await _stream_make("migrate", "database migrations", o)


async def _rollback(_a, o: RichLog):
    await _stream_make("rollback", "migration rollback", o)


async def _install(_a, o: RichLog):
    await _stream_make("install", "dependency install", o)


async def _sync(_a, o: RichLog):
    await _stream_make("sync", "dependency sync", o)


async def _shell(_a, o: RichLog):
    o.write("[yellow]![/] 'be shell' requires a real terminal. Run directly:")
    o.write("[dim]  cd armhr-python && uv run --env-file .env ptpython[/]")


async def _sso(_a, o: RichLog):
    await _stream_make("sso", "AWS SSO login", o)


async def _setup(_a, o: RichLog):
    await _stream_make("setup-dev", "dev setup", o)


async def _run(args: list[str], o: RichLog):
    if not args:
        o.write("[yellow]![/] Usage: be run <module> [args...]")
        return
    o.write(f"[dim]Running uv run {' '.join(args)}...[/]")
    try:
        cmd = ["uv", "run", "--env-file", ".env", "python", "-m", *args]
        async for line in stream_command(*cmd, cwd=BACKEND_ROOT):
            if line.strip():
                o.write(escape(line))
        o.write("[green]✓[/] Done")
    except Exception as e:
        o.write(f"[red]✗[/] {e}")


async def _load_reports(_a, o: RichLog):
    await _stream_make("load-reports", "load reports", o)


async def _load_single_report(_a, o: RichLog):
    await _stream_make("load-single-report", "load single report", o)


async def _check_sso(_a, o: RichLog):
    await _stream_make("check-sso-session", "check SSO session", o)


# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------

_SUBCOMMANDS: dict = {
    "serve": _serve,
    "dev": _dev,
    "local": _local,
    "worker": _worker,
    "subscriptions": _subscriptions,
    "subscriptions-worker": _subscriptions_worker,
    "lint": _lint,
    "test": _test,
    "migrate": _migrate,
    "rollback": _rollback,
    "install": _install,
    "sync": _sync,
    "shell": _shell,
    "sso": _sso,
    "setup": _setup,
    "run": _run,
    "load-reports": _load_reports,
    "load-single-report": _load_single_report,
    "check-sso": _check_sso,
}


def register(registry: dict):
    registry["be"] = cmd_be
    registry["backend"] = cmd_be
