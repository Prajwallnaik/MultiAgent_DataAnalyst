"""
Code Generation Agent — Node 3 (LLM call).

Takes the analysis plan + output_type + schema_context and produces
raw Python (pandas / plotly) code as a string.  No execution here.
"""

import os
import logging

from llm.nvidia_client import chat
from orchestrator.state import AnalysisState

logger = logging.getLogger(__name__)

_PROMPT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "prompts",
    "code_generator_prompt.md",
)

def _load_prompt() -> str:
    """Load the prompt template from disk."""
    with open(_PROMPT_PATH, "r", encoding="utf-8") as f:
        return f.read()


def _clean_code(raw: str) -> str:
    """Strip markdown code fences if the LLM wraps the code in them."""
    code = raw.strip()
    if code.startswith("```"):
        # Remove opening fence line (```python or ```)
        first_nl = code.index("\n")
        code = code[first_nl + 1:]
    if code.endswith("```"):
        code = code[:-3]
    return code.strip()


def run(state: AnalysisState) -> dict:
    """Generate pandas/plotly code for the user's question.

    Returns
    -------
    dict
        State updates: ``generated_code``.
    """
    code_type = state.get("code_type", "pandas")
    logger.info("Code Generator Agent: writing %s code for output_type=%s …", code_type, state["output_type"])

    prompt = _load_prompt()
    prompt = prompt.replace("{schema_context}", state["schema_context"])
    prompt = prompt.replace("{analysis_plan}", state["analysis_plan"])
    prompt = prompt.replace("{output_type}", state["output_type"])
    prompt = prompt.replace("{user_query}", state["user_query"])
    prompt = prompt.replace("{code_type}", code_type)

    if code_type == "sql":
        system_msg = (
            "You are an expert SQL analyst. "
            "Write a clean, correct SQL SELECT query. "
            "Return ONLY the raw SQL — no markdown, no explanation."
        )
    else:
        system_msg = (
            "You are an expert Python data analyst. "
            "Write clean, correct pandas code. "
            "Return ONLY the code — no markdown, no explanation."
        )

    messages = [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": prompt},
    ]

    raw = chat(messages, temperature=0.1, max_tokens=1500)
    code = _clean_code(raw)

    logger.debug("Generated code:\n%s", code)

    return {
        "generated_code": code,
    }
