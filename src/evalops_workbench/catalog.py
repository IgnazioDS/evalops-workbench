from __future__ import annotations

import json
from importlib.resources import files

from .models import ProjectSpec


def load_project() -> ProjectSpec:
    data_path = files("evalops_workbench").joinpath("project.json")
    return ProjectSpec(**json.loads(data_path.read_text(encoding="utf-8")))
