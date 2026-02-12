"""Authentication commands: auth login, auth status, auth logout, auth token.

Manages OAuth2 PKCE authentication against Auth0/Okta for CLI API access.
"""

from rich.table import Table
from textual.widgets import RichLog

from armhr_cli.services.auth import (
    clear_token,
    get_auth0_config,
    get_token_status,
    login,
    save_manual_token,
)


async def cmd_auth(args: list[str], output: RichLog) -> None:
    """Dispatch auth sub-commands."""
    if not args:
        await _show_status(output)
        return

    sub = args[0].lower()

    if sub == "login":
        await _login(output)
    elif sub == "status":
        await _show_status(output)
    elif sub == "logout":
        await _logout(output)
    elif sub == "token":
        await _set_token(args[1:], output)
    elif sub == "config":
        await _show_config(output)
    else:
        output.write(f"[red]✗[/] Unknown auth sub-command: {sub}")
        output.write("[dim]Usage: auth [login|status|logout|token|config][/]")


async def _login(output: RichLog) -> None:
    """Run browser-based OAuth PKCE login."""
    config = get_auth0_config()

    if not config.get("enabled"):
        output.write("[dim]Auth0 is disabled — no login needed[/]")
        output.write("[dim]The backend uses fake_api_user in this mode[/]")
        return

    if not config["domain"] or not config["client_id"]:
        output.write("[red]✗[/] Auth0 configuration incomplete")
        output.write(f"[dim]  domain: {config['domain'] or '(missing)'}[/]")
        output.write(f"[dim]  client_id: {config['client_id'] or '(missing)'}[/]")
        output.write("[dim]Set HCM_AUTH0_DOMAIN in .env and ensure ops frontend .env has VITE_APP_CLIENT_ID[/]")
        return

    output.write(f"[bold cyan]Authenticating via {config['domain']}[/]")
    output.write(f"[dim]Client: {config['client_id'][:12]}...[/]")
    output.write(f"[dim]Connection: {config.get('connection', 'default')}[/]")
    output.write("[dim]Opening browser...[/]")

    token_data = await login()

    if token_data:
        expires_in = token_data.get("expires_in", 0)
        hours = expires_in // 3600
        mins = (expires_in % 3600) // 60
        output.write("[green]✓[/] Authenticated successfully")
        output.write(f"[dim]  Token expires in {hours}h {mins}m[/]")
        if token_data.get("refresh_token"):
            output.write("[dim]  Refresh token cached for auto-renewal[/]")
    else:
        output.write("[red]✗[/] Authentication failed")
        output.write("[dim]Possible causes:[/]")
        output.write("[dim]  · Browser didn't complete authentication within 120s[/]")
        output.write("[dim]  · Auth0 callback URL not configured for localhost[/]")
        output.write("[dim]  · Token exchange failed (check domain/audience match)[/]")
        output.write("")
        output.write("[dim]Fallback: paste a token manually with 'auth token <token>'[/]")


async def _show_status(output: RichLog) -> None:
    """Show current authentication status."""
    status = get_token_status()
    config = get_auth0_config()

    table = Table(
        show_header=False,
        box=None,
        padding=(0, 2),
        expand=False,
    )
    table.add_column("Key", style="dim")
    table.add_column("Value")

    # Auth0 enabled
    enabled_str = "[green]enabled[/]" if status["auth0_enabled"] else "[dim]disabled[/]"
    table.add_row("Auth0", enabled_str)
    table.add_row("Domain", status.get("domain") or "[dim]—[/]")
    table.add_row("Audience", config.get("audience") or "[dim]—[/]")
    table.add_row("Client ID", (status.get("client_id") or "—")[:20] + "...")

    # Token status
    if status["authenticated"]:
        secs = status["expires_in_secs"]
        hours = secs // 3600
        mins = (secs % 3600) // 60
        token_str = f"[green]● valid[/] · expires in {hours}h {mins}m"
        if status.get("manual"):
            token_str += " [dim](manual)[/]"
    elif not status["auth0_enabled"]:
        token_str = "[dim]not needed (auth0 disabled)[/]"
    elif not status["domain_match"]:
        token_str = "[yellow]● stale[/] · domain changed, re-login needed"
    else:
        token_str = "[red]○ not authenticated[/]"

    table.add_row("Token", token_str)

    if status.get("has_refresh"):
        table.add_row("Refresh", "[green]● cached[/]")

    output.write(table)


async def _logout(output: RichLog) -> None:
    """Clear cached auth token."""
    clear_token()
    output.write("[green]✓[/] Auth token cleared")


async def _set_token(args: list[str], output: RichLog) -> None:
    """Manually set a bearer token (fallback for WSL2/headless environments)."""
    if not args:
        output.write("[red]✗[/] Usage: auth token <access_token>")
        output.write("[dim]Paste a valid Bearer token from browser devtools or another source[/]")
        output.write("[dim]  1. Open your app in the browser[/]")
        output.write("[dim]  2. Open devtools → Network tab[/]")
        output.write("[dim]  3. Find any API request → copy the Authorization header value[/]")
        output.write("[dim]  4. Remove the 'Bearer ' prefix and paste: auth token eyJ...[/]")
        return

    token = args[0].strip()
    if token.lower().startswith("bearer "):
        token = token[7:]

    if not token.startswith("eyJ"):
        output.write("[yellow]⚠[/] Token doesn't look like a JWT (expected eyJ... prefix)")
        output.write("[dim]Saving anyway — the backend will validate it[/]")

    save_manual_token(token)
    output.write("[green]✓[/] Token saved to ~/.armhr/auth_token.json")
    output.write("[dim]Token will be used for all API requests until it expires (24h default)[/]")


async def _show_config(output: RichLog) -> None:
    """Show the resolved Auth0 configuration."""
    config = get_auth0_config()

    output.write("[bold]Auth0 Configuration (resolved)[/]")
    for key, value in config.items():
        if key == "client_id" and value:
            value = f"{value[:12]}...{value[-4:]}"
        display_val = str(value) if value else "[dim]—[/]"
        output.write(f"  [dim]{key}:[/] {display_val}")


def register(registry: dict) -> None:
    registry["auth"] = cmd_auth
