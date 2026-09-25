"""petehome commands: orchestrate, monitor, and interact with the coach."""

from __future__ import annotations

import webbrowser

from rich.table import Table
from textual.widgets import RichLog

from petehome_cli.config import COACH_API_BASE, COACH_HEALTHZ_URL, PM2_PROCESSES
from petehome_cli.services import coach as coach_svc
from petehome_cli.services.pm2 import PM2Service

COACH_NAME = PM2_PROCESSES["worker"]

_USAGE = """\
[dim]coach / pc — petehome
  start|stop|restart     PM2 petehome-worker
  status|health|logs     Monitor worker + API
  doctor                 yarn coach:doctor
  job <name> [...]       Run a scheduled job now
  worker                 Foreground yarn coach:worker
  test|typecheck|eval    Package checks / evals
  ingest|backfill [...]  Knowledge / history scripts
  today [YYYY-MM-DD]     Today's plan + readiness
  readiness|projection|spend
  ask [--deep] [--new] "..."
  open                   Open /coach in browser
[/]"""


async def _stream_yarn(output: RichLog, *parts: str, cwd: str | None = None) -> None:
    from pathlib import Path

    path = Path(cwd) if cwd else None
    async for line in coach_svc.stream_yarn(*parts, cwd=path):
        _write_line(output, line)


def _write_line(output: RichLog, line: str) -> None:
    lower = line.lower()
    if "error" in lower or line.startswith("[error]"):
        output.write(f"[red]{line}[/]")
    elif "warn" in lower:
        output.write(f"[yellow]{line}[/]")
    elif any(kw in lower for kw in ("ok", "ready", "success", "✓")):
        output.write(f"[green]{line}[/]")
    else:
        output.write(line)


async def cmd_coach(args: list[str], output: RichLog) -> None:
    """Dispatch `coach <subcommand>`."""
    if not args:
        output.write(_USAGE)
        return

    sub = args[0].lower().strip()
    rest = args[1:]

    handlers = {
        "start": _cmd_start,
        "stop": _cmd_stop,
        "restart": _cmd_restart,
        "status": _cmd_status,
        "health": _cmd_health,
        "logs": _cmd_logs,
        "doctor": _cmd_doctor,
        "job": _cmd_job,
        "worker": _cmd_worker,
        "test": _cmd_test,
        "typecheck": _cmd_typecheck,
        "type-check": _cmd_typecheck,
        "eval": _cmd_eval,
        "ingest": _cmd_ingest,
        "backfill": _cmd_backfill,
        "today": _cmd_today,
        "readiness": _cmd_readiness,
        "projection": _cmd_projection,
        "spend": _cmd_spend,
        "ask": _cmd_ask,
        "open": _cmd_open,
        "help": _cmd_help,
        "?": _cmd_help,
    }

    handler = handlers.get(sub)
    if not handler:
        output.write(f"[red]✗[/] Unknown: coach {sub}")
        output.write(_USAGE)
        return

    await handler(rest, output)


async def _cmd_help(_args: list[str], output: RichLog) -> None:
    output.write(_USAGE)


async def _cmd_start(_args: list[str], output: RichLog) -> None:
    ok, msg = await PM2Service.start(COACH_NAME)
    if ok:
        output.write(f"[green]✓[/] Started {COACH_NAME}")
    else:
        output.write(f"[red]✗[/] Failed to start {COACH_NAME}")
        if msg.strip():
            output.write(f"[dim]{msg.strip()}[/]")


async def _cmd_stop(_args: list[str], output: RichLog) -> None:
    ok, msg = await PM2Service.stop(COACH_NAME)
    if ok:
        output.write(f"[green]✓[/] Stopped {COACH_NAME}")
    else:
        output.write(f"[red]✗[/] Failed to stop {COACH_NAME}")
        if msg.strip():
            output.write(f"[dim]{msg.strip()}[/]")


async def _cmd_restart(_args: list[str], output: RichLog) -> None:
    ok, msg = await PM2Service.restart(COACH_NAME)
    if ok:
        output.write(f"[green]✓[/] Restarted {COACH_NAME}")
    else:
        output.write(f"[red]✗[/] Failed to restart {COACH_NAME}")
        if msg.strip():
            output.write(f"[dim]{msg.strip()}[/]")


async def _cmd_logs(_args: list[str], output: RichLog) -> None:
    output.write(f"[dim]Streaming {COACH_NAME} logs (last 30 lines)...[/]")
    count = 0
    async for line in PM2Service.stream_logs(COACH_NAME, lines=30):
        if count > 100:
            break
        _write_line(output, line)
        count += 1


async def _cmd_health(_args: list[str], output: RichLog) -> None:
    ok, payload = await coach_svc.get_healthz()
    if isinstance(payload, str):
        output.write(f"[red]✗[/] {payload}")
        return

    status = "[green]● healthy[/]" if ok else "[red]○ unhealthy[/]"
    output.write(f"{status}  [dim]{COACH_HEALTHZ_URL}[/]")
    listener = payload.get("listenerConnected")
    stale = payload.get("stale")
    last_job = payload.get("lastJobAt") or payload.get("lastJob")
    output.write(f"  listenerConnected: {listener}")
    output.write(f"  stale: {stale}")
    if last_job:
        output.write(f"  lastJobAt: {last_job}")
    if payload.get("now"):
        output.write(f"  now: {payload['now']}")


async def _cmd_status(_args: list[str], output: RichLog) -> None:
    proc = await coach_svc.pm2_coach_process()
    table = Table(
        show_header=True,
        header_style="bold dim",
        box=None,
        padding=(0, 2),
        expand=False,
    )
    table.add_column("Check")
    table.add_column("Value")

    if proc:
        status_display = {
            "online": "[green]● online[/]",
            "stopped": "[red]○ stopped[/]",
            "errored": "[red]✗ errored[/]",
            "launching": "[yellow]◐ launching[/]",
        }.get(proc.status, f"[yellow]◐ {proc.status}[/]")
        table.add_row("PM2", f"{proc.name} {status_display}")
        table.add_row("PID", str(proc.pid or "-"))
        table.add_row("Uptime", proc.uptime_str)
        table.add_row(
            "CPU / Mem",
            f"{proc.cpu:.0f}% / {proc.memory_mb:.0f}MB",
        )
        table.add_row("Restarts", str(proc.restarts))
    else:
        table.add_row("PM2", f"[red]○ {COACH_NAME} not in pm2 list[/]")

    ok, payload = await coach_svc.get_healthz()
    if isinstance(payload, str):
        table.add_row("healthz", f"[red]{payload}[/]")
    else:
        mark = "[green]200[/]" if ok else "[red]fail[/]"
        table.add_row(
            "healthz",
            f"{mark} listener={payload.get('listenerConnected')} stale={payload.get('stale')}",
        )

    status_code, today = await coach_svc.api_get("/api/coach/today", timeout=10.0)
    if status_code == 0:
        table.add_row("API today", f"[red]{today}[/]")
    elif status_code == 200:
        table.add_row("API today", f"[green]200[/]  [dim]{COACH_API_BASE}[/]")
    else:
        table.add_row("API today", f"[red]{status_code}[/] {today}")

    output.write(table)


async def _cmd_doctor(_args: list[str], output: RichLog) -> None:
    output.write("[dim]Running yarn coach:doctor…[/]")
    await _stream_yarn(output, "coach:doctor")


async def _cmd_job(args: list[str], output: RichLog) -> None:
    if not args:
        output.write("[yellow]![/] Usage: coach job <name> […]")
        output.write(
            "[dim]Jobs: "
            + ", ".join(coach_svc.JOB_NAMES)
            + "[/]"
        )
        return

    job = args[0].lower()
    if job not in coach_svc.JOB_NAMES:
        output.write(f"[yellow]![/] Unknown job '{job}' — still forwarding to yarn")

    output.write(f"[dim]Running yarn coach:job {' '.join(args)}…[/]")
    async for line in coach_svc.stream_coach_job(args):
        _write_line(output, line)


async def _cmd_worker(_args: list[str], output: RichLog) -> None:
    output.write("[dim]Foreground yarn coach:worker (Ctrl+C in host shell to stop)…[/]")
    await _stream_yarn(output, "coach:worker")


async def _cmd_test(_args: list[str], output: RichLog) -> None:
    output.write("[dim]Running yarn coach:test…[/]")
    await _stream_yarn(output, "coach:test")


async def _cmd_typecheck(_args: list[str], output: RichLog) -> None:
    output.write("[dim]Running yarn coach:type-check…[/]")
    await _stream_yarn(output, "coach:type-check")


async def _cmd_eval(_args: list[str], output: RichLog) -> None:
    output.write("[yellow]![/] coach eval hits the live model and spends budget")
    output.write("[dim]Running yarn coach:eval…[/]")
    await _stream_yarn(output, "coach:eval", *(_args or []))


async def _cmd_ingest(args: list[str], output: RichLog) -> None:
    output.write(f"[dim]Running yarn coach:ingest {' '.join(args)}…[/]")
    await _stream_yarn(output, "coach:ingest", *args, cwd=coach_svc.web_cwd())


async def _cmd_backfill(args: list[str], output: RichLog) -> None:
    output.write(f"[dim]Running yarn coach:backfill {' '.join(args)}…[/]")
    await _stream_yarn(output, "coach:backfill", *args, cwd=coach_svc.web_cwd())


async def _cmd_today(args: list[str], output: RichLog) -> None:
    params = {"date": args[0]} if args else None
    status, data = await coach_svc.api_get("/api/coach/today", params=params, timeout=20.0)
    if status != 200 or not isinstance(data, dict):
        output.write(f"[red]✗[/] today failed ({status}): {data}")
        return
    for line in coach_svc.format_today(data):
        output.write(line)


async def _cmd_readiness(_args: list[str], output: RichLog) -> None:
    status, data = await coach_svc.api_get("/api/coach/today", timeout=20.0)
    if status != 200 or not isinstance(data, dict):
        # Fall back to dedicated readiness route if today fails
        status2, data2 = await coach_svc.api_get("/api/coach/readiness", timeout=15.0)
        if status2 != 200:
            output.write(f"[red]✗[/] readiness failed ({status}): {data}")
            return
        data = {"readiness": data2} if not isinstance(data2, dict) or "readiness" not in data2 else data2

    readiness = data.get("readiness") if isinstance(data, dict) else None
    if not readiness:
        output.write("[dim]No readiness snapshot[/]")
        return
    level = readiness.get("level") or readiness.get("score") or "?"
    guidance = readiness.get("guidance") or ""
    output.write(f"[bold]Readiness[/]  [cyan]{level}[/]")
    if guidance:
        output.write(f"  {guidance}")
    for key in ("hrv", "sleep", "rhr", "subjective", "load"):
        if key in readiness and readiness[key] is not None:
            output.write(f"  {key}: {readiness[key]}")


async def _cmd_projection(_args: list[str], output: RichLog) -> None:
    status, data = await coach_svc.api_get("/api/coach/projection", timeout=20.0)
    if status != 200:
        output.write(f"[red]✗[/] projection failed ({status}): {data}")
        return
    payload = data if isinstance(data, dict) or data is None else None
    for line in coach_svc.format_projection(payload):
        output.write(line)


async def _cmd_spend(_args: list[str], output: RichLog) -> None:
    status, data = await coach_svc.api_get("/api/coach/spend", timeout=15.0)
    if status != 200 or not isinstance(data, dict):
        output.write(f"[red]✗[/] spend failed ({status}): {data}")
        return
    for line in coach_svc.format_spend(data):
        output.write(line)


async def _cmd_ask(args: list[str], output: RichLog) -> None:
    deep = False
    new_conversation = False
    prompt_parts: list[str] = []

    i = 0
    while i < len(args):
        token = args[i]
        if token in ("--deep", "-d"):
            deep = True
        elif token in ("--new", "-n"):
            new_conversation = True
        else:
            prompt_parts.append(token)
        i += 1

    prompt = " ".join(prompt_parts).strip()
    if not prompt:
        output.write('[yellow]![/] Usage: coach ask [--deep] [--new] "your question"')
        return

    err = coach_svc.require_api_key()
    if err:
        output.write(f"[red]✗[/] {err}")
        return

    mode = "deep" if deep else "normal"
    cid = None if new_conversation else coach_svc.load_conversation_id()
    thread = "new thread" if new_conversation or not cid else f"thread {cid[:8]}…"
    output.write(f"[dim]Asking petehome ({mode}, {thread})…[/]")
    output.write("")

    got_text = False
    buffer = ""
    async for text in coach_svc.ask_coach(
        prompt,
        deep=deep,
        new_conversation=new_conversation,
    ):
        got_text = True
        if text.startswith("[error]"):
            if buffer.strip():
                output.write(buffer)
                buffer = ""
            output.write(f"[red]{text}[/]")
            return

        buffer += text
        while "\n" in buffer:
            line, buffer = buffer.split("\n", 1)
            output.write(line)

    if buffer.strip():
        output.write(buffer)

    if not got_text:
        output.write("[yellow]![/] Empty response from chat")
    else:
        saved = coach_svc.load_conversation_id()
        if saved:
            output.write("")
            output.write(f"[dim]conversation {saved}[/]")


async def _cmd_open(_args: list[str], output: RichLog) -> None:
    url = coach_svc.open_ui_url()
    output.write(f"[dim]Opening {url}[/]")
    try:
        webbrowser.open(url)
        output.write("[green]✓[/] Browser launched")
    except Exception as exc:
        output.write(f"[red]✗[/] Could not open browser: {exc}")
        output.write(f"[dim]Navigate to {url} manually[/]")


def register(registry: dict) -> None:
    """Register coach commands into the command registry."""
    registry["coach"] = cmd_coach
    registry["pc"] = cmd_coach
