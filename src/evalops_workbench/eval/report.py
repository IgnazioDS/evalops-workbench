"""Render a downloadable markdown report from a benchmark artifact."""
from __future__ import annotations


def render(artifact: dict) -> str:
    metrics = artifact["metrics"]
    lines = [
        f"# EvalOps benchmark: {artifact['fixture']}",
        "",
        f"- Run: `{artifact['run_id']}`",
        f"- Generated: {artifact['generated_at']}",
        f"- Cases: {metrics['n_cases']}",
        f"- Gate verdict: **{metrics['gate_verdict'].upper()}**",
        "",
        "## Variants",
        "",
        "| Variant | Exact match | Token F1 | Contains gold |",
        "| --- | --- | --- | --- |",
    ]
    for variant in artifact["variants"]:
        suffix = ""
        if variant["name"] == metrics["candidate_variant"]:
            suffix = " (candidate)"
        elif variant["name"] == metrics["baseline_variant"]:
            suffix = " (baseline)"
        lines.append(
            f"| {variant['name']}{suffix} | {variant['exact_match']:.3f} | "
            f"{variant['token_f1']:.3f} | {variant['contains_gold']:.3f} |"
        )

    lines += [
        "",
        f"Candidate against baseline: exact match {metrics['improvement_exact_match']:+.3f}, "
        f"token F1 {metrics['improvement_token_f1']:+.3f}.",
        "",
        f"## Regressions ({metrics['regressions']})",
        "",
    ]
    if artifact["regressions"]:
        lines += [
            "| Case | Baseline | Candidate | Delta | Reason |",
            "| --- | --- | --- | --- | --- |",
        ]
        for reg in artifact["regressions"]:
            lines.append(
                f"| {reg['case_id']} | {reg['baseline']:.2f} | {reg['candidate']:.2f} | "
                f"{reg['delta']:+.2f} | {reg['reason']} |"
            )
    else:
        lines.append("None. The candidate scored at or above the baseline on every case.")

    lines += [
        "",
        "## Reproduce",
        "",
        "```bash",
        "git clone https://github.com/IgnazioDS/evalops-workbench",
        "cd evalops-workbench && pip install -e .",
        "python -m evalops_workbench.benchmark_runner",
        "```",
        "",
        f"Fixture: [`{artifact['fixture']}`]({artifact['artifact_urls']['fixture']}). "
        "Every case, label, and score is reproducible offline with no credentials.",
        "",
    ]
    return "\n".join(lines)
