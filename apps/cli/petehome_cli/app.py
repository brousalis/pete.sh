"""Interactive CLI for petehome - command-based interface."""

import asyncio
import shlex
import sys
import webbrowser
from pathlib import Path

import questionary
from prompt_toolkit import PromptSession
from prompt_toolkit.completion import Completer, Completion
from prompt_toolkit.formatted_text import FormattedText
from prompt_toolkit.history import FileHistory
from questionary import Style
from rich.columns import Columns
from rich.console import Console, Group
from rich.live import Live
from rich.markup import escape
from rich.panel import Panel
from rich.rule import Rule
from rich.spinner import Spinner
from rich.status import Status
from rich.table import Table
from rich.text import Text
from rich.tree import Tree

from petehome_cli.config import PM2_PROCESSES
from petehome_cli.services.dev_server import DevServerService
from petehome_cli.services.github import GitHubService
from petehome_cli.services.pm2 import PM2Service
from petehome_cli.services.supabase import (
    is_configured as supabase_configured,
    mark_applied as supabase_mark_applied,
    migration_status,
    run_migrations,
)
from petehome_cli.services.vercel import VercelService

console = Console()

# Yellow-gold fallback when Windows accent cannot be read
FALLBACK_ACCENT_RGB = (212, 175, 55)  # goldenrod / yellow gold


def _get_windows_accent_rgb() -> tuple[int, int, int] | None:
    """Read Windows 11 accent color from registry. Returns (r, g, b) or None."""
    if sys.platform != "win32":
        return None
    try:
        import winreg
        key = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"Software\Microsoft\Windows\CurrentVersion\Explorer\Accent",
            0,
            winreg.KEY_READ,
        )
        try:
            value, _ = winreg.QueryValueEx(key, "AccentColor")
            # DWORD 0xRRGGBB00: R/G/B in high 24 bits; or LE 0x00BBGGRR in low 24 bits
            if value > 0xFFFFFF:
                r = (value >> 24) & 0xFF
                g = (value >> 16) & 0xFF
                b = (value >> 8) & 0xFF
            else:
                r = value & 0xFF
                g = (value >> 8) & 0xFF
                b = (value >> 16) & 0xFF
            return (r, g, b)
        finally:
            winreg.CloseKey(key)
    except (OSError, FileNotFoundError):
        return None


def _gradient_end_from_accent(rgb: tuple[int, int, int]) -> tuple[int, int, int]:
    """Create a lighter gradient end color by blending accent with white."""
    r, g, b = rgb
    blend = 0.45  # blend toward white
    return (
        min(255, int(r + (255 - r) * blend)),
        min(255, int(g + (255 - g) * blend)),
        min(255, int(b + (255 - b) * blend)),
    )


def _build_theme() -> dict:
    """Build theme: accent RGB/hex and gradient start/end. Uses Windows accent or gold fallback."""
    accent = _get_windows_accent_rgb()
    if accent is None:
        accent = FALLBACK_ACCENT_RGB
    gradient_end = _gradient_end_from_accent(accent)
    r, g, b = accent
    hex_str = f"#{r:02x}{g:02x}{b:02x}"
    return {
        "accent_rgb": accent,
        "accent_hex": hex_str,
        "gradient_start_rgb": accent,
        "gradient_end_rgb": gradient_end,
    }


THEME = _build_theme()

# Minimalist style - questionary uses prompt_toolkit styling (accent = theme color)
custom_style = Style([
    ('qmark', f"fg:{THEME['accent_hex']} bold"),
    ('question', 'fg:#71717a'),
    ('answer', 'fg:#22c55e'),
    ('pointer', f"fg:{THEME['accent_hex']} bold"),
    ('highlighted', f"fg:{THEME['accent_hex']}"),
    ('selected', 'fg:#22c55e'),
    ('instruction', 'fg:#525252'),
])

# All available commands for autocomplete
COMMANDS = [
    # PM2
    "status", "start", "stop", "restart", "logs", "s",
    "start all", "stop all", "restart all",
    "start main", "start notifications",
    "stop main", "stop notifications",
    "restart main", "restart notifications",
    "logs main", "logs notifications", "logs all",
    # Git - full commands
    "git status", "git add", "git commit", "git push", "git pull",
    "git log", "git pr", "git pr create", "git diff",
    # Git - shortcuts
    "gs", "ga", "gc", "gp", "gpo", "gpl", "gl", "gd", "gpr",
    # Dev
    "lint", "lint fix", "format", "build", "clean", "typecheck", "sync",
    # Deploy
    "deploy", "deploy status", "deploy history", "deploy open", "d",
    # Supabase
    "migrate", "migrate status", "migrate mark-applied", "migrate dry-run", "supabase", "supabase migrate", "supabase status",
    # Other
    "help", "exit", "quit", "clear", "?", "c", "h", "q",
]


class CommandCompleter(Completer):
    """Autocomplete for CLI commands."""

    def get_completions(self, document, complete_event):
        text = document.text_before_cursor.lower()
        for cmd in COMMANDS:
            if cmd.startswith(text):
                yield Completion(cmd, start_position=-len(text))


def run_async(coro):
    """Run async code synchronously."""
    return asyncio.run(coro)


def get_status_summary() -> str:
    """Get a quick status summary."""
    try:
        processes = run_async(PM2Service.get_status())
        online = sum(1 for p in processes if p.status == "online")
        total = len(processes)
        if total == 0:
            return "[dim]no services[/]"
        elif online == total:
            return f"[green]●[/] {online}/{total}"
        elif online == 0:
            return f"[red]●[/] {online}/{total}"
        else:
            return f"[yellow]●[/] {online}/{total}"
    except Exception:
        return "[dim]—[/]"


def get_git_branch() -> str:
    """Get current git branch."""
    try:
        github = GitHubService()
        status = run_async(github.get_status())
        if status:
            branch = status.branch
            if status.ahead or status.behind:
                return f"{branch} [dim]↑{status.ahead}↓{status.behind}[/]"
            return branch
        return ""
    except Exception:
        return ""


def gradient_text(text: str, start_color: tuple[int, int, int], end_color: tuple[int, int, int], bold: bool = True) -> Text:
    """Create smooth gradient colored text by interpolating RGB values."""
    result = Text()
    n = len(text)

    for i, char in enumerate(text):
        # Linear interpolation between start and end colors
        t = i / max(n - 1, 1)
        r = int(start_color[0] + (end_color[0] - start_color[0]) * t)
        g = int(start_color[1] + (end_color[1] - start_color[1]) * t)
        b = int(start_color[2] + (end_color[2] - start_color[2]) * t)

        color = f"#{r:02x}{g:02x}{b:02x}"
        style = f"bold {color}" if bold else color
        result.append(char, style=style)

    return result


def print_welcome():
    """Print welcome header with gradient from theme accent."""
    start = THEME["gradient_start_rgb"]
    end = THEME["gradient_end_rgb"]
    logo = gradient_text("petehome", start, end)
    console.print()
    console.print(Text("  ◆ ", style=f"bold {THEME['accent_hex']}") + logo + Text("  cli", style="dim"))
    console.print()


def print_context():
    """Print context line."""
    branch = get_git_branch()
    status = get_status_summary()

    parts = []
    if branch:
        parts.append(f"[{THEME['accent_hex']}]{branch}[/]")
    if status:
        parts.append(status)

    if parts:
        console.print(f"  {' · '.join(parts)}")
        console.print()


# ============================================================================
# Command Handlers
# ============================================================================

def cmd_help():
    """Show help."""
    # Services column
    services = Table.grid(padding=(0, 2))
    services.add_column(style=THEME["accent_hex"])
    services.add_column(style="dim")
    services.add_row("status, s", "processes")
    services.add_row("start <name>", "start")
    services.add_row("stop <name>", "stop")
    services.add_row("restart <name>", "restart")
    services.add_row("logs [name]", "logs")

    # Git column
    git = Table.grid(padding=(0, 2))
    git.add_column(style=THEME["accent_hex"])
    git.add_column(style="dim")
    git.add_row("gs", "status")
    git.add_row("ga", "add all")
    git.add_row("gc", "commit")
    git.add_row("gp", "push")
    git.add_row("gpo", "push origin")
    git.add_row("gpl", "pull")
    git.add_row("gl", "log")
    git.add_row("gd", "diff")
    git.add_row("gpr", "create PR")

    # Dev column
    dev = Table.grid(padding=(0, 2))
    dev.add_column(style=THEME["accent_hex"])
    dev.add_column(style="dim")
    dev.add_row("lint [fix]", "eslint")
    dev.add_row("format", "prettier")
    dev.add_row("build", "build")
    dev.add_row("typecheck", "tsc")
    dev.add_row("clean", "clean")
    dev.add_row("sync", "sync data")

    # Deploy column
    deploy = Table.grid(padding=(0, 2))
    deploy.add_column(style=THEME["accent_hex"])
    deploy.add_column(style="dim")
    deploy.add_row("deploy, d", "production")
    deploy.add_row("d status", "latest")
    deploy.add_row("d history", "history")
    deploy.add_row("d open", "browser")

    # Supabase column
    supabase = Table.grid(padding=(0, 2))
    supabase.add_column(style=THEME["accent_hex"])
    supabase.add_column(style="dim")
    supabase.add_row("migrate", "run pending")
    supabase.add_row("migrate status", "list applied")
    supabase.add_row("migrate mark-applied", "sync history (e.g. 001-014)")
    supabase.add_row("migrate dry-run", "preview")

    console.print()
    console.print(Panel(
        Columns([
            Panel(services, title="[bold]Services[/]", border_style="dim", padding=(0, 1)),
            Panel(git, title="[bold]Git[/]", border_style="dim", padding=(0, 1)),
            Panel(dev, title="[bold]Dev[/]", border_style="dim", padding=(0, 1)),
            Panel(deploy, title="[bold]Deploy[/]", border_style="dim", padding=(0, 1)),
            Panel(supabase, title="[bold]Supabase[/]", border_style="dim", padding=(0, 1)),
        ], equal=True, expand=True),
        border_style="dim",
        padding=(1, 2),
    ))
    console.print("  [dim]Services: main · notifications · all[/]")
    console.print("  [dim]Also: git <cmd> · migrate · clear · help · exit[/]")
    console.print()


def cmd_status():
    """Show PM2 status."""
    with console.status("[dim]Loading...[/]", spinner="dots"):
        processes = run_async(PM2Service.get_status())

    if not processes:
        console.print()
        console.print("  [yellow]![/] No PM2 processes running")
        console.print()
        return

    table = Table(
        show_header=True,
        header_style="bold dim",
        border_style="dim",
        box=None,
        padding=(0, 2),
        expand=False,
    )
    table.add_column("Service")
    table.add_column("Status")
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
            f"[dim]{p.uptime_str}[/]",
            f"[dim]{p.cpu:.0f}%[/]" if p.cpu > 0 else "[dim]-[/]",
            f"[dim]{p.memory_mb:.0f}MB[/]" if p.memory_mb > 0 else "[dim]-[/]",
            f"[dim]{p.restarts}[/]" if p.restarts > 0 else "[dim]-[/]",
        )

    console.print()
    console.print(Panel(table, border_style="dim", padding=(1, 2)))
    console.print()


def resolve_service_name(name: str) -> str | None:
    """Resolve short name to PM2 process name."""
    name = name.lower().strip()
    if name in PM2_PROCESSES:
        return PM2_PROCESSES[name]
    for full_name in PM2_PROCESSES.values():
        if name == full_name:
            return full_name
    return None


def cmd_start(args: list[str]):
    """Start a service."""
    if not args:
        console.print(f"  [yellow]![/] Usage: [{THEME['accent_hex']}]start <main|notifications|all>[/]")
        return

    target = args[0].lower()

    if target == "all":
        console.print()
        for short, name in PM2_PROCESSES.items():
            with console.status(f"[dim]Starting {name}...[/]", spinner="dots"):
                ok, _ = run_async(PM2Service.start(name))
            if ok:
                console.print(f"  [green]✓[/] {name}")
            else:
                console.print(f"  [red]✗[/] {name}")
        console.print()
        return

    name = resolve_service_name(target)
    if not name:
        console.print(f"  [red]✗[/] Unknown service: {target}")
        console.print("  [dim]Options: main, notifications, all[/]")
        return

    with console.status(f"[dim]Starting {name}...[/]", spinner="dots"):
        ok, output = run_async(PM2Service.start(name))

    console.print()
    if ok:
        console.print(f"  [green]✓[/] Started {name}")
    else:
        console.print(f"  [red]✗[/] Failed to start {name}")
        if output:
            console.print(f"  [dim]{escape(output.strip()[:100])}[/]")
    console.print()


def cmd_stop(args: list[str]):
    """Stop a service."""
    if not args:
        console.print(f"  [yellow]![/] Usage: [{THEME['accent_hex']}]stop <main|notifications|all>[/]")
        return

    target = args[0].lower()

    if target == "all":
        console.print()
        with console.status("[dim]Getting processes...[/]", spinner="dots"):
            processes = run_async(PM2Service.get_status())
        online = [p for p in processes if p.status == "online"]
        if not online:
            console.print("  [dim]No services running[/]")
            console.print()
            return
        for p in online:
            with console.status(f"[dim]Stopping {p.name}...[/]", spinner="dots"):
                ok, _ = run_async(PM2Service.stop(p.name))
            if ok:
                console.print(f"  [green]✓[/] {p.name}")
            else:
                console.print(f"  [red]✗[/] {p.name}")
        console.print()
        return

    name = resolve_service_name(target)
    if not name:
        console.print(f"  [red]✗[/] Unknown service: {target}")
        return

    with console.status(f"[dim]Stopping {name}...[/]", spinner="dots"):
        ok, _ = run_async(PM2Service.stop(name))

    console.print()
    if ok:
        console.print(f"  [green]✓[/] Stopped {name}")
    else:
        console.print(f"  [red]✗[/] Failed to stop {name}")
    console.print()


def cmd_restart(args: list[str]):
    """Restart a service."""
    if not args:
        console.print(f"  [yellow]![/] Usage: [{THEME['accent_hex']}]restart <main|notifications|all>[/]")
        return

    target = args[0].lower()

    if target == "all":
        console.print()
        with console.status("[dim]Getting processes...[/]", spinner="dots"):
            processes = run_async(PM2Service.get_status())
        for p in processes:
            with console.status(f"[dim]Restarting {p.name}...[/]", spinner="dots"):
                ok, _ = run_async(PM2Service.restart(p.name))
            if ok:
                console.print(f"  [green]✓[/] {p.name}")
            else:
                console.print(f"  [red]✗[/] {p.name}")
        console.print()
        return

    name = resolve_service_name(target)
    if not name:
        console.print(f"  [red]✗[/] Unknown service: {target}")
        return

    with console.status(f"[dim]Restarting {name}...[/]", spinner="dots"):
        ok, _ = run_async(PM2Service.restart(name))

    console.print()
    if ok:
        console.print(f"  [green]✓[/] Restarted {name}")
    else:
        console.print(f"  [red]✗[/] Failed to restart {name}")
    console.print()


def cmd_logs(args: list[str]):
    """Stream logs."""
    target = args[0].lower() if args else "all"

    if target == "all":
        process_name = None
    else:
        process_name = resolve_service_name(target)
        if not process_name:
            console.print(f"  [red]✗[/] Unknown service: {target}")
            return

    console.print()
    console.print(f"  [dim]Streaming{f' {process_name}' if process_name else ''} logs · Ctrl+C to stop[/]")
    console.print(Rule(style="dim"))

    async def stream():
        try:
            async for line in PM2Service.stream_logs(process_name, lines=30):
                # Colorize based on content
                if "error" in line.lower():
                    console.print(f"  [red]{escape(line)}[/]")
                elif "warn" in line.lower():
                    console.print(f"  [yellow]{escape(line)}[/]")
                elif "ready" in line.lower() or "success" in line.lower() or "compiled" in line.lower():
                    console.print(f"  [green]{escape(line)}[/]")
                elif line.startswith("PM2") or "|" in line[:30]:
                    console.print(f"  [{THEME['accent_hex']}]{escape(line)}[/]")
                else:
                    console.print(f"  {escape(line)}")
        except KeyboardInterrupt:
            pass

    try:
        run_async(stream())
    except KeyboardInterrupt:
        pass

    console.print(Rule(style="dim"))
    console.print()


def cmd_git(args: list[str]):
    """Handle git commands."""
    if not args:
        args = ["status"]

    github = GitHubService()
    subcmd = args[0].lower()
    subargs = args[1:]

    if subcmd == "status":
        with console.status("[dim]Loading...[/]", spinner="dots"):
            status = run_async(github.get_status())

        if not status:
            console.print("  [red]✗[/] Not a git repository")
            return

        # Build a tree for git status
        tree = Tree(f"[bold]{status.branch}[/]" + (f"  [dim]↑{status.ahead} ↓{status.behind}[/]" if status.ahead or status.behind else ""))

        if status.staged:
            staged_branch = tree.add(f"[green]Staged ({len(status.staged)})[/]")
            for f in status.staged[:10]:
                staged_branch.add(f"[green]+[/] [dim]{f}[/]")
            if len(status.staged) > 10:
                staged_branch.add(f"[dim]...+{len(status.staged) - 10} more[/]")

        if status.unstaged:
            unstaged_branch = tree.add(f"[yellow]Modified ({len(status.unstaged)})[/]")
            for f in status.unstaged[:10]:
                unstaged_branch.add(f"[yellow]~[/] [dim]{f}[/]")
            if len(status.unstaged) > 10:
                unstaged_branch.add(f"[dim]...+{len(status.unstaged) - 10} more[/]")

        if status.untracked:
            untracked_branch = tree.add(f"[red]Untracked ({len(status.untracked)})[/]")
            for f in status.untracked[:10]:
                untracked_branch.add(f"[red]?[/] [dim]{f}[/]")
            if len(status.untracked) > 10:
                untracked_branch.add(f"[dim]...+{len(status.untracked) - 10} more[/]")

        console.print()
        console.print(Panel(tree, border_style="dim", padding=(1, 2)))
        if status.is_clean:
            console.print("  [green]✓[/] Working directory clean")
        console.print()

    elif subcmd == "add":
        with console.status("[dim]Staging...[/]", spinner="dots"):
            ok, _ = run_async(github.add_files())
        if ok:
            console.print("  [green]✓[/] Staged all changes")
        else:
            console.print("  [red]✗[/] Failed to stage")

    elif subcmd == "commit":
        # Auto-stage all changes if nothing is staged
        with console.status("[dim]Checking...[/]", spinner="dots"):
            status = run_async(github.get_status())
        if status and not status.staged and status.has_changes:
            with console.status("[dim]Staging all changes...[/]", spinner="dots"):
                ok, _ = run_async(github.add_files())
            if ok:
                console.print("  [green]✓[/] Staged all changes")
            else:
                console.print("  [red]✗[/] Failed to stage")
                return

        if not subargs:
            message = questionary.text(
                "message:",
                qmark="",
                style=custom_style,
            ).ask()
            if not message:
                console.print("  [dim]Cancelled[/]")
                return
        else:
            message = " ".join(subargs)

        with console.status("[dim]Committing...[/]", spinner="dots"):
            ok, output = run_async(github.commit(message))
        if ok:
            console.print("  [green]✓[/] Committed")
        else:
            console.print(f"  [red]✗[/] {escape(output.split(chr(10))[0]) if output else 'Failed'}")

    elif subcmd == "push":
        # Check for "origin" flag to push with upstream
        set_upstream = "origin" in subargs or "-u" in subargs
        with console.status("[dim]Pushing...[/]", spinner="dots"):
            ok, output = run_async(github.push(set_upstream=set_upstream))
        if ok:
            console.print("  [green]✓[/] Pushed")
        else:
            console.print(f"  [red]✗[/] {escape(output.split(chr(10))[0]) if output else 'Failed'}")

    elif subcmd == "diff":
        with console.status("[dim]Loading...[/]", spinner="dots"):
            ok, output = run_async(github.diff())
        if ok and output.strip():
            console.print()
            console.print(Rule(style="dim"))
            for line in output.split('\n')[:50]:
                if line.startswith('+') and not line.startswith('+++'):
                    console.print(f"  [green]{escape(line)}[/]")
                elif line.startswith('-') and not line.startswith('---'):
                    console.print(f"  [red]{escape(line)}[/]")
                elif line.startswith('@@'):
                    console.print(f"  [{THEME['accent_hex']}]{escape(line)}[/]")
                else:
                    console.print(f"  [dim]{escape(line)}[/]")
            console.print(Rule(style="dim"))
            console.print()
        elif ok:
            console.print("  [dim]No changes[/]")
        else:
            console.print(f"  [red]✗[/] {escape(output.split(chr(10))[0]) if output else 'Failed'}")

    elif subcmd == "pull":
        with console.status("[dim]Pulling...[/]", spinner="dots"):
            ok, output = run_async(github.pull())
        if ok:
            console.print("  [green]✓[/] Pulled")
        else:
            console.print(f"  [red]✗[/] {escape(output.split(chr(10))[0]) if output else 'Failed'}")

    elif subcmd == "log":
        with console.status("[dim]Loading...[/]", spinner="dots"):
            commits = run_async(github.get_log(10))

        if not commits:
            console.print("  [dim]No commits[/]")
            return

        table = Table(show_header=False, box=None, padding=(0, 1))
        table.add_column(style="yellow")
        table.add_column()
        table.add_column(style="dim")

        for c in commits:
            table.add_row(c['hash'], c['message'][:50], c['time'])

        console.print()
        console.print(Panel(table, border_style="dim", padding=(1, 2), title="[bold]Recent Commits[/]", title_align="left"))
        console.print()

    elif subcmd == "pr":
        if subargs and subargs[0] == "create":
            with console.status("[dim]Checking...[/]", spinner="dots"):
                status = run_async(github.get_status())

            if status and status.branch in ("main", "master"):
                console.print("  [red]✗[/] Can't create PR from main branch")
                return

            title = questionary.text(
                "title:",
                qmark="",
                style=custom_style,
            ).ask()
            if not title:
                console.print("  [dim]Cancelled[/]")
                return

            with console.status("[dim]Creating PR...[/]", spinner="dots"):
                ok, output = run_async(github.create_pr(title, ""))
            if ok:
                console.print(f"  [green]✓[/] Created: {output.strip()}")
            else:
                console.print(f"  [red]✗[/] {escape(output.split(chr(10))[0]) if output else 'Failed'}")
        else:
            with console.status("[dim]Loading...[/]", spinner="dots"):
                prs = run_async(github.list_prs())

            if not prs:
                console.print("  [dim]No open pull requests[/]")
                return

            table = Table(show_header=False, box=None, padding=(0, 1))
            table.add_column(style="yellow")
            table.add_column()
            table.add_column(style="dim")

            for pr in prs:
                table.add_row(f"#{pr.number}", pr.title[:45], pr.head_branch)

            console.print()
            console.print(Panel(table, border_style="dim", padding=(1, 2), title="[bold]Open PRs[/]", title_align="left"))
            console.print()

    else:
        console.print(f"  [red]✗[/] Unknown: git {subcmd}")


def cmd_lint(args: list[str]):
    """Run lint."""
    fix = "fix" in args
    dev = DevServerService()

    console.print()
    console.print(f"  [dim]Running lint{'--fix' if fix else ''}...[/]")
    console.print(Rule(style="dim"))

    async def stream():
        async for line in dev.lint(fix=fix):
            if line.strip():
                console.print(f"  {escape(line)}")

    try:
        run_async(stream())
        console.print(Rule(style="dim"))
        console.print("  [green]✓[/] Done")
    except Exception as e:
        console.print(Rule(style="dim"))
        console.print(f"  [red]✗[/] {e}")
    console.print()


def cmd_format():
    """Run format."""
    dev = DevServerService()

    console.print()
    console.print("  [dim]Running prettier...[/]")
    console.print(Rule(style="dim"))

    async def stream():
        async for line in dev.format_code():
            if line.strip():
                console.print(f"  {escape(line)}")

    try:
        run_async(stream())
        console.print(Rule(style="dim"))
        console.print("  [green]✓[/] Done")
    except Exception as e:
        console.print(Rule(style="dim"))
        console.print(f"  [red]✗[/] {e}")
    console.print()


def cmd_build():
    """Run build."""
    dev = DevServerService()

    console.print()
    console.print("  [dim]Building...[/]")
    console.print(Rule(style="dim"))

    async def stream():
        async for line in dev.build():
            if line.strip():
                # Colorize build output
                if "error" in line.lower():
                    console.print(f"  [red]{escape(line)}[/]")
                elif "warn" in line.lower():
                    console.print(f"  [yellow]{escape(line)}[/]")
                elif "success" in line.lower() or "compiled" in line.lower() or "done" in line.lower():
                    console.print(f"  [green]{escape(line)}[/]")
                else:
                    console.print(f"  {escape(line)}")

    try:
        run_async(stream())
        console.print(Rule(style="dim"))
        console.print("  [green]✓[/] Build complete")
    except Exception as e:
        console.print(Rule(style="dim"))
        console.print(f"  [red]✗[/] {e}")
    console.print()


def cmd_clean():
    """Run clean."""
    dev = DevServerService()

    with console.status("[dim]Cleaning...[/]", spinner="dots"):
        ok, _ = run_async(dev.clean())

    if ok:
        console.print("  [green]✓[/] Cleaned")
    else:
        console.print("  [red]✗[/] Failed")


def cmd_typecheck():
    """Run type check."""
    dev = DevServerService()

    console.print()
    console.print("  [dim]Type checking...[/]")
    console.print(Rule(style="dim"))

    async def stream():
        async for line in dev.type_check():
            if line.strip():
                if "error" in line.lower():
                    console.print(f"  [red]{escape(line)}[/]")
                else:
                    console.print(f"  {escape(line)}")

    try:
        run_async(stream())
        console.print(Rule(style="dim"))
        console.print("  [green]✓[/] Done")
    except Exception as e:
        console.print(Rule(style="dim"))
        console.print(f"  [red]✗[/] {e}")
    console.print()


def cmd_sync():
    """Run sync."""
    dev = DevServerService()

    console.print()
    console.print("  [dim]Syncing data...[/]")
    console.print(Rule(style="dim"))

    async def stream():
        async for line in dev.sync_once():
            if line.strip():
                console.print(f"  {escape(line)}")

    try:
        run_async(stream())
        console.print(Rule(style="dim"))
        console.print("  [green]✓[/] Done")
    except Exception as e:
        console.print(Rule(style="dim"))
        console.print(f"  [red]✗[/] {e}")
    console.print()


def cmd_deploy(args: list[str]):
    """Handle deploy commands."""
    vercel = VercelService()

    if not vercel.is_configured:
        console.print("  [red]✗[/] Vercel not configured")
        console.print("  [dim]Set VERCEL_TOKEN environment variable[/]")
        return

    subcmd = args[0].lower() if args else "trigger"

    if subcmd in ("status", "latest"):
        with console.status("[dim]Loading...[/]", spinner="dots"):
            deployment = run_async(vercel.get_latest_deployment())

        if not deployment:
            console.print("  [dim]No deployments found[/]")
            return

        status_display = {
            "READY": "[green]● Ready[/]",
            "ERROR": "[red]● Error[/]",
            "CANCELED": "[red]○ Canceled[/]",
            "BUILDING": "[yellow]◐ Building[/]",
            "QUEUED": "[yellow]◐ Queued[/]",
        }.get(deployment.state, f"[yellow]◐ {deployment.state}[/]")

        info_table = Table.grid(padding=(0, 2))
        info_table.add_column(style="dim")
        info_table.add_column()
        info_table.add_row("Status", status_display)
        info_table.add_row("URL", f"[link={deployment.deployment_url}]{deployment.deployment_url}[/link]")
        info_table.add_row("Created", deployment.created_str)

        console.print()
        console.print(Panel(info_table, border_style="dim", padding=(1, 2), title="[bold]Latest Deployment[/]", title_align="left"))
        console.print()

    elif subcmd == "history":
        with console.status("[dim]Loading...[/]", spinner="dots"):
            deployments = run_async(vercel.get_deployments(limit=10))

        if not deployments:
            console.print("  [dim]No deployments found[/]")
            return

        table = Table(show_header=True, header_style="bold dim", box=None, padding=(0, 2))
        table.add_column("Status")
        table.add_column("State")
        table.add_column("Created")

        for d in deployments:
            status_icon = {"READY": "[green]●[/]", "ERROR": "[red]●[/]", "CANCELED": "[red]○[/]"}.get(d.state, "[yellow]◐[/]")
            table.add_row(status_icon, d.state, d.created_str)

        console.print()
        console.print(Panel(table, border_style="dim", padding=(1, 2), title="[bold]Deployment History[/]", title_align="left"))
        console.print()

    elif subcmd == "open":
        with console.status("[dim]Loading...[/]", spinner="dots"):
            deployment = run_async(vercel.get_latest_deployment())

        if deployment:
            console.print(f"  [green]✓[/] Opening {deployment.deployment_url}")
            webbrowser.open(deployment.deployment_url)
        else:
            console.print("  [dim]No deployment found[/]")

    elif subcmd in ("trigger", "prod", "production"):
        if not questionary.confirm(
            "Deploy to production?",
            style=custom_style,
            default=False,
        ).ask():
            console.print("  [dim]Cancelled[/]")
            return

        console.print()
        with console.status("[dim]Deploying...[/]", spinner="dots"):
            ok, output = run_async(vercel.trigger_deployment())

        if ok:
            console.print("  [green]✓[/] Deployment triggered")
        else:
            console.print(f"  [red]✗[/] {escape(output.split(chr(10))[0]) if output else 'Failed'}")
        console.print()

    else:
        console.print(f"  [red]✗[/] Unknown: deploy {subcmd}")


def cmd_migrate(args: list[str]):
    """Run Supabase migrations on prod (SUPABASE_DB_URL) or show status."""
    dry_run = "dry-run" in args or "dry_run" in args
    subcmd = (args[0].lower() if args else "run").strip()
    if subcmd in ("dry-run", "dry_run"):
        subcmd = "run"

    if subcmd == "status":
        if not supabase_configured():
            console.print("  [red]✗[/] SUPABASE_DB_URL not set")
            console.print("  [dim]Set it in apps/web/.env (Postgres URI from Supabase dashboard)[/]")
            return
        ok, rows = migration_status()
        if not ok:
            console.print("  [red]✗[/] Could not read migration status (check SUPABASE_DB_URL)")
            return
        if not rows:
            console.print("  [dim]No migration files in apps/web/supabase/migrations[/]")
            return
        table = Table(show_header=True, header_style="bold dim", box=None, padding=(0, 2))
        table.add_column("Migration")
        table.add_column("Status")
        for r in rows:
            status = "[green]● applied[/]" if r["applied"] else "[yellow]○ pending[/]"
            table.add_row(r["name"], status)
        console.print()
        console.print(Panel(table, border_style="dim", padding=(1, 2), title="[bold]Migration Status[/]", title_align="left"))
        console.print()
        return

    if subcmd == "mark-applied":
        # migrate mark-applied 001-014  or  migrate mark-applied 001 002 ... 014
        rest = [a for a in args[1:] if a not in ("dry-run", "dry_run")]
        if not rest:
            console.print("  [yellow]![/] Usage: migrate mark-applied 001 002 ... 014  or  migrate mark-applied 001-014")
            return
        with console.status("[dim]Marking migrations as applied...[/]", spinner="dots"):
            success, msg = supabase_mark_applied(rest)
        console.print()
        if success:
            console.print(f"  [green]✓[/] {msg}")
        else:
            console.print(f"  [red]✗[/] {msg}")
        console.print()
        return

    if subcmd in ("run", "up", "") or dry_run:
        with console.status("[dim]Running migrations...[/]" if not dry_run else "[dim]Checking pending...[/]", spinner="dots"):
            success, msg = run_migrations(dry_run=dry_run)
        console.print()
        if success:
            console.print(f"  [green]✓[/] {msg}")
        else:
            console.print(f"  [red]✗[/] {msg}")
        console.print()
        return

    console.print(f"  [red]✗[/] Unknown: migrate {subcmd}")
    console.print("  [dim]Use: migrate · migrate status · migrate mark-applied 001-014 · migrate dry-run[/]")


def cmd_supabase(args: list[str]):
    """Supabase: migrate or status (alias for migrate)."""
    if not args:
        cmd_migrate(["run"])
        return
    subcmd = args[0].lower()
    if subcmd == "migrate":
        cmd_migrate(args[1:])
    elif subcmd == "status":
        cmd_migrate(["status"])
    else:
        console.print(f"  [red]✗[/] Unknown: supabase {subcmd}")
        console.print("  [dim]Use: supabase migrate · supabase status[/]")


# ============================================================================
# Main Loop
# ============================================================================

def parse_and_execute(cmd: str):
    """Parse and execute a command."""
    cmd = cmd.strip()
    if not cmd:
        return True

    try:
        parts = shlex.split(cmd)
    except ValueError:
        parts = cmd.split()

    if not parts:
        return True

    command = parts[0].lower()
    args = parts[1:]

    # Exit
    if command in ("exit", "quit", "q"):
        return False

    # Clear
    if command in ("clear", "cls"):
        console.clear()
        print_welcome()
        print_context()
        return True

    # Help
    if command in ("help", "?", "h"):
        cmd_help()
        return True

    # PM2 commands
    if command in ("status", "s"):
        cmd_status()
    elif command == "start":
        cmd_start(args)
    elif command == "stop":
        cmd_stop(args)
    elif command == "restart":
        cmd_restart(args)
    elif command == "logs":
        cmd_logs(args)

    # Git - full command
    elif command == "git":
        cmd_git(args)

    # Git shortcuts
    elif command == "gs":
        cmd_git(["status"])
    elif command == "ga":
        cmd_git(["add"])
    elif command == "gc":
        # Always stage all changes, then commit (prompt for message if needed)
        cmd_git(["add"])
        cmd_git(["commit"] + args)
    elif command == "gp":
        cmd_git(["push"] + args)
    elif command == "gpo":
        # Push to origin with current branch
        cmd_git(["push", "origin"])
    elif command == "gpl":
        cmd_git(["pull"])
    elif command == "gl":
        cmd_git(["log"])
    elif command == "gd":
        cmd_git(["diff"])
    elif command == "gpr":
        if args:
            cmd_git(["pr"] + args)
        else:
            cmd_git(["pr", "create"])

    # Dev commands
    elif command == "lint":
        cmd_lint(args)
    elif command == "format":
        cmd_format()
    elif command == "build":
        cmd_build()
    elif command == "clean":
        cmd_clean()
    elif command in ("typecheck", "tsc"):
        cmd_typecheck()
    elif command == "sync":
        cmd_sync()

    # Deploy
    elif command in ("deploy", "d"):
        cmd_deploy(args)

    # Supabase
    elif command == "migrate":
        cmd_migrate(args)
    elif command == "supabase":
        cmd_supabase(args)

    else:
        console.print(f"  [red]✗[/] Unknown: {command}")
        console.print("  [dim]Type 'help' for commands[/]")

    return True


def run():
    """Run the CLI."""
    console.clear()
    print_welcome()
    print_context()

    # Persistent command history with autocomplete
    history_path = Path.home() / ".petehome_cli_history"
    session = PromptSession(
        history=FileHistory(str(history_path)),
        completer=CommandCompleter(),
        complete_while_typing=True,
    )
    prompt_text = FormattedText([(f"{THEME['accent_hex']} bold", "> ")])

    while True:
        try:
            cmd = session.prompt(prompt_text)

            if not parse_and_execute(cmd):
                break

        except KeyboardInterrupt:
            console.print()
            continue
        except EOFError:
            break

    console.print()
    console.print("  [dim]Goodbye[/]")
    console.print()
