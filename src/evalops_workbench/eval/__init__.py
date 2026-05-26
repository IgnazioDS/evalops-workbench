"""EvalOps evaluation engine.

A local-first, dependency-free evaluation harness: load a labelled dataset,
run named variants of a system-under-test, score predictions with rubric
functions, pin a baseline, and surface per-case regressions.

The engine is model-agnostic. The public benchmark ships deterministic
extractive-QA strategies as the system-under-test so the run is reproducible
by any third party with zero credentials and zero cost. A live LLM target is
an optional extension point (see ``targets.Target``), never a requirement.
"""
from __future__ import annotations
