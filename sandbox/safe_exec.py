"""Validated execution for LLM-produced dataframe expressions.

This module deliberately does not provide a general-purpose Python sandbox.
Untrusted code is first parsed and accepted only when it matches a small,
data-analysis-only AST subset. In particular, it rejects imports, dunder
access, builtins, control flow, arbitrary function calls, and mutation.
"""

from __future__ import annotations

import ast
from typing import Any

import numpy as np
import pandas as pd
import plotly.express as px


class ExecutionTimeout(Exception):
    """Kept for API compatibility with the execution layer."""


class SandboxViolation(Exception):
    """Raised when generated code is outside the permitted analysis subset."""


_SAFE_ROOTS = {"df", "pd", "np", "px"}
_SAFE_MODULE_CALLS = {
    "pd": {"to_datetime", "cut", "qcut", "concat", "crosstab"},
    "np": {"where", "select", "isnan", "isfinite", "log", "log1p", "sqrt", "round"},
    "px": {"bar", "line", "scatter", "pie", "histogram", "box", "area", "violin", "imshow", "sunburst", "treemap"},
}
_SAFE_METHODS = {
    "abs", "agg", "aggregate", "all", "any", "astype", "between", "clip", "count",
    "cummax", "cummin", "cumsum", "diff", "drop_duplicates", "dropna", "fillna",
    "first", "groupby", "head", "idxmax", "idxmin", "isin", "last", "max", "mean",
    "median", "merge", "min", "melt", "mode", "nlargest", "nsmallest", "notna",
    "nunique", "pct_change", "pivot", "pivot_table", "rank", "rename", "rename_axis",
    "reset_index", "round", "size", "sort_index", "sort_values", "std", "sum", "tail",
    "to_frame", "value_counts", "var", "update_layout",
}
_SAFE_ATTRIBUTES = _SAFE_METHODS | {
    "columns", "dt", "dtypes", "iloc", "index", "loc", "shape", "str", "T", "values",
}
_ALLOWED_EXPR_NODES = (
    ast.BinOp, ast.BoolOp, ast.Compare, ast.Constant, ast.Dict, ast.IfExp,
    ast.List, ast.Name, ast.Set, ast.Slice, ast.Subscript, ast.Tuple,
    ast.UnaryOp,
)


class _AnalysisValidator(ast.NodeVisitor):
    """Allow a tiny expression language for dataframe analysis only."""

    def __init__(self) -> None:
        self.assigned: set[str] = set()

    @staticmethod
    def _reject(message: str) -> None:
        raise SandboxViolation(message)

    def visit_Module(self, node: ast.Module) -> None:
        if not node.body or len(node.body) > 12:
            self._reject("Generated code must contain 1 to 12 simple analysis statements.")
        for statement in node.body:
            self.visit(statement)
        if "result" not in self.assigned:
            self._reject("Generated code must assign the final output to 'result'.")

    def visit_Assign(self, node: ast.Assign) -> None:
        if len(node.targets) != 1 or not isinstance(node.targets[0], ast.Name):
            self._reject("Only assignments to simple temporary variables are allowed.")
        target = node.targets[0].id
        if target in _SAFE_ROOTS or target.startswith("_"):
            self._reject("Reserved or private variable names are not allowed.")
        self.visit(node.value)
        self.assigned.add(target)

    def visit_Expr(self, node: ast.Expr) -> None:
        if not isinstance(node.value, ast.Call):
            self._reject("Only assignments and Plotly update_layout calls are allowed.")
        self.visit(node.value)

    def visit_Name(self, node: ast.Name) -> None:
        if node.id.startswith("_") or node.id not in (_SAFE_ROOTS | self.assigned):
            self._reject(f"Name '{node.id}' is not available in the analysis environment.")

    def visit_Attribute(self, node: ast.Attribute) -> None:
        if node.attr.startswith("_") or node.attr not in _SAFE_ATTRIBUTES:
            self._reject(f"Attribute '{node.attr}' is not permitted.")
        self.visit(node.value)

    def visit_Call(self, node: ast.Call) -> None:
        if not isinstance(node.func, ast.Attribute):
            self._reject("Only approved pandas, numpy, and plotly function calls are allowed.")
        func = node.func
        if isinstance(func.value, ast.Name) and func.value.id in _SAFE_MODULE_CALLS:
            if func.attr not in _SAFE_MODULE_CALLS[func.value.id]:
                self._reject(f"Function '{func.value.id}.{func.attr}' is not permitted.")
        else:
            if func.attr not in _SAFE_METHODS:
                self._reject(f"Method '{func.attr}' is not permitted.")
            if func.attr == "update_layout" and not isinstance(func.value, ast.Name):
                self._reject("update_layout may only be called on a named chart variable.")
            self.visit(func.value)
        for keyword in node.keywords:
            if keyword.arg == "inplace":
                self._reject("In-place dataframe mutation is not permitted.")
            self.visit(keyword.value)
        for argument in node.args:
            self.visit(argument)

    def generic_visit(self, node: ast.AST) -> None:
        if isinstance(node, (ast.operator, ast.boolop, ast.cmpop, ast.expr_context, ast.unaryop)):
            return
        if isinstance(node, _ALLOWED_EXPR_NODES):
            super().generic_visit(node)
            return
        self._reject(f"Python construct '{type(node).__name__}' is not permitted.")


def _validate_code(code: str) -> ast.Module:
    if not isinstance(code, str) or not code.strip():
        raise SandboxViolation("Generated code must be a non-empty string.")
    if len(code) > 10_000:
        raise SandboxViolation("Generated code exceeds the 10,000 character limit.")
    try:
        tree = ast.parse(code, mode="exec")
    except SyntaxError as exc:
        raise SandboxViolation(f"Generated code is not valid Python: {exc.msg}") from exc
    _AnalysisValidator().visit(tree)
    return tree


def safe_exec(code: str, df: pd.DataFrame, timeout_seconds: int = 10) -> Any:
    """Run validated dataframe analysis code and return its ``result`` value."""
    del timeout_seconds
    tree = _validate_code(code)
    namespace = {"__builtins__": {}, "df": df.copy(deep=True), "pd": pd, "np": np, "px": px}
    exec(compile(tree, "<generated-analysis>", "exec"), namespace, namespace)  # noqa: S102
    return namespace["result"]
