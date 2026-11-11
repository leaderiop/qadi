---
phase: 22-scoped-port-read
plan: 01
subsystem: planning
tags: [decisions, port-description, scoped-read, wave-7]

requires:
  - phase: 21-port-request-derivation
    provides: makePortDescription, closed port registry (Phase 21 closed, 21-05-SUMMARY.md present)
provides:
  - "Recorded D-02 and D-05 answers, read by plans 22-02..22-04"
  - "Phase base in 22-base.txt"
  - "Confirmation that Phase 22's reserved numbers are free"
affects: [22-02, 22-03, 22-04]

phase_base: 7f64db9a
d02_outcome: A
d02_date: 2026-11-11
d02_reason: "No nested span: every scoped port read is one span that carries the question and the `MissingResourceId` failure; `requireResourceId` is deleted; AGENTS.md §5's sentence is rewritten"
d05_outcome: state-once
d05_date: 2026-11-11
d05_reason: "The leaf->request mapping is stated once, in each port description (built through Phase 21's `makePortDescription`); the scoped reads and `servingFor` both derive from it, so the two can no longer disagree. `ServedLeaves` changes (public, `@qadi/core` minor). The `servingFor` property test stays as a guard. ADR-QD-134 records the override"
standing_instruction: "the recommendation should be the cleanest solution, not the simplest one; we can override any ADR if it causes us problems"
reserved_numbers_free: true

actuals:
  tokens: 1500
  tasks: 1
  commits: 1

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/phases/22-scoped-port-read/22-base.txt
    - .planning/phases/22-scoped-port-read/22-01-SUMMARY.md
  modified: []

key-decisions:
  - "D-02 = A: a missing resource id leaves only the port span, on every scoped port; requireResourceId is deleted"
  - "D-05 = state once: the leaf->request mapping is stated once on each port description (asks); reads and servingFor derive from it"

requirements-completed: [SCOPE-02, SCOPE-04, WX-02]

coverage:
  - id: D1
    description: "D-02 and D-05 answers recorded in this SUMMARY's frontmatter with date and quoted meaning"
    requirement: "SCOPE-02"
    verification:
      - kind: other
        ref: "bash grep of ^d02_outcome: A$, ^d05_outcome: state-once$, dates, reasons, standing instruction in 22-01-SUMMARY.md"
        status: pass
    human_judgment: false
  - id: D2
    description: "Phase base recorded and the reserved numbers (ARCH-70, ADR-QD-134, CCR-QD-412, BEH-QD-445..449, INV-QD-288..289) confirmed unused"
    requirement: "WX-02"
    verification:
      - kind: other
        ref: "grep -rnE of each id over spec packages .changeset AGENTS.md returned no hits; ls spec/decisions | grep '^134-' empty"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-11-11
status: complete
---

# Phase 22 Plan 01: Record the answered decisions Summary

**D-02 (`A`: one span, `requireResourceId` deleted) and D-05 (`state once`: leaf-to-request mapping stated on each port description) are recorded with the human's words, the phase base is `7f64db9a`, and every reserved Phase 22 number is confirmed free.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-11-11T02:33:00Z
- **Completed:** 2026-11-11T02:36:00Z
- **Tasks:** 1
- **Files modified:** 2 (both new, both under `.planning/`)

## Accomplishments

- Both answers were taken from `.planning/phases/_DECISIONS-v1.2.md` (answered 2026-11-11, before execution); no question was put to the human.
- The standing instruction is quoted verbatim: "the recommendation should be the cleanest solution, not the simplest one; we can override any ADR if it causes us problems".
- Phase base recorded in `22-base.txt` (`7f64db9a`), and ARCH-70, ADR-QD-134, CCR-QD-412, BEH-QD-445..449 and INV-QD-288..289 were grepped across `spec`, `packages`, `.changeset` and `AGENTS.md`: no hit outside "Unused:" register text; `spec/decisions` has no `134-` file.

## What follows

22-02's D-07 table expects only the port span (RED on the acted and signature rows) and two type tests go RED; 22-03 adds `PortDescription.asks`, removes `PortServingFacet.leaves`, derives `servingFor` from `asks`, routes every read through `asks` and `readScoped`, and deletes `requireResourceId`; 22-04 writes ADR-QD-134 quoting both answers. Each of those plans checks `d02_outcome: A` and `d05_outcome: state-once` before writing anything.

## Task Commits

1. **Task 1: Take the recorded answers; record them, the phase base and the free numbers** - see `plan_head_after` below (docs)

**Plan metadata:** the STATE/ROADMAP close-out commit follows.

## Files Created/Modified

- `.planning/phases/22-scoped-port-read/22-base.txt` - the phase base SHA
- `.planning/phases/22-scoped-port-read/22-01-SUMMARY.md` - the recorded answers

## Decisions Made

None beyond the two recorded above; both were the human's, taken from the decisions file.

## Deviations from Plan

None - plan executed exactly as written. (The planning-time base was `965ff14c`; the phase base recorded is the real HEAD at execution, `7f64db9a`, per step 1.)

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plans 22-02..22-04 can read `d02_outcome` and `d05_outcome` and proceed with no branching.

## Self-Check: PASSED

---
*Phase: 22-scoped-port-read*
*Completed: 2026-11-11*
