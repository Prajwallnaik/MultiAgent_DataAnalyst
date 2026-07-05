"""
SQLite schema definitions for logging queries, generated code, errors, and retries.

Keeps a lightweight audit trail that is useful for debugging and portfolio demos.
"""

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS query_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp   TEXT    NOT NULL DEFAULT (datetime('now')),
    user_query  TEXT    NOT NULL,
    output_type TEXT,
    analysis_plan TEXT,
    code_type   TEXT,
    generated_code TEXT,
    execution_success INTEGER NOT NULL DEFAULT 0,   -- 0 = failed, 1 = succeeded
    retry_count INTEGER NOT NULL DEFAULT 0,
    fallback_used INTEGER NOT NULL DEFAULT 0,
    insight_text TEXT,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS retry_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    query_log_id INTEGER NOT NULL,
    attempt     INTEGER NOT NULL,
    failed_code TEXT    NOT NULL,
    error_message TEXT  NOT NULL,
    timestamp   TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (query_log_id) REFERENCES query_log(id)
);
"""
