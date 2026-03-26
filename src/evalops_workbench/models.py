from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ProjectSpec:
    slug: str
    name: str
    category: str
    track: str
    stage: str
    summary: str
    problem: str
    users: str
    stack: list[str]
    why_now: str
    mvp: list[str]
