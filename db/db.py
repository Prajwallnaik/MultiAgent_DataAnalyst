"""
SQLite connection manager and helper functions for logging analysis runs.

Uses a single file-based SQLite DB stored alongside the project.
"""

import sqlite3
import os
import logging
from contextlib import contextmanager

from db.models import SCHEMA_SQL

logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "analyst.db")


def _ensure_schema(conn: sqlite3.Connection) -> None:
    """Create tables if they don't already exist."""
    conn.executescript(SCHEMA_SQL)
    conn.commit()


@contextmanager
def get_connection():
    """Yield a SQLite connection with WAL mode and auto-commit on success."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.row_factory = sqlite3.Row
    _ensure_schema(conn)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def log_query(
    user_query: str,
    output_type: str | None = None,
    analysis_plan: str | None = None,
    code_type: str | None = None,
    generated_code: str | None = None,
    execution_success: bool = False,
    retry_count: int = 0,
    fallback_used: bool = False,
    insight_text: str | None = None,
    error_message: str | None = None,
) -> int:
    """Insert a row into query_log and return the new row id."""
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO query_log
                (user_query, output_type, analysis_plan, code_type,
                 generated_code, execution_success, retry_count,
                 fallback_used, insight_text, error_message)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_query,
                output_type,
                analysis_plan,
                code_type,
                generated_code,
                int(execution_success),
                retry_count,
                int(fallback_used),
                insight_text,
                error_message,
            ),
        )
        return cursor.lastrowid


def log_retry(
    query_log_id: int,
    attempt: int,
    failed_code: str,
    error_message: str,
) -> None:
    """Record one failed attempt in the retry_log table."""
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO retry_log (query_log_id, attempt, failed_code, error_message)
            VALUES (?, ?, ?, ?)
            """,
            (query_log_id, attempt, failed_code, error_message),
        )


def get_recent_queries(limit: int = 20) -> list[dict]:
    """Return the most recent query_log rows as dicts (newest first)."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM query_log ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]
