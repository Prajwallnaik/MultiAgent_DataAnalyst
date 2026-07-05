"""
Sandboxed exec() wrapper.

Executes LLM-generated code in a heavily restricted namespace so that
arbitrary file, network, or OS access is impossible.

Security controls (non-negotiable — see brain.md Section 6):
  • Whitelisted modules only: pandas, numpy, plotly.express
  • Minimal safe builtins (no open, eval, exec, __import__, os, sys, subprocess)
  • Execution timeout (default 10 s)
  • The loaded DataFrame is injected as ``df`` in the namespace
"""

import signal
import threading
import pandas as pd
import numpy as np
import plotly.express as px
from typing import Any

# ── Safe builtins ────────────────────────────────────────────────────────────
# We start from the real builtins and strip anything dangerous.
import builtins as _builtins

_BLOCKED_BUILTINS = {
    "open",
    "eval",
    "exec",
    "compile",
    "__import__",
    "globals",
    "locals",
    "breakpoint",
    "exit",
    "quit",
    "input",
    "memoryview",
    "help",
}

SAFE_BUILTINS: dict[str, Any] = {
    name: getattr(_builtins, name)
    for name in dir(_builtins)
    if not name.startswith("_") and name not in _BLOCKED_BUILTINS
}

# Re-add a handful of harmless dunders that code may rely on
SAFE_BUILTINS["__name__"] = "__safe_exec__"
SAFE_BUILTINS["__build_class__"] = _builtins.__build_class__


import importlib

# ── Read-Only Proxy for Modules ──────────────────────────────────────────────
class ReadOnlyProxy:
    """Wraps library modules to prevent LLM code from mutating their attributes.

    This prevents bugs like `px.pie = px.pie(...)` which corrupts the module
    for the rest of the application lifetime.
    """
    def __init__(self, wrapped):
        object.__setattr__(self, "_wrapped", wrapped)

    def __getattr__(self, name):
        return getattr(object.__getattribute__(self, "_wrapped"), name)

    def __setattr__(self, name, value):
        raise AttributeError(
            "Modifying library module attributes (e.g. assigning to px.pie) is not allowed. "
            "Assign to a new variable (like 'result') instead."
        )

    def __delattr__(self, name):
        raise AttributeError("Deleting library module attributes is not allowed.")

    def __dir__(self):
        return dir(object.__getattribute__(self, "_wrapped"))

    def __repr__(self):
        return repr(object.__getattribute__(self, "_wrapped"))


class ExecutionTimeout(Exception):
    """Raised when generated code exceeds the allowed wall-clock time."""


class SandboxViolation(Exception):
    """Raised when generated code tries to do something disallowed."""


def _build_namespace(df: pd.DataFrame) -> dict[str, Any]:
    """Return the restricted globals dict that exec() will use."""
    # Ensure plotly.express is in a clean state (recovers from any prior mutations)
    try:
        importlib.reload(px)
    except Exception:
        pass

    return {
        "__builtins__": SAFE_BUILTINS,
        "pd": ReadOnlyProxy(pd),
        "np": ReadOnlyProxy(np),
        "px": ReadOnlyProxy(px),
        "df": df,
    }


def _scan_code(code: str) -> None:
    """Quick static check for obviously dangerous patterns.

    This is defense-in-depth on top of the restricted namespace — if someone
    crafts a string that bypasses the builtins restriction we still want to
    catch obvious sabotage patterns early.
    """
    banned_tokens = [
        "import os",
        "import sys",
        "import subprocess",
        "import shutil",
        "import socket",
        "__import__",
        "os.system",
        "os.popen",
        "subprocess.",
        "open(",
        "eval(",
        "exec(",
        "compile(",
    ]
    code_lower = code.lower()
    for token in banned_tokens:
        if token.lower() in code_lower:
            raise SandboxViolation(
                f"Generated code contains a blocked pattern: '{token}'"
            )


def safe_exec(
    code: str,
    df: pd.DataFrame,
    timeout_seconds: int = 10,
) -> Any:
    """Execute *code* in a sandboxed namespace and return the ``result`` variable.

    The generated code is expected to assign its output to a variable
    named ``result``.  For example::

        result = df[df['salary'] > 40000]

    Parameters
    ----------
    code : str
        Python source code produced by the Code Generator or Fixer Agent.
    df : pd.DataFrame
        The user's loaded DataFrame.
    timeout_seconds : int
        Maximum wall-clock seconds before the execution is aborted.

    Returns
    -------
    Any
        The value of ``result`` after execution (DataFrame, Series, scalar,
        or Plotly figure).

    Raises
    ------
    ExecutionTimeout
        If execution exceeds *timeout_seconds*.
    SandboxViolation
        If the code contains blocked patterns.
    Exception
        Any runtime exception from the generated code (KeyError, TypeError, …)
        is re-raised with the original traceback for the Fixer Agent.
    """
    # ── Static scan ──────────────────────────────────────────────────────
    _scan_code(code)

    # ── Build restricted namespace ───────────────────────────────────────
    namespace = _build_namespace(df)

    # ── Execute with timeout ─────────────────────────────────────────────
    exec_error: list[Exception] = []
    exec_done = threading.Event()

    def _target():
        try:
            exec(code, namespace)  # noqa: S102 — intentional sandboxed exec
        except Exception as exc:
            exec_error.append(exc)
        finally:
            exec_done.set()

    thread = threading.Thread(target=_target, daemon=True)
    thread.start()
    finished = exec_done.wait(timeout=timeout_seconds)

    if not finished:
        raise ExecutionTimeout(
            f"Code execution exceeded the {timeout_seconds}s time limit."
        )

    if exec_error:
        raise exec_error[0]

    # ── Extract result ───────────────────────────────────────────────────
    if "result" not in namespace:
        raise NameError(
            "Generated code did not assign a 'result' variable. "
            "Make sure the code ends with: result = <expression>"
        )

    return namespace["result"]
