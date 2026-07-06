"""
Query Planner Agent — Node 2 (LLM call).

Takes the user's natural-language question + schema_context and returns:
  • output_type  — one of the 10 defined types
  • analysis_plan — a short step-by-step plan in plain English
  • code_type     — "pandas" (SQL reserved for future extension)
"""

import json
import os
import logging

from llm.nvidia_client import chat
from orchestrator.state import AnalysisState, OUTPUT_TYPES

logger = logging.getLogger(__name__)

# Load the prompt template once
_PROMPT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "prompts",
    "query_planner_prompt.md",
)

def _load_prompt() -> str:
    """Load the prompt template from disk (fresh read each time for dev reload)."""
    with open(_PROMPT_PATH, "r", encoding="utf-8") as f:
        return f.read()


def run(state: AnalysisState) -> dict:
    """Classify intent and create an analysis plan.

    Returns
    -------
    dict
        State updates: ``output_type``, ``analysis_plan``, ``code_type``.
    """
    logger.info("Query Planner Agent: classifying query …")

    prompt = _load_prompt()
    prompt = prompt.replace("{schema_context}", state["schema_context"])
    prompt = prompt.replace("{user_query}", state["user_query"])

    messages = [
        {"role": "system", "content": "You are a precise data analysis planner. Respond only with valid JSON."},
        {"role": "user", "content": prompt},
    ]

    raw = chat(messages, temperature=0.1, expect_json=True)
    plan = json.loads(raw)

    # Validate output_type
    output_type = plan.get("output_type", "retrieval")
    if output_type not in OUTPUT_TYPES:
        logger.warning(
            "LLM returned unknown output_type '%s' — defaulting to 'retrieval'.",
            output_type,
        )
        output_type = "retrieval"

    code_type = plan.get("code_type", "pandas")
    analysis_plan = plan.get("analysis_plan", "Analyze the data based on the user's question.")

    logger.info("Classified as output_type=%s, code_type=%s", output_type, code_type)
    logger.debug("Analysis plan: %s", analysis_plan)

    return {
        "output_type": output_type,
        "analysis_plan": analysis_plan,
        "code_type": code_type,
    }
