---
phase: 08-port-serving-from-registry
plan: 01
subsystem: spec
tags: [adr-qd-094, serving-facet, checkpoint, ccr-qd-392]
requires: []
provides:
  - "d01 decision outcome read by plans 08-03, 08-04, 08-05"
  - "CCR-QD-392 register row (opened)"
affects: [08-02, 08-03, 08-04, 08-05, 08-06]
d01_outcome: approved
d01_date: 2026-11-08
d01_reason: ""
key-files:
  created: []
  modified:
    - spec/README.md
decisions:
  - "D-01 approved: a port description may carry a serving facet (amends ADR-QD-094); recorded as ADR-QD-114 by plan 08-04"
metrics:
  duration: "~10 min (continuation after the checkpoint)"
  completed: 2026-11-08
status: complete
actuals:
  tokens: 900
  tasks: 2
  commits: 1
plan_head_before: 799a928234bb0ddbffb48d5c22154ba241324bb1
plan_head_after: eefdf830d1b2ca188bddc961cb4dda07d6bf32d2
---

# Phase 8 Plan 1: D-01 checkpoint and CCR-QD-392 opening Summary

The maintainer approved amending ADR-QD-094 so a port description may state a `serving` facet; the outcome is recorded in this frontmatter and in a new CCR-QD-392 register row (spec/README.md Rev 1.125).

Branch consequence: the outcome is `approved`, so plans 08-03 (code) and 08-04 (ADR-QD-114 and amendments) run and 08-05 skips. Plans 08-02 and 08-06 run either way. No reason was given with the approval, so `d01_reason` is the empty string.

## Tasks

| Task | Name | Result | Commit |
| ---- | ---- | ------ | ------ |
| 1 | D-01 checkpoint | Resolved by the human at the orchestrator: approve | none |
| 2 | Record outcome, open CCR-QD-392 | Done | eefdf83 |

## Reserved-number check

`CCR-QD-392`, `ADR-QD-114` and `ARCH-53` have no use in `spec/`, `packages/` or `.changeset/`, and `spec/decisions/114-*` does not exist. The only textual hit is CCR-QD-391's own sentence "ADR-QD-114 stays reserved for ARCH-53", which is the reservation itself, not a use. CCR-QD-392 was inserted directly after the CCR-QD-391 row.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `spec-revise.mjs` rejects the plan's documented invocation**
- **Found during:** Task 2
- **Issue:** `node scripts/spec-revise.mjs <doc> "<text>"` without `--date` exits 2 with the usage message. When `--date` is absent `dateFlag` is `-1`, so the positional filter's `index !== dateFlag + 1` drops index 0 (the document path).
- **Fix:** passed `--date 2026-11-08` explicitly, which the usage line allows. The script itself was not changed (out of scope for this plan); the Revision row was written by the script, not by hand.
- **Files modified:** none beyond `spec/README.md`
- **Commit:** eefdf83

## Known Stubs

None.

## Threat Flags

None. No code, endpoint or schema was touched; no file under `packages/` changed.

## Deferred Issues

`scripts/spec-revise.mjs`: positional-argument parsing drops the document path when `--date` is omitted (see deviation 1). Worth a one-line fix in a separate change.

## Self-Check: PASSED

- `spec/README.md` has exactly one `| CCR-QD-392 |` row; `spec-revise --check` and `pnpm spec:verify:strict` are green (21 pass, 0 fail).
- Commit eefdf83 is an ancestor of HEAD.
- `git diff --name-only -- packages` is empty.
