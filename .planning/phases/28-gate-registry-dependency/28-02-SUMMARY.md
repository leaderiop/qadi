---
phase: 28-gate-registry-dependency
plan: 02
subsystem: react-gate-registry
tags: [react, mutation-baseline, tdd, gate-writer, useGateRegistrations]
requires:
  - phase: 28-gate-registry-dependency
    provides: "28-01: d01_outcome A, use_gate_registration delete, phase_base 9b44e6b5"
provides:
  - "28-mutation-base.json: per-file Stryker scores for the six packages/react/src files phase 28 changes, plus an aggregate (the baseline 28-05 compares against)"
  - "GateWriter.test.tsx running its seven lifecycle cases on the production hook useGateRegistrations"
  - "useGateRegistration (test-only wrapper) removed from GateWriter.ts"
affects: [28-03, 28-04, 28-05]
use_gate_registration_branch: delete
actuals:
  tokens: 1800
  tasks: 2
  commits: 3
plan_head_before: a19a08f076e97d50f4782c5e2ce43e663b6f650e
plan_head_after: 0ccfe996fb9c0ed5fa8f316f638a3297b5d5e3e1
tech-stack:
  added: []
  patterns: []
key-files:
  created:
    - .planning/phases/28-gate-registry-dependency/28-mutation-base.json
  modified:
    - packages/react/test/GateWriter.test.tsx
    - packages/react/src/GateWriter.ts
    - spec/traceability.md
key-decisions:
  - "useGateRegistration deleted (28-01 `use_gate_registration: delete`): the seven lifecycle tests were moved to useGateRegistrations first, with unchanged assertions, so no lifecycle rule lost its only test (T-28-04)"
requirements-completed: [GATE-04, WX-04, WX-05]
duration: 6min
completed: 2026-11-11
status: complete
---

# Phase 28 Plan 02: Mutation baseline and useGateRegistration removal Summary

**Fresh Stryker baseline (six gate files plus aggregate 0.8239) recorded on the phase base, the seven registration-lifecycle tests moved onto `useGateRegistrations`, and the test-only `useGateRegistration` wrapper deleted.**

## Performance

- **Duration:** 6 min
- **Tasks:** 2 (Task 2 is `tdd="true"`)
- **Files modified:** 4 (1 created baseline JSON, test file, `GateWriter.ts`, `spec/traceability.md`)

## Mutation baseline (WX-05)

Measured from a fresh `pnpm exec stryker run stryker.react.mjs --mutate <six files>` run (316 mutants, 1 min 32 s, exit 0) on the phase base's `packages/` and `spec/`. The on-disk report was stale (2026-11-10) and was replaced by the fresh run; the plan's writer accepted it only because it was newer than every file under `packages/react/src` and `packages/react/test`. Detected = Killed + Timeout; total = detected + Survived + NoCoverage.

| File | Score |
| ---- | ----- |
| `packages/react/src/GateWriter.ts` | 0.8261 |
| `packages/react/src/GateRegistry.ts` | 0.9643 |
| `packages/react/src/useGate.ts` | 0.8000 |
| `packages/react/src/QadiProvider.tsx` | 0.7500 |
| `packages/react/src/hooks.ts` | 0.8065 |
| `packages/react/src/MissingQadiProviderError.ts` | 0.4000 |
| `__aggregate__` (over exactly the six) | 0.8239 |

`MissingQadiProviderError.ts` (0.40) and `QadiProvider.tsx` (0.75) start low; WX-05 requires no touched file's score to fall below these, not to reach a threshold. The stryker config's `break: 80` threshold applies to the run's overall score (it exited 0); the baseline writes the numbers and enforces nothing.

## TDD note

Task 2 is a retarget plus deletion, not new behavior, so there is no RED: the seven cases already pass on `useGateRegistrations` (the retarget commit is green at once, by design: "all seven pass"), and the deletion is the refactor step. Commit order follows the plan: `test` (retarget, green) then `refactor` (wrapper removed). No `feat` commit exists because no behavior was added; this is the plan's own structure, not a gate violation to fix.

## Task Commits

1. **Task 1: Mutation baseline for the gate files** - `d82ce1de` (chore; changes only the JSON, verified empty `git diff phase_base..d82ce1de -- packages spec`)
2. **Task 2a: Retarget `GateWriter.test.tsx` onto `useGateRegistrations`** - `1b43a6fc` (test)
3. **Task 2b: Remove the test-only `useGateRegistration`** - `0ccfe996` (refactor)

## Files Created/Modified

- `.planning/phases/28-gate-registry-dependency/28-mutation-base.json` - baseline scores (six files + `__aggregate__`)
- `packages/react/test/GateWriter.test.tsx` - `run` calls `useGateRegistrations(p.writer, [p.identity], [p.state])`; `describe` renamed `"useGateRegistrations (one identity)"`; header names the production hook
- `packages/react/src/GateWriter.ts` - `useGateRegistration` removed; the `useGateRegistrations` doc sentence now says a single-question guard passes one identity
- `spec/traceability.md` - the `GateWriter.test.tsx` row names `useGateRegistrations` (the file's description of what the test drives)

## Decisions Made

- `useGateRegistration` deleted per 28-01; its `{@link}` removed with it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated `spec/traceability.md` row that named the deleted symbol**
- **Found during:** Task 2 (post-deletion grep)
- **Issue:** The plan's grep covers `packages examples apps features`, but `spec/traceability.md:447` described the test as driving `useGateRegistration`, a name that no longer exists; AGENTS.md §11 makes `spec/` normative and keeps the traceability matrix current with the code.
- **Fix:** One-word change to `useGateRegistrations` in that row.
- **Files modified:** `spec/traceability.md`
- **Verification:** `pnpm spec:verify` (PASS: 21, FAIL: 0), `pnpm spec:api` green.
- **Committed in:** `0ccfe996`

**Total deviations:** 1 auto-fixed (1 blocking). **Impact on plan:** one-line doc correction, no scope creep.

## Issues Encountered

None. Verification: `pnpm vitest run --project react` (24 files, 403 tests pass), `pnpm typecheck`, `pnpm lint`, `pnpm lint:style`, `pnpm circular`, `pnpm spec:api`, `pnpm test:tstyche`, `pnpm spec:verify` all exit 0 (lint prints three pre-existing `no-unused-vars` warnings in files this plan did not touch).

## Deferred Items

- `spec/decisions/103-a-question-is-opened-once.md:52` still says `useGateRegistrations`, "of which `useGateRegistration` is the one-element case". That is a decision record's history, not a live claim about the code, so it was left alone here; 28-05's ADR-QD-140 (which amends ADR-QD-111) can note that the wrapper was removed in 28-02 if it wants the record to point forward.

## Known Stubs

None.

## Threat Flags

None. T-28-04 (a lifecycle rule losing its only test) mitigated: all seven cases ran on `useGateRegistrations` before the wrapper was deleted. T-28-SC: no package installed.

## Next Phase Readiness

Ready for 28-03 (extract the pure `reconcile`). `GateWriter.test.tsx` imports `useGateRegistrations` from `../src/GateWriter.ts`; 28-04 re-points that to `useGate.ts` when the hooks move.

## Self-Check: PASSED

- `28-mutation-base.json`, `GateWriter.test.tsx`, `GateWriter.ts`: present.
- `d82ce1de`, `1b43a6fc`, `0ccfe996` are ancestors of HEAD; `git rev-list --count` from the ledger base gives 3.

---
*Phase: 28-gate-registry-dependency*
*Completed: 2026-11-11*
