# EvalOps benchmark: benchmark-v1

- Run: `evalops-2026-05-26-308b0b20`
- Generated: 2026-05-26T06:49:52Z
- Cases: 38
- Gate verdict: **PASS**

## Variants

| Variant | Exact match | Token F1 | Contains gold |
| --- | --- | --- | --- |
| first_sentence | 0.000 | 0.274 | 1.000 |
| overlap_sentence (baseline) | 0.000 | 0.274 | 1.000 |
| span_extract (candidate) | 0.632 | 0.651 | 0.684 |

Candidate against baseline: exact match +0.632, token F1 +0.377.

## Regressions (12)

| Case | Baseline | Candidate | Delta | Reason |
| --- | --- | --- | --- | --- |
| adv-01 | 0.15 | 0.00 | -0.15 | token_f1: candidate 0.00 below baseline 0.15 (-0.15) |
| adv-02 | 0.33 | 0.00 | -0.33 | token_f1: candidate 0.00 below baseline 0.33 (-0.33) |
| adv-03 | 0.31 | 0.00 | -0.31 | token_f1: candidate 0.00 below baseline 0.31 (-0.31) |
| adv-04 | 0.33 | 0.00 | -0.33 | token_f1: candidate 0.00 below baseline 0.33 (-0.33) |
| adv-05 | 0.17 | 0.00 | -0.17 | token_f1: candidate 0.00 below baseline 0.17 (-0.17) |
| adv-06 | 0.17 | 0.00 | -0.17 | token_f1: candidate 0.00 below baseline 0.17 (-0.17) |
| adv-07 | 0.15 | 0.00 | -0.15 | token_f1: candidate 0.00 below baseline 0.15 (-0.15) |
| adv-08 | 0.17 | 0.00 | -0.17 | token_f1: candidate 0.00 below baseline 0.17 (-0.17) |
| adv-09 | 0.18 | 0.00 | -0.18 | token_f1: candidate 0.00 below baseline 0.18 (-0.18) |
| adv-10 | 0.18 | 0.00 | -0.18 | token_f1: candidate 0.00 below baseline 0.18 (-0.18) |
| adv-11 | 0.18 | 0.00 | -0.18 | token_f1: candidate 0.00 below baseline 0.18 (-0.18) |
| adv-12 | 0.20 | 0.00 | -0.20 | token_f1: candidate 0.00 below baseline 0.20 (-0.20) |

## Reproduce

```bash
git clone https://github.com/IgnazioDS/evalops-workbench
cd evalops-workbench && pip install -e .
python -m evalops_workbench.benchmark_runner
```

Fixture: [`benchmark-v1`](https://raw.githubusercontent.com/IgnazioDS/evalops-workbench/main/examples/benchmark-v1/cases.jsonl). Every case, label, and score is reproducible offline with no credentials.
