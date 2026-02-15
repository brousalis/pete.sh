"""Git commands and shortcuts.

Single-repo: operates on the petehome monorepo root.
Handlers write output to a RichLog widget.
"""

from rich.markup import escape
from rich.panel import Panel
from rich.table import Table
from rich.tree import Tree
from textual.widgets import RichLog

from petehome_cli.services.github import GitHubService

_svc = GitHubService()


# ---------------------------------------------------------------------------
# Git subcommand handlers
# ---------------------------------------------------------------------------


async def _git_status(_args: list[str], output: RichLog) -> None:
    """Show git status."""
    status = await _svc.get_status()
    if not status:
        output.write("[red]✗[/] Not a git repo")
        return

    header = f"[bold]{status.branch}[/]"
    if status.ahead or status.behind:
        header += f"  [dim]↑{status.ahead} ↓{status.behind}[/]"
    tree = Tree(header)

    if status.staged:
        branch = tree.add(f"[green]Staged ({len(status.staged)})[/]")
        for f in status.staged[:10]:
            branch.add(f"[green]+[/] [dim]{f}[/]")
        if len(status.staged) > 10:
            branch.add(f"[dim]...+{len(status.staged) - 10} more[/]")

    if status.unstaged:
        branch = tree.add(f"[yellow]Modified ({len(status.unstaged)})[/]")
        for f in status.unstaged[:10]:
            branch.add(f"[yellow]~[/] [dim]{f}[/]")
        if len(status.unstaged) > 10:
            branch.add(f"[dim]...+{len(status.unstaged) - 10} more[/]")

    if status.untracked:
        branch = tree.add(f"[red]Untracked ({len(status.untracked)})[/]")
        for f in status.untracked[:10]:
            branch.add(f"[red]?[/] [dim]{f}[/]")
        if len(status.untracked) > 10:
            branch.add(f"[dim]...+{len(status.untracked) - 10} more[/]")

    subtitle = "[green]✓ clean[/]" if status.is_clean else ""
    output.write(
        Panel(
            tree,
            subtitle=subtitle,
            border_style="dim",
            padding=(0, 1),
        )
    )


async def _git_add(_args: list[str], output: RichLog) -> None:
    ok, _ = await _svc.add_files()
    if ok:
        output.write("[green]✓[/] Staged all changes")
    else:
        output.write("[red]✗[/] Failed to stage")


async def _git_commit(args: list[str], output: RichLog) -> None:
    """Commit changes. Auto-stages if nothing staged. Message from args."""
    status = await _svc.get_status()
    if status and not status.staged and status.has_changes:
        ok, _ = await _svc.add_files()
        if ok:
            output.write("[green]✓[/] Staged all changes")

    if not args:
        output.write("[yellow]![/] Usage: gc <message>")
        output.write("[dim]Provide the commit message as arguments, e.g.: gc fix login bug[/]")
        return
    message = " ".join(args)

    status = await _svc.get_status()
    if not status or not status.staged:
        output.write("[dim]Nothing to commit[/]")
        return

    ok, out = await _svc.commit(message)
    if ok:
        output.write("[green]✓[/] Committed")
    else:
        first_line = out.split("\n")[0] if out else "Failed"
        output.write(f"[red]✗[/] {escape(first_line)}")


async def _git_push(args: list[str], output: RichLog) -> None:
    set_upstream = "origin" in args or "-u" in args
    ok, out = await _svc.push(set_upstream=set_upstream)
    if ok:
        output.write("[green]✓[/] Pushed")
    else:
        first_line = out.split("\n")[0] if out else "Failed"
        output.write(f"[red]✗[/] {escape(first_line)}")


async def _git_pull(_args: list[str], output: RichLog) -> None:
    ok, out = await _svc.pull()
    if ok:
        output.write("[green]✓[/] Pulled")
    else:
        first_line = out.split("\n")[0] if out else "Failed"
        output.write(f"[red]✗[/] {escape(first_line)}")


async def _git_log(_args: list[str], output: RichLog) -> None:
    commits = await _svc.get_log(10)
    if not commits:
        output.write("[dim]No commits[/]")
        return

    table = Table(show_header=False, box=None, padding=(0, 1))
    table.add_column(style="yellow")
    table.add_column()
    table.add_column(style="dim")
    for c in commits:
        table.add_row(c["hash"], c["message"][:50], c["time"])

    output.write(
        Panel(
            table,
            border_style="dim",
            padding=(0, 1),
            title="[bold]Recent Commits[/]",
            title_align="left",
        )
    )


async def _git_diff(_args: list[str], output: RichLog) -> None:
    ok, diff_output = await _svc.diff()
    if ok and diff_output.strip():
        for line in diff_output.split("\n")[:50]:
            if line.startswith("+") and not line.startswith("+++"):
                output.write(f"[green]{escape(line)}[/]")
            elif line.startswith("-") and not line.startswith("---"):
                output.write(f"[red]{escape(line)}[/]")
            elif line.startswith("@@"):
                output.write(f"[cyan]{escape(line)}[/]")
            else:
                output.write(f"[dim]{escape(line)}[/]")
    elif ok:
        output.write("[dim]No changes[/]")
    else:
        first_line = diff_output.split("\n")[0] if diff_output else "Failed"
        output.write(f"[red]✗[/] {escape(first_line)}")


async def _git_pr(args: list[str], output: RichLog) -> None:
    if args and args[0] == "create":
        status = await _svc.get_status()
        if status and status.branch in ("main", "master"):
            output.write("[red]✗[/] Can't create PR from main branch")
            return
        if len(args) < 2:
            output.write("[yellow]![/] Usage: gpr create <title>")
            return
        title = " ".join(args[1:])
        ok, out = await _svc.create_pr(title, "")
        if ok:
            output.write(f"[green]✓[/] Created: {out.strip()}")
        else:
            first_line = out.split("\n")[0] if out else "Failed"
            output.write(f"[red]✗[/] {escape(first_line)}")
    else:
        prs = await _svc.list_prs()
        if not prs:
            output.write("[dim]No open pull requests[/]")
            return
        table = Table(show_header=False, box=None, padding=(0, 1))
        table.add_column(style="yellow")
        table.add_column()
        table.add_column(style="dim")
        for pr in prs:
            table.add_row(f"#{pr.number}", pr.title[:45], pr.head_branch)
        output.write(
            Panel(
                table,
                border_style="dim",
                padding=(0, 1),
                title="[bold]Open PRs[/]",
                title_align="left",
            )
        )


# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------

_GIT_SUBCOMMANDS: dict = {
    "status": _git_status,
    "add": _git_add,
    "commit": _git_commit,
    "push": _git_push,
    "pull": _git_pull,
    "log": _git_log,
    "diff": _git_diff,
    "pr": _git_pr,
}


async def cmd_git(args: list[str], output: RichLog) -> None:
    if not args:
        args = ["status"]
    subcmd = args[0].lower()
    subargs = args[1:]
    handler = _GIT_SUBCOMMANDS.get(subcmd)
    if handler:
        await handler(subargs, output)
    else:
        output.write(f"[red]✗[/] Unknown: git {subcmd}")


# ---------------------------------------------------------------------------
# Shortcuts
# ---------------------------------------------------------------------------


async def _shortcut_gs(_a: list[str], o: RichLog) -> None:
    await _git_status([], o)


async def _shortcut_ga(_a: list[str], o: RichLog) -> None:
    await _git_add([], o)


async def _shortcut_gc(args: list[str], o: RichLog) -> None:
    await _git_add([], o)
    await _git_commit(args, o)


async def _shortcut_gp(args: list[str], o: RichLog) -> None:
    await _git_push(args, o)


async def _shortcut_gpo(_a: list[str], o: RichLog) -> None:
    await _git_push(["origin"], o)


async def _shortcut_gpl(_a: list[str], o: RichLog) -> None:
    await _git_pull([], o)


async def _shortcut_gl(_a: list[str], o: RichLog) -> None:
    await _git_log([], o)


async def _shortcut_gd(_a: list[str], o: RichLog) -> None:
    await _git_diff([], o)


async def _shortcut_gpr(args: list[str], o: RichLog) -> None:
    if args:
        await _git_pr(args, o)
    else:
        await _git_pr(["create"], o)


def register(registry: dict) -> None:
    """Register git commands into the command registry."""
    registry["git"] = cmd_git
    registry["gs"] = _shortcut_gs
    registry["ga"] = _shortcut_ga
    registry["gc"] = _shortcut_gc
    registry["gp"] = _shortcut_gp
    registry["gpo"] = _shortcut_gpo
    registry["gpl"] = _shortcut_gpl
    registry["gl"] = _shortcut_gl
    registry["gd"] = _shortcut_gd
    registry["gpr"] = _shortcut_gpr
