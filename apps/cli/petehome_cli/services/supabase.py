"""Supabase integration: run migrations against production database."""

import os
from pathlib import Path

from petehome_cli.config import WEB_APP_PATH

MIGRATIONS_DIR = WEB_APP_PATH / "supabase" / "migrations"
# Same schema/table Supabase CLI uses for migration history
MIGRATION_SCHEMA = "supabase_migrations"
MIGRATION_TABLE = "schema_migrations"


def get_db_url() -> str | None:
    """Get Supabase Postgres connection URL. Prefer SUPABASE_DB_URL, then construct from common env vars."""
    url = os.getenv("SUPABASE_DB_URL", "").strip()
    if url and not url.startswith("your-"):
        return url
    # Optional: Supabase pooler URL format (user must set SUPABASE_DB_URL for direct run)
    return None


def is_configured() -> bool:
    """Return True if we have a DB URL to run migrations."""
    return bool(get_db_url())


def _ensure_migration_table(conn) -> None:
    """Create supabase_migrations.schema_migrations if it doesn't exist."""
    with conn.cursor() as cur:
        cur.execute(f"CREATE SCHEMA IF NOT EXISTS {MIGRATION_SCHEMA}")
        cur.execute(
            f"""
            CREATE TABLE IF NOT EXISTS {MIGRATION_SCHEMA}.{MIGRATION_TABLE} (
                version TEXT PRIMARY KEY
            )
            """
        )
    conn.commit()


def get_applied_versions(conn) -> set[str]:
    """Return set of migration version strings (filenames) already applied."""
    with conn.cursor() as cur:
        try:
            cur.execute(f"SELECT version FROM {MIGRATION_SCHEMA}.{MIGRATION_TABLE}")
            return {row[0] for row in cur.fetchall()}
        except Exception:
            return set()


def list_migration_files() -> list[Path]:
    """List migration SQL files in order (by name)."""
    if not MIGRATIONS_DIR.exists():
        return []
    files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    return files


def run_migrations(dry_run: bool = False) -> tuple[bool, str]:
    """
    Run pending Supabase migrations against the database.
    Uses SUPABASE_DB_URL (Postgres connection URI from Supabase dashboard).
    Returns (success, message).
    """
    try:
        import psycopg2
    except ImportError:
        return False, "psycopg2 not installed. Run: pip install psycopg2-binary"

    url = get_db_url()
    if not url:
        return False, "SUPABASE_DB_URL not set. Set it to your Supabase Postgres URI (Project Settings → Database → Connection string)."

    files = list_migration_files()
    if not files:
        return False, f"No migration files in {MIGRATIONS_DIR}"

    try:
        conn = psycopg2.connect(url)
        conn.autocommit = False
    except Exception as e:
        return False, f"Connection failed: {e}"

    try:
        _ensure_migration_table(conn)
        applied = get_applied_versions(conn)
        pending = [f for f in files if f.name not in applied]
        if not pending:
            return True, "No pending migrations."
        if dry_run:
            names = [p.name for p in pending]
            return True, f"Dry run: would apply {len(pending)} migration(s): " + ", ".join(names)

        for path in pending:
            sql = path.read_text(encoding="utf-8", errors="replace")
            with conn.cursor() as cur:
                cur.execute(sql)
            with conn.cursor() as cur:
                cur.execute(
                    f"INSERT INTO {MIGRATION_SCHEMA}.{MIGRATION_TABLE} (version) VALUES (%s)",
                    (path.name,),
                )
            conn.commit()
        return True, f"Applied {len(pending)} migration(s)."
    except Exception as e:
        conn.rollback()
        return False, str(e)
    finally:
        conn.close()


def migration_status() -> tuple[bool, list[dict]]:
    """
    Return (success, list of {name, applied: bool}).
    """
    try:
        import psycopg2
    except ImportError:
        return False, []

    url = get_db_url()
    if not url:
        return False, []

    files = list_migration_files()
    if not files:
        return True, []

    try:
        conn = psycopg2.connect(url)
        try:
            _ensure_migration_table(conn)
            applied = get_applied_versions(conn)
        finally:
            conn.close()
    except Exception:
        return False, []

    result = [{"name": f.name, "applied": f.name in applied} for f in files]
    return True, result


def _resolve_spec_to_filename(spec: str, files: list[Path]) -> str | None:
    """Resolve a spec (e.g. '001' or '001_initial_schema.sql') to a migration filename."""
    spec = spec.strip()
    if not spec:
        return None
    # Exact match
    for f in files:
        if f.name == spec:
            return f.name
    # Prefix match (001 -> 001_initial_schema.sql)
    if not spec.endswith(".sql"):
        spec_prefix = spec.rstrip("_")
        for f in files:
            if f.name.startswith(spec_prefix + "_") or f.name.startswith(spec_prefix + "."):
                return f.name
    return None


def mark_applied(specs: list[str]) -> tuple[bool, str]:
    """
    Mark one or more migrations as applied without running them (sync history).
    specs: e.g. ['001', '002', ... '014'] or ['001_initial_schema.sql', ...].
    Returns (success, message).
    """
    try:
        import psycopg2
    except ImportError:
        return False, "psycopg2 not installed. Run: pip install psycopg2-binary"

    url = get_db_url()
    if not url:
        return False, "SUPABASE_DB_URL not set."

    files = list_migration_files()
    if not files:
        return False, "No migration files found."

    # Expand range like "001-014" into 001, 002, ... 014
    expanded: list[str] = []
    for s in specs:
        if "-" in s and not s.startswith("-"):
            parts = s.split("-", 1)
            if len(parts) == 2 and parts[0].isdigit() and parts[1].isdigit():
                lo, hi = int(parts[0]), int(parts[1])
                for i in range(lo, hi + 1):
                    expanded.append(f"{i:03d}")
                continue
        expanded.append(s)

    to_mark: list[str] = []
    for spec in expanded:
        name = _resolve_spec_to_filename(spec, files)
        if name:
            to_mark.append(name)
        else:
            return False, f"Unknown migration: {spec}"

    if not to_mark:
        return True, "Nothing to mark."

    try:
        conn = psycopg2.connect(url)
        conn.autocommit = False
        try:
            _ensure_migration_table(conn)
            applied = get_applied_versions(conn)
            new_ones = [v for v in to_mark if v not in applied]
            if not new_ones:
                return True, "All specified migrations already marked as applied."
            with conn.cursor() as cur:
                for v in new_ones:
                    cur.execute(
                        f"INSERT INTO {MIGRATION_SCHEMA}.{MIGRATION_TABLE} (version) VALUES (%s) ON CONFLICT (version) DO NOTHING",
                        (v,),
                    )
            conn.commit()
            return True, f"Marked {len(new_ones)} migration(s) as applied."
        finally:
            conn.close()
    except Exception as e:
        return False, str(e)
