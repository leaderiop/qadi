---
phase: QD-65-only-admit-builds-an-admitted
plan: 05
subsystem: spec
tags: [spec, adr-amendment, invariants, traceability, ccr-register]
phase_base: d1ac1df0629e95797f406c5c46da364e6542dce2

requires:
  - phase: QD-65-only-admit-builds-an-admitted
    provides: 65-02's private-constructor Admitted, 65-03's single matcher context, 65-04's bench verdict (pass)
provides:
  - ADR-QD-172 Rev 1.1 amended (Status, Decision 1, Decision 3, an Amendment section, Related)
  - INV-QD-375 and INV-QD-376, INV-QD-364 amended, all traced
  - BEH-QD-661 and BEH-QD-662 in 05-evaluator.md, traced
  - the CCR-QD-456 register row, naming ADR-QD-178 and BEH-QD-663-665 Unused
affects: [QD-65-06]

actuals:
  tokens: 40000
  tasks: 2
  commits: 2
plan_head_before: 7d04e21049be4c31a19686f6f0d7b7f1bf8c730c
plan_head_after: 7e2530f12dd7368a2b6b63179ef02aabdcb4a558
commits: 2

tech-stack:
  added: []
  patterns:
    - "records are applied from hash-checked texts by a scratch edit script, then checked by a scratch records script; the traceability register is shown red before its rows exist"

key-files:
  created: []
  modified:
    - spec/decisions/172-admission-produces-the-one-walk-environment.md
    - spec/decisions/index.yaml
    - spec/invariants.md
    - spec/traceability.md
    - spec/README.md
    - spec/behaviors/05-evaluator.md

key-decisions:
  - "None beyond the plan: ADR-QD-172 amended (not superseded), no new ADR; the compiler's limit on the asked flags is stated in INV-QD-376 and the ADR"

requirements-completed: [ADMT-02, ADMT-03, WX-02, WX-03, WX-06, WX-07]

duration: 15min
completed: 2026-11-20
status: complete
---

# Phase 65 Plan 05: The records Summary

ARCH-112 is recorded in the spec with the reserved ids only: ADR-QD-172 amended to Rev 1.1, INV-QD-375 (only `admit` builds an `Admitted`) and INV-QD-376 (the flags and the matcher context come from one read; the compiler does not check the `"asked"` flags), BEH-QD-661 and BEH-QD-662, their traceability, and the CCR-QD-456 register row.

## Revisions (spec-revise, `--date 2026-11-20`)

| Document | From | To |
| -------- | ---- | -- |
| `spec/decisions/172-admission-produces-the-one-walk-environment.md` | 1.0 | 1.1 |
| `spec/invariants.md` | 1.161 | 1.162 |
| `spec/traceability.md` (first) | 1.227 | 1.228 |
| `spec/README.md` | 1.264 | 1.265 |
| `spec/behaviors/05-evaluator.md` | 1.17 | 1.18 |
| `spec/traceability.md` (second) | 1.228 | 1.229 |

## Evidence

The register was red before the rows existed (`trace-red.log`, after the ADR and invariant text, before the traceability and register rows):

```
PASS: 19   FAIL: 2   SKIP: 0 (strict: skips count as failures)
| FAIL   | invariants -> traceability                 | untraced: INV-QD-375 INV-QD-376
| FAIL   | CCR register coverage                      | drift from KNOWN_GAPS ... (456)
```

- `records t1: 17 of 17 check(s) green` (`verify-traceability --strict`: `PASS: 21   FAIL: 0   SKIP: 0`)
- `records t2: 12 of 12 check(s) green` (26 added anchors resolve; the CCR row's five Revisions current)
- Gates: `doc-examples: 117 block(s) compile`; `dod-table: 25 step(s) match pnpm check, 151 reference(s) resolve`; `api-surface: 939 export(s) documented across 9 package(s)`; `devtools-claims: 8 claim(s) registered across 6 file(s)`. `spec/overview.md` unchanged.
- `git diff phase_base --name-only -- spec` lists exactly the six spec files above.
- Both task verifies (`verify-t1.sh`, `verify-t2.sh`, the plan's `<automated>` commands) exit 0.

## Commits

- f8f7ed70 docs(65-05): ADR-QD-172 amended; INV-QD-375 and INV-QD-376 recorded, traced and registered
- 7e2530f1 docs(65-05): BEH-QD-661 and BEH-QD-662

## Deviations from Plan

None - plan executed exactly as written. The ten record texts and both scratch scripts were extracted mechanically from the plan and matched the planned SHA-256 values. Per the orchestrator notes, no WX-* or ADMT-* requirement was ticked in `.planning/REQUIREMENTS.md` (65-06 owns that); `requirements-completed` above copies the plan's frontmatter only.

## Known Stubs

None.

## Threat Flags

None. `next-id.mjs` was never run; ADR-QD-178 and BEH-QD-663-665 appear only in the CCR-QD-456 row; no plan, decision, requirement or phase id was added under `spec/`.

## Self-Check: PASSED

Both commits exist on `arch-wave-12`; all six spec files modified as listed; `spec/` and `packages/` clean after each commit.
