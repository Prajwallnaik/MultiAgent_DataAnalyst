"""
Multi-Agent Data Analyst — Streamlit UI

Features:
  - CSV file upload with size guard (200 MB cap)
  - Chat-style query input
  - Dynamic result rendering based on output_type
  - Expandable generated code section
  - Download button for export output type
  - Fallback rendering for exhausted retries
"""

import logging
import streamlit as st
import pandas as pd

from orchestrator.nodes import data_understanding
from orchestrator.graph import build_graph
from db.db import log_query, log_retry

# -- Logging ------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(name)-30s  %(levelname)-7s  %(message)s",
)
logger = logging.getLogger(__name__)

# -- Constants ----------------------------------------------------------------
MAX_UPLOAD_MB = 200
MAX_RETRIES = 3

# -- Page config --------------------------------------------------------------
st.set_page_config(
    page_title="Multi-Agent Data Analyst",
    page_icon="M",
    layout="wide",
)

# -- Custom CSS ---------------------------------------------------------------
st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }

    /* Header */
    .header-bar {
        background: #0a0a0a;
        border: 1px solid #1f1f1f;
        padding: 2rem 2.5rem;
        border-radius: 8px;
        margin-bottom: 2rem;
    }
    .header-bar h1 {
        margin: 0;
        font-size: 1.6rem;
        font-weight: 800;
        color: #ffffff;
        letter-spacing: -0.03em;
        text-transform: uppercase;
    }
    .header-bar p {
        margin: 0.5rem 0 0 0;
        color: #737373;
        font-size: 0.88rem;
        font-weight: 500;
        letter-spacing: 0.01em;
    }

    /* Schema card */
    .schema-card {
        background: #0a0a0a;
        border: 1px solid #1f1f1f;
        border-radius: 6px;
        padding: 1rem 1.2rem;
        font-size: 0.8rem;
        color: #a3a3a3;
        line-height: 1.6;
        white-space: pre-wrap;
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        max-height: 350px;
        overflow-y: auto;
    }

    /* Insight box */
    .insight-box {
        background: #0a0a0a;
        border-left: 3px solid #ffffff;
        padding: 1rem 1.4rem;
        border-radius: 0 6px 6px 0;
        margin: 1rem 0;
        color: #d4d4d4;
        font-size: 0.92rem;
        line-height: 1.7;
        font-weight: 500;
    }
    .insight-label {
        font-weight: 700;
        color: #ffffff;
        text-transform: uppercase;
        font-size: 0.7rem;
        letter-spacing: 0.08em;
        margin-bottom: 0.4rem;
    }

    /* Status chips */
    .status-chip {
        display: inline-block;
        padding: 0.2rem 0.7rem;
        border-radius: 4px;
        font-size: 0.72rem;
        font-weight: 700;
        margin-right: 0.5rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
    }
    .chip-success { background: #052e16; color: #4ade80; border: 1px solid #166534; }
    .chip-error   { background: #450a0a; color: #f87171; border: 1px solid #7f1d1d; }
    .chip-retry   { background: #422006; color: #fbbf24; border: 1px solid #78350f; }
    .chip-type    { background: #1e1b4b; color: #a5b4fc; border: 1px solid #312e81; }

    /* Query label */
    .query-label {
        font-size: 0.95rem;
        font-weight: 700;
        color: #e5e5e5;
        margin-bottom: 0.5rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid #1f1f1f;
    }

    /* Divider */
    .result-divider {
        border: none;
        border-top: 1px solid #1f1f1f;
        margin: 1.5rem 0;
    }

    /* Empty state */
    .empty-state {
        background: #0a0a0a;
        border: 1px solid #1f1f1f;
        padding: 3rem 2.5rem;
        border-radius: 8px;
        text-align: left;
    }
    .empty-state h2 {
        color: #ffffff;
        font-weight: 800;
        font-size: 1.3rem;
        letter-spacing: -0.02em;
        text-transform: uppercase;
        margin: 0 0 0.8rem 0;
    }
    .empty-state p {
        color: #a3a3a3;
        font-size: 0.9rem;
        font-weight: 500;
        line-height: 1.6;
        margin: 0;
    }

    /* Hide Streamlit branding */
    #MainMenu { visibility: hidden; }
    footer { visibility: hidden; }

    /* Buttons */
    div.stButton > button {
        background: #ffffff;
        color: #0a0a0a;
        border: none;
        border-radius: 6px;
        padding: 0.5rem 1.5rem;
        font-weight: 700;
        font-size: 0.82rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        transition: opacity 0.15s;
    }
    div.stButton > button:hover {
        opacity: 0.85;
    }

    /* Download button */
    div.stDownloadButton > button {
        background: #ffffff;
        color: #0a0a0a;
        border: none;
        border-radius: 6px;
        padding: 0.5rem 1.5rem;
        font-weight: 700;
        font-size: 0.82rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    /* Sidebar headings */
    .sidebar-heading {
        font-weight: 800;
        font-size: 0.78rem;
        color: #737373;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: 0.8rem;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

# -- Header -------------------------------------------------------------------
st.markdown(
    """
    <div class="header-bar">
        <h1>Multi-Agent Data Analyst</h1>
        <p>Upload a CSV dataset and query it in plain English. Powered by autonomous AI agents.</p>
    </div>
    """,
    unsafe_allow_html=True,
)

# -- Session state defaults ----------------------------------------------------
if "df" not in st.session_state:
    st.session_state.df = None
if "schema_context" not in st.session_state:
    st.session_state.schema_context = None
if "history" not in st.session_state:
    st.session_state.history = []


# -- Sidebar: file upload -----------------------------------------------------
with st.sidebar:
    st.markdown('<div class="sidebar-heading">Upload Dataset</div>', unsafe_allow_html=True)
    uploaded_file = st.file_uploader(
        "Choose a CSV file",
        type=["csv"],
        help=f"Max file size: {MAX_UPLOAD_MB} MB",
    )

    if uploaded_file is not None:
        size_mb = uploaded_file.size / (1024 * 1024)
        if size_mb > MAX_UPLOAD_MB:
            st.error(f"File too large ({size_mb:.1f} MB). Maximum is {MAX_UPLOAD_MB} MB.")
        elif st.session_state.df is None or st.session_state.get("_file_name") != uploaded_file.name:
            with st.spinner("Loading dataset..."):
                result = data_understanding.run({}, uploaded_file)
                st.session_state.df = result["df"]
                st.session_state.schema_context = result["schema_context"]
                st.session_state._file_name = uploaded_file.name
                st.session_state.history = []
            st.success(f"Loaded **{uploaded_file.name}** — {result['df'].shape[0]:,} rows, {result['df'].shape[1]} columns")

    if st.session_state.df is not None:
        st.markdown("---")
        st.markdown('<div class="sidebar-heading">Dataset Schema</div>', unsafe_allow_html=True)
        import html as _html
        escaped_schema = _html.escape(st.session_state.schema_context)
        st.markdown(
            f'<div class="schema-card">{escaped_schema}</div>',
            unsafe_allow_html=True,
        )


# -- Rendering helpers ---------------------------------------------------------

def render_result(result_state: dict) -> None:
    """Render the analysis result based on output_type."""
    output_type = result_state.get("output_type", "retrieval")
    execution_result = result_state.get("execution_result")
    fallback_used = result_state.get("fallback_used", False)
    insight_text = result_state.get("insight_text", "")
    generated_code = result_state.get("generated_code", "")
    code_type = result_state.get("code_type", "pandas")
    retry_count = result_state.get("retry_count", 0)

    # -- Status chips ----------------------------------------------------------
    chips_html = f'<span class="status-chip chip-type">{output_type}</span>'
    if fallback_used:
        chips_html += '<span class="status-chip chip-error">Fallback</span>'
    elif retry_count > 0:
        chips_html += f'<span class="status-chip chip-retry">{retry_count} retries</span>'
    else:
        chips_html += '<span class="status-chip chip-success">Success</span>'
    st.markdown(chips_html, unsafe_allow_html=True)

    # -- Insight ---------------------------------------------------------------
    if insight_text:
        st.markdown(
            f'<div class="insight-box">'
            f'<div class="insight-label">Insight</div>'
            f'{insight_text}</div>',
            unsafe_allow_html=True,
        )

    # -- Result rendering dispatch ---------------------------------------------
    if fallback_used:
        if isinstance(execution_result, pd.DataFrame):
            st.dataframe(execution_result, use_container_width=True)
        elif execution_result is not None:
            st.write(execution_result)
        else:
            st.info("Could not produce a result for this query.")

    elif output_type in (
        "retrieval", "aggregation", "ranking", "comparison",
        "statistical_summary", "correlation", "data_quality",
    ):
        if isinstance(execution_result, pd.DataFrame):
            st.dataframe(execution_result, use_container_width=True)
        elif isinstance(execution_result, pd.Series):
            st.dataframe(execution_result.to_frame(), use_container_width=True)
        else:
            st.write(execution_result)

        if output_type == "data_quality":
            try:
                if isinstance(execution_result, (pd.DataFrame, pd.Series)):
                    total_issues = execution_result.sum()
                    if isinstance(total_issues, pd.Series):
                        total_issues = total_issues.sum()
                    if total_issues > 0:
                        st.warning("Missing values or duplicates detected in the dataset.")
            except Exception:
                pass

    elif output_type == "visualization":
        try:
            st.plotly_chart(execution_result, use_container_width=True)
        except Exception:
            st.write(execution_result)

    elif output_type == "trend":
        try:
            if isinstance(execution_result, (pd.DataFrame, pd.Series)):
                st.line_chart(execution_result)
            else:
                st.plotly_chart(execution_result, use_container_width=True)
        except Exception:
            st.write(execution_result)

    elif output_type == "export":
        if isinstance(execution_result, pd.DataFrame):
            st.dataframe(execution_result, use_container_width=True)
            csv_data = execution_result.to_csv(index=False)
            st.download_button(
                "Download CSV",
                data=csv_data,
                file_name="result.csv",
                mime="text/csv",
            )
        else:
            st.write(execution_result)

    else:
        st.write(execution_result)

    # -- Show generated code (expandable) --------------------------------------
    code_lang = "sql" if code_type == "sql" else "python"
    with st.expander("View Generated Code"):
        st.code(generated_code, language=code_lang)

    # -- Show error history if retries occurred --------------------------------
    if retry_count > 0:
        with st.expander(f"Error History ({retry_count} retries)"):
            for i, attempt in enumerate(result_state.get("failed_attempts", []), 1):
                st.markdown(f"**Attempt {i}**")
                st.code(attempt.get("code", ""), language=code_lang)
                st.error(attempt.get("error", ""))


# -- Main area: query input ----------------------------------------------------

if st.session_state.df is not None:
    query = st.chat_input("Ask a question about your data...")

    if query:
        initial_state = {
            "df": st.session_state.df,
            "schema_context": st.session_state.schema_context,
            "user_query": query,
            "output_type": "retrieval",
            "analysis_plan": "",
            "code_type": "pandas",
            "generated_code": "",
            "execution_result": None,
            "error_message": None,
            "failed_attempts": [],
            "retry_count": 0,
            "max_retries": MAX_RETRIES,
            "insight_text": None,
            "fallback_used": False,
        }

        with st.spinner("Processing query..."):
            graph = build_graph()
            result_state = graph.invoke(initial_state)

        try:
            query_id = log_query(
                user_query=query,
                output_type=result_state.get("output_type"),
                analysis_plan=result_state.get("analysis_plan"),
                code_type=result_state.get("code_type"),
                generated_code=result_state.get("generated_code"),
                execution_success=result_state.get("error_message") is None,
                retry_count=result_state.get("retry_count", 0),
                fallback_used=result_state.get("fallback_used", False),
                insight_text=result_state.get("insight_text"),
                error_message=result_state.get("error_message"),
            )
            for i, attempt in enumerate(result_state.get("failed_attempts", []), 1):
                log_retry(query_id, i, attempt["code"], attempt["error"])
        except Exception as exc:
            logger.error("Failed to log query: %s", exc)

        st.session_state.history.append({
            "query": query,
            "result_state": result_state,
        })

    # -- Render history (newest first) -----------------------------------------
    for entry in reversed(st.session_state.history):
        st.markdown(
            f'<div class="query-label">{entry["query"]}</div>',
            unsafe_allow_html=True,
        )
        render_result(entry["result_state"])
        st.markdown('<hr class="result-divider">', unsafe_allow_html=True)

else:
    st.markdown(
        """
        <div class="empty-state">
            <h2>Upload a CSV to get started</h2>
            <p>
                Use the sidebar to upload your dataset, then ask questions in plain English.
                <br>Specialized AI agents will plan, write code, execute it, and explain the results.
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )
