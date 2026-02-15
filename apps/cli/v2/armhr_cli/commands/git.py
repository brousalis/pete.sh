"""Git commands and shortcuts.

Multi-repo aware: `gs` shows status for both backend and frontend.
Handlers write output to a RichLog widget.
"""

from rich.markup import escape
from rich.panel import Panel
from rich.table import Table
from rich.tree import Tree
from textual.widgets import RichLog

from armhr_cli.config import BACKEND_ROOT, FRONTEND_ROOT
from armhr_cli.services.github import GitHubService

_REPOS = {
    "backend": BACKEND_ROOT,
    "frontend": FRONTEND_ROOT,
}


# ---------------------------------------------------------------------------
# Git subcommand handlers
# ---------------------------------------------------------------------------


async def _git_status(_args: list[str], output: RichLog):
    """Show git status for both repos."""
    for name, path in _REPOS.items():
        svc = GitHubService(cwd=path)
        status = await svc.get_status()
        if not status:
            output.write(f"[red]✗[/] {name}: not a git repo")
            continue

        header = f"[bold]{status.branch}[/]"
        if status.ahead or status.behind:
            header += f"  [dim]↑{status.ahead} ↓{status.behind}[/]"
        tree = Tree(header)

        if status.staged:
            branch = tree.add(f"[green]Staged ({len(status.staged)})[/]")
            for f in status.staged[:8]:
                branch.add(f"[green]+[/] [dim]{f}[/]")
            if len(status.staged) > 8:
                branch.add(f"[dim]...+{len(status.staged) - 8} more[/]")

        if status.unstaged:
            branch = tree.add(f"[yellow]Modified ({len(status.unstaged)})[/]")
            for f in status.unstaged[:8]:
                branch.add(f"[yellow]~[/] [dim]{f}[/]")
            if len(status.unstaged) > 8:
                branch.add(f"[dim]...+{len(status.unstaged) - 8} more[/]")

        if status.untracked:
            branch = tree.add(f"[red]Untracked ({len(status.untracked)})[/]")
            for f in status.untracked[:8]:
                branch.add(f"[red]?[/] [dim]{f}[/]")
            if len(status.untracked) > 8:
                branch.add(f"[dim]...+{len(status.untracked) - 8} more[/]")

        subtitle = "[green]✓ clean[/]" if status.is_clean else ""
        output.write(
            Panel(
                tree,
                title=f"[bold]{name}[/]",
                subtitle=subtitle,
                border_style="dim",
                padding=(0, 1),
            )
        )


async def _git_add(_args: list[str], output: RichLog):
    for name, path in _REPOS.items():
        svc = GitHubService(cwd=path)
        ok, _ = await svc.add_files()
        if ok:
            output.write(f"[green]✓[/] [{name}] staged all changes")
        else:
            output.write(f"[red]✗[/] [{name}] failed to stage")


async def _git_commit(args: list[str], output: RichLog):
    """Commit changes. Auto-stages if nothing staged. Message from args."""
    for name, path in _REPOS.items():
        svc = GitHubService(cwd=path)
        status = await svc.get_status()
        if status and not status.staged and status.has_changes:
            ok, _ = await svc.add_files()
            if ok:
                output.write(f"[green]✓[/] [{name}] staged all changes")

    if not args:
        output.write("[yellow]![/] Usage: gc <message>")
        output.write("[dim]Provide the commit message as arguments, e.g.: gc fix login bug[/]")
        return
    message = " ".join(args)

    for name, path in _REPOS.items():
        svc = GitHubService(cwd=path)
        status = await svc.get_status()
        if not status or not status.staged:
            continue
        ok, out = await svc.commit(message)
        if ok:
            output.write(f"[green]✓[/] [{name}] committed")
        else:
            first_line = out.split("\n")[0] if out else "Failed"
            output.write(f"[red]✗[/] [{name}] {escape(first_line)}")


async def _git_push(args: list[str], output: RichLog):
    set_upstream = "origin" in args or "-u" in args
    for name, path in _REPOS.items():
        svc = GitHubService(cwd=path)
        ok, out = await svc.push(set_upstream=set_upstream)
        if ok:
            output.write(f"[green]✓[/] [{name}] pushed")
        else:
            first_line = out.split("\n")[0] if out else "Failed"
            output.write(f"[red]✗[/] [{name}] {escape(first_line)}")


async def _git_pull(_args: list[str], output: RichLog):
    for name, path in _REPOS.items():
        svc = GitHubService(cwd=path)
        ok, out = await svc.pull()
        if ok:
            output.write(f"[green]✓[/] [{name}] pulled")
        else:
            first_line = out.split("\n")[0] if out else "Failed"
            output.write(f"[red]✗[/] [{name}] {escape(first_line)}")


async def _git_log(_args: list[str], output: RichLog):
    for name, path in _REPOS.items():
        svc = GitHubService(cwd=path)
        commits = await svc.get_log(10)
        if not commits:
            output.write(f"[dim][{name}] No commits[/]")
            continue

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
                title=f"[bold]{name} · Recent Commits[/]",
                title_align="left",
            )
        )


async def _git_diff(_args: list[str], output: RichLog):
    for name, path in _REPOS.items():
        svc = GitHubService(cwd=path)
        ok, diff_output = await svc.diff()
        if ok and diff_output.strip():
            output.write(f"[bold]{name}[/]")
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
            output.write(f"[dim][{name}] No changes[/]")
        else:
            first_line = diff_output.split("\n")[0] if diff_output else "Failed"
            output.write(f"[red]✗[/] [{name}] {escape(first_line)}")


async def _git_pr(args: list[str], output: RichLog):
    svc = GitHubService(cwd=BACKEND_ROOT)
    if args and args[0] == "create":
        status = await svc.get_status()
        if status and status.branch in ("main", "master"):
            output.write("[red]✗[/] Can't create PR from main branch")
            return
        if len(args) < 2:
            output.write("[yellow]![/] Usage: gpr create <title>")
            return
        title = " ".join(args[1:])
        ok, out = await svc.create_pr(title, "")
        if ok:
            output.write(f"[green]✓[/] Created: {out.strip()}")
        else:
            first_line = out.split("\n")[0] if out else "Failed"
            output.write(f"[red]✗[/] {escape(first_line)}")
    else:
        prs = await svc.list_prs()
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


async def cmd_git(args: list[str], output: RichLog):
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


async def _shortcut_gs(_a, o: RichLog):
    await _git_status([], o)


async def _shortcut_ga(_a, o: RichLog):
    await _git_add([], o)


async def _shortcut_gc(args, o: RichLog):
    await _git_add([], o)
    await _git_commit(args, o)


async def _shortcut_gp(args, o: RichLog):
    await _git_push(args, o)


async def _shortcut_gpo(_a, o: RichLog):
    await _git_push(["origin"], o)


async def _shortcut_gpl(_a, o: RichLog):
    await _git_pull([], o)


async def _shortcut_gl(_a, o: RichLog):
    await _git_log([], o)


async def _shortcut_gd(_a, o: RichLog):
    await _git_diff([], o)


async def _shortcut_gpr(args, o: RichLog):
    if args:
        await _git_pr(args, o)
    else:
        await _git_pr(["create"], o)


def register(registry: dict):
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
