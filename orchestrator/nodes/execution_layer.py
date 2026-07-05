"""
Execution Layer — Node 4 (no LLM call).

Runs the generated code inside the sandbox and routes the outcome:
  • On success → populates execution_result
  • On failure → populates error_message + appends to failed_attempts

Supports two code_type modes:
  • "pandas" — runs Python code via sandboxed exec()
  • "sql"    — loads df into an in-memory SQLite table and runs the SQL query
"""

import logging
import sqlite3
import pandas as pd

from sandbox.safe_exec import safe_exec, ExecutionTimeout, SandboxViolation
from orchestrator.state import AnalysisState

logger = logging.getLogger(__name__)


_BLOCKED_SQL_KEYWORDS = [
    "DROP", "DELETE", "UPDATE", "INSERT", "ALTER",
    "CREATE", "ATTACH", "DETACH", "PRAGMA", "VACUUM",
    "REPLACE INTO", "LOAD_EXTENSION",
]


def _validate_sql(sql: str) -> None:
    """Block destructive SQL statements — only SELECT queries are allowed."""
    sql_upper = sql.upper().strip()

    if not sql_upper.startswith("SELECT"):
        raise SandboxViolation(
            "Only SELECT queries are allowed. "
            f"Got: {sql_upper[:50]}..."
        )

    for keyword in _BLOCKED_SQL_KEYWORDS:
        if keyword in sql_upper:
            raise SandboxViolation(
                f"SQL contains blocked keyword: {keyword}"
            )


def _execute_sql(sql: str, df: pd.DataFrame) -> pd.DataFrame:
    """Load the DataFrame into an in-memory SQLite table named 'df'
    and execute the SQL query against it.

    Returns the query result as a DataFrame.
    """
    _validate_sql(sql)

    conn = sqlite3.connect(":memory:")
    try:
        # Load DataFrame into SQLite as table "df"
        df.to_sql("df", conn, index=False, if_exists="replace")

        # Execute the query
        result = pd.read_sql_query(sql, conn)
        return result
    finally:
        conn.close()


def run(state: AnalysisState) -> dict:
    """Execute generated code in the sandbox (pandas) or via SQLite (sql).

    Returns
    -------
    dict
        On success: ``execution_result`` set, ``error_message`` cleared.
        On failure: ``error_message`` set, ``failed_attempts`` extended,
        ``retry_count`` incremented.
    """
    code = state["generated_code"]
    df = state["df"]
    code_type = state.get("code_type", "pandas")
    retry_count = state.get("retry_count", 0)
    failed_attempts = list(state.get("failed_attempts", []))

    logger.info("Execution Layer: running %s code (attempt %d) …", code_type, retry_count + 1)

    try:
        if code_type == "sql":
            # ── SQL execution path ───────────────────────────────────────
            # Clean up the SQL — strip markdown fences if present
            sql = code.strip()
            if sql.startswith("```"):
                first_nl = sql.index("\n")
                sql = sql[first_nl + 1:]
            if sql.endswith("```"):
                sql = sql[:-3]
            sql = sql.strip().rstrip(";")

            result = _execute_sql(sql, df)
        else:
            # ── Pandas execution path ────────────────────────────────────
            result = safe_exec(code, df)

        logger.info("Execution succeeded.")
        return {
            "execution_result": result,
            "error_message": None,
        }

    except ExecutionTimeout as exc:
        error_msg = f"Timeout: {exc}"
    except SandboxViolation as exc:
        error_msg = f"Security violation: {exc}"
    except KeyError as exc:
        error_msg = f"KeyError: {exc} — available columns: {list(df.columns)}"
    except TypeError as exc:
        dtypes_info = df.dtypes.to_dict()
        error_msg = f"TypeError: {exc} — column dtypes: {dtypes_info}"
    except ValueError as exc:
        error_msg = f"ValueError: {exc}"
    except NameError as exc:
        error_msg = f"NameError: {exc}"
    except sqlite3.OperationalError as exc:
        error_msg = f"SQL Error: {exc} — available columns: {list(df.columns)}"
    except Exception as exc:
        error_msg = f"{type(exc).__name__}: {exc}"

    # ── Failure path ─────────────────────────────────────────────────────
    logger.warning("Execution failed (attempt %d): %s", retry_count + 1, error_msg)

    failed_attempts.append({
        "code": code,
        "error": error_msg,
    })

    return {
        "execution_result": None,
        "error_message": error_msg,
        "failed_attempts": failed_attempts,
        "retry_count": retry_count + 1,
    }
