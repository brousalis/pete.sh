"""setlist — build a Spotify playlist from likely setlists.fm consensus."""

from __future__ import annotations

from textual.widgets import RichLog

from petehome_cli.config import WEB_APP_PATH
from petehome_cli.services import coach as coach_svc

_USAGE = """\
[dim]setlist — likely setlist → Spotify playlist
  setlist <band> [band...] [--shows N] [--min-freq 0.5] [--name "..."] [--public|--private] [--auth]

  Examples:
    setlist Bilmuri
    setlist Bilmuri "Dance Gavin Dance"
    setlist Bilmuri --shows 3 --name "Riot Fest prep"
    setlist Bilmuri --auth
[/]"""


def _write_line(output: RichLog, line: str) -> None:
    lower = line.lower()
    if "error" in lower or line.startswith("[error]"):
        output.write(f"[red]{line}[/]")
    elif "warn" in lower:
        output.write(f"[yellow]{line}[/]")
    elif any(kw in lower for kw in ("created playlist", "tracks added", "open:", "✓")):
        output.write(f"[green]{line}[/]")
    else:
        output.write(line)


async def cmd_setlist(args: list[str], output: RichLog) -> None:
    """Run yarn setlist:spotify with the given band names / flags."""
    if not args or args[0] in ("-h", "--help", "help"):
        output.write(_USAGE)
        return

    output.write(f"[dim]yarn setlist:spotify {' '.join(args)}[/]")
    async for line in coach_svc.stream_yarn("setlist:spotify", *args, cwd=WEB_APP_PATH):
        _write_line(output, line)


def register(registry: dict) -> None:
    registry["setlist"] = cmd_setlist
