"""Deploy commands: Vercel deployment management.

Handlers write output to a RichLog widget.
"""

import webbrowser

from rich.markup import escape
from rich.table import Table
from textual.widgets import RichLog

from petehome_cli.services.vercel import VercelService


async def cmd_deploy(args: list[str], output: RichLog) -> None:
    """Handle deploy commands."""
    vercel = VercelService()

    if not vercel.is_configured:
        output.write("[red]✗[/] Vercel not configured")
        output.write("[dim]Set VERCEL_TOKEN environment variable[/]")
        return

    subcmd = args[0].lower() if args else "trigger"

    if subcmd in ("status", "latest"):
        deployment = await vercel.get_latest_deployment()

        if not deployment:
            output.write("[dim]No deployments found[/]")
            return

        status_display = {
            "READY": "[green]● Ready[/]",
            "ERROR": "[red]● Error[/]",
            "CANCELED": "[red]○ Canceled[/]",
            "BUILDING": "[yellow]◐ Building[/]",
            "QUEUED": "[yellow]◐ Queued[/]",
        }.get(deployment.state, f"[yellow]◐ {deployment.state}[/]")

        output.write(f"  Status:  {status_display}")
        output.write(f"  URL:     {deployment.deployment_url}")
        output.write(f"  Created: {deployment.created_str}")

    elif subcmd == "history":
        deployments = await vercel.get_deployments(limit=10)

        if not deployments:
            output.write("[dim]No deployments found[/]")
            return

        table = Table(
            show_header=True,
            header_style="bold dim",
            box=None,
            padding=(0, 2),
        )
        table.add_column("Status")
        table.add_column("State")
        table.add_column("Created")

        for d in deployments:
            status_icon = {
                "READY": "[green]●[/]",
                "ERROR": "[red]●[/]",
                "CANCELED": "[red]○[/]",
            }.get(d.state, "[yellow]◐[/]")
            table.add_row(status_icon, d.state, d.created_str)

        output.write(table)

    elif subcmd == "open":
        deployment = await vercel.get_latest_deployment()
        if deployment:
            output.write(f"[green]✓[/] Opening {deployment.deployment_url}")
            webbrowser.open(deployment.deployment_url)
        else:
            output.write("[dim]No deployment found[/]")

    elif subcmd in ("trigger", "prod", "production"):
        output.write("[dim]Deploying to production...[/]")
        ok, out = await vercel.trigger_deployment()
        if ok:
            output.write("[green]✓[/] Deployment triggered")
        else:
            first_line = out.split("\n")[0] if out else "Failed"
            output.write(f"[red]✗[/] {escape(first_line)}")

    else:
        output.write(f"[red]✗[/] Unknown: deploy {subcmd}")
        output.write("[dim]Options: status, history, open, trigger[/]")


def register(registry: dict) -> None:
    """Register deploy commands into the command registry."""
    registry["deploy"] = cmd_deploy
    registry["d"] = cmd_deploy
