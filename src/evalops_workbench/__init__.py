"""EvalOps Workbench package."""

from .catalog import load_project
from .workbench import assess_gate, compare_runs, get_run_details, load_dataset, run_evaluation

__all__ = [
    "assess_gate",
    "compare_runs",
    "get_run_details",
    "load_dataset",
    "load_project",
    "run_evaluation",
]
