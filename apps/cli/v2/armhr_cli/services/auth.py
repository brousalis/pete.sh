"""OAuth2 Authorization Code with PKCE for CLI auth against Auth0/Okta.

Handles browser-based login, token caching, refresh, and manual token entry.
Tokens are cached at ~/.armhr/auth_token.json with restrictive permissions.

Flow:
  1. CLI reads Auth0 config from backend .env (domain, audience)
  2. Reads SPA client_id from ops frontend .env (or CLI_AUTH0_CLIENT_ID override)
  3. Opens browser to Auth0 /authorize with PKCE challenge
  4. User authenticates via Okta SSO (usually seamless if already logged in)
  5. Auth0 redirects to localhost callback with authorization code
  6. CLI exchanges code for access_token (+ optional refresh_token)
  7. Token cached to disk; subsequent API calls include Bearer header
"""

import base64
import hashlib
import json
import os
import secrets
import stat
import threading
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlencode, urlparse

import httpx

from armhr_cli.config import ENV_FILE, FRONTEND_ROOT, STATE_DIR

# ── Paths ────────────────────────────────────────────────────────────────

TOKEN_FILE = STATE_DIR / "auth_token.json"

# ── Timeout for Auth0 HTTP requests ─────────────────────────────────────

_TIMEOUT = httpx.Timeout(15.0, connect=5.0)

# ── Default scopes ──────────────────────────────────────────────────────

_SCOPES = "openid profile email offline_access"


# ── .env reader helper ──────────────────────────────────────────────────


def _read_env_var(path: Path, key: str) -> str:
    """Read a single env var value from a dotenv file."""
    try:
        if path.exists():
            for line in path.read_text().splitlines():
                stripped = line.strip()
                if stripped.startswith("#"):
                    continue
                if stripped.startswith(f"{key}="):
                    return stripped.split("=", 1)[1].strip().strip('"').strip("'")
    except Exception:
        pass
    return ""


# ── Auth0 configuration ─────────────────────────────────────────────────


def get_auth0_config() -> dict[str, Any]:
    """Build Auth0 config from backend and frontend .env files.

    Returns dict with keys: enabled, domain, audience, client_id, connection.
    """
    enabled_str = _read_env_var(ENV_FILE, "HCM_AUTH0_ENABLED")
    domain = _read_env_var(ENV_FILE, "HCM_AUTH0_DOMAIN")
    audience = _read_env_var(ENV_FILE, "HCM_AUTH0_AUDIENCE")

    # Client ID: prefer CLI-specific override, then ops frontend
    client_id = _read_env_var(ENV_FILE, "CLI_AUTH0_CLIENT_ID")
    if not client_id:
        ops_env = FRONTEND_ROOT / "packages" / "ops" / ".env"
        client_id = _read_env_var(ops_env, "VITE_APP_CLIENT_ID")

    # Okta connection (enterprise IdP): dev vs prod
    connection = ""
    if domain:
        connection = "armhr-ops-okta-dev" if "dev" in domain else "armhr-ops-okta"

    return {
        "enabled": enabled_str.lower() == "true",
        "domain": domain,
        "audience": audience,
        "client_id": client_id,
        "connection": connection,
    }


def is_auth0_enabled() -> bool:
    """Check whether Auth0 is enabled in the backend .env."""
    return _read_env_var(ENV_FILE, "HCM_AUTH0_ENABLED").lower() == "true"


# ── PKCE helpers ─────────────────────────────────────────────────────────


def _generate_pkce() -> tuple[str, str]:
    """Generate PKCE code_verifier and code_challenge (S256)."""
    code_verifier = secrets.token_urlsafe(96)[:128]
    digest = hashlib.sha256(code_verifier.encode("ascii")).digest()
    code_challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
    return code_verifier, code_challenge


# Fixed callback port — must be in Auth0 Allowed Callback URLs.
# Add http://localhost:18741/callback to your Auth0 app's Allowed Callback URLs.
_CALLBACK_PORT = 18741


# ── Localhost callback server ────────────────────────────────────────────


class _CallbackHandler(BaseHTTPRequestHandler):
    """Minimal HTTP handler to capture the OAuth2 callback."""

    auth_code: str | None = None
    error: str | None = None

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        if "code" in params:
            _CallbackHandler.auth_code = params["code"][0]
            self._respond(
                200,
                "<h2 style='color:#22c55e'>&#10003; Authenticated</h2>"
                "<p>You can close this tab and return to the CLI.</p>",
            )
        elif "error" in params:
            desc = params.get("error_description", params["error"])
            _CallbackHandler.error = desc[0] if desc else "unknown error"
            self._respond(400, f"<h2 style='color:#ef4444'>Error</h2><p>{_CallbackHandler.error}</p>")
        else:
            self.send_response(404)
            self.end_headers()

    def _respond(self, code: int, body_html: str) -> None:
        self.send_response(code)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        page = (
            "<!doctype html><html><body style='font-family:system-ui,sans-serif;"
            "text-align:center;padding:60px'>"
            f"{body_html}</body></html>"
        )
        self.wfile.write(page.encode())

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A002
        """Suppress default HTTP server logging."""


# ── Token cache ──────────────────────────────────────────────────────────


def _load_cached_token() -> dict[str, Any] | None:
    """Load cached token data from disk."""
    try:
        if TOKEN_FILE.exists():
            return json.loads(TOKEN_FILE.read_text())
    except Exception:
        pass
    return None


def _save_token(token_data: dict[str, Any]) -> None:
    """Persist token data to disk with restrictive permissions."""
    TOKEN_FILE.parent.mkdir(parents=True, exist_ok=True)
    TOKEN_FILE.write_text(json.dumps(token_data, indent=2))
    os.chmod(TOKEN_FILE, stat.S_IRUSR | stat.S_IWUSR)


def _is_token_expired(token_data: dict[str, Any]) -> bool:
    """Check if the access token is expired (with 60s buffer)."""
    expires_at = token_data.get("expires_at", 0)
    return time.time() >= expires_at - 60


def clear_token() -> None:
    """Remove cached token file."""
    try:
        TOKEN_FILE.unlink(missing_ok=True)
    except Exception:
        pass


# ── Manual token entry ───────────────────────────────────────────────────


def save_manual_token(access_token: str, expires_in: int = 86400) -> None:
    """Save a manually-pasted access token with a default 24h TTL."""
    config = get_auth0_config()
    token_data = {
        "access_token": access_token,
        "token_type": "Bearer",
        "expires_at": time.time() + expires_in,
        "domain": config["domain"],
        "manual": True,
    }
    _save_token(token_data)


# ── PKCE login flow ─────────────────────────────────────────────────────


async def login() -> dict[str, Any] | None:
    """Run Authorization Code + PKCE flow via browser.

    1. Start a localhost callback server
    2. Open browser to Auth0 /authorize
    3. Wait for redirect with authorization code
    4. Exchange code for tokens
    5. Cache and return token data

    Returns token dict on success, None on failure.
    """
    config = get_auth0_config()
    if not config["domain"] or not config["client_id"]:
        return None

    code_verifier, code_challenge = _generate_pkce()
    port = _CALLBACK_PORT
    redirect_uri = f"http://localhost:{port}/callback"

    # Reset handler state
    _CallbackHandler.auth_code = None
    _CallbackHandler.error = None

    # Start single-request callback server in a daemon thread
    try:
        server = HTTPServer(("127.0.0.1", port), _CallbackHandler)
    except OSError:
        return None  # Port in use — caller should show a helpful message
    server_thread = threading.Thread(target=server.handle_request, daemon=True)
    server_thread.start()

    # Build authorize URL
    params: dict[str, str] = {
        "response_type": "code",
        "client_id": config["client_id"],
        "redirect_uri": redirect_uri,
        "scope": _SCOPES,
        "audience": config["audience"],
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    if config.get("connection"):
        params["connection"] = config["connection"]

    authorize_url = f"https://{config['domain']}/authorize?{urlencode(params)}"

    # Open browser — works on Linux, macOS, WSL2 (via wslview)
    webbrowser.open(authorize_url)

    # Wait for the callback (up to 120 seconds)
    server_thread.join(timeout=120)
    server.server_close()

    if _CallbackHandler.error:
        return None

    if not _CallbackHandler.auth_code:
        return None

    # Exchange authorization code for tokens
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.post(
                f"https://{config['domain']}/oauth/token",
                json={
                    "grant_type": "authorization_code",
                    "client_id": config["client_id"],
                    "code_verifier": code_verifier,
                    "code": _CallbackHandler.auth_code,
                    "redirect_uri": redirect_uri,
                },
            )
            resp.raise_for_status()
            token_data = resp.json()
    except Exception:
        return None

    # Enrich with metadata
    token_data["expires_at"] = time.time() + token_data.get("expires_in", 86400)
    token_data["domain"] = config["domain"]
    token_data["obtained_at"] = time.time()

    _save_token(token_data)
    return token_data


# ── Token refresh ────────────────────────────────────────────────────────


async def refresh_access_token() -> dict[str, Any] | None:
    """Refresh the access token using a cached refresh_token.

    Returns new token data or None if refresh fails.
    """
    cached = _load_cached_token()
    if not cached or "refresh_token" not in cached:
        return None

    config = get_auth0_config()
    if not config["domain"] or not config["client_id"]:
        return None

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.post(
                f"https://{config['domain']}/oauth/token",
                json={
                    "grant_type": "refresh_token",
                    "client_id": config["client_id"],
                    "refresh_token": cached["refresh_token"],
                },
            )
            resp.raise_for_status()
            token_data = resp.json()
    except Exception:
        return None

    # Preserve refresh_token if not included in response
    if "refresh_token" not in token_data and "refresh_token" in cached:
        token_data["refresh_token"] = cached["refresh_token"]

    token_data["expires_at"] = time.time() + token_data.get("expires_in", 86400)
    token_data["domain"] = config["domain"]
    token_data["obtained_at"] = time.time()

    _save_token(token_data)
    return token_data


# ── Public API ───────────────────────────────────────────────────────────


async def get_access_token() -> str | None:
    """Get a valid access token, refreshing if needed.

    Returns the access_token string, or None if:
    - Auth0 is disabled (no token needed)
    - No cached token exists (user needs to login)
    - Token expired and refresh failed
    - Auth0 domain changed since last login
    """
    if not is_auth0_enabled():
        return None  # Auth disabled — no token needed

    cached = _load_cached_token()
    if cached is None:
        return None

    # Invalidate if auth0 domain changed (user switched presets)
    config = get_auth0_config()
    if cached.get("domain") != config["domain"]:
        return None

    # Valid token
    if not _is_token_expired(cached):
        return cached.get("access_token")

    # Attempt refresh
    refreshed = await refresh_access_token()
    if refreshed:
        return refreshed.get("access_token")

    return None  # Expired and can't refresh — needs re-login


def needs_login() -> bool:
    """Check if the user needs to authenticate.

    Returns True when auth0 is enabled but no valid token is available.
    This is a synchronous check (no refresh attempt).
    """
    if not is_auth0_enabled():
        return False

    cached = _load_cached_token()
    if cached is None:
        return True

    config = get_auth0_config()
    if cached.get("domain") != config["domain"]:
        return True

    if _is_token_expired(cached):
        # Has refresh token? Can't check synchronously, but flag as needs-login
        # The async get_access_token() will attempt refresh
        if "refresh_token" not in cached:
            return True

    return False


def get_token_status() -> dict[str, Any]:
    """Get detailed auth status for CLI display.

    Returns dict with: auth0_enabled, domain, authenticated, expires_in_secs,
    domain_match, has_refresh, manual.
    """
    config = get_auth0_config()
    result: dict[str, Any] = {
        "auth0_enabled": config.get("enabled", False),
        "domain": config.get("domain", ""),
        "client_id": config.get("client_id", ""),
        "authenticated": False,
        "expires_in_secs": 0,
        "domain_match": True,
        "has_refresh": False,
        "manual": False,
    }

    cached = _load_cached_token()
    if cached:
        result["domain_match"] = cached.get("domain") == config["domain"]
        result["has_refresh"] = "refresh_token" in cached
        result["manual"] = cached.get("manual", False)

        if result["domain_match"] and not _is_token_expired(cached):
            result["authenticated"] = True
            result["expires_in_secs"] = max(0, int(cached.get("expires_at", 0) - time.time()))

    return result
