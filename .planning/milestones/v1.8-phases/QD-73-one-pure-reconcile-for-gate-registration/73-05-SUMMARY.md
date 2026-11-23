---
phase: QD-73-one-pure-reconcile-for-gate-registration
plan: 05
subsystem: react
tags: [react, gates, tests, reconcile, coverage]

requires:
  - phase: 73-04
    provides: the reconcile tests, the characterisation rows and the shared counter the three moved cases now rest on
provides:
  - "GateRegistry.test.tsx without the three reconcile-rule cases: 37 tests, titles equal to the plan-start 40 minus three"
  - "rerenderedGate counting through notificationsOf"
  - "73-RED-EVIDENCE.md section recording where each moved case is pinned now"
affects: [73-06, 73-07]

phase_base: 1dbaf1a932109af41278b9b56892083c6ec40913
plan_head_before: 76c260d1cd9a0bc8f21bd592db87e28620b7f245
plan_head_after: ce83b48fd0b3607ea1b6c460a0ae68dfdc2ebb5d

actuals:
  tokens: 3500
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a rule is tested once, at the level it lives: the rendered file keeps outcome reading, markers, layout, scoping, the read side, StrictMode and teardown wiring"

key-files:
  created: []
  modified:
    - packages/react/test/GateRegistry.test.tsx
    - .planning/phases/QD-73-one-pure-reconcile-for-gate-registration/73-RED-EVIDENCE.md

key-decisions:
  - "Cases were deleted only after the six replacement titles were seen passing in a run before the edit and again, with the trimmed file, in the verify run"
  - "hasPermission and permission left the import list because only the deleted ticket-141 case used them; no other line changed"

requirements-completed: []  # RECN-04, WX-05..07 stay Pending by instruction; only 73-07 marks requirements

duration: ~6min
completed: 2026-11-23
status: complete
---

# Phase 73 Plan 05: The reconcile rules leave the rendered registry tests Summary

**Three rendered registry cases whose subject was a reconcile rule are deleted after their reconcile tests and characterisation rows were seen passing, and `rerenderedGate` now counts through the shared `notificationsOf`.**

## Accomplishments

- Task 1 (tracer), `104ccffd1878f457451e5216ab0496e7ffefa1c5`: before any edit the reconcile tests and the characterisation ran alone and all six replacement titles passed. The three cases were then removed from `GateRegistry.test.tsx` and `rerenderedGate` switched from its hand-written `told` counter to `notificationsOf(set.gates)` read before the first render (`notifications` is still the difference after the mount). File alone: 37 passed. Whole react project: 653 passed. `pnpm typecheck` and oxlint on the file clean. Exactly one `.subscribe(` remains, in `tells a subscribed host on mount, and not after it unsubscribed`.
- Task 2, `ce83b48fd0b3607ea1b6c460a0ae68dfdc2ebb5d`: `## Where each moved registry case is pinned now` appended to `73-RED-EVIDENCE.md` with the table, the trim commit sha, the command, each replacement's `passed` result and `GateRegistry.test.tsx: 37 passed, 0 failed`.

## The moved cases

| Case that left `GateRegistry.test.tsx` | Reconcile test (`GateWriter.reconcile.test.ts`) | Characterisation row |
|----------------------------------------|-------------------------------------------------|----------------------|
| `does NOT re-register on a render with a fresh, structurally equal policy and resource (ticket 141)` | `keeps unchanged identities with fresh policy objects, calling only update` | `a re-render with a fresh equal policy and resource notifies nothing` |
| `unregisters exactly the instance whose key was removed` | `unregisters a dropped id and registers nothing` | `removing a key unregisters that entry alone and keeps its sibling` |
| `does not re-register when an equal record is rebuilt each render` | `reconciling the same input twice keeps every entry and calls only update` | `an equal record rebuilt each render notifies nothing` |

Trim commit: `104ccffd1878f457451e5216ab0496e7ffefa1c5`.

## Verification

- Task 1 verify (extracted from the plan, run unchanged): `registry tests trimmed`.
- Task 2 verify: `the move is recorded`.
- `git status --porcelain -- packages scripts spec .changeset` empty before each commit; `packages/react/src`, the characterisation and `packages/react/test/support` unchanged since the plan start.
- Coverage half of WX-05 is a backstop: 73-07's `pnpm check:pr` runs the thresholds; nothing here ran the coverage gate.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `104ccffd` and `ce83b48f` are ancestors of HEAD; the measured count from the plan ledger is 2 commits.
- `GateRegistry.test.tsx` and `73-RED-EVIDENCE.md` exist and hold the claimed content.
