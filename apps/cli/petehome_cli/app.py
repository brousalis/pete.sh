"""petehome-cli: Textual TUI for petehome development.

Split-pane log viewer with a command input bar. PM2 logs are tailed
into a log panel; commands stream output into a dedicated output panel.
"""

import shlex
from collections.abc import Callable, Coroutine
from typing import Any

from rich.text import Text
from textual import events, on, work
from textual.app import App, ComposeResult
from textual.containers import Horizontal, Vertical, VerticalScroll
from textual.screen import Screen
from textual.widgets import (
    Button,
    Collapsible,
    Footer,
    Input,
    Label,
    RichLog,
    Static,
    Switch,
)
from textual_autocomplete import AutoComplete, DropdownItem

from petehome_cli.commands import deploy, dev, git, migrate, pm2


class DropUp(AutoComplete):
    """AutoComplete that opens upward (above the input)."""

    def _align_to_target(self) -> None:
        from textual.geometry import Offset

        x, y = self.target.cursor_screen_offset
        dropdown = self.option_list
        _width, height = dropdown.outer_size
        y = max(0, y - height)
        x = max(0, x - 1)
        self.absolute_offset = Offset(x, y)


# ---------------------------------------------------------------------------
# Command Registry
# ---------------------------------------------------------------------------

CommandHandler = Callable[[list[str], RichLog], Coroutine[Any, Any, None]]

REGISTRY: dict[str, CommandHandler] = {}


def _build_registry() -> None:
    """Populate the command registry from all command modules."""
    pm2.register(REGISTRY)
    git.register(REGISTRY)
    dev.register(REGISTRY)
    deploy.register(REGISTRY)
    migrate.register(REGISTRY)


# ---------------------------------------------------------------------------
# Autocomplete candidates
# ---------------------------------------------------------------------------

_COMMAND_DEFS: list[tuple[str, str]] = [
    # PM2
    ("status", "Show PM2 process status"),
    ("start main", "Start main server"),
    ("start notifications", "Start notifications"),
    ("start all", "Start all services"),
    ("stop main", "Stop main server"),
    ("stop notifications", "Stop notifications"),
    ("stop all", "Stop all services"),
    ("restart main", "Restart main server"),
    ("restart notifications", "Restart notifications"),
    ("restart all", "Restart all services"),
    ("logs", "Stream all PM2 logs"),
    ("logs main", "Stream main logs"),
    ("logs notifications", "Stream notification logs"),
    # Git shortcuts
    ("gs", "Git status"),
    ("ga", "Git add all"),
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
    # Dev
    ("lint", "Run ESLint"),
    ("lint fix", "Run ESLint with --fix"),
    ("format", "Run Prettier"),
    ("build", "Build web app"),
    ("typecheck", "TypeScript type check"),
    ("tsc", "TypeScript type check"),
    ("clean", "Clean build artifacts"),
    ("sync", "Sync data"),
    # Deploy
    ("deploy", "Deploy to production"),
    ("deploy status", "Latest deployment"),
    ("deploy history", "Deployment history"),
    ("deploy open", "Open in browser"),
    ("d", "Deploy to production"),
    # Migrate
    ("migrate", "Run pending migrations"),
    ("migrate status", "Migration status"),
    ("migrate mark-applied", "Sync migration history"),
    ("migrate dry-run", "Preview migrations"),
    ("supabase", "Run migrations"),
    # Built-ins
    ("clear", "Clear all panels"),
    ("help", "Show help"),
    ("quit", "Exit the CLI"),
]

_DROPDOWN_ITEMS: list[DropdownItem] = []


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
        with Vertical(id="help-dialog"):
            yield Static("[bold green]◆◆ petehome[/] [dim]cli[/]", id="help-title")
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
                    "Services (PM2)",
                    [
                        ("status / s", "Show PM2 status"),
                        ("start <name>", "Start (main/notifications/all)"),
                        ("stop <name>", "Stop service"),
                        ("restart <name>", "Restart service"),
                        ("logs [name]", "Stream logs"),
                    ],
                    border_style="green",
                ),
                _section(
                    "Git",
                    [
                        ("gs", "Status"),
                        ("ga", "Stage all"),
                        ("gc [msg]", "Commit"),
                        ("gp / gpo", "Push / push origin"),
                        ("gpl", "Pull"),
                        ("gl / gd", "Log / diff"),
                        ("gpr [create]", "Pull request"),
                    ],
                    border_style="blue",
                ),
                _section(
                    "Dev",
                    [
                        ("lint [fix]", "ESLint"),
                        ("format", "Prettier"),
                        ("build", "Build"),
                        ("typecheck / tsc", "Type check"),
                        ("clean", "Clean"),
                        ("sync", "Sync data"),
                    ],
                    border_style="yellow",
                ),
                _section(
                    "Deploy",
                    [
                        ("deploy / d", "Deploy to production"),
                        ("d status", "Latest deployment"),
                        ("d history", "Deployment history"),
                        ("d open", "Open in browser"),
                    ],
                    border_style="cyan",
                ),
                _section(
                    "Supabase",
                    [
                        ("migrate", "Run pending"),
                        ("migrate status", "List applied"),
                        ("migrate mark-applied", "Sync history"),
                        ("migrate dry-run", "Preview"),
                    ],
                    border_style="magenta",
                ),
                _section(
                    "General",
                    [
                        ("clear", "Clear panels"),
                        ("help / ?", "This modal"),
                        ("ctrl+q", "Quit"),
                        ("f1 / f2", "Focus panel"),
                        ("esc", "Restore"),
                    ],
                    border_style="dim",
                ),
            )
        )


class SettingsScreen(Screen):
    """Tabbed settings modal -- Preferences, Keybindings, Cleanup."""

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
        height: 75%;
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
    #settings-content {
        height: 1fr;
        padding: 0 1;
    }

    /* Preferences */
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

    /* Keybindings */
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

    /* Cleanup */
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
    #cleanup-header {
        height: 3;
        padding: 0 1;
    }
    #cleanup-header-label {
        width: 1fr;
        padding: 1 0 0 0;
        text-style: bold;
    }
    #cleanup-results {
        height: 1fr;
        overflow-y: auto;
        padding: 0;
    }
    """

    _editing_action: str | None = None

    def compose(self) -> ComposeResult:
        from textual.widgets import TabbedContent, TabPane

        from petehome_cli.services.settings import get_keybinding, get_pref

        pref_meta: list[tuple[str, str, bool]] = [
            ("clear_output_on_cmd", "Clear output panel on each command", False),
            ("input_at_top", "Place input bar at top (restart required)", True),
        ]

        kb_meta: list[tuple[str, str]] = [
            ("quit", "Quit"),
            ("clear_output", "Clear output"),
            ("focus_logs", "Focus logs"),
            ("focus_output", "Focus output"),
            ("restore_panels", "Restore panels"),
        ]

        with Vertical(id="settings-dialog"):
            yield Static("[bold]Settings[/]", id="settings-title")
            with TabbedContent(id="settings-content"):
                # Preferences tab
                with TabPane("Preferences", id="tab-prefs"):
                    for key, desc, restart in pref_meta:
                        with Horizontal(classes="pref-row"):
                            yield Label(desc, classes="pref-label")
                            if restart:
                                yield Label("restart required", classes="pref-restart")
                            yield Switch(
                                value=get_pref(key),
                                id=f"sw-{key}",
                                classes="pref-switch",
                            )

                # Keybindings tab
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
                        "[dim]Keybinding changes take effect on restart.[/]",
                        classes="kb-note",
                    )

                # Cleanup tab
                with TabPane("Cleanup", id="tab-cleanup"):
                    with Vertical(id="cleanup-container"):
                        with Horizontal(id="cleanup-header"):
                            yield Static(
                                "Scan monitored ports for orphaned processes",
                                id="cleanup-header-label",
                            )
                            yield Button("Scan", id="btn-scan")
                        with VerticalScroll(id="cleanup-results"):
                            yield Static(
                                "[dim]Press Scan to check ports...[/]",
                                classes="cleanup-empty",
                            )

            yield Static("[dim]Esc / q to close[/]", id="settings-footer")

    # -- Preference toggles --

    @on(Switch.Changed)
    def _on_pref_toggle(self, event: Switch.Changed) -> None:
        from petehome_cli.services.settings import set_pref

        switch_id = event.switch.id or ""
        if not switch_id.startswith("sw-"):
            return
        key = switch_id[3:]
        set_pref(key, event.value)

    # -- Keybinding editing --

    @on(Button.Pressed, ".kb-edit-btn")
    def _on_kb_edit(self, event: Button.Pressed) -> None:
        btn_id = event.button.id or ""
        action = btn_id.replace("kbe-", "")

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
        from petehome_cli.services.settings import set_keybinding

        input_id = event.input.id or ""
        action = input_id.replace("kbi-", "")
        new_key = event.value.strip()

        if new_key:
            set_keybinding(action, new_key)
            label = self.query_one(f"#kbl-{action}", Label)
            label.update(new_key)

        event.input.remove_class("editing")
        self._editing_action = None

    # -- Cleanup tab --

    @on(Button.Pressed, "#btn-scan")
    def _on_scan_pressed(self, event: Button.Pressed) -> None:
        self._run_scan()

    @work(exclusive=True, group="cleanup-scan")
    async def _run_scan(self) -> None:
        from petehome_cli.config import MONITORED_PORTS
        from petehome_cli.services.ports import scan_ports

        results = await scan_ports(MONITORED_PORTS)
        await self._render_cleanup(results)

    async def _render_cleanup(self, results: list) -> None:
        container = self.query_one("#cleanup-results", VerticalScroll)
        await container.remove_children()

        if not results:
            await container.mount(
                Static(
                    "[dim]No processes found on monitored ports.[/]",
                    classes="cleanup-empty",
                )
            )
            return

        widgets: list[Static | Horizontal] = []
        for info in results:
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
        from petehome_cli.services.ports import kill_port

        ok, msg = await kill_port(pid)
        if ok:
            self.notify(msg, severity="information")
        else:
            self.notify(msg, severity="error")
        self._run_scan()


def _build_app_bindings() -> list[tuple[str, str, str]]:
    """Build keybinding list from settings.toml."""
    from petehome_cli.services.settings import get_keybinding as kb

    return [
        (kb("quit"), "quit", "Quit"),
        (kb("clear_output"), "clear_output", "Clear output"),
        (kb("focus_logs"), "focus_panel('pm2-log')", "Logs"),
        (kb("focus_output"), "focus_panel('cmd-output')", "Output"),
        (kb("restore_panels"), "restore_panels", "Restore"),
        ("question_mark", "show_help", "Help"),
    ]


class PetehomeApp(App):
    """Interactive TUI for petehome development."""

    TITLE = "petehome cli"
    CSS_PATH = "styles.tcss"

    BINDINGS = _build_app_bindings()

    _focused_panel: str | None = None
    _active_section: str = "cmd-output"
    _pm2_streaming: bool = False

    def compose(self) -> ComposeResult:
        from petehome_cli.config import INPUT_AT_TOP

        with Horizontal(id="status-bar", classes="input-top" if INPUT_AT_TOP else ""):
            yield Static(
                "[bold #22c55e]◆◆[/] [bold #4ade80]petehome[/] [dim]cli[/] ",
                id="logo",
            )
            yield Static("", classes="status-spacer")
            yield Button("PM2", id="btn-pm2", classes="btn-pm2 stopped")
            yield Button("Settings", id="btn-settings", classes="btn-icon")

        cmd_input = Input(
            placeholder="Type a command (help for list)",
            id="cmd-input",
        )

        if INPUT_AT_TOP:
            with Horizontal(id="input-bar"):
                yield Static("❯", id="prompt-char")
                yield cmd_input
            yield AutoComplete(cmd_input, candidates=self._get_candidates)
            with Collapsible(title="output", id="col-output", collapsed=False):
                yield RichLog(id="cmd-output", markup=True, wrap=True, max_lines=1000, auto_scroll=True)
            with Vertical(id="log-panels"):
                with Collapsible(title="logs", id="col-logs", collapsed=False):
                    yield RichLog(id="pm2-log", markup=True, wrap=True, max_lines=1000, auto_scroll=True)
        else:
            with Vertical(id="log-panels"):
                with Collapsible(title="logs", id="col-logs", collapsed=False):
                    yield RichLog(id="pm2-log", markup=True, wrap=True, max_lines=1000, auto_scroll=True)
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
        _DROPDOWN_ITEMS = [DropdownItem(main=cmd) for cmd, _desc in _COMMAND_DEFS]

        # Startup banner
        output = self.query_one("#cmd-output", RichLog)
        output.write("[bold green]◆◆[/] [bold #4ade80]petehome[/] [dim]cli[/]")
        output.write("[dim]Type [bold]help[/bold] for commands · [bold]status[/bold] to check PM2[/]")
        output.write("")

        self.query_one("#cmd-input", Input).focus()

        self.set_interval(2.0, self._refresh_pm2_button)
        # Start PM2 log streaming
        self._start_pm2_log_stream()

    @staticmethod
    def _get_candidates(_state) -> list[DropdownItem]:
        return _DROPDOWN_ITEMS

    # ------------------------------------------------------------------
    # PM2 log streaming
    # ------------------------------------------------------------------

    def _start_pm2_log_stream(self) -> None:
        """Start streaming PM2 logs into the log panel."""
        if not self._pm2_streaming:
            self._pm2_streaming = True
            self._stream_pm2_logs()

    @work(exclusive=True, group="pm2-log-stream")
    async def _stream_pm2_logs(self) -> None:
        """Background worker that tails PM2 logs."""
        from petehome_cli.services.pm2 import PM2Service

        try:
            log_panel = self.query_one("#pm2-log", RichLog)
        except Exception:
            return

        try:
            async for line in PM2Service.stream_logs(lines=50):
                try:
                    log_panel = self.query_one("#pm2-log", RichLog)
                except Exception:
                    break
                if "error" in line.lower():
                    log_panel.write(Text(line, style="red"))
                elif "warn" in line.lower():
                    log_panel.write(Text(line, style="yellow"))
                elif any(kw in line.lower() for kw in ("ready", "success", "compiled", "started")):
                    log_panel.write(Text(line, style="green"))
                else:
                    log_panel.write(Text.from_ansi(line))
        except Exception:
            pass
        finally:
            self._pm2_streaming = False

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
        from petehome_cli.services.settings import get_pref

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
            self.exit()
            return

        if command in ("clear", "cls"):
            self.query_one("#cmd-output", RichLog).clear()
            self.query_one("#pm2-log", RichLog).clear()
            return

        if command in ("help", "?", "h"):
            self.push_screen(HelpScreen())
            return

        handler = REGISTRY.get(command)
        if handler:
            await handler(args, output)
        else:
            output.write(f"[red]✗[/] Unknown: {command}")
            output.write("[dim]Type 'help' for commands[/]")

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def action_quit(self) -> None:
        self.exit()

    def action_clear_output(self) -> None:
        self.query_one(f"#{self._active_section}", RichLog).clear()

    def action_show_help(self) -> None:
        self.push_screen(HelpScreen())

    _PANEL_TO_COL: dict[str, str] = {
        "pm2-log": "col-logs",
        "cmd-output": "col-output",
    }

    def action_focus_panel(self, panel_id: str) -> None:
        """Maximize one panel, collapse the other."""
        self._focused_panel = panel_id
        self._active_section = panel_id

        log_panels = self.query_one("#log-panels")
        col_output = self.query_one("#col-output", Collapsible)
        col_logs = self.query_one("#col-logs", Collapsible)

        if panel_id == "cmd-output":
            log_panels.display = False
            col_output.collapsed = False
            col_output.display = True
        else:
            log_panels.display = True
            col_output.display = False
            col_logs.collapsed = False

    def action_restore_panels(self) -> None:
        """Restore all panels to default."""
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
        col_id = event.collapsible.id or ""
        if col_id not in ("col-logs", "col-output"):
            return
        col_logs = self.query_one("#col-logs", Collapsible)
        log_panels = self.query_one("#log-panels")
        log_panels.styles.height = "auto" if col_logs.collapsed else "3fr"

    @on(events.Click, "#pm2-log")
    def _on_click_pm2_log(self) -> None:
        self._active_section = "pm2-log"

    @on(events.Click, "#cmd-output")
    def _on_click_cmd_output(self) -> None:
        self._active_section = "cmd-output"

    @on(Button.Pressed, "#btn-pm2")
    def _on_toggle_pm2(self) -> None:
        """Quick PM2 status check via button."""
        self._dispatch_command("status")

    @on(Button.Pressed, "#btn-settings")
    def _on_settings(self) -> None:
        self.push_screen(SettingsScreen())

    # ------------------------------------------------------------------
    # PM2 button state
    # ------------------------------------------------------------------

    def _refresh_pm2_button(self) -> None:
        self._do_pm2_refresh()

    @work(exclusive=True, group="pm2-refresh")
    async def _do_pm2_refresh(self) -> None:
        from petehome_cli.services.pm2 import PM2Service

        try:
            btn = self.query_one("#btn-pm2", Button)
            col_logs = self.query_one("#col-logs", Collapsible)
        except Exception:
            return

        processes = await PM2Service.get_status()
        online = sum(1 for p in processes if p.status == "online")
        total = len(processes)

        if total == 0:
            btn.label = "PM2"
            btn.remove_class("running")
            btn.add_class("stopped")
            col_logs.title = "logs"
        elif online == total:
            btn.label = f"PM2 {online}/{total}"
            btn.remove_class("stopped")
            btn.add_class("running")
            col_logs.title = f"logs · {online}/{total} online"
            col_logs.add_class("col-running")
        elif online > 0:
            btn.label = f"PM2 {online}/{total}"
            btn.remove_class("stopped")
            btn.add_class("running")
            col_logs.title = f"logs · {online}/{total} online"
            col_logs.add_class("col-running")
        else:
            btn.label = f"PM2 0/{total}"
            btn.remove_class("running")
            btn.add_class("stopped")
            col_logs.title = "logs · stopped"
            col_logs.remove_class("col-running")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def run() -> None:
    """Boot the Textual app."""
    app = PetehomeApp()
    app.run()
