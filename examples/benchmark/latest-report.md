# EvalOps benchmark: support-qa

- Run: `evalops-2026-10-12-d34c4f66`
- Generated: 2026-10-12T14:56:18Z
- Gate verdict: **PASS**

# EvalOps Comparison Report

- Base run: `run_20261012T145618680605_387b8d`
- Candidate run: `run_20261012T145618731132_906944`
- Average score delta: `+0.667`
- Pass-rate delta: `+1.000`
- Regressions: `0`
- Improvements: `4`

## Regressions

No regressions.

## Improvements

| case_id | kind | score delta | notes |
| --- | --- | ---: | --- |
| `data_residency` | `fail_to_pass` | `+0.667` | Case data_residency improved from fail to pass. |
| `refund_policy` | `fail_to_pass` | `+0.333` | Case refund_policy improved from fail to pass. |
| `seat_upgrade` | `fail_to_pass` | `+1.000` | Case seat_upgrade improved from fail to pass. |
| `sla_enterprise` | `fail_to_pass` | `+0.667` | Case sla_enterprise improved from fail to pass. |
