# Multi-Agent Data Analyst — Build Document (brain.md)

## 1. Project Overview

**Name:** Multi-Agent Data Analyst

**One-line description:** A multi-agent system that lets a user upload a small-to-medium CSV dataset and ask natural-language questions about it. Instead of a single LLM call doing everything, specialized agents handle planning, code generation, execution, error-fixing, and explanation — orchestrated as a LangGraph pipeline.

**Scope (explicit):**
- Small-to-medium CSV files only (roughly up to a few hundred MB, whatever comfortably fits in local RAM via pandas).
- NOT a big-data / distributed system. No Spark, no Dask, no DuckDB required for v1.
- Single dataset per session (no multi-file joins in v1, can be a future extension).

**Why this project (portfolio positioning):**
- Demonstrates agentic system design (multi-agent orchestration, not a single prompt wrapper).
- Demonstrates self-correcting systems (error-aware retry loops).
- Demonstrates practical engineering tradeoffs (token efficiency, sandboxing, graceful fallback).
- Reuses and extends patterns from prior projects: LangGraph multi-agent pattern (from MLOps Copilot), OpenRouter free-tier model usage (from PR Review Assistant / DocuMind), RAG/embeddings background (from Study Assistant) — this project is code-generation-and-execution focused rather than retrieval focused.

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Orchestration | LangGraph | State graph with conditional edges for retry/fix loop |
| LLM Provider | OpenRouter (free-tier) | Primary: Qwen (qwen/qwen3-235b-a22b:free), Fallback: Llama free-tier model |
| Data processing | Pandas | Primary execution engine, in-memory |
| UI | Streamlit | File upload, chat-style query input, dynamic result rendering |
| Storage | SQLite | Logs queries, generated code, errors, retry counts for later analysis |
| Charting | Plotly (primary), fallback to Matplotlib if needed | Plotly preferred for Streamlit interactivity |
| Code execution | Python `exec()` in a sandboxed namespace | Restricted builtins, no file/network/import access beyond whitelisted modules |

**Explicitly out of scope for v1:** DuckDB, Spark, Dask, distributed processing, multi-GB+ files.

---

## 3. Agent Architecture (LangGraph Nodes)

```
Upload CSV
    |
    v
[1. Data Understanding Agent]  (no LLM call — pure pandas)
    |
    v
[2. Query Planner Agent]  (LLM call — classifies intent + output_type)
    |
    v
[3. Code Generation Agent]  (LLM call — writes pandas/SQL code as text)
    |
    v
[4. Execution Layer]  (pure Python — exec() the code, sandboxed)
    |
    +--- success --> [6. Insight/Explainer Agent] --> Render in Streamlit
    |
    +--- error ----> [5. Fixer Agent]  (LLM call — unified fixer for all code types)
                         |
                         +--- retry (max 2-3x) --> back to [4. Execution Layer]
                         |
                         +--- exhausted retries --> Fallback (raw table / friendly error message)
```

### Node Details

**1. Data Understanding Agent** (no LLM call)
- Loads CSV via pandas locally.
- Extracts: column names, dtypes, shape, `df.head(3)`, `df.describe()` summary, null counts.
- Output: a compact `schema_context` string (must stay small — this is what gets sent to the LLM instead of raw data).

**2. Query Planner Agent** (LLM call)
- Input: user's natural language question + `schema_context`.
- Output (structured JSON): analysis plan (steps in plain terms) + `output_type` classification.
- `output_type` must be one of the 10 types defined in Section 4.

**3. Code Generation Agent** (LLM call)
- Input: the plan + `output_type` + `schema_context`.
- Output: raw pandas (or SQL, if using SQLite table) code as text. No execution here — just code generation.
- Must never fabricate column names not present in `schema_context`.

**4. Execution Layer** (no LLM call — pure Python)
- Executes generated code inside a sandboxed `exec()` call.
- Sandbox restrictions: whitelist only `pandas`, `numpy`, `plotly.express` in the exec namespace; disallow `import`, `open`, `os`, `sys`, `eval`, network access.
- Wrapped in `try/except`, capturing specific exception types (`KeyError`, `TypeError`, `ValueError`, SQL syntax errors) with context-rich messages.
- On success: routes `execution_result` to the Insight Agent and to the Streamlit renderer based on `output_type`.
- On failure: routes `error_message` + `failed_code` + `attempt_number` to the Fixer Agent.

**5. Fixer Agent** (LLM call — unified, single agent for all code types)
- Input: `{ code_type: "pandas" | "sql", failed_code, error_message, schema_context, attempt_number }`
- One prompt template handles pandas, SQL, and numpy-related errors — parameterized by `code_type`, not three separate agents.
- Output: corrected code.
- Retry cap: 2–3 attempts. Each retry includes the full history of prior failed attempts + their errors (so the LLM doesn't repeat the same mistake).
- If retries exhausted: return a fallback signal — execution layer falls back to showing the raw filtered/grouped table (if possible) or a friendly "couldn't complete this analysis" message, and logs the failure to SQLite.

**6. Insight/Explainer Agent** (LLM call)
- Input: ONLY the small `execution_result` (a table with a few rows, or a scalar/summary stat) — never the raw dataset.
- Output: a 1–3 sentence plain-English explanation of the result.
- Runs for all output types, not just visualizations (e.g., for retrieval: "Found 12 employees earning above ₹40,000").

---

## 4. Output Types (Execution Layer must support all 10)

The Query Planner Agent classifies each user question into exactly one of these:

| `output_type` | Example Query | Code Pattern | Streamlit Rendering |
|---|---|---|---|
| `retrieval` | "Employees with salary more than 40000" | `df[df['salary'] > 40000]` | `st.dataframe(result)` |
| `aggregation` | "Total sales by region" | `df.groupby('region')['sales'].sum()` | `st.dataframe(result)` |
| `visualization` | "Region-wise sales chart" | `px.bar(...)` | `st.plotly_chart(fig)` |
| `trend` | "Sales over months" | `df.groupby('month')['sales'].sum()` + line chart | `st.line_chart(result)` |
| `statistical_summary` | "Stats on salary column" | `df['salary'].describe()` | `st.dataframe(result)` |
| `correlation` | "Relation between experience and salary" | `df[['experience','salary']].corr()` | `st.dataframe(result)` or heatmap via `px.imshow` |
| `comparison` | "Compare avg salary between departments" | `df.groupby('dept')['salary'].mean()` | `st.dataframe(result)` or grouped bar chart |
| `data_quality` | "Any missing values?" | `df.isnull().sum()`, `df.duplicated().sum()` | `st.dataframe(result)` + `st.warning()` if issues found |
| `ranking` | "Top 5 highest paid employees" | `df.nlargest(5, 'salary')` | `st.dataframe(result)` |
| `export` | "Give me this filtered data as a file" | Same as retrieval + `df.to_csv()` | `st.download_button(...)` |

**Rendering dispatch logic (Streamlit):**
```python
if output_type in ["retrieval", "aggregation", "ranking", "comparison", "statistical_summary", "correlation", "data_quality"]:
    st.dataframe(execution_result)
    if output_type == "data_quality" and execution_result.sum() > 0:
        st.warning("Missing values or duplicates detected")
elif output_type == "visualization":
    st.plotly_chart(execution_result)
elif output_type == "trend":
    st.line_chart(execution_result)
elif output_type == "export":
    st.download_button("Download CSV", data=execution_result.to_csv(index=False), file_name="result.csv")
```

---

## 5. State Schema

```python
from typing import TypedDict, Literal, Optional, Any

class AnalysisState(TypedDict):
    schema_context: str          # column names, dtypes, sample rows, describe() summary
    user_query: str
    output_type: Literal[
        "retrieval", "aggregation", "visualization", "trend",
        "statistical_summary", "correlation", "comparison",
        "data_quality", "ranking", "export"
    ]
    analysis_plan: str           # plain-language plan from Query Planner
    code_type: Literal["pandas", "sql"]
    generated_code: str
    execution_result: Optional[Any]   # DataFrame, Series, scalar, or Plotly figure
    error_message: Optional[str]
    failed_attempts: list[dict]  # history of {code, error} pairs for retry context
    retry_count: int
    max_retries: int             # default 2-3
    insight_text: Optional[str]
    fallback_used: bool
```

---

## 6. Sandboxed Execution — Security Requirements (Non-Negotiable)

Since generated code runs via `exec()`, the following are mandatory:
- Restrict the exec namespace to only: `pandas as pd`, `numpy as np`, `plotly.express as px`, and the loaded `df`.
- Do NOT expose `__builtins__` fully — provide a minimal safe builtins dict (no `open`, `eval`, `exec`, `__import__`, `os`, `sys`, `subprocess`).
- No network access from within executed code.
- No file writes except the explicit `export` output_type path (and even then, write to a controlled temp location, not arbitrary paths).
- Set a max execution timeout (e.g., 5–10 seconds) to prevent runaway loops in generated code.
- Cap dataset size on upload (e.g., reject or warn above ~200MB) since this is explicitly a small-to-medium CSV tool.

---

## 7. Error Handling Reference (for Fixer Agent context)

| Error Type | Typical Cause | Context to Send Back |
|---|---|---|
| `KeyError` | Wrong/hallucinated column name | Full list of actual column names |
| `TypeError` | Operation on wrong dtype (e.g., summing strings) | Column dtypes dict |
| `ValueError` | Bad conversion, shape mismatch, empty groupby result | Relevant shapes/values involved |
| SQL syntax error | Malformed query, wrong table/column name | Table schema as `CREATE TABLE` statement |
| Empty result (no exception) | Over-restrictive filter | Not an error — check `if result.empty` before rendering; ask user to rephrase instead of retrying code |

**Fixer Agent prompt structure (single unified template):**
```
You are a code-fixing agent for a data analysis tool.
code_type: {code_type}
The following code failed:
{failed_code}

Error message:
{error_message}

Schema context:
{schema_context}

Previous failed attempts (if any):
{failed_attempts}

Fix the code. Return only the corrected {code_type} code, no explanation.
```

---

## 8. Token Efficiency Rules (Must Follow)

- NEVER send the full CSV/dataframe to the LLM at any stage.
- Only send: schema (column names + dtypes), `df.head(3)`, and small aggregate stats as context.
- Only send `execution_result` (small table/scalar) to the Insight Agent — never the raw dataset.
- Cap `schema_context` string length; if the CSV has many columns, consider only including columns semantically relevant to the query (optional optimization).

---

## 9. File Structure

```
multi-agent-data-analyst/
├── app.py                      # Streamlit entry point
├── orchestrator/
│   ├── graph.py                 # LangGraph definition, node wiring
│   ├── state.py                  # AnalysisState TypedDict
│   ├── nodes/
│   │   ├── data_understanding.py
│   │   ├── query_planner.py
│   │   ├── code_generator.py
│   │   ├── execution_layer.py
│   │   ├── fixer_agent.py
│   │   └── insight_agent.py
├── sandbox/
│   └── safe_exec.py              # sandboxed exec() wrapper with restricted builtins + timeout
├── llm/
│   └── openrouter_client.py      # OpenRouter API wrapper with model fallback (Qwen -> Llama)
├── db/
│   ├── models.py                  # SQLite schema (queries, code, errors, retry logs)
│   └── db.py                       # SQLite connection + helper functions
├── prompts/
│   ├── query_planner_prompt.md
│   ├── code_generator_prompt.md
│   ├── fixer_agent_prompt.md
│   └── insight_agent_prompt.md
├── requirements.txt
└── README.md
```

---

## 10. Ordered Build Sequence (for AI IDE / Antigravity / Cursor)

1. Set up project structure and `requirements.txt` (streamlit, pandas, langgraph, langchain-core, plotly, requests, python-dotenv).
2. Build `llm/openrouter_client.py` — OpenRouter API wrapper with primary/fallback model logic.
3. Build `db/models.py` + `db/db.py` — SQLite schema for logging queries, code, errors, retries.
4. Build `sandbox/safe_exec.py` — sandboxed exec wrapper with restricted builtins + timeout.
5. Build `orchestrator/state.py` — the `AnalysisState` TypedDict.
6. Build `orchestrator/nodes/data_understanding.py` — CSV loading + schema extraction (no LLM).
7. Build `prompts/query_planner_prompt.md` and `orchestrator/nodes/query_planner.py`.
8. Build `prompts/code_generator_prompt.md` and `orchestrator/nodes/code_generator.py`.
9. Build `orchestrator/nodes/execution_layer.py` — uses `safe_exec.py`, routes success/error.
10. Build `prompts/fixer_agent_prompt.md` and `orchestrator/nodes/fixer_agent.py` — unified fixer.
11. Build `prompts/insight_agent_prompt.md` and `orchestrator/nodes/insight_agent.py`.
12. Build `orchestrator/graph.py` — wire all nodes into a LangGraph StateGraph with conditional edges (execution -> success -> insight; execution -> error -> fixer -> retry execution; retries exhausted -> fallback).
13. Build `app.py` — Streamlit UI: file upload, query input box, output_type-based rendering dispatch (Section 4), expandable "Show generated code" section, download button for export type.
14. Add fallback rendering logic in `app.py` for exhausted-retry cases (raw table + friendly message).
15. Add dataset size guard on upload (warn/reject above threshold, e.g., 200MB).
16. Test each `output_type` individually with sample datasets (e.g., employee salary CSV, sales CSV).
17. Test error-recovery loop deliberately (e.g., ask a question referencing a non-existent column) to confirm Fixer Agent + retry loop works end-to-end.
18. Write README.md with setup instructions, architecture diagram, and example queries per output_type.

---

## 11. Example Queries to Test Each Output Type

- retrieval: "Show employees with salary more than 40000"
- aggregation: "Total sales by region"
- visualization: "Show a bar chart of sales by region"
- trend: "How did sales change over the months?"
- statistical_summary: "Give me statistics on the salary column"
- correlation: "Is there a relationship between experience and salary?"
- comparison: "Compare average salary between departments"
- data_quality: "Are there any missing values in this dataset?"
- ranking: "Top 5 highest paid employees"
- export: "Give me the filtered data as a downloadable file"

---

## 12. Resume-Ready Summary Line

"Designed and built a multi-agent data analysis system (LangGraph) for small-to-medium CSV datasets, handling 10 distinct query intents (retrieval, aggregation, trend, correlation, data quality, ranking, etc.) via an LLM-based intent classifier, self-correcting code generation with error-context retry loops, a unified fixer agent for pandas/SQL errors, and sandboxed code execution — built on free-tier LLMs via OpenRouter."
