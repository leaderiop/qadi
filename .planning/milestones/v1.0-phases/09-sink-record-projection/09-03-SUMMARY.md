---
phase: 09-sink-record-projection
plan: 03
subsystem: spec
tags: [spec, ADR-QD-116, CCR-QD-393, ARCH-54, traceability]
requires: ["09-01", "09-02"]
provides:
  - "CCR-QD-393 register row in spec/README.md (revision numbers completed by 09-04)"
  - "ADR-QD-116 (QADI-ADR-116), indexed and traced"
  - "dated amendments to ADR-QD-095, ADR-QD-102, ADR-QD-100"
affects: [09-04]
tech-stack:
  added: []
  patterns: ["a change that moves where a documented decision says a rule lives takes an ADR; one that changes no documented contract takes a CCR row"]
key-files:
  created:
    - spec/decisions/116-the-json-refusal-vocabulary-is-a-leaf-of-its-own.md
  modified:
    - spec/README.md
    - spec/decisions/index.yaml
    - spec/decisions/095-sinkcodec-owns-both-directions.md
    - spec/decisions/102-the-error-tables-stay-tables.md
    - spec/decisions/100-a-question-is-asked-once.md
    - spec/behaviors/25-inspection.md
    - spec/invariants.md
    - spec/traceability.md
key-decisions:
  - "ADR-QD-116 records the JsonRefusal.ts leaf and amends ADR-QD-095 and ADR-QD-102; ADR-QD-096 and ADR-QD-107 are cited in Related only (grep found no sink-wire-as-home sentence in either)"
  - "ADR-QD-115 left unused: the record projection changes no documented contract, because ADR-QD-100 already made SinkEmit.ts the one projection and ADR-QD-105's record had been built beside it; CCR-QD-393 plus an ADR-QD-100 amendment cover it"
requirements-completed: [XC-02]
status: complete
duration: 10 min
completed: 2026-11-09
commits: 3
plan_head_before: e27eae842655f849c611656a9406ae0b9c450a38
plan_head_after: f7447c1431569cc0b4856872ea4e6e75bf5ec725
actuals:
  tokens: 9000
  tasks: 3
  commits: 3
coverage:
  - deliverable: "CCR-QD-393 registered before any citation; ADR-QD-116 exists, indexed, traced; ADR-QD-095/102/100 amended"
    verification:
      - kind: command
        ref: "pnpm spec:verify:strict (21 PASS, 0 FAIL, 0 SKIP)"
        status: pass
      - kind: command
        ref: "node scripts/spec-revise.mjs --check"
        status: pass
    human_judgment: false
---

# Phase 9 Plan 03: Spec records Summary

The phase is recorded in the normative spec: the CCR-QD-393 row, ADR-QD-116 (the `JsonRefusal.ts` leaf, amending ADR-QD-095 and ADR-QD-102), an ADR-QD-100 amendment naming `obligationRecord` as the third projection, the BEH-QD-195 note, INV-QD-104's Source, and the traceability rows; `pnpm spec:verify:strict` is green.

## Commits

| Commit | Message |
| ------ | ------- |
| a3210ac | docs(09-03): CCR-QD-393 row, ADR-QD-116 and the ADR-QD-095/102/100 amendments |
| acab61f | docs(09-03): BEH-QD-195 and INV-QD-104 name where the projection and readings live |
| f7447c1 | docs(09-03): traceability rows for ADR-QD-116, JsonRefusal.ts, SinkEmit.ts and the obligation-record pin |

## Revisions for plan 09-04 (to complete the CCR-QD-393 row)

| Document | New Revision |
| -------- | ------------ |
| spec/decisions/116-the-json-refusal-vocabulary-is-a-leaf-of-its-own.md | 1.0 (new) |
| spec/decisions/095-sinkcodec-owns-both-directions.md | 1.5 (was 1.4) |
| spec/decisions/102-the-error-tables-stay-tables.md | 1.1 (was 1.0) |
| spec/decisions/100-a-question-is-asked-once.md | 1.2 (was 1.1) |
| spec/behaviors/25-inspection.md | 1.18 (was 1.17), BEH-QD-195 note |
| spec/invariants.md | 1.86 (was 1.85), INV-QD-104 |
| spec/traceability.md | 1.130 (was 1.129) |
| spec/README.md | 1.125, not yet bumped (09-04 does it once; the CCR row has no revision numbers yet) |
| spec/overview.md | untouched, for 09-04 |

The CCR-QD-393 row already lists every file of plans 09-01 to 09-04 by path (without `Rev X.Y`) and cites the pin commit `00eb826` and the changeset `.changeset/sink-record-projection.md` (which 09-04 must create under that name).

## Notes

- ADR-QD-115 was left unused, and the CCR row says why (D-07).
- Reserved numbers CCR-QD-393 and ADR-QD-116 were free in every worktree; no substitution was needed. `next-id` was not run.
- ADR-QD-096 and ADR-QD-107: `grep SinkWire` over both printed nothing, so both are cited in ADR-QD-116's Related only.
- ADR-QD-102's amendment uses ADR-QD-100's `## Amendment (date, ARCH-NN): title` style; ADR-QD-095 uses its blockquote style.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `spec-revise.mjs` fails without `--date`**
- **Found during:** Task 1
- **Issue:** the script's positional filter excludes index `dateFlag + 1`, which is `0` when `--date` is absent, so it drops the document argument and prints the usage line. The plan's commands omit `--date`.
- **Fix:** every invocation passed `--date 2026-11-09` (today). Nothing in the script was changed (out of scope).
- **Files modified:** none beyond the plan's.
- **Commit:** n/a

Otherwise, the plan was executed as written.

## Known Stubs

None.

## Threat Flags

None. T-09-08 mitigated (facts from the 09-01/09-02 SUMMARYs; `pnpm spec:verify:strict` green; CCR row landed before any citation); T-09-09 mitigated (the CCR row cites the whole-record pin `00eb826`).

## Self-Check: PASSED

- FOUND: spec/decisions/116-the-json-refusal-vocabulary-is-a-leaf-of-its-own.md
- FOUND commits: a3210ac, acab61f, f7447c1
- `pnpm spec:verify:strict`: 21 PASS, 0 FAIL
