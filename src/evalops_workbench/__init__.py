"""EvalOps Workbench package."""

from .catalog import load_project
from .workbench import compare_runs, load_dataset, run_evaluation

__all__ = ["compare_runs", "load_dataset", "load_project", "run_evaluation"]
