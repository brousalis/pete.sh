"""Async HTTP client for the local armhr backend API.

Provides proxy session management and user search via the ops endpoints.
All methods return None on connection errors for graceful offline handling.

When Auth0 is enabled, requests include a Bearer token from the auth service.
The module tracks the last error type so the UI can distinguish between
"backend offline" and "authentication required".
"""

from typing import Any

import httpx

from armhr_cli.config import ENV_FILE
from armhr_cli.services.auth import get_access_token

# ── Timeout config ──────────────────────────────────────────────────────

_TIMEOUT = httpx.Timeout(5.0, connect=2.0)

# ── Error tracking ──────────────────────────────────────────────────────

# Last error type: "auth" (401), "offline" (connection), "error" (other), None (ok)
_last_error: str | None = None


def get_last_error() -> str | None:
    """Return the error type from the most recent API call.

    Values: "auth" (401 Unauthorized), "offline" (connection failed),
    "error" (other HTTP/server error), or None (last call succeeded).
    """
    return _last_error


# ── Proxy categories (mirrors ProxyCategories enum on the backend) ──────

PROXY_CATEGORIES: list[str] = [
    "Testing",
    "Customer Support",
    "Troubleshooting",
    "Training",
    "Onboarding",
    "Data Verification",
    "Feature Verification",
]


# ── Base URL resolution ─────────────────────────────────────────────────


def _get_base_url() -> str:
    """Read UV_PORT from .env and return the ops API base URL."""
    port = "8000"
    try:
        if ENV_FILE.exists():
            for line in ENV_FILE.read_text().splitlines():
                line = line.strip()
                if line.startswith("UV_PORT="):
                    port = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break
    except Exception:
        pass
    return f"http://localhost:{port}/ops"


# ── Auth headers ────────────────────────────────────────────────────────


async def _get_auth_headers() -> dict[str, str]:
    """Build request headers, including Bearer token when auth0 is enabled."""
    headers: dict[str, str] = {}
    token = await get_access_token()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


# ── Request helper ──────────────────────────────────────────────────────


async def _request(
    method: str,
    path: str,
    *,
    params: dict[str, Any] | None = None,
    json_body: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    """Make an authenticated API request. Returns parsed JSON or None.

    Sets _last_error to track the failure mode.
    """
    global _last_error
    try:
        headers = await _get_auth_headers()
        async with httpx.AsyncClient(timeout=_TIMEOUT, headers=headers) as client:
            resp = await client.request(
                method,
                f"{_get_base_url()}{path}",
                params=params,
                json=json_body,
            )
            resp.raise_for_status()
            _last_error = None
            return resp.json()
    except httpx.HTTPStatusError as e:
        _last_error = "auth" if e.response.status_code == 401 else "error"
        return None
    except (httpx.ConnectError, httpx.ConnectTimeout):
        _last_error = "offline"
        return None
    except Exception:
        _last_error = "error"
        return None


# ── API Methods ─────────────────────────────────────────────────────────


async def get_proxy_sessions() -> list[dict[str, Any]] | None:
    """Fetch all active proxy sessions.

    Returns list of session dicts or None on failure.
    """
    data = await _request("GET", "/admin/users/proxy-sessions")
    if data is None:
        return None
    return data.get("results", [])


async def end_proxy_session(user_id: str) -> bool:
    """End (DELETE) a proxy session for the given true_user_id.

    Returns True on success, False on failure.
    """
    data = await _request("DELETE", f"/admin/users/proxy-sessions/{user_id}")
    return data is not None


async def search_users(query: str, page: int = 1, limit: int = 20) -> dict[str, Any] | None:
    """Search Auth0 users via the ops search endpoint.

    Always returns {"users": [...], "total": int} or None on failure.
    """
    data = await _request(
        "GET",
        "/admin/users/search",
        params={"search": query, "page": page, "limit": limit},
    )
    if data is None:
        return None
    results = data.get("results", {})
    # Backend returns the user list directly under "results"
    if isinstance(results, list):
        return {"users": results, "total": len(results)}
    return results


async def set_proxy_user(payload: dict[str, Any]) -> dict[str, Any] | None:
    """Start a proxy session via POST /admin/users/set-proxy-user.

    Payload should match ProxySessionRequest schema:
      proxy_user_id, proxy_prism_user_id, proxy_prism_client_id,
      prehire_flag, category, note, expiration_duration

    Returns the response dict or None on failure.
    """
    data = await _request("POST", "/admin/users/set-proxy-user", json_body=payload)
    if data is None:
        return None
    return data.get("results", {})


async def get_target_user() -> dict[str, Any] | None:
    """Get the current user (from JWT / fake_api_user in dev).

    Returns user dict or None on failure.
    """
    data = await _request("GET", "/admin/users/target-user")
    if data is None:
        return None
    return data.get("results", {})


async def get_proxy_audit_logs() -> list[dict[str, Any]] | None:
    """Fetch all proxy audit log entries.

    Returns list of audit log dicts or None on failure.
    """
    data = await _request("GET", "/admin/users/proxy-audits")
    if data is None:
        return None
    return data.get("results", [])
