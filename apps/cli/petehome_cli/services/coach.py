"""petehome service: PM2 worker helpers, yarn jobs, and HTTP API client."""

from __future__ import annotations

import json
import uuid
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

import httpx

from petehome_cli.config import (
    COACH_API_BASE,
    COACH_API_KEY,
    COACH_CONVERSATION_FILE,
    COACH_HEALTHZ_URL,
    COACH_UI_URL,
    PM2_PROCESSES,
    REPO_ROOT,
    STATE_DIR,
    WEB_APP_PATH,
)
from petehome_cli.services.pm2 import PM2Service
from petehome_cli.services.process import stream_command

COACH_PM2_NAME = PM2_PROCESSES["coach"]

JOB_NAMES = (
    "briefing",
    "debrief",
    "nudge",
    "weekly-plan",
    "block-review",
    "nightly",
    "pt-morning",
    "pt-evening",
)


def api_key_configured() -> bool:
    """True when COACH_API_KEY looks usable for bearer auth."""
    return bool(COACH_API_KEY) and len(COACH_API_KEY) >= 24


def _auth_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {COACH_API_KEY}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


def require_api_key() -> str | None:
    """Return an error message if the API key is missing, else None."""
    if api_key_configured():
        return None
    return "COACH_API_KEY not set (or too short) in apps/web/.env"


async def stream_yarn(*script_parts: str, cwd: Path | None = None) -> AsyncIterator[str]:
    """Stream a yarn script from the monorepo root (or a package cwd)."""
    work_dir = str(cwd or REPO_ROOT)
    async for line in stream_command("yarn", *script_parts, cwd=work_dir):
        yield line


async def stream_coach_job(job_args: list[str]) -> AsyncIterator[str]:
    """Run `yarn coach:job …` from the repo root."""
    async for line in stream_yarn("coach:job", *job_args):
        yield line


async def get_healthz() -> tuple[bool, dict[str, Any] | str]:
    """GET worker /healthz. Returns (ok, payload_or_error)."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(COACH_HEALTHZ_URL)
            try:
                payload = response.json()
            except Exception:
                payload = {"raw": response.text}
            ok = response.status_code == 200 and not (
                isinstance(payload, dict) and payload.get("stale")
            )
            if isinstance(payload, dict):
                return ok, payload
            return ok, {"raw": str(payload)}
    except httpx.RequestError as exc:
        return False, f"Worker unreachable at {COACH_HEALTHZ_URL}: {exc}"


async def api_get(
    path: str,
    *,
    params: dict[str, str] | None = None,
    timeout: float = 15.0,
) -> tuple[int, Any]:
    """GET /api/coach/… with bearer auth. Returns (status, data_or_error)."""
    err = require_api_key()
    if err:
        return 0, err

    url = f"{COACH_API_BASE}{path}"
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url, headers=_auth_headers(), params=params)
            try:
                body = response.json()
            except Exception:
                return response.status_code, response.text
            if isinstance(body, dict) and "data" in body:
                return response.status_code, body["data"]
            return response.status_code, body
    except httpx.RequestError as exc:
        detail = str(exc).strip() or exc.__class__.__name__
        return 0, f"API unreachable at {url}: {detail}"


async def api_post_stream(
    path: str,
    payload: dict[str, Any],
    *,
    timeout: float = 300.0,
) -> AsyncIterator[str]:
    """POST to a streaming coach endpoint and yield raw response chunks."""
    err = require_api_key()
    if err:
        yield f"[error] {err}"
        return

    url = f"{COACH_API_BASE}{path}"
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream(
                "POST",
                url,
                headers=_auth_headers(),
                json=payload,
            ) as response:
                if response.status_code >= 400:
                    body = await response.aread()
                    text = body.decode("utf-8", errors="replace")
                    try:
                        parsed = json.loads(text)
                        message = (
                            parsed.get("error")
                            or parsed.get("message")
                            or text
                        )
                    except Exception:
                        message = text
                    yield f"[error] HTTP {response.status_code}: {message}"
                    return

                async for chunk in response.aiter_text():
                    if chunk:
                        yield chunk
    except httpx.RequestError as exc:
        yield f"[error] API unreachable at {url}: {exc}"


def load_conversation_id() -> str | None:
    """Load the last CLI chat conversation id, if any."""
    if not COACH_CONVERSATION_FILE.exists():
        return None
    try:
        data = json.loads(COACH_CONVERSATION_FILE.read_text(encoding="utf-8"))
        cid = data.get("conversationId")
        return str(cid) if cid else None
    except Exception:
        return None


def save_conversation_id(conversation_id: str) -> None:
    """Persist conversation id for follow-up asks."""
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    COACH_CONVERSATION_FILE.write_text(
        json.dumps({"conversationId": conversation_id}, indent=2),
        encoding="utf-8",
    )


def clear_conversation_id() -> None:
    """Forget the saved CLI chat thread."""
    if COACH_CONVERSATION_FILE.exists():
        COACH_CONVERSATION_FILE.unlink()


def build_user_message(text: str) -> dict[str, Any]:
    """Build a minimal AI SDK UIMessage for a single user turn."""
    return {
        "id": str(uuid.uuid4()),
        "role": "user",
        "parts": [{"type": "text", "text": text}],
    }


def extract_stream_text(chunk: str) -> tuple[str, str | None]:
    """Extract displayable text and optional conversationId from a UI stream chunk.

    AI SDK UI message streams emit SSE-style or newline-delimited JSON events.
    We conservatively pull text from common shapes and ignore tool/metadata noise.
    """
    text_bits: list[str] = []
    conversation_id: str | None = None

    for raw_line in chunk.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith("data:"):
            line = line[5:].strip()
        if line in ("[DONE]", "done"):
            continue

        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            # Plain text fallthrough (some proxies strip framing)
            if not line.startswith("{") and not line.startswith("["):
                text_bits.append(line)
            continue

        if not isinstance(event, dict):
            continue

        # Nested metadata may carry conversationId
        meta = event.get("messageMetadata") or event.get("metadata")
        if isinstance(meta, dict) and meta.get("conversationId"):
            conversation_id = str(meta["conversationId"])

        etype = event.get("type")
        if etype in ("text-delta", "text"):
            delta = event.get("delta") or event.get("text") or ""
            if delta:
                text_bits.append(str(delta))
        elif etype == "text-start":
            continue
        elif "delta" in event and isinstance(event["delta"], str):
            # Older / alternate shapes
            if etype is None or "text" in str(etype):
                text_bits.append(event["delta"])
        elif isinstance(event.get("parts"), list):
            for part in event["parts"]:
                if isinstance(part, dict) and part.get("type") == "text":
                    part_text = part.get("text")
                    if part_text:
                        text_bits.append(str(part_text))

    return "".join(text_bits), conversation_id


async def ask_coach(
    prompt: str,
    *,
    deep: bool = False,
    new_conversation: bool = False,
) -> AsyncIterator[str]:
    """POST /api/coach/chat and yield assistant text as it streams."""
    if new_conversation:
        clear_conversation_id()
        conversation_id = str(uuid.uuid4())
    else:
        conversation_id = load_conversation_id() or str(uuid.uuid4())

    save_conversation_id(conversation_id)

    payload: dict[str, Any] = {
        "messages": [build_user_message(prompt)],
        "conversationId": conversation_id,
        "deepMode": deep,
    }

    buffer = ""
    async for chunk in api_post_stream("/api/coach/chat", payload, timeout=300.0):
        if chunk.startswith("[error]"):
            yield chunk
            return

        buffer += chunk
        # Flush on newlines so SSE events parse cleanly; keep a trailing partial line.
        while "\n" in buffer:
            line, buffer = buffer.split("\n", 1)
            text, cid = extract_stream_text(line + "\n")
            if cid:
                save_conversation_id(cid)
            if text:
                yield text

    if buffer.strip():
        text, cid = extract_stream_text(buffer)
        if cid:
            save_conversation_id(cid)
        if text:
            yield text


def format_today(data: dict[str, Any]) -> list[str]:
    """Format /api/coach/today payload as Rich markup lines."""
    lines: list[str] = []
    date = data.get("date") or "?"
    lines.append(f"[bold]Today[/]  [dim]{date}[/]")

    readiness = data.get("readiness")
    if readiness:
        level = readiness.get("level") or readiness.get("score") or "?"
        guidance = readiness.get("guidance") or ""
        lines.append(f"  Readiness: [cyan]{level}[/]")
        if guidance:
            lines.append(f"  [dim]{guidance}[/]")
    else:
        lines.append("  Readiness: [dim]n/a[/]")

    load = data.get("load")
    if load:
        lines.append(
            "  Load: "
            f"CTL {load.get('ctl')!s}  ATL {load.get('atl')!s}  "
            f"TSB {load.get('tsb')!s}  ACWR {load.get('acwr')!s}"
        )

    block = data.get("block")
    if block:
        lines.append(
            f"  Block: {block.get('name')} "
            f"[dim]({block.get('phase')}, #{block.get('number')})[/]"
        )

    conditions = data.get("conditions")
    if conditions:
        summary = conditions.get("summary") or ""
        temp = conditions.get("temperatureF")
        wind = conditions.get("windMph")
        lake = conditions.get("lakeTempF")
        bits = [summary] if summary else []
        if temp is not None:
            bits.append(f"{temp}°F")
        if wind is not None:
            bits.append(f"wind {wind} mph")
        if lake is not None:
            bits.append(f"lake {lake}°F")
        if bits:
            lines.append(f"  Conditions: {', '.join(str(b) for b in bits if b)}")

    sessions = data.get("sessions") or []
    lines.append("")
    lines.append(f"[bold]Sessions[/] ({len(sessions)})")
    if not sessions:
        lines.append("  [dim]none planned[/]")
    for session in sessions:
        sport = session.get("sport") or "?"
        title = session.get("title") or session.get("type") or "session"
        status = session.get("status") or ""
        mins = session.get("durationMinutes")
        dur = f" · {mins}m" if mins else ""
        guard = session.get("guardrail")
        flag = ""
        if guard and not guard.get("passed"):
            flag = " [red]guardrail[/]"
        lines.append(f"  • [{sport}] {title}{dur} [dim]{status}[/]{flag}")

    protocols = data.get("ptProtocols") or []
    if protocols:
        lines.append("")
        lines.append("[bold]PT[/]")
        for protocol in protocols:
            name = protocol.get("name") or protocol.get("slug")
            done = protocol.get("completed")
            skipped = protocol.get("skipped")
            mark = "[green]✓[/]" if done else ("[yellow]skipped[/]" if skipped else "[dim]○[/]")
            lines.append(f"  {mark} {name}")

    injuries = data.get("injuries") or []
    if injuries:
        lines.append("")
        lines.append("[bold]Injuries[/]")
        for injury in injuries:
            lines.append(
                f"  • {injury.get('name')} [dim]{injury.get('status')}[/] "
                f"{injury.get('sites') or ''}"
            )

    briefing = data.get("briefing")
    if briefing:
        lines.append("")
        lines.append("[bold]Briefing[/]")
        for paragraph in str(briefing).strip().splitlines():
            if paragraph.strip():
                lines.append(f"  {paragraph.strip()}")

    return lines


def format_spend(data: dict[str, Any]) -> list[str]:
    """Format /api/coach/spend payload."""
    lines: list[str] = []
    state = data.get("state") or "?"
    day = data.get("day") or {}
    month = data.get("month") or {}
    lines.append(f"[bold]Spend[/]  state=[cyan]{state}[/]")
    lines.append(
        f"  Day:   ${float(day.get('spent', 0)):.2f} / "
        f"${float(day.get('cap', 0)):.2f} ({float(day.get('pct', 0)):.0f}%)"
    )
    lines.append(
        f"  Month: ${float(month.get('spent', 0)):.2f} / "
        f"${float(month.get('cap', 0)):.2f} ({float(month.get('pct', 0)):.0f}%)"
    )
    projected = data.get("projectedMonthEnd")
    if projected is not None:
        lines.append(f"  Projected month end: ${float(projected):.2f}")

    by_job = data.get("byJob") or []
    if by_job:
        lines.append("")
        lines.append("[bold]By job[/]")
        for row in by_job[:12]:
            lines.append(
                f"  {row.get('job')}: ${float(row.get('costUsd', 0)):.3f} "
                f"({row.get('runs')} runs)"
            )
    return lines


def format_projection(data: dict[str, Any] | None) -> list[str]:
    """Format /api/coach/projection payload."""
    if not data:
        lines = [
            "[bold]Race projection[/]",
            "  [dim]No projection yet — CSS / VDOT / FTP baselines missing.[/]",
        ]
        return lines

    lines = ["[bold]Race projection[/]"]
    total = data.get("totalSeconds") or data.get("projectedTotalSeconds")
    if total is not None:
        minutes = int(total) // 60
        seconds = int(total) % 60
        lines.append(f"  Projected finish: {minutes}:{seconds:02d}")

    goal = data.get("goalSeconds") or data.get("goalTotalSeconds")
    if goal is not None:
        minutes = int(goal) // 60
        seconds = int(goal) % 60
        lines.append(f"  Goal: {minutes}:{seconds:02d}")

    for key in ("swim", "bike", "run", "t1", "t2"):
        if key in data and data[key] is not None:
            val = data[key]
            if isinstance(val, dict):
                lines.append(f"  {key}: {val}")
            else:
                lines.append(f"  {key}: {val}")

    leverage = data.get("leverage")
    if leverage:
        lines.append("")
        lines.append("[bold]Leverage[/]")
        if isinstance(leverage, list):
            for item in leverage[:8]:
                lines.append(f"  • {item}")
        elif isinstance(leverage, dict):
            for key, val in leverage.items():
                lines.append(f"  {key}: {val}")
        else:
            lines.append(f"  {leverage}")

    # Dump a few top-level keys we did not already render, for visibility.
    known = {
        "totalSeconds",
        "projectedTotalSeconds",
        "goalSeconds",
        "goalTotalSeconds",
        "swim",
        "bike",
        "run",
        "t1",
        "t2",
        "leverage",
    }
    extras = {k: v for k, v in data.items() if k not in known and v is not None}
    if extras and len(lines) < 4:
        lines.append("")
        lines.append(json.dumps(extras, indent=2, default=str))

    return lines


async def pm2_coach_process():
    """Return PM2 ProcessInfo for petehome-worker, or None."""
    return await PM2Service.get_process(COACH_PM2_NAME)


def open_ui_url() -> str:
    """URL for `coach open`."""
    return COACH_UI_URL


def web_cwd() -> str:
    return str(WEB_APP_PATH)
