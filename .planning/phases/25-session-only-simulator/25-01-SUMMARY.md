---
phase: 25-session-only-simulator
plan: 01
subsystem: devtools
tags: [simulation-session, effect-fiberhandle, scope, decision-record]
d01_outcome: D
d01_date: 2026-11-11
d01_reason: "the recommendation should be the cleanest solution, not the simplest one; we can override any ADR if it causes us problems."
d01_source: .planning/phases/_DECISIONS-v1.2.md
overrides: ARCH-20 D-20-b
record: ADR-QD-137
reserved_numbers_free: true
public_changes_confirmed: true
requires:
  - phase: 24-simulation-source-preparation
    provides: the simulation source split Phase 25 builds the scoped session on
provides:
  - the recorded D-01 outcome (option D, FiberHandle), its override of ARCH-20 D-20-b, and the public-change confirmation
  - confirmation that ARCH-73, ADR-QD-137, CCR-QD-415, BEH-QD-460..464 and INV-QD-294..295 are unused
affects: [25-02, 25-03, 25-04, 25-05]
actuals:
  tokens: 1500
  tasks: 1
  commits: 1
plan_head_before: 17fa67382910a03203d6765bf4fce1aebdde162e
plan_head_after: eab2ead59574da1a2650c336033105e2f053227f
tech-stack:
  added: []
  patterns: ["a session owns its runs' lifetime through a Scope and an effect/FiberHandle"]
key-files:
  created: [.planning/phases/25-session-only-simulator/25-01-SUMMARY.md]
  modified: []
key-decisions:
  - "D-01 option D: the session is constructed in a Scope and owns an effect/FiberHandle; overrides ARCH-20 D-20-b"
requirements-completed: [SIM-04, SIM-05, WX-02]
coverage:
  - id: D1
    description: "D-01 (option D) recorded with the standing instruction quoted, the override named, and the public-change confirmation"
    requirement: SIM-05
    verification:
      - kind: other
        ref: "grep for d01_outcome, d01_date, d01_reason, overrides, reserved_numbers_free, public_changes_confirmed in this file"
        status: pass
    human_judgment: false
  - id: D2
    description: "Phase 24 closed; reserved numbers confirmed free"
    requirement: WX-02
    verification:
      - kind: other
        ref: "test -f 24-03-SUMMARY.md; grep -rlE per id over spec packages .changeset AGENTS.md (one historical hit, see Issues Encountered)"
        status: pass
    human_judgment: false
duration: 6min
completed: 2026-11-11
status: complete
commits: 1
---

# Phase 25 Plan 01: Record D-01 Summary

**The simulation session is constructed in a Scope and owns an effect/FiberHandle (D-01 option D), overriding ARCH-20 D-20-b, with the human's answer and standing instruction recorded for ADR-QD-137 to quote.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-11-11T06:58:38Z
- **Completed:** 2026-11-11
- **Tasks:** 1
- **Files modified:** 1 (this SUMMARY)

## Accomplishments

- **The answer, quoted from `_DECISIONS-v1.2.md` (row "25-01 T1 (D-01)"):** "`D: FiberHandle` + public confirmed. New option, not in the original plan. The session is constructed in a `Scope` and owns an `effect/FiberHandle`. Every run forks into it, so a new run interrupts the previous one and closing the scope interrupts the run in flight. `reap`, `hasRetired`, the retired list and `dispose` leave the interface. **Overrides ARCH-20 D-20-b** ("model code never forks"): the session owns its runs' lifetime through structured concurrency instead. The interface changes listed in 25-01 D-06 are confirmed, adjusted for a scoped constructor." The file's standing instruction, which this plan applied without stopping for a human: "the recommendation should be the cleanest solution, not the simplest one; we can override any ADR if it causes us problems." An executor that reaches a checkpoint task treats it as answered with the recorded value, quotes the answer and the instruction, and continues; plans 25-02..25-05 read `d01_outcome` and stop if it is not `D`.
- **What 25-03 builds (25-CONTEXT D-09..D-14):** `makeSimulationSession` becomes a scoped `Effect.fn("qadi.devtools.makeSimulationSession")` returning `Effect<SimulationSession, never, Scope.Scope>`, built with `FiberHandle.make` and `FiberHandle.runtime`. `run(kind): void` does today's synchronous part (policy, question, refusal) and forks the evaluation into the handle. `supersede()` installs an empty fiber, which interrupts the run in flight at once, so `choosePolicy`, `seed`/`replay`, `setPorts` and the other superseding commands cancel without a reap. A closing finalizer interrupts the last run and leaves the session inert. The interface has no `reap`, `hasRetired` or `dispose`. React owns the scope through a package-private `react/useScoped.ts`, and `DevtoolsDock` becomes the owner (timeline, diagnostics, merge) with the view split into an owner and a frame.
- **What 25-02's lifecycle tests assert:** a superseded run is interrupted through the handle with no `reap`; closing the scope interrupts the run in flight and leaves the session inert; the interface has no `reap`, `hasRetired` or `dispose`; a run's span is a root.
- **Options A, B and C of the original checkpoint are not built.** Option D replaced them, and ARCH-20's rejected option B (injecting a `fork`) is not what D is: the session owns the handle through structured concurrency, not through a function a caller passes in.
- **Checks passed:** Phase 24 is closed (`24-03-SUMMARY.md` exists); the `_DECISIONS-v1.2.md` row still reads `D: FiberHandle`; ARCH-73, ADR-QD-137, CCR-QD-415, BEH-QD-460..464 and INV-QD-294..295 are unused; `spec/decisions` has no `137-` file.

## Task Commits

1. **Task 1: Record D-01 (option D), confirm Phase 24 is closed and the reserved numbers are free** - `docs(25-01): record that a session owns its runs through a scope (D-01 option D)` (this file; hash in `plan_head_after`)

**Plan metadata:** the `docs(25-01): complete record D-01 plan` commit (STATE.md, ROADMAP.md, REQUIREMENTS.md).

## Files Created/Modified

- `.planning/phases/25-session-only-simulator/25-01-SUMMARY.md` - the recorded D-01 outcome and its machine-checked keys

## Decisions Made

- D-01 option D (FiberHandle) is applied as recorded; it overrides ARCH-20 D-20-b ("model code never forks") and the interface changes in 25-CONTEXT D-06 are confirmed, adjusted for a scoped constructor. The record is ADR-QD-137, written by 25-05.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

The number check for `INV-QD-295` found one hit that is history, not use: `spec/README.md` row CCR-QD-410 says "Unused: BEH-QD-440-448, INV-QD-295-299". `spec/invariants.md` ends at INV-QD-290 and no file declares INV-QD-295, so the number is free; ADR-QD-137/25-05 should leave that history line as written (CCR rows are change history, exempt per AGENTS.md section 15).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

25-02 can write the scoped lifecycle tests red against `d01_outcome: D`. No blockers.

---
*Phase: 25-session-only-simulator*
*Completed: 2026-11-11*

## Self-Check: PASSED

- FOUND: .planning/phases/25-session-only-simulator/25-01-SUMMARY.md
- FOUND: commit eab2ead5 (`git merge-base --is-ancestor` ok)
