"""
AnalysisState — the shared state schema that flows through every LangGraph node.

Every node reads from and writes to subsets of this TypedDict.
See brain.md Section 5 for the authoritative field descriptions.
"""

from typing import TypedDict, Literal, Optional, Any
import pandas as pd


# ── Supported output types (Section 4 of brain.md) ──────────────────────────
OUTPUT_TYPES = (
    "retrieval",
    "aggregation",
    "visualization",
    "trend",
    "statistical_summary",
    "correlation",
    "comparison",
    "data_quality",
    "ranking",
    "export",
)

OutputType = Literal[
    "retrieval",
    "aggregation",
    "visualization",
    "trend",
    "statistical_summary",
    "correlation",
    "comparison",
    "data_quality",
    "ranking",
    "export",
]

CodeType = Literal["pandas", "sql"]


class AnalysisState(TypedDict):
    """Shared state that flows through the LangGraph pipeline.

    Fields are populated progressively as each node executes:
      • data_understanding  → schema_context, df
      • query_planner       → analysis_plan, output_type
      • code_generator      → generated_code, code_type
      • execution_layer     → execution_result | error_message
      • fixer_agent         → generated_code (patched), failed_attempts
      • insight_agent       → insight_text
    """

    # ── Set once at upload ───────────────────────────────────────────────────
    df: Optional[pd.DataFrame]           # The loaded DataFrame (never sent to LLM)
    schema_context: str                  # Compact schema string for LLM context

    # ── Set per query ────────────────────────────────────────────────────────
    user_query: str                      # The user's natural-language question
    output_type: OutputType              # Classified by Query Planner
    analysis_plan: str                   # Plain-language plan from Query Planner
    code_type: CodeType                  # "pandas" or "sql"
    generated_code: str                  # Code string produced by Code Generator / Fixer

    # ── Execution results ────────────────────────────────────────────────────
    execution_result: Optional[Any]      # DataFrame, Series, scalar, or Plotly figure
    error_message: Optional[str]         # Captured exception message on failure
    failed_attempts: list[dict]          # History of {code, error} dicts for fixer context
    retry_count: int                     # Current retry number (starts at 0)
    max_retries: int                     # Cap (default 3)

    # ── Final output ─────────────────────────────────────────────────────────
    insight_text: Optional[str]          # Plain-English explanation from Insight Agent
    fallback_used: bool                  # True if retries exhausted and fallback rendered
