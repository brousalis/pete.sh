"""armhr-cli: Textual TUI for armhr development.

Split-pane log viewer with a command input bar. Servers run as detached
subprocesses writing to log files; Textual workers tail those files into
RichLog panels. Commands stream output into a dedicated output panel.
"""

import atexit
import queue
import shlex
import threading
from collections.abc import Callable, Coroutine
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from rich.text import Text
from textual import events, on, work
from textual.app import App, ComposeResult
from textual.containers import Horizontal, Vertical, VerticalScroll
from textual.geometry import Offset
from textual.screen import Screen
from textual.widgets import (
    Button,
    Collapsible,
    DataTable,
    Footer,
    Input,
    Label,
    RichLog,
    Select,
    Static,
    Switch,
    TabbedContent,
    TabPane,
)
from textual_autocomplete import AutoComplete, DropdownItem

from armhr_cli.commands import auth, backend, env, frontend, git, servers


class DropUp(AutoComplete):
    """AutoComplete that opens upward (above the input)."""

    def _align_to_target(self) -> None:
        x, y = self.target.cursor_screen_offset
        dropdown = self.option_list
        _width, height = dropdown.outer_size
        # Place above: subtract the dropdown height from the cursor y
        y = max(0, y - height)
        x = max(0, x - 1)
        self.absolute_offset = Offset(x, y)


# ---------------------------------------------------------------------------
# Command Registry
# ---------------------------------------------------------------------------

CommandHandler = Callable[[list[str], RichLog], Coroutine[Any, Any, None]]

REGISTRY: dict[str, CommandHandler] = {}


def _build_registry():
    """Populate the command registry from all command modules."""
    auth.register(REGISTRY)
    backend.register(REGISTRY)
    env.register(REGISTRY)
    frontend.register(REGISTRY)
    git.register(REGISTRY)
    servers.register(REGISTRY)


# ---------------------------------------------------------------------------
# Autocomplete candidates
# ---------------------------------------------------------------------------

# (command_string, description) pairs for the dropdown
_COMMAND_DEFS: list[tuple[str, str]] = [
    # Server management
    ("start", "Start all servers"),
    ("start be", "Start backend server"),
    ("start fe", "Start frontend server"),
    ("down", "Stop all servers"),
    ("down be", "Stop backend server"),
    ("down fe", "Stop frontend server"),
    ("status", "Show server status"),
    # Environment presets
    ("env", "Show active env presets"),
    ("env init", "Seed presets.toml from .env"),
    ("env backup", "Backup current .env"),
    ("env auth0", "Auth0 presets"),
    ("env prism", "PrismHR presets"),
    ("env db", "Database presets"),
    # Authentication
    ("auth", "Show auth status"),
    ("auth login", "Login via browser (OAuth PKCE)"),
    ("auth status", "Show auth token status"),
    ("auth logout", "Clear cached auth token"),
    ("auth token", "Set token manually"),
    ("auth config", "Show Auth0 configuration"),
    # Built-ins
    ("clear", "Clear all panels"),
    ("help", "Show help"),
    ("quit", "Exit the CLI"),
    # Git shortcuts
    ("gs", "Git status (both repos)"),
    ("ga", "Git add (both repos)"),
    ("gc", "Git add + commit"),
    ("gp", "Git push"),
    ("gpo", "Git push -u origin"),
    ("gpl", "Git pull"),
    ("gl", "Git log"),
    ("gd", "Git diff"),
    ("gpr", "Create pull request"),
    ("gpr create", "Create pull request"),
    # Git full commands
    ("git status", "Git status"),
    ("git add", "Stage all changes"),
    ("git commit", "Commit changes"),
    ("git push", "Push to remote"),
    ("git pull", "Pull from remote"),
    ("git log", "Show commit log"),
    ("git diff", "Show diff"),
    ("git pr", "Pull request commands"),
]


def _build_command_defs() -> list[tuple[str, str]]:
    """Build the full list of command definitions including dynamic ones."""
    from armhr_cli.config import FRONTEND_APPS
    from armhr_cli.services.envfile import list_presets

    defs = list(_COMMAND_DEFS)

    # Environment preset combos (env <group> <preset>)
    for group, preset_names in list_presets().items():
        for preset_name in preset_names:
            defs.append((f"env {group} {preset_name}", f"Switch {group} to {preset_name}"))

    # Backend sub-commands
    be_cmds = [
        ("be serve", "Start backend server (foreground)"),
        ("be dev", "Backend dev mode"),
        ("be local", "Backend local mode"),
        ("be worker", "Run procrastinate worker"),
        ("be subscriptions", "Run subscriptions service"),
        ("be lint", "Run pre-commit + pyright"),
        ("be test", "Run all pytest"),
        ("be test hcm", "Run HCM tests"),
        ("be test quote", "Run quote tests"),
        ("be test start", "Run start tests"),
        ("be test ops", "Run ops tests"),
        ("be migrate", "Run DB migrations"),
        ("be rollback", "Rollback last migration"),
        ("be install", "Install Python deps"),
        ("be sync", "Sync deps + requirements"),
        ("be shell", "Launch ptpython REPL"),
        ("be sso", "AWS SSO login"),
        ("be setup", "Run dev setup"),
        ("be run", "Run arbitrary module via uv"),
        ("be load-reports", "Load all reports"),
        ("be check-sso", "Check SSO session"),
    ]
    defs.extend(be_cmds)

    # Frontend sub-commands
    fe_base = [
        ("fe start", "Start frontend dev server"),
        ("fe build", "Build frontend"),
        ("fe lint", "Run eslint"),
        ("fe test", "Run vitest"),
        ("fe watch", "Run tests in watch mode"),
        ("fe tsc", "TypeScript type check"),
        ("fe prettier", "Run prettier"),
        ("fe setup", "Run frontend setup"),
        ("fe install", "Install yarn deps"),
    ]
    defs.extend(fe_base)

    # App-scoped frontend variants
    for app in FRONTEND_APPS:
        defs.append((f"fe start {app}", f"Start {app} dev server"))
        defs.append((f"fe build {app}", f"Build {app}"))
        defs.append((f"fe lint {app}", f"Lint {app}"))
        defs.append((f"fe test {app}", f"Test {app}"))
        defs.append((f"fe watch {app}", f"Watch {app} tests"))

    return defs


# Cached dropdown items built on mount
_DROPDOWN_ITEMS: list[DropdownItem] = []


# ---------------------------------------------------------------------------
# Log queue — tail threads push here, a timer on the main thread drains it
# ---------------------------------------------------------------------------

_log_queue: queue.Queue[tuple[str, str]] = queue.Queue()
_DRAIN_BATCH = 20


# ---------------------------------------------------------------------------
# Textual App
# ---------------------------------------------------------------------------


class HelpScreen(Screen):
    """Modal overlay showing categorised command reference."""

    BINDINGS = [
        ("escape", "dismiss", "Close"),
        ("q", "dismiss", "Close"),
    ]

    DEFAULT_CSS = """
    HelpScreen {
        align: center middle;
        background: $background;
    }
    #help-dialog {
        width: 90;
        height: 55;
        max-height: 95%;
        background: $surface;
        border: round $primary;
        padding: 1 2;
    }
    #help-title {
        text-align: center;
        text-style: bold;
        color: $text;
        width: 100%;
    }
    #help-scroll {
        height: 1fr;
    }
    #help-content {
        height: auto;
        overflow: hidden;
    }
    #help-footer {
        text-align: center;
        color: $text-muted;
        width: 100%;
    }
    """

    def compose(self) -> ComposeResult:
        from textual.containers import Vertical

        with Vertical(id="help-dialog"):
            yield Static("[bold cyan]▄▀▄ █▀▄ █▄ ▄█ █▄█ █▀▄[/]\n[bold cyan]█▀█ █▀▄ █ ▀ █ █ █ █▀▄[/]", id="help-title")
            with VerticalScroll(id="help-scroll"):
                yield RichLog(id="help-content", markup=True, wrap=True, auto_scroll=False)
            yield Static("[dim]Esc / q to close[/]", id="help-footer")

    def on_mount(self) -> None:
        from rich import box
        from rich.console import Group
        from rich.panel import Panel
        from rich.table import Table

        log = self.query_one("#help-content", RichLog)

        def _section(title: str, rows: list[tuple[str, str]], border_style: str = "dim") -> Panel:
            tbl = Table(show_header=False, box=None, padding=(0, 1), expand=True)
            tbl.add_column("cmd", style="bold cyan", no_wrap=True)
            tbl.add_column("desc", style="dim")
            for cmd, desc in rows:
                tbl.add_row(cmd, desc)
            return Panel(
                tbl,
                title=f"[bold]{title}[/]",
                border_style=border_style,
                box=box.ROUNDED,
                padding=(0, 0),
                expand=True,
            )

        log.write(
            Group(
                _section(
                    "Servers",
                    [
                        ("start [be|fe]", "Start servers"),
                        ("down [be|fe]", "Stop servers"),
                        ("status", "Show running"),
                    ],
                    border_style="green",
                ),
                _section(
                    "Backend",
                    [
                        ("be serve/dev/local", "Server modes"),
                        ("be worker", "Worker"),
                        ("be subscriptions", "Subscriptions"),
                        ("be test [scope]", "Pytest"),
                        ("be lint", "Lint + pyright"),
                        ("be migrate/rollback", "Migrations"),
                        ("be sync/install", "Dependencies"),
                        ("be shell/sso/setup", "Utilities"),
                    ],
                    border_style="cyan",
                ),
                _section(
                    "Frontend",
                    [
                        ("fe start [app]", "Dev server"),
                        ("fe build [app]", "Prod build"),
                        ("fe lint/prettier", "Lint & format"),
                        ("fe test/watch", "Tests"),
                        ("fe tsc", "Type check"),
                        ("fe install/setup", "Dependencies"),
                    ],
                    border_style="yellow",
                ),
                _section(
                    "Environment",
                    [
                        ("env", "Active presets"),
                        ("env <grp> <pre>", "Swap + restart"),
                        ("env init", "Seed from .env"),
                    ],
                    border_style="magenta",
                ),
                _section(
                    "Git",
                    [
                        ("gs", "Status"),
                        ("ga", "Stage all"),
                        ("gc [msg]", "Commit"),
                        ("gp / gpo", "Push"),
                        ("gpl", "Pull"),
                        ("gl / gd", "Log / diff"),
                        ("gpr", "Pull request"),
                    ],
                    border_style="blue",
                ),
                _section(
                    "General",
                    [
                        ("clear", "Clear panels"),
                        ("help / ?", "This modal"),
                        ("ctrl+q", "Quit"),
                        ("f1/f2/f3", "Focus panel"),
                        ("esc", "Restore"),
                    ],
                    border_style="dim",
                ),
            )
        )


class SettingsScreen(Screen):
    """Tabbed settings modal — Preferences, Keybindings, Presets."""

    BINDINGS = [
        ("escape", "dismiss", "Close"),
        ("q", "dismiss", "Close"),
    ]

    DEFAULT_CSS = """
    SettingsScreen {
        align: center middle;
        background: $background;
    }
    #settings-dialog {
        width: 90;
        height: 85%;
        background: $surface;
        border: round $accent;
        padding: 1 2;
    }
    #settings-title {
        text-align: center;
        text-style: bold;
        color: $text;
        width: 100%;
    }
    #settings-footer {
        text-align: center;
        color: $text-muted;
        width: 100%;
    }
    #settings-tabs {
        height: 1fr;
        padding: 0 1;
    }

    /* ── Preferences tab ── */
    .pref-row {
        height: 3;
        padding: 0 1;
    }
    .pref-label {
        width: 1fr;
        padding: 1 0 0 0;
    }
    .pref-desc {
        width: auto;
        padding: 1 2 0 0;
        color: $text-muted;
    }
    .pref-restart {
        width: auto;
        padding: 1 1 0 0;
        color: $warning;
    }
    .pref-switch {
        width: auto;
    }

    /* ── Keybindings tab ── */
    .kb-row {
        height: 3;
        padding: 0 1;
    }
    .kb-action {
        width: 1fr;
        padding: 1 0 0 0;
    }
    .kb-key {
        width: auto;
        padding: 1 1 0 0;
        color: $accent;
        text-style: bold;
    }
    .kb-edit-btn {
        width: 8;
        min-width: 8;
        height: 3;
        margin: 0;
        border: none;
        background: $surface-lighten-1;
        color: $text-muted;
    }
    .kb-edit-btn:hover {
        background: $surface-lighten-2;
        color: $text;
    }
    .kb-input {
        width: 20;
        display: none;
    }
    .kb-input.editing {
        display: block;
    }
    .kb-note {
        color: $text-muted;
        padding: 1;
    }

    /* ── Presets tab ── */
    #presets-log {
        height: 1fr;
    }

    /* ── Cleanup tab ── */
    #cleanup-container {
        height: 1fr;
        padding: 0;
    }
    #cleanup-header {
        height: 3;
        padding: 0 1;
    }
    #cleanup-header-label {
        width: 1fr;
        padding: 1 0 0 0;
        text-style: bold;
    }
    #btn-scan {
        width: 10;
        min-width: 10;
        height: 3;
        margin: 0;
        border: none;
        background: $surface-lighten-1;
        color: $text-muted;
    }
    #btn-scan:hover {
        background: $surface-lighten-2;
        color: $text;
    }
    #btn-scan.scanning {
        color: $warning;
    }
    #cleanup-results {
        height: 1fr;
        overflow-y: auto;
        padding: 0;
    }
    .cleanup-empty {
        text-align: center;
        color: $text-muted;
        padding: 4 1;
        width: 100%;
    }
    .cleanup-group-hdr {
        padding: 1 1 0 1;
        text-style: bold;
        color: $text;
        width: 100%;
    }
    .cleanup-col-hdr {
        height: 2;
        padding: 0 1;
        color: $text-muted;
    }
    .cleanup-col-svc {
        width: 14;
        padding: 0 0 0 0;
    }
    .cleanup-col-port {
        width: 8;
    }
    .cleanup-col-pid {
        width: 10;
    }
    .cleanup-col-cmd {
        width: 1fr;
    }
    .cleanup-col-act {
        width: 8;
    }
    .cleanup-row {
        height: 3;
        padding: 0 1;
    }
    .cleanup-row:hover {
        background: $surface-lighten-1;
    }
    .cleanup-svc {
        width: 14;
        padding: 1 0 0 0;
    }
    .cleanup-port {
        width: 8;
        padding: 1 0 0 0;
        color: $accent;
        text-style: bold;
    }
    .cleanup-pid {
        width: 10;
        padding: 1 0 0 0;
        color: $text-muted;
    }
    .cleanup-cmd {
        width: 1fr;
        padding: 1 0 0 0;
        color: $text-muted;
    }
    .cleanup-kill {
        width: 8;
        min-width: 8;
        height: 3;
        margin: 0;
        border: none;
        background: $error;
        color: $text;
    }
    .cleanup-kill:hover {
        background: $error-lighten-1;
    }
    .cleanup-divider {
        height: 1;
        margin: 0 1;
        background: $surface-lighten-1;
    }
    """

    _editing_action: str | None = None

    def compose(self) -> ComposeResult:
        from textual.containers import Vertical

        from armhr_cli.services.settings import get_keybinding, get_pref

        pref_meta: list[tuple[str, str, bool]] = [
            ("clear_logs_on_start", "Clear log files on server start", False),
            ("clear_output_on_cmd", "Clear output panel on each command", False),
            ("input_at_top", "Place input bar at top (restart required)", True),
            ("stacked_logs", "Stack log panels full-width (restart required)", True),
        ]

        kb_meta: list[tuple[str, str]] = [
            ("quit", "Quit"),
            ("clear_output", "Clear output"),
            ("focus_backend", "Focus backend"),
            ("focus_frontend", "Focus frontend"),
            ("focus_output", "Focus output"),
            ("restore_panels", "Restore panels"),
        ]

        with Vertical(id="settings-dialog"):
            yield Static("[bold]⚙ Settings[/]", id="settings-title")
            with TabbedContent(id="settings-tabs"):
                # ── Preferences tab ──
                with TabPane("Preferences", id="tab-prefs"):
                    for key, desc, restart in pref_meta:
                        with Horizontal(classes="pref-row"):
                            yield Label(desc, classes="pref-label")
                            if restart:
                                yield Label("↻", classes="pref-restart")
                            yield Switch(
                                value=get_pref(key),
                                id=f"sw-{key}",
                                classes="pref-switch",
                            )

                # ── Keybindings tab ──
                with TabPane("Keybindings", id="tab-keys"):
                    for action, label in kb_meta:
                        current = get_keybinding(action)
                        with Horizontal(classes="kb-row"):
                            yield Label(label, classes="kb-action")
                            yield Label(current, id=f"kbl-{action}", classes="kb-key")
                            yield Input(
                                placeholder="key...",
                                id=f"kbi-{action}",
                                classes="kb-input",
                            )
                            yield Button("edit", id=f"kbe-{action}", classes="kb-edit-btn")
                    yield Static(
                        "[dim]↻ Keybinding changes take effect on restart.[/]",
                        classes="kb-note",
                    )

                # ── Presets tab ──
                with TabPane("Presets", id="tab-presets"):
                    yield RichLog(
                        id="presets-log",
                        markup=True,
                        wrap=True,
                        auto_scroll=False,
                    )

                # ── Cleanup tab ──
                with TabPane("Cleanup", id="tab-cleanup"):
                    with Vertical(id="cleanup-container"):
                        with Horizontal(id="cleanup-header"):
                            yield Static(
                                "Scan monitored ports for orphaned processes",
                                id="cleanup-header-label",
                            )
                            yield Button("↻ Scan", id="btn-scan")
                        with VerticalScroll(id="cleanup-results"):
                            yield Static(
                                "[dim]Press [bold]↻ Scan[/bold] or switch to this tab to scan ports…[/]",
                                classes="cleanup-empty",
                            )

            yield Static("[dim]Esc / q to close[/]", id="settings-footer")

    def on_mount(self) -> None:
        self._render_presets()

    # ── Preference toggles ──

    @on(Switch.Changed)
    def _on_pref_toggle(self, event: Switch.Changed) -> None:
        from armhr_cli.services.settings import set_pref

        switch_id = event.switch.id or ""
        if not switch_id.startswith("sw-"):
            return
        key = switch_id[3:]  # strip "sw-"
        set_pref(key, event.value)

    # ── Keybinding editing ──

    @on(Button.Pressed, ".kb-edit-btn")
    def _on_kb_edit(self, event: Button.Pressed) -> None:
        btn_id = event.button.id or ""
        action = btn_id.replace("kbe-", "")

        # Hide any previously open input
        if self._editing_action and self._editing_action != action:
            prev_input = self.query_one(f"#kbi-{self._editing_action}", Input)
            prev_input.remove_class("editing")

        inp = self.query_one(f"#kbi-{action}", Input)
        if inp.has_class("editing"):
            inp.remove_class("editing")
            self._editing_action = None
        else:
            inp.add_class("editing")
            inp.value = ""
            inp.focus()
            self._editing_action = action

    @on(Input.Submitted, ".kb-input")
    def _on_kb_submit(self, event: Input.Submitted) -> None:
        from armhr_cli.services.settings import set_keybinding

        input_id = event.input.id or ""
        action = input_id.replace("kbi-", "")
        new_key = event.value.strip()

        if new_key:
            set_keybinding(action, new_key)
            label = self.query_one(f"#kbl-{action}", Label)
            label.update(new_key)

        event.input.remove_class("editing")
        self._editing_action = None

    # ── Presets rendering ──

    def _render_presets(self) -> None:
        from rich import box
        from rich.console import Group
        from rich.panel import Panel
        from rich.table import Table

        from armhr_cli.services.envfile import (
            identify_active_preset,
            load_presets,
        )

        log = self.query_one("#presets-log", RichLog)
        all_presets = load_presets()

        if not all_presets:
            log.write("[dim]No presets found. Run [bold]env init[/bold] to seed from .env[/]")
            return

        panels: list[Panel] = []
        for group, presets in all_presets.items():
            active, _ = identify_active_preset(group)

            tbl = Table(box=box.SIMPLE, expand=True, padding=(0, 1))
            tbl.add_column("Preset", style="bold", no_wrap=True)
            tbl.add_column("Variable", style="cyan", no_wrap=True)
            tbl.add_column("Value", style="dim")

            for preset_name, kvs in presets.items():
                is_active = preset_name == active
                first = True
                for k, v in kvs.items():
                    if first:
                        name_str = f"[green]● {preset_name}[/]" if is_active else f"  {preset_name}"
                        first = False
                    else:
                        name_str = ""
                    display_v = f"…{v[-20:]}" if len(v) > 24 else v
                    tbl.add_row(name_str, k, display_v)
                # Add a blank separator between presets
                if kvs:
                    tbl.add_row("", "", "")

            border = "cyan" if group == "auth0" else "yellow" if group == "prism" else "magenta"
            panels.append(
                Panel(
                    tbl,
                    title=f"[bold]{group}[/]",
                    border_style=border,
                    box=box.ROUNDED,
                    padding=(0, 0),
                    expand=True,
                )
            )

        log.write(Group(*panels))
        log.write("")
        log.write("[dim][green]●[/] = currently active preset[/]")

    # ── Cleanup tab ──

    _cleanup_scanned: bool = False

    @on(TabbedContent.TabActivated)
    def _on_tab_switch(self, event: TabbedContent.TabActivated) -> None:
        """Auto-scan when the Cleanup tab is first activated."""
        if event.pane.id == "tab-cleanup" and not self._cleanup_scanned:
            self._cleanup_scanned = True
            self._run_scan()

    @on(Button.Pressed, "#btn-scan")
    def _on_scan_pressed(self, event: Button.Pressed) -> None:
        self._run_scan()

    @work(exclusive=True, group="cleanup-scan")
    async def _run_scan(self) -> None:
        from armhr_cli.services.ports import scan_ports

        scan_btn = self.query_one("#btn-scan", Button)
        scan_btn.add_class("scanning")
        scan_btn.disabled = True
        scan_btn.label = "Scanning…"

        try:
            results = await scan_ports()
            await self._render_cleanup(results)
        finally:
            scan_btn.remove_class("scanning")
            scan_btn.disabled = False
            scan_btn.label = "↻ Scan"

    async def _render_cleanup(self, results: list) -> None:
        """Rebuild the cleanup results area with scanned port data."""
        container = self.query_one("#cleanup-results", VerticalScroll)

        # Await removal so the DOM is clear before mounting new widgets
        await container.remove_children()

        if not results:
            await container.mount(
                Static(
                    "[dim]No processes found on monitored ports.[/]",
                    classes="cleanup-empty",
                )
            )
            return

        # Group results by group label
        groups: dict[str, list] = {}
        for info in results:
            group_label = info.group.title()
            groups.setdefault(group_label, [])
            groups[group_label].append(info)

        widgets: list[Static | Horizontal] = []

        for group_label, items in groups.items():
            widgets.append(Static(f"[bold]▸ {group_label}[/]", classes="cleanup-group-hdr"))
            # Column headers
            widgets.append(
                Horizontal(
                    Label("Service", classes="cleanup-col-svc"),
                    Label("Port", classes="cleanup-col-port"),
                    Label("PID", classes="cleanup-col-pid"),
                    Label("Command", classes="cleanup-col-cmd"),
                    Label("", classes="cleanup-col-act"),
                    classes="cleanup-col-hdr",
                )
            )

            for info in items:
                widgets.append(
                    Horizontal(
                        Label(info.service, classes="cleanup-svc"),
                        Label(str(info.port), classes="cleanup-port"),
                        Label(str(info.pid), classes="cleanup-pid"),
                        Label(info.command, classes="cleanup-cmd"),
                        Button(
                            "Kill",
                            id=f"cleanup-kill-{info.pid}",
                            classes="cleanup-kill",
                        ),
                        classes="cleanup-row",
                    )
                )

            widgets.append(Static("", classes="cleanup-divider"))

        await container.mount_all(widgets)

    @on(Button.Pressed, ".cleanup-kill")
    def _on_kill_pressed(self, event: Button.Pressed) -> None:
        btn_id = event.button.id or ""
        pid_str = btn_id.replace("cleanup-kill-", "")
        try:
            pid = int(pid_str)
        except ValueError:
            return
        self._run_kill(pid)

    @work(exclusive=False, group="cleanup-kill")
    async def _run_kill(self, pid: int) -> None:
        from armhr_cli.services.ports import kill_port

        ok, msg = await kill_port(pid)
        if ok:
            self.notify(msg, severity="information")
        else:
            self.notify(msg, severity="error")

        # Re-scan after kill
        self._run_scan()


class ProxySearchScreen(Screen):
    """Modal to search Auth0 users and start a proxy session."""

    BINDINGS = [
        ("escape", "dismiss_or_back", "Back / Close"),
        ("q", "dismiss_or_back", "Back / Close"),
    ]

    DEFAULT_CSS = """
    ProxySearchScreen {
        align: center middle;
        background: $background;
    }
    #proxy-search-dialog {
        width: 100;
        height: 85%;
        background: $surface;
        border: round $accent;
        padding: 1 2;
    }
    #proxy-search-title {
        text-align: center;
        text-style: bold;
        color: $text;
        width: 100%;
    }
    #proxy-search-footer {
        text-align: center;
        color: $text-muted;
        width: 100%;
    }
    #proxy-search-input {
        margin: 1 0;
    }
    #proxy-search-table {
        height: 1fr;
    }
    #proxy-search-status {
        height: auto;
        color: $text-muted;
        padding: 0 0 1 0;
    }
    #proxy-confirm-view {
        display: none;
        height: 1fr;
    }
    #proxy-confirm-view.visible {
        display: block;
    }
    #proxy-search-view {
        height: 1fr;
    }
    #proxy-search-view.hidden {
        display: none;
    }
    #proxy-confirm-info {
        padding: 1 0;
    }
    #proxy-confirm-error {
        color: $error;
        padding: 0 0 1 0;
        display: none;
    }
    #proxy-confirm-error.visible {
        display: block;
    }
    .proxy-confirm-row {
        height: 3;
    }
    .proxy-confirm-label {
        width: 12;
        padding: 1 1 0 0;
        color: $text-muted;
    }
    #proxy-confirm-category {
        width: 1fr;
    }
    #proxy-confirm-note {
        margin: 1 0;
    }
    .proxy-confirm-buttons {
        height: 3;
        align: right middle;
    }
    #btn-proxy-confirm {
        margin: 0 0 0 1;
    }
    """

    _pending_query: str = ""
    _search_timer: object | None = None
    _search_results: list[dict] = []
    _selected_user: dict | None = None
    _step: str = "search"

    def compose(self) -> ComposeResult:
        from textual.containers import Vertical

        from armhr_cli.services.api import PROXY_CATEGORIES

        with Vertical(id="proxy-search-dialog"):
            yield Static("[bold]Start Proxy Session[/]", id="proxy-search-title")

            with Vertical(id="proxy-search-view"):
                yield Input(
                    placeholder="Search users by name, email, or ID...",
                    id="proxy-search-input",
                )
                yield DataTable(id="proxy-search-table", cursor_type="row")
                yield Static("", id="proxy-search-status")

            with Vertical(id="proxy-confirm-view"):
                yield Static("", id="proxy-confirm-info")
                yield Static("", id="proxy-confirm-error")
                with Horizontal(classes="proxy-confirm-row"):
                    yield Label("Category:", classes="proxy-confirm-label")
                    yield Select[str](
                        [(cat, cat) for cat in PROXY_CATEGORIES],
                        value=PROXY_CATEGORIES[0],
                        allow_blank=False,
                        id="proxy-confirm-category",
                    )
                yield Input(
                    placeholder="Optional note about this proxy session...",
                    id="proxy-confirm-note",
                )
                with Horizontal(classes="proxy-confirm-buttons"):
                    yield Button("Back", id="btn-proxy-back", variant="default")
                    yield Button("Confirm Proxy", id="btn-proxy-confirm", variant="success")

            yield Static("[dim]Esc to close[/]", id="proxy-search-footer")

    def on_mount(self) -> None:
        table = self.query_one("#proxy-search-table", DataTable)
        table.add_columns("Name", "Email", "User ID", "Client ID", "Prehire")
        self.query_one("#proxy-search-input", Input).focus()

    def action_dismiss_or_back(self) -> None:
        if self._step == "confirm":
            self._show_search_step()
        else:
            self.dismiss(None)

    # ── Search logic ──

    @on(Input.Changed, "#proxy-search-input")
    def _on_search_changed(self, event: Input.Changed) -> None:
        if self._search_timer is not None:
            self._search_timer.stop()
        self._pending_query = event.value.strip()
        if self._pending_query:
            self._search_timer = self.set_timer(0.3, self._trigger_search)
        else:
            table = self.query_one("#proxy-search-table", DataTable)
            table.clear()
            self._search_results = []
            self.query_one("#proxy-search-status", Static).update("")

    def _trigger_search(self) -> None:
        self._do_search(self._pending_query)

    @work(exclusive=True, group="proxy-search")
    async def _do_search(self, query: str) -> None:
        from armhr_cli.services import api

        status = self.query_one("#proxy-search-status", Static)
        status.update("[dim]Searching...[/]")

        result = await api.search_users(query, page=1, limit=20)

        table = self.query_one("#proxy-search-table", DataTable)
        table.clear()
        self._search_results = []

        if result is None:
            status.update("[red]Backend offline — start the backend first[/]")
            return

        users = result.get("users", [])
        total = result.get("total", 0)
        self._search_results = users

        for user in users:
            prehire = user.get("user_metadata", {}).get("prehire", False)
            table.add_row(
                user.get("name", "—"),
                user.get("email", "—"),
                str(user.get("userId", "—")),
                str(user.get("clientId", "—")),
                "Yes" if prehire else "No",
                key=user.get("id", ""),
            )

        status.update(f"[dim]Showing {len(users)} of {total} users[/]")

    # ── Row selection → confirm step ──

    @on(DataTable.RowSelected, "#proxy-search-table")
    def _on_user_selected(self, event: DataTable.RowSelected) -> None:
        row_key = str(event.row_key.value)
        user = next(
            (u for u in self._search_results if u.get("id") == row_key),
            None,
        )
        if user is None:
            return

        self._selected_user = user
        name = user.get("name", "Unknown")
        uid = user.get("userId", "—")
        cid = user.get("clientId", "—")
        prehire = "Yes" if user.get("user_metadata", {}).get("prehire") else "No"

        info_text = (
            f"[bold]{name}[/]\n\n"
            f"  [cyan]User ID:[/]    {uid}\n"
            f"  [cyan]Client ID:[/]  {cid}\n"
            f"  [cyan]Prehire:[/]    {prehire}"
        )

        self.query_one("#proxy-confirm-info", Static).update(info_text)
        self.query_one("#proxy-confirm-error").remove_class("visible")
        self._step = "confirm"
        self.query_one("#proxy-search-view").add_class("hidden")
        self.query_one("#proxy-confirm-view").add_class("visible")

    def _show_search_step(self) -> None:
        self._step = "search"
        self._selected_user = None
        self.query_one("#proxy-search-view").remove_class("hidden")
        self.query_one("#proxy-confirm-view").remove_class("visible")
        self.query_one("#proxy-search-input", Input).focus()

    # ── Confirm / cancel buttons ──

    @on(Button.Pressed, "#btn-proxy-back")
    def _on_back(self) -> None:
        self._show_search_step()

    @on(Button.Pressed, "#btn-proxy-confirm")
    def _on_confirm(self) -> None:
        if self._selected_user is None:
            return
        self._do_proxy_confirm()

    @work(exclusive=True, group="proxy-confirm")
    async def _do_proxy_confirm(self) -> None:
        from armhr_cli.services import api

        user = self._selected_user
        if user is None:
            return

        category = self.query_one("#proxy-confirm-category", Select).value
        note = self.query_one("#proxy-confirm-note", Input).value.strip() or None

        payload = {
            "proxy_user_id": user.get("id", ""),
            "proxy_prism_user_id": user.get("userId", ""),
            "proxy_prism_client_id": user.get("clientId", ""),
            "prehire_flag": bool(user.get("user_metadata", {}).get("prehire")),
            "category": str(category),
            "note": note,
            "expiration_duration": 15,
        }

        result = await api.set_proxy_user(payload)
        if result is not None:
            self.dismiss(True)
        else:
            err = self.query_one("#proxy-confirm-error", Static)
            err.update("[red]Failed to start proxy — check backend logs[/]")
            err.add_class("visible")


class ProxyMonitorScreen(Screen):
    """Modal showing active proxy sessions and audit history."""

    BINDINGS = [
        ("escape", "dismiss", "Close"),
        ("q", "dismiss", "Close"),
    ]

    DEFAULT_CSS = """
    ProxyMonitorScreen {
        align: center middle;
        background: $background;
    }
    #proxy-monitor-dialog {
        width: 100;
        height: 85%;
        background: $surface;
        border: round $accent;
        padding: 1 2;
    }
    #proxy-monitor-title {
        text-align: center;
        text-style: bold;
        color: $text;
        width: 100%;
    }
    #proxy-monitor-footer {
        text-align: center;
        color: $text-muted;
        width: 100%;
    }
    #proxy-monitor-tabs {
        height: 1fr;
    }
    #proxy-sessions-log, #proxy-audit-log {
        height: 1fr;
    }
    """

    def compose(self) -> ComposeResult:
        from textual.containers import Vertical

        with Vertical(id="proxy-monitor-dialog"):
            yield Static("[bold]Proxy Monitor[/]", id="proxy-monitor-title")
            with TabbedContent(id="proxy-monitor-tabs"):
                with TabPane("Sessions", id="tab-sessions"):
                    yield RichLog(
                        id="proxy-sessions-log",
                        markup=True,
                        wrap=True,
                        auto_scroll=False,
                    )
                with TabPane("Audit Log", id="tab-audit"):
                    yield RichLog(
                        id="proxy-audit-log",
                        markup=True,
                        wrap=True,
                        auto_scroll=False,
                    )
            yield Static("[dim]Esc / q to close[/]", id="proxy-monitor-footer")

    def on_mount(self) -> None:
        self._load_data()

    @work(exclusive=True)
    async def _load_data(self) -> None:
        await self._load_sessions()
        await self._load_audit()

    async def _load_sessions(self) -> None:
        from rich import box
        from rich.panel import Panel
        from rich.table import Table

        from armhr_cli.services import api

        log = self.query_one("#proxy-sessions-log", RichLog)
        sessions = await api.get_proxy_sessions()

        if sessions is None:
            log.write("[red]Backend offline — start the backend first[/]")
            return

        now = datetime.now(timezone.utc)
        active = [s for s in sessions if datetime.fromisoformat(s["session_expiration"]) > now]

        if not active:
            log.write("[dim]No active proxy sessions[/]")
            return

        tbl = Table(box=box.SIMPLE, expand=True, padding=(0, 1))
        tbl.add_column("Name", style="bold", no_wrap=True)
        tbl.add_column("User ID", style="cyan", no_wrap=True)
        tbl.add_column("Client ID", style="cyan", no_wrap=True)
        tbl.add_column("Remaining", no_wrap=True)
        tbl.add_column("Started", style="dim", no_wrap=True)

        for s in active:
            exp = datetime.fromisoformat(s["session_expiration"])
            start = datetime.fromisoformat(s["session_start"])
            remaining = (exp - now).total_seconds()
            mins = int(remaining // 60)
            secs = int(remaining % 60)

            if remaining > 300:
                time_style = "green"
            elif remaining > 60:
                time_style = "yellow"
            else:
                time_style = "red"

            tbl.add_row(
                s.get("name", "—"),
                s.get("proxy_prism_user_id", "—"),
                s.get("proxy_prism_client_id", "—"),
                f"[{time_style}]{mins}m {secs:02d}s[/]",
                start.strftime("%H:%M"),
            )

        log.write(
            Panel(
                tbl,
                title=f"[bold]{len(active)} Active Session{'s' if len(active) != 1 else ''}[/]",
                border_style="green",
                box=box.ROUNDED,
                expand=True,
            )
        )

    async def _load_audit(self) -> None:
        from rich import box
        from rich.panel import Panel
        from rich.table import Table

        from armhr_cli.services import api

        log = self.query_one("#proxy-audit-log", RichLog)
        audits = await api.get_proxy_audit_logs()

        if audits is None:
            log.write("[red]Backend offline[/]")
            return

        if not audits:
            log.write("[dim]No audit log entries[/]")
            return

        # Group by session_id
        grouped: dict[int, list[dict]] = {}
        for entry in audits:
            sid = entry.get("session_id")
            if sid is None:
                continue
            grouped.setdefault(sid, []).append(entry)

        action_styles = {
            "created": "green",
            "expired": "yellow",
            "terminated": "red",
            "purged": "blue",
        }

        for sid in sorted(grouped.keys(), reverse=True)[:20]:
            events = sorted(grouped[sid], key=lambda e: e.get("proxy_start", ""))
            first = events[0]

            tbl = Table(box=box.SIMPLE, expand=True, padding=(0, 1))
            tbl.add_column("Action", no_wrap=True)
            tbl.add_column("Time", style="dim", no_wrap=True)
            tbl.add_column("Note", style="dim")

            for ev in events:
                action = ev.get("action", "—")
                style = action_styles.get(action, "dim")
                created = ev.get("created_at", "")
                try:
                    ts = datetime.fromisoformat(created).strftime("%m/%d %H:%M")
                except Exception:
                    ts = created[:16] if created else "—"

                tbl.add_row(
                    f"[{style}]{action.upper()}[/]",
                    ts,
                    ev.get("note", "") or "",
                )

            name = first.get("name", "Unknown")
            uid = first.get("proxy_prism_user_id", "—")
            log.write(
                Panel(
                    tbl,
                    title=f"[bold]#{sid}[/] {name} · {uid}",
                    border_style="dim",
                    box=box.ROUNDED,
                    expand=True,
                )
            )


def _build_app_bindings() -> list[tuple[str, str, str]]:
    """Build the keybinding list from settings.toml (called once at import)."""
    from armhr_cli.services.settings import get_keybinding as kb

    return [
        (kb("quit"), "quit", "Quit"),
        (kb("clear_output"), "clear_output", "Clear output"),
        (kb("focus_backend"), "focus_panel('be-log')", "Backend"),
        (kb("focus_frontend"), "focus_panel('fe-log')", "Frontend"),
        (kb("focus_output"), "focus_panel('cmd-output')", "Output"),
        (kb("restore_panels"), "restore_panels", "Restore"),
        ("question_mark", "show_help", "Help"),
    ]


class ArmhrApp(App):
    """Interactive TUI for the armhr workspace."""

    TITLE = "armhr cli"
    CSS_PATH = "styles.tcss"

    BINDINGS = _build_app_bindings()

    _tailer_keys: set[str] = set()
    _tailer_threads: list[threading.Thread] = []
    _tailer_stop: threading.Event = threading.Event()
    _focused_panel: str | None = None  # "be-log", "fe-log", or None
    _active_section: str = "cmd-output"  # last clicked log panel
    _env_select_syncing: bool = True  # Start True; cleared after mount
    _env_mode: str = "individual"  # "individual" or "full"
    _proxy_sessions: list[dict] = []
    _proxy_primary: dict | None = None  # first active session for the bar
    _proxy_auth_needed: bool = False  # True when auth0 enabled + no token

    @staticmethod
    def _initial_env_options(group: str) -> tuple[list[tuple[str, str]], str | object]:
        """Return (options, initial_value) for a group's Select widget."""
        from armhr_cli.config import PRESETS_FILE
        from armhr_cli.services.envfile import identify_active_preset, list_presets

        if not PRESETS_FILE.exists():
            return [("n/a", "n/a")], "n/a"

        all_presets = list_presets()
        preset_names = all_presets.get(group, [])
        if not preset_names:
            return [("n/a", "n/a")], "n/a"

        options: list[tuple[str, str]] = [(name, name) for name in preset_names]
        active, _ = identify_active_preset(group)
        if active != "custom" and active in preset_names:
            return options, active
        return options, preset_names[0]

    @staticmethod
    def _build_env_summary_text() -> str:
        """Build the Rich markup string for the env-summary Static widget."""
        from armhr_cli.services.envfile import env_summary_values

        parts: list[str] = []
        for label, val in env_summary_values():
            parts.append(f"[dim]{label}:[/] {val}")
        return "  ".join(parts) if parts else ""

    @staticmethod
    def _initial_full_env_options() -> tuple[list[tuple[str, str]], str | object]:
        """Return (options, initial_value) for the full-preset Select widget."""
        from armhr_cli.config import PRESETS_FILE
        from armhr_cli.services.envfile import (
            identify_active_full_preset,
            list_full_presets,
        )

        if not PRESETS_FILE.exists():
            return [("n/a", "n/a")], "n/a"

        names = list_full_presets()
        if not names:
            return [("n/a", "n/a")], "n/a"

        options: list[tuple[str, str]] = [(n, n) for n in names]
        active = identify_active_full_preset()
        if active and active in names:
            return options, active
        return options, names[0]

    def compose(self) -> ComposeResult:
        from armhr_cli.config import INPUT_AT_TOP, STACKED_LOGS

        with Horizontal(id="env-bar", classes="input-top" if INPUT_AT_TOP else ""):
            yield Static(
                "[bold #b0d9ff]a[/][bold #9ecefe]r[/][bold #8cc3fe]m[/][bold #7ab8fd]h[/][bold #68adfd]r[/][bold #569ffc]-[/][bold #4398fc]c[/][bold #2e8efc]l[/][bold #1789fc]i[/] [#1789fc]◆[/] ",
                id="logo",
            )
            # Individual mode widgets (shown by default)
            for group in ("auth0", "prism", "db"):
                yield Label(f"{group}:", classes="env-label env-individual")
                options, initial = self._initial_env_options(group)
                yield Select[str](
                    options,
                    value=initial,
                    allow_blank=False,
                    id=f"sel-{group}",
                    classes="env-select env-individual",
                )
            # Full mode widget (hidden by default via CSS)
            yield Label("env:", classes="env-label env-full")
            full_options, full_initial = self._initial_full_env_options()
            yield Select[str](
                full_options,
                value=full_initial,
                allow_blank=False,
                id="sel-full",
                classes="env-select env-full",
            )
            yield Static(
                self._build_env_summary_text(),
                id="env-summary",
                classes="env-full",
            )
            yield Button("≡", id="btn-env-toggle", classes="btn-env-toggle")
            yield Button("BE", id="btn-be", classes="btn-server stopped")
            yield Button("FE", id="btn-fe", classes="btn-server stopped")
            yield Button("Proxy", id="btn-proxy", classes="btn-proxy")
            yield Button("⚙️", id="btn-settings", classes="btn-icon")

        with Horizontal(id="proxy-bar"):
            yield Static("[dim]○ proxy[/]", id="proxy-status")
            yield Static("[dim]  loading...[/]", id="proxy-info")
            yield Button("End", id="btn-proxy-end", classes="btn-proxy-end")

        cmd_input = Input(
            placeholder="Type a command (help for list)",
            id="cmd-input",
        )

        LogContainer = Vertical if STACKED_LOGS else Horizontal

        if INPUT_AT_TOP:
            with Horizontal(id="input-bar"):
                yield Static("❯", id="prompt-char")
                yield cmd_input
            yield AutoComplete(cmd_input, candidates=self._get_candidates)
            with Collapsible(title="output", id="col-output", collapsed=False):
                yield RichLog(id="cmd-output", markup=True, wrap=True, max_lines=1000, auto_scroll=True)
            with LogContainer(id="log-panels", classes="stacked" if STACKED_LOGS else ""):
                with Collapsible(title="backend", id="col-be", collapsed=False):
                    yield RichLog(id="be-log", markup=False, wrap=True, max_lines=1000, auto_scroll=True)
                with Collapsible(title="frontend", id="col-fe", collapsed=False):
                    yield RichLog(id="fe-log", markup=False, wrap=True, max_lines=1000, auto_scroll=True)
        else:
            with LogContainer(id="log-panels", classes="stacked" if STACKED_LOGS else ""):
                with Collapsible(title="backend", id="col-be", collapsed=False):
                    yield RichLog(id="be-log", markup=False, wrap=True, max_lines=1000, auto_scroll=True)
                with Collapsible(title="frontend", id="col-fe", collapsed=False):
                    yield RichLog(id="fe-log", markup=False, wrap=True, max_lines=1000, auto_scroll=True)
            with Collapsible(title="output", id="col-output", collapsed=False):
                yield RichLog(id="cmd-output", markup=True, wrap=True, max_lines=1000, auto_scroll=True)

        if not INPUT_AT_TOP:
            with Horizontal(id="input-bar"):
                yield Static("❯", id="prompt-char")
                yield cmd_input
            yield DropUp(cmd_input, candidates=self._get_candidates)

        yield Footer()

    def on_mount(self) -> None:
        global _DROPDOWN_ITEMS
        _build_registry()
        defs = _build_command_defs()
        _DROPDOWN_ITEMS = [DropdownItem(main=cmd) for cmd, _desc in defs]

        # Startup banner
        output = self.query_one("#cmd-output", RichLog)
        output.write("[bold cyan]▄▀▄ █▀▄ █▄ ▄█ █▄█ █▀▄[/]")
        output.write("[bold cyan]█▀█ █▀▄ █ ▀ █ █ █ █▀▄[/]")
        output.write("[dim]Type [bold]help[/bold] for commands · [bold]start[/bold] to launch servers[/]")
        output.write("")

        self.query_one("#cmd-input", Input).focus()

        self.set_interval(0.2, self._drain_log_queue)
        self.set_interval(1.0, self._refresh_ui_state)
        self.set_interval(5.0, self._refresh_proxy_bar)
        self._start_tailers()
        # Allow initial Select.Changed events from compose to be ignored
        self.set_timer(0.5, self._clear_env_sync_flag)
        # Initial proxy bar refresh
        self.set_timer(1.0, self._refresh_proxy_bar)

    @staticmethod
    def _get_candidates(_state) -> list[DropdownItem]:
        """Return all command candidates for the autocomplete dropdown."""
        return _DROPDOWN_ITEMS

    # ------------------------------------------------------------------
    # Log queue drain (runs on main thread via set_interval)
    # Alternates between be/fe each tick to avoid repainting both
    # side-by-side panels in the same frame.
    # ------------------------------------------------------------------

    _drain_turn: str = "be"

    def _drain_log_queue(self) -> None:
        target_key = self._drain_turn
        self._drain_turn = "fe" if target_key == "be" else "be"

        try:
            panel = self.query_one("#be-log" if target_key == "be" else "#fe-log", RichLog)
        except Exception:
            return  # Log panels not on active screen; lines stay in queue

        written = 0
        requeue: list[tuple[str, str]] = []

        for _ in range(_DRAIN_BATCH):
            try:
                key, text = _log_queue.get_nowait()
            except queue.Empty:
                break
            if key == target_key:
                panel.write(Text.from_ansi(text))
                written += 1
            else:
                requeue.append((key, text))

        # Put back lines for the other panel
        for item in requeue:
            _log_queue.put(item)

    # ------------------------------------------------------------------
    # Input handling
    # ------------------------------------------------------------------

    def on_input_submitted(self, event: Input.Submitted) -> None:
        cmd = event.value.strip()
        event.input.clear()
        if not cmd:
            return
        self._dispatch_command(cmd)

    @work(exclusive=False, group="cmd")
    async def _dispatch_command(self, cmd: str) -> None:
        from armhr_cli.services.settings import get_pref

        output = self.query_one("#cmd-output", RichLog)
        if get_pref("clear_output_on_cmd"):
            output.clear()
        output.write(f"[bold cyan]> {cmd}[/]")

        try:
            parts = shlex.split(cmd)
        except ValueError:
            parts = cmd.split()

        if not parts:
            return

        command = parts[0].lower()
        args = parts[1:]

        if command in ("exit", "quit", "q"):
            self._exit_app()
            return

        if command in ("clear", "cls"):
            self.query_one("#cmd-output", RichLog).clear()
            self.query_one("#be-log", RichLog).clear()
            self.query_one("#fe-log", RichLog).clear()
            return

        if command in ("help", "?", "h"):
            self.push_screen(HelpScreen())
            return

        handler = REGISTRY.get(command)
        if handler:
            await handler(args, output)
            if command in ("start", "up", "down", "env"):
                self._start_tailers()
            if command == "env":
                self._refresh_env_selects()
                self._rebuild_dropdown_items()
            if command == "auth":
                # Refresh proxy bar after auth changes (login/logout/token)
                self.set_timer(0.5, self._refresh_proxy_bar)
        else:
            output.write(f"[red]✗[/] Unknown: {command}")
            output.write("[dim]Type 'help' for commands[/]")

    # ------------------------------------------------------------------
    # Log file tailers (plain threads, no call_from_thread)
    # ------------------------------------------------------------------

    def _start_tailers(self) -> None:
        from armhr_cli.commands.servers import _processes

        for key, mp in _processes.items():
            base_key = key.split(":")[0]
            if base_key in ("be", "fe") and mp.log_file.exists():
                if key not in self._tailer_keys:
                    self._tailer_keys.add(key)
                    t = threading.Thread(
                        target=_tail_log_thread,
                        args=(base_key, mp.log_file, self._tailer_stop),
                        daemon=True,
                    )
                    self._tailer_threads.append(t)
                    t.start()

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def _exit_app(self) -> None:
        self._tailer_stop.set()
        self.exit()

    def action_quit(self) -> None:
        self._exit_app()

    def action_clear_output(self) -> None:
        self.query_one(f"#{self._active_section}", RichLog).clear()

    def action_show_help(self) -> None:
        self.push_screen(HelpScreen())

    # Map panel IDs to their Collapsible wrapper IDs
    _PANEL_TO_COL: dict[str, str] = {
        "be-log": "col-be",
        "fe-log": "col-fe",
        "cmd-output": "col-output",
    }

    def action_focus_panel(self, panel_id: str) -> None:
        """Maximize one panel, collapse the others."""
        self._focused_panel = panel_id
        self._active_section = panel_id

        log_panels = self.query_one("#log-panels")
        col_output = self.query_one("#col-output", Collapsible)

        if panel_id == "cmd-output":
            # Focusing output — hide log panels, show output
            log_panels.display = False
            col_output.collapsed = False
            col_output.display = True
        else:
            # Focusing a log panel — show log panels, hide output
            log_panels.display = True
            col_output.display = False
            # Collapse the sibling log panel
            for pid, col_id in self._PANEL_TO_COL.items():
                if col_id in ("col-be", "col-fe"):
                    col = self.query_one(f"#{col_id}", Collapsible)
                    col.collapsed = pid != panel_id

    def action_restore_panels(self) -> None:
        """Restore all panels to their default size."""
        self._focused_panel = None
        log_panels = self.query_one("#log-panels")
        log_panels.display = True
        for col_id in self._PANEL_TO_COL.values():
            col = self.query_one(f"#{col_id}", Collapsible)
            col.collapsed = False
            col.display = True
        self.query_one("#cmd-input", Input).focus()

    @on(Collapsible.Toggled)
    def _on_panel_toggled(self, event: Collapsible.Toggled) -> None:
        """Redistribute space when panels are collapsed/expanded."""
        col_id = event.collapsible.id or ""
        if col_id not in ("col-be", "col-fe", "col-output"):
            return
        col_be = self.query_one("#col-be", Collapsible)
        col_fe = self.query_one("#col-fe", Collapsible)
        log_panels = self.query_one("#log-panels")
        both_logs_collapsed = col_be.collapsed and col_fe.collapsed
        log_panels.styles.height = "auto" if both_logs_collapsed else "3fr"

    @on(events.Click, "#be-log")
    def _on_click_be_log(self) -> None:
        self._active_section = "be-log"

    @on(events.Click, "#fe-log")
    def _on_click_fe_log(self) -> None:
        self._active_section = "fe-log"

    @on(events.Click, "#cmd-output")
    def _on_click_cmd_output(self) -> None:
        self._active_section = "cmd-output"

    @on(Button.Pressed, "#btn-be")
    def _on_toggle_be(self) -> None:
        self._toggle_server("be")

    @on(Button.Pressed, "#btn-fe")
    def _on_toggle_fe(self) -> None:
        self._toggle_server("fe")

    @on(Button.Pressed, "#btn-settings")
    def _on_settings(self) -> None:
        self.push_screen(SettingsScreen())

    # ------------------------------------------------------------------
    # Proxy bar
    # ------------------------------------------------------------------

    def _refresh_proxy_bar(self) -> None:
        """Sync timer callback — kicks off async proxy refresh."""
        self._do_proxy_refresh()

    @work(exclusive=True, group="proxy-refresh")
    async def _do_proxy_refresh(self) -> None:
        """Fetch proxy sessions and update the proxy bar widgets."""
        from armhr_cli.services import api
        from armhr_cli.services.auth import get_token_status

        sessions = await api.get_proxy_sessions()

        try:
            status_widget = self.query_one("#proxy-status", Static)
            info_widget = self.query_one("#proxy-info", Static)
            end_btn = self.query_one("#btn-proxy-end", Button)
            proxy_btn = self.query_one("#btn-proxy", Button)
            proxy_bar = self.query_one("#proxy-bar", Horizontal)
        except Exception:
            return  # Widgets not on active screen

        # Check for auth-required state
        if sessions is None and api.get_last_error() == "auth":
            self._proxy_sessions = []
            self._proxy_primary = None
            self._proxy_auth_needed = True
            proxy_bar.display = True
            auth_status = get_token_status()
            domain = auth_status.get("domain", "")
            if auth_status.get("authenticated"):
                # Token exists but rejected — wrong audience/issuer/domain
                status_widget.update("[yellow]🔒 auth[/]")
                info_widget.update(f"  [yellow]token rejected[/] · [dim]{domain}[/]")
            else:
                status_widget.update("[yellow]🔒 auth[/]")
                info_widget.update(f"  [yellow]login required[/] · [dim]{domain}[/]")
            end_btn.display = False
            proxy_btn.label = "Login"
            proxy_btn.remove_class("proxy-active")
            proxy_btn.add_class("proxy-auth")
            return

        self._proxy_auth_needed = False
        proxy_btn.remove_class("proxy-auth")

        # Backend offline — hide the proxy bar entirely
        if sessions is None:
            self._proxy_sessions = []
            self._proxy_primary = None
            proxy_bar.display = False
            end_btn.display = False
            proxy_btn.label = "Proxy"
            proxy_btn.remove_class("proxy-active")
            return

        # Backend is reachable — show the proxy bar
        proxy_bar.display = True

        # Filter to non-expired sessions
        now = datetime.now(timezone.utc)
        active = [s for s in sessions if datetime.fromisoformat(s["session_expiration"]) > now]
        self._proxy_sessions = active

        # No active sessions — hide the proxy bar
        if not active:
            self._proxy_primary = None
            proxy_bar.display = False
            end_btn.display = False
            proxy_btn.label = "Proxy"
            proxy_btn.remove_class("proxy-active")
            return

        # Active session — show primary (first by start time)
        active.sort(key=lambda s: s.get("session_start", ""))
        primary = active[0]
        self._proxy_primary = primary

        exp = datetime.fromisoformat(primary["session_expiration"])
        start = datetime.fromisoformat(primary["session_start"])
        remaining = max(0, (exp - now).total_seconds())
        total = max(1, (exp - start).total_seconds())
        progress = max(0.0, min(1.0, 1.0 - remaining / total))

        mins = int(remaining // 60)
        secs = int(remaining % 60)

        # Color based on time remaining
        if remaining > 300:
            color = "green"
        elif remaining > 60:
            color = "yellow"
        else:
            color = "red"

        # Progress bar (12 chars)
        filled = int(progress * 12)
        bar = "▰" * filled + "▱" * (12 - filled)

        name = primary.get("name", "Unknown")
        uid = primary.get("proxy_prism_user_id", "—")
        cid = primary.get("proxy_prism_client_id", "—")

        status_widget.update(f"[{color}]● proxy[/]")

        count_str = ""
        if len(active) > 1:
            count_str = f" [dim]({len(active)} sessions)[/]"

        info_widget.update(
            f"  [bold]{name}[/]  UID:{uid}  CID:{cid}  [{color}]{bar}[/]  [{color}]{mins}m {secs:02d}s[/]{count_str}"
        )

        end_btn.display = True
        proxy_btn.label = "Proxy"
        proxy_btn.add_class("proxy-active")

    @on(Button.Pressed, "#btn-proxy-end")
    def _on_proxy_end(self) -> None:
        """End the primary active proxy session."""
        if self._proxy_primary is None:
            return
        self._do_proxy_end()

    @work(exclusive=True, group="proxy-action")
    async def _do_proxy_end(self) -> None:
        from armhr_cli.services import api

        primary = self._proxy_primary
        if primary is None:
            return

        true_user_id = primary.get("true_user_id", "")
        output = self.query_one("#cmd-output", RichLog)

        ok = await api.end_proxy_session(true_user_id)
        if ok:
            output.write("[green]✓[/] Proxy session ended")
        else:
            output.write("[red]✗[/] Failed to end proxy session")

        # Refresh immediately
        self._refresh_proxy_bar()

    @on(Button.Pressed, "#btn-proxy")
    def _on_proxy_btn(self) -> None:
        """Login (auth needed), search modal (no session), or monitor modal."""
        if self._proxy_auth_needed:
            self._do_auth_login()
        elif self._proxy_primary is not None:
            self.push_screen(ProxyMonitorScreen())
        else:
            self.push_screen(
                ProxySearchScreen(),
                callback=self._on_proxy_search_dismissed,
            )

    @work(exclusive=True, group="auth-login")
    async def _do_auth_login(self) -> None:
        """Run the OAuth PKCE login flow in a background worker."""
        from armhr_cli.services import auth

        output = self.query_one("#cmd-output", RichLog)
        config = auth.get_auth0_config()

        if not config["domain"] or not config["client_id"]:
            output.write("[red]✗[/] Auth0 not configured (missing domain or client_id)")
            output.write("[dim]Ensure HCM_AUTH0_DOMAIN is set in .env[/]")
            output.write("[dim]and VITE_APP_CLIENT_ID exists in ops frontend .env[/]")
            return

        output.write("[bold cyan]> auth login[/]")
        output.write(f"[dim]Domain: {config['domain']}[/]")
        output.write(f"[dim]Client: {config['client_id'][:8]}...[/]")
        output.write("[dim]Opening browser for authentication...[/]")

        # Update proxy bar to show "authenticating..."
        status_widget = self.query_one("#proxy-status", Static)
        info_widget = self.query_one("#proxy-info", Static)
        status_widget.update("[cyan]◌ auth[/]")
        info_widget.update("  [cyan]waiting for browser login...[/]")

        token_data = await auth.login()

        if token_data:
            expires_in = token_data.get("expires_in", 0)
            output.write(f"[green]✓[/] Authenticated · token expires in {expires_in // 60}m")
            self._proxy_auth_needed = False
            # Refresh proxy bar with the new token
            self._refresh_proxy_bar()
        else:
            output.write("[red]✗[/] Authentication failed or timed out")
            output.write("[dim]Alternatives:[/]")
            output.write("[dim]  · auth token <paste>  — paste a token manually[/]")
            output.write("[dim]  · auth logout         — clear cached token[/]")
            # Restore proxy bar
            self._refresh_proxy_bar()

    def _on_proxy_search_dismissed(self, result: bool | None = None) -> None:
        """Called when ProxySearchScreen is dismissed."""
        if result is True:
            output = self.query_one("#cmd-output", RichLog)
            output.write("[green]✓[/] Proxy session started")
            # Refresh proxy bar immediately
            self._refresh_proxy_bar()

    def _toggle_server(self, key: str) -> None:
        """Toggle a server on/off by key ('be' or 'fe')."""
        from armhr_cli.commands.servers import _get_or_create, _processes

        try:
            output = self.query_one("#cmd-output", RichLog)
            log_widget = self.query_one(f"#{key}-log", RichLog)

            # Find existing process or create one
            mp = None
            for proc_key, proc in _processes.items():
                if proc_key.split(":")[0] == key:
                    mp = proc
                    break
            if mp is None:
                mp = _get_or_create(key)

            if mp.is_running:
                # Stop
                ok, msg = mp.stop()
                log_widget.write(Text(f"--- {msg} ---", style="bold red"))
                output.write(f"[green]✓[/] {msg}" if ok else f"[red]✗[/] {msg}")
            else:
                # Start
                ok, msg = mp.start()
                output.write(f"[green]✓[/] {msg}" if ok else f"[red]✗[/] {msg}")
                self._start_tailers()

            self._refresh_ui_state()
            # Refresh proxy bar when backend state changes
            if key == "be":
                self.set_timer(2.0, self._refresh_proxy_bar)
        except Exception as e:
            self.query_one("#cmd-output", RichLog).write(f"[red]✗[/] Error: {e}")
        finally:
            self.query_one("#cmd-input", Input).focus()

    def _refresh_ui_state(self) -> None:
        """Update buttons, panel titles, and border accents based on server state."""
        from armhr_cli.commands.servers import _processes

        for key, btn_id, log_id, col_id in (
            ("be", "#btn-be", "#be-log", "#col-be"),
            ("fe", "#btn-fe", "#fe-log", "#col-fe"),
        ):
            try:
                btn = self.query_one(btn_id, Button)
                log_panel = self.query_one(log_id, RichLog)
            except Exception:
                return  # Widgets not on active screen
            col = self.query_one(col_id, Collapsible)
            label = "BE" if key == "be" else "FE"
            name = "backend" if key == "be" else "frontend"

            # Find process for this key
            mp = None
            for proc_key, proc in _processes.items():
                if proc_key.split(":")[0] == key:
                    mp = proc
                    break

            running = mp is not None and mp.is_running

            # Button state
            if running:
                btn.label = f"{label}"
                btn.remove_class("stopped")
                btn.add_class("running")
            else:
                btn.label = f"{label}"
                btn.remove_class("running")
                btn.add_class("stopped")

            # Collapsible title + accent
            if running:
                col.title = f"{name} · {mp.pid} · {mp.uptime}"
                col.add_class("col-running")
                log_panel.remove_class("server-off")
                log_panel.add_class("server-on")
            else:
                col.title = name
                col.remove_class("col-running")
                log_panel.remove_class("server-on")
                log_panel.add_class("server-off")

    # ------------------------------------------------------------------
    # Env preset dropdowns
    # ------------------------------------------------------------------

    def _refresh_env_selects(self) -> None:
        """Re-sync the env Select widgets after a swap or seed (e.g. from the `env` command)."""
        from armhr_cli.config import GROUP_PREFIXES, PRESETS_FILE
        from armhr_cli.services.envfile import (
            identify_active_full_preset,
            identify_active_preset,
            list_full_presets,
            list_presets,
        )

        if not PRESETS_FILE.exists():
            return

        self._env_select_syncing = True
        try:
            # --- Individual group selects ---
            all_presets = list_presets()
            for group in GROUP_PREFIXES:
                sel = self.query_one(f"#sel-{group}", Select)
                preset_names = all_presets.get(group, [])
                if not preset_names:
                    continue

                # Update the options list (needed after env init seeds the file)
                new_options = [(name, name) for name in preset_names]
                sel.set_options(new_options)

                # Set the active preset as the selected value
                active, _ = identify_active_preset(group)
                if active != "custom" and active in preset_names:
                    sel.value = active
                else:
                    sel.value = preset_names[0]

            # --- Full preset select ---
            sel_full = self.query_one("#sel-full", Select)
            full_names = list_full_presets()
            if full_names:
                sel_full.set_options([(n, n) for n in full_names])
                active_full = identify_active_full_preset()
                if active_full and active_full in full_names:
                    sel_full.value = active_full
                else:
                    sel_full.value = full_names[0]
        except Exception:
            pass
        # Also refresh the env summary values
        self._refresh_env_summary()
        # Clear the guard after a short delay so deferred Changed events are ignored
        self.set_timer(0.5, self._clear_env_sync_flag)

    def _refresh_env_summary(self) -> None:
        """Update the env-summary Static widget with current .env values."""
        try:
            summary = self.query_one("#env-summary", Static)
            summary.update(self._build_env_summary_text())
        except Exception:
            pass

    def _clear_env_sync_flag(self) -> None:
        self._env_select_syncing = False

    def _rebuild_dropdown_items(self) -> None:
        """Rebuild autocomplete candidates after presets change (e.g. env init)."""
        global _DROPDOWN_ITEMS
        defs = _build_command_defs()
        _DROPDOWN_ITEMS = [DropdownItem(main=cmd) for cmd, _desc in defs]

    @on(Select.Changed)
    def _on_env_select_changed(self, event: Select.Changed) -> None:
        """Handle env preset dropdown change — swap .env and restart servers."""
        if self._env_select_syncing:
            return
        if event.value is Select.BLANK:
            return

        widget_id = event.select.id or ""
        if not widget_id.startswith("sel-"):
            return

        # Full-preset select
        if widget_id == "sel-full":
            self._do_full_env_swap(str(event.value))
            return

        group = widget_id.removeprefix("sel-")
        preset_name = str(event.value)
        self._do_env_swap(group, preset_name)

    @work(exclusive=False, group="cmd")
    async def _do_env_swap(self, group: str, preset_name: str) -> None:
        """Run the env swap + restart as a background worker."""
        from armhr_cli.commands.env import _swap

        output = self.query_one("#cmd-output", RichLog)
        output.write(f"[bold cyan]> env {group} {preset_name}[/]")
        await _swap(group, preset_name, output)
        self._start_tailers()

    @work(exclusive=False, group="cmd")
    async def _do_full_env_swap(self, preset_name: str) -> None:
        """Swap all groups according to a full preset and restart BE once."""
        from armhr_cli.commands.env import _swap_all
        from armhr_cli.services.envfile import load_full_presets

        full = load_full_presets()
        mapping = full.get(preset_name)
        if not mapping:
            return

        output = self.query_one("#cmd-output", RichLog)
        output.write(f"[bold cyan]> env full {preset_name}[/]")
        await _swap_all(mapping, output)
        self._refresh_env_selects()
        self._start_tailers()

    @on(Button.Pressed, "#btn-env-toggle")
    def _on_env_toggle(self) -> None:
        """Toggle between individual and full env-preset modes."""
        if self._env_mode == "individual":
            self._env_mode = "full"
        else:
            self._env_mode = "individual"
        self._apply_env_mode()

    def _apply_env_mode(self) -> None:
        """Show/hide env widgets based on the current ``_env_mode``."""
        show_individual = self._env_mode == "individual"
        for widget in self.query(".env-individual"):
            widget.display = show_individual
        for widget in self.query(".env-full"):
            widget.display = not show_individual
        # Refresh so the visible select reflects current state
        self._refresh_env_selects()


# ---------------------------------------------------------------------------
# Standalone tail function (runs in a plain daemon thread)
# ---------------------------------------------------------------------------


def _tail_log_thread(key: str, log_path: Path, stop: threading.Event) -> None:
    """Read a log file and push lines into the shared queue."""
    try:
        with open(log_path, "r") as f:
            content = f.read()
            if content:
                for line in content.splitlines()[-200:]:
                    _log_queue.put((key, line))

            while not stop.is_set():
                line = f.readline()
                if line:
                    _log_queue.put((key, line.rstrip()))
                else:
                    stop.wait(0.15)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def run():
    """Boot the Textual app."""
    # Register cleanup as atexit handler so it runs even on unexpected exits
    atexit.register(servers.stop_all)
    app = ArmhrApp()
    app.run()
    # Terminal is restored by now — do explicit cleanup (atexit is a fallback)
    servers.stop_all()
