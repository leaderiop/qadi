---
phase: 28-gate-registry-dependency
plan: 01
subsystem: react-gate-registry
tags: [decision, adr-qd-111, gate-writer, planning-only]
d01_outcome: A
d01_date: 2026-11-11
d01_reason: "Split the React-free write side plus pure `reconcile` (private leaf below the registry) from the hooks (`useGate.ts`, above `QadiAtoms`); `GateAtoms` = `Pick<QadiAtoms, …>`; ADR-QD-140 amends ADR-QD-111's import rule"
use_gate_registration: delete
reserved_numbers_free: true
phase_base: 9b44e6b54d9d912812a6d13e8101401499b97f72
requires: []
provides:
  - "the recorded D-01 scope (A) and the useGateRegistration fate (delete) that plans 28-02..28-05 read"
affects: [28-02, 28-03, 28-04, 28-05]
actuals:
  tokens: 2500
  tasks: 2
  commits: 1
plan_head_before: 9b44e6b54d9d912812a6d13e8101401499b97f72
plan_head_after: 9b44e6b54d9d912812a6d13e8101401499b97f72
tech-stack:
  added: []
  patterns: []
key-files:
  created:
    - .planning/phases/28-gate-registry-dependency/28-01-SUMMARY.md
  modified: []
key-decisions:
  - "D-01 = A: split GateWriter.ts's write side (React-free private leaf below the registry) from its hooks (useGate.ts, above QadiAtoms), extract a pure reconcile, derive GateAtoms as Pick<QadiAtoms, ...>; ADR-QD-140 amends ADR-QD-111's import rule"
  - "D-02 = delete: useGateRegistration is removed once its seven tests run against useGateRegistrations"
requirements-completed: [GATE-01, GATE-04, WX-02]
duration: 4min
completed: 2026-11-11
status: complete
---

# Phase 28 Plan 01: Gate-writer scope decision Summary

**Outcome A recorded: split the gate writer's React-free write side from its hooks, extract a pure `reconcile`, and delete the test-only `useGateRegistration`; ADR-QD-140 will amend ADR-QD-111's import rule.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-11-11T15:10:24Z
- **Tasks:** 2 (1 decision checkpoint answered from the pre-recorded table, 1 auto)
- **Files modified:** 1 (this SUMMARY; nothing outside `.planning/`)

## Accomplishments

- Task 1 (`checkpoint:decision`, `gate="blocking-human"`) was **not stopped on**: the answer was taken from the pre-recorded decisions table `.planning/phases/_DECISIONS-v1.2.md`, row "28-01 T1 (D-01)", dated 2026-11-11 (the human's "ask once" rule; the table was answered before execution, with the instruction "the recommendation should be the cleanest solution, not the simplest one; we can override any ADR if it causes us problems"). The row reads: `A` (useGateRegistration deleted) — "Split the React-free write side plus pure `reconcile` (private leaf below the registry) from the hooks (`useGate.ts`, above `QadiAtoms`); `GateAtoms` = `Pick<QadiAtoms, …>`; ADR-QD-140 amends ADR-QD-111's import rule". That row also confirms D-02: `useGateRegistration` is deleted, so no `keep:` reason applies.
- Task 2: the reserved numbers `ARCH-76`, `ADR-QD-140`, `CCR-QD-418`, `BEH-QD-475`..`BEH-QD-479`, `INV-QD-300`, `INV-QD-301` were grepped over `spec`, `packages`, `.changeset` and `AGENTS.md` (`/usr/bin/grep -rlnE -- "<id>([^0-9]|$)" … | /usr/bin/grep -v /lib/`): no output for any of the ten ids, and `ls spec/decisions | grep '^140-'` printed nothing (rc 1). `reserved_numbers_free: true`.
- Precondition for Task 2 held: every `27-0*-PLAN.md` has a SUMMARY, and no `(28-0` commit existed before this one.

## What runs next (branching on `d01_outcome: A`)

Outcome A means **both 28-03 and 28-04 run** (28-03 extracts the pure `reconcile`, 28-04 splits the write side from the hooks and derives `GateAtoms`), 28-02 retargets `GateWriter.test.tsx` from `useGateRegistration` to `useGateRegistrations` and then deletes `useGateRegistration` (`use_gate_registration: delete`), and **28-05 records ADR-QD-140 amending ADR-QD-111's import-rule bullet**, quoting `d01_reason` above. `phase_base` is the parent of this phase's first commit, `9b44e6b5` ("docs(28): revise phase plan ...").

## Task Commits

1. **Task 1: D-01 checkpoint** - no commit (decision answered from `_DECISIONS-v1.2.md`)
2. **Task 2: record the D-01 outcome and confirm reserved numbers** - the commit `docs(28-01): record the gate-writer scope decision` (this file; hash recorded in `plan_head_after`)

The frontmatter `commits: 1` counts that one commit measured from the persisted ledger (`git rev-list --count 9b44e6b5..<SUMMARY commit>`); the later STATE/ROADMAP metadata commit is not counted, since it is plan close-out, not a task commit. `plan_head_after` is written after the SUMMARY commit exists.

## Files Created/Modified

- `.planning/phases/28-gate-registry-dependency/28-01-SUMMARY.md` - the recorded scope every later plan reads

## Decisions Made

- D-01 = A (see `d01_reason`), D-02 = delete, both from the pre-recorded table dated 2026-11-11.

## Deviations from Plan

None - plan executed exactly as written. (The `checkpoint:decision` was resolved from the pre-recorded decisions table as the plan's own `resume-signal` directs, not by stopping.)

## Issues Encountered

None.

## Known Stubs

None.

## Threat Flags

None. T-28-01 (publishing `gateWriterFor`) is mitigated downstream: outcome A keeps the write side out of the barrel, and 28-04 verifies `pnpm spec:api` shows no new export. T-28-03 (auto-resolution of a human gate) is satisfied by the human's pre-recorded answer, not by an auto-select.

## Next Phase Readiness

Ready for 28-02 (retarget the `useGateRegistration` tests).

---
*Phase: 28-gate-registry-dependency*
*Completed: 2026-11-11*
