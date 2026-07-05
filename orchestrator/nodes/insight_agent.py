"""
Insight / Explainer Agent — Node 6 (LLM call).

Takes the small ``execution_result`` (never the raw dataset) and generates
a 1–3 sentence plain-English explanation of what the result means.
"""

import os
import logging
import pandas as pd

from llm.openrouter_client import chat
from orchestrator.state import AnalysisState

logger = logging.getLogger(__name__)

_PROMPT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "prompts",
    "insight_agent_prompt.md",
)

def _load_prompt() -> str:
    """Load the prompt template from disk."""
    with open(_PROMPT_PATH, "r", encoding="utf-8") as f:
        return f.read()


def _result_to_string(result, max_rows: int = 20) -> str:
    """Convert execution_result to a compact string for the LLM.

    Only sends a truncated preview — never the full dataset.
    """
    if result is None:
        return "No result produced."

    if isinstance(result, pd.DataFrame):
        if len(result) > max_rows:
            preview = result.head(max_rows).to_string(index=False)
            return f"{preview}\n... ({len(result)} total rows, showing first {max_rows})"
        return result.to_string(index=False)

    if isinstance(result, pd.Series):
        return result.to_string()

    # Plotly figures — summarize the data, not the figure object
    if hasattr(result, "data") and hasattr(result, "layout"):
        try:
            trace = result.data[0]
            if hasattr(trace, "x") and hasattr(trace, "y"):
                x_vals = list(trace.x)[:10]
                y_vals = list(trace.y)[:10]
                return f"Chart data (first 10 points):\nX: {x_vals}\nY: {y_vals}"
        except Exception:
            pass
        return "A Plotly chart was generated."

    # Scalar or other
    return str(result)


def run(state: AnalysisState) -> dict:
    """Generate a plain-English insight from the execution result.

    Returns
    -------
    dict
        State updates: ``insight_text``.
    """
    logger.info("Insight Agent: explaining result …")

    result_str = _result_to_string(state.get("execution_result"))

    prompt = _load_prompt()
    prompt = prompt.replace("{user_query}", state.get("user_query", ""))
    prompt = prompt.replace("{output_type}", state.get("output_type", ""))
    prompt = prompt.replace("{execution_result}", result_str)

    messages = [
        {
            "role": "system",
            "content": (
                "You are a friendly data analyst explaining results to a "
                "non-technical user. Be concise and insightful."
            ),
        },
        {"role": "user", "content": prompt},
    ]

    insight = chat(messages, temperature=0.3, max_tokens=300)
    insight = insight.strip()

    logger.debug("Insight: %s", insight)

    return {
        "insight_text": insight,
    }
