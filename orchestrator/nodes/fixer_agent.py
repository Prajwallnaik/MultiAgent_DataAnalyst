"""
Fixer Agent — Node 5 (LLM call, unified for all code types).

Receives the failed code, error message, schema context, and the full
history of prior failed attempts.  Returns corrected code.

A single prompt template handles pandas, SQL, and numpy-related errors —
parameterised by ``code_type``, not three separate agents.
"""

import os
import logging

from llm.nvidia_client import chat
from orchestrator.state import AnalysisState

logger = logging.getLogger(__name__)

_PROMPT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "prompts",
    "fixer_agent_prompt.md",
)

def _load_prompt() -> str:
    """Load the prompt template from disk."""
    with open(_PROMPT_PATH, "r", encoding="utf-8") as f:
        return f.read()


def _format_failed_attempts(attempts: list[dict]) -> str:
    """Build a human-readable summary of all previous failed attempts."""
    if not attempts:
        return "None — this is the first fix attempt."

    parts = []
    for i, attempt in enumerate(attempts, 1):
        parts.append(
            f"--- Attempt {i} ---\n"
            f"Code:\n{attempt['code']}\n\n"
            f"Error:\n{attempt['error']}\n"
        )
    return "\n".join(parts)


def _clean_code(raw: str) -> str:
    """Strip markdown code fences if the LLM wraps the code in them."""
    code = raw.strip()
    if code.startswith("```"):
        first_nl = code.index("\n")
        code = code[first_nl + 1:]
    if code.endswith("```"):
        code = code[:-3]
    return code.strip()


def run(state: AnalysisState) -> dict:
    """Fix the failed code and return a corrected version.

    Returns
    -------
    dict
        State updates: ``generated_code`` (replaced with fixed version).
    """
    logger.info(
        "Fixer Agent: fixing %s code (attempt %d) …",
        state.get("code_type", "pandas"),
        state.get("retry_count", 1),
    )

    failed_attempts_str = _format_failed_attempts(
        state.get("failed_attempts", [])
    )

    prompt = _load_prompt()
    prompt = prompt.replace("{code_type}", state.get("code_type", "pandas"))
    prompt = prompt.replace("{failed_code}", state.get("generated_code", ""))
    prompt = prompt.replace("{error_message}", state.get("error_message", "Unknown error"))
    prompt = prompt.replace("{schema_context}", state.get("schema_context", ""))
    prompt = prompt.replace("{failed_attempts}", failed_attempts_str)

    messages = [
        {
            "role": "system",
            "content": (
                "You are an expert code debugger. "
                "Fix the code and return ONLY the corrected code — "
                "no explanation, no markdown fences."
            ),
        },
        {"role": "user", "content": prompt},
    ]

    raw = chat(messages, temperature=0.1, max_tokens=1500)
    fixed_code = _clean_code(raw)

    logger.debug("Fixed code:\n%s", fixed_code)

    return {
        "generated_code": fixed_code,
    }
