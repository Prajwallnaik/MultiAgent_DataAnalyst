"""
LangGraph pipeline — wires all agent nodes into a StateGraph
with conditional edges for the execution → fix → retry loop.

Graph topology (from brain.md Section 3):

  query_planner → code_generator → execution
                                       │
                              ┌── success ──→ insight → END
                              │
                              └── error ──→ fixer ──→ execution  (loop)
                                              │
                                        retries exhausted → END (fallback)
"""

import logging
from langgraph.graph import StateGraph, END

from orchestrator.state import AnalysisState
from orchestrator.nodes import (
    query_planner,
    code_generator,
    execution_layer,
    fixer_agent,
    insight_agent,
)

logger = logging.getLogger(__name__)

DEFAULT_MAX_RETRIES = 3


# ── Routing functions ────────────────────────────────────────────────────────

def _route_after_execution(state: AnalysisState) -> str:
    """Decide the next node after the execution layer runs.

    Returns
    -------
    str
        "insight" on success, "fixer" on error (if retries remain),
        or "fallback" if retries are exhausted.
    """
    if state.get("error_message") is None:
        return "insight"

    max_retries = state.get("max_retries", DEFAULT_MAX_RETRIES)
    if state.get("retry_count", 0) < max_retries:
        return "fixer"

    return "fallback"


def _route_after_fixer(_state: AnalysisState) -> str:
    """After the fixer produces corrected code, always re-execute."""
    return "execution"


# ── Node wrappers ────────────────────────────────────────────────────────────
# LangGraph nodes receive the full state dict and return a partial update dict.

def _query_planner_node(state: AnalysisState) -> dict:
    return query_planner.run(state)


def _code_generator_node(state: AnalysisState) -> dict:
    return code_generator.run(state)


def _execution_node(state: AnalysisState) -> dict:
    return execution_layer.run(state)


def _fixer_node(state: AnalysisState) -> dict:
    return fixer_agent.run(state)


def _insight_node(state: AnalysisState) -> dict:
    return insight_agent.run(state)


def _fallback_node(state: AnalysisState) -> dict:
    """Terminal node when all retries are exhausted."""
    logger.warning("All retries exhausted — using fallback.")
    return {
        "fallback_used": True,
        "insight_text": (
            "I wasn't able to complete this analysis after several attempts. "
            "Here's the raw data instead. You might try rephrasing your question."
        ),
    }


# ── Graph builder ────────────────────────────────────────────────────────────

def build_graph() -> StateGraph:
    """Construct and return the compiled LangGraph pipeline.

    The returned object is callable:
        ``result_state = graph.invoke(initial_state)``
    """
    graph = StateGraph(AnalysisState)

    # Register nodes
    graph.add_node("query_planner", _query_planner_node)
    graph.add_node("code_generator", _code_generator_node)
    graph.add_node("execution", _execution_node)
    graph.add_node("fixer", _fixer_node)
    graph.add_node("insight", _insight_node)
    graph.add_node("fallback", _fallback_node)

    # Entry point
    graph.set_entry_point("query_planner")

    # Linear edges
    graph.add_edge("query_planner", "code_generator")
    graph.add_edge("code_generator", "execution")

    # Conditional edges after execution
    graph.add_conditional_edges(
        "execution",
        _route_after_execution,
        {
            "insight": "insight",
            "fixer": "fixer",
            "fallback": "fallback",
        },
    )

    # Fixer always loops back to execution
    graph.add_edge("fixer", "execution")

    # Terminal edges
    graph.add_edge("insight", END)
    graph.add_edge("fallback", END)

    return graph.compile()
