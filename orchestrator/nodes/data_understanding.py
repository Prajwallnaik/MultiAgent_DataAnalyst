"""
Data Understanding Agent — Node 1 (no LLM call).

Loads the CSV into a pandas DataFrame and builds a compact ``schema_context``
string that downstream LLM-based agents will use instead of the raw data.
This is the only node that touches the raw file.
"""

import io
import logging
import pandas as pd

from orchestrator.state import AnalysisState

logger = logging.getLogger(__name__)

# Maximum rows to include in head() preview
_HEAD_ROWS = 3


def _build_schema_context(df: pd.DataFrame) -> str:
    """Create a compact, token-efficient schema summary.

    Includes:
      • Shape (rows × columns)
      • Column names with dtypes
      • First 3 rows (head)
      • Descriptive statistics (describe)
      • Null counts per column
    """
    parts: list[str] = []

    # Shape
    parts.append(f"Shape: {df.shape[0]} rows x {df.shape[1]} columns\n")

    # Columns & types
    col_info = "\n".join(
        f"    {col} : {dtype}" for col, dtype in zip(df.columns, df.dtypes)
    )
    parts.append(f"Columns:\n{col_info}\n")

    # Sample rows
    head_str = df.head(_HEAD_ROWS).to_string(index=False)
    parts.append(f"Sample rows (first {_HEAD_ROWS}):\n{head_str}\n")

    # Descriptive stats (numeric columns only, keep it compact)
    try:
        desc = df.describe(include="all").to_string()
        parts.append(f"Descriptive statistics:\n{desc}\n")
    except Exception:
        pass  # graceful — some DataFrames may not describe well

    # Null counts
    nulls = df.isnull().sum()
    if nulls.sum() > 0:
        null_str = "\n".join(
            f"    {col}: {count} nulls"
            for col, count in nulls.items()
            if count > 0
        )
        parts.append(f"Null values:\n{null_str}\n")
    else:
        parts.append("Null values: None\n")

    return "\n".join(parts)


def run(state: AnalysisState, uploaded_file) -> dict:
    """Load CSV from a Streamlit ``UploadedFile`` and return schema context.

    Parameters
    ----------
    state : AnalysisState
        Current pipeline state (mostly empty at this point).
    uploaded_file
        A Streamlit ``UploadedFile`` object (has a ``.read()`` method).

    Returns
    -------
    dict
        State updates: ``df`` and ``schema_context``.
    """
    logger.info("Data Understanding Agent: loading CSV …")

    # Read the file bytes into pandas
    raw_bytes = uploaded_file.read()
    uploaded_file.seek(0)  # reset for potential re-use
    df = pd.read_csv(io.BytesIO(raw_bytes))

    logger.info("Loaded DataFrame with shape %s", df.shape)

    schema_context = _build_schema_context(df)
    logger.debug("Schema context:\n%s", schema_context)

    return {
        "df": df,
        "schema_context": schema_context,
    }
