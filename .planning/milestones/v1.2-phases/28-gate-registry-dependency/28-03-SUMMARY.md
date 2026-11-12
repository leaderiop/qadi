---
phase: 28-gate-registry-dependency
plan: 03
subsystem: react-gate-registry
tags: [react, tdd, gate-writer, reconcile, useGateRegistrations]
requires:
  - phase: 28-gate-registry-dependency
    provides: "28-01: d01_outcome A; 28-02: useGateRegistrations lifecycle tests as the safety net"
provides:
  - "GateWriter.ts exports reconcile(writer, live, wanted, current) and the Registered / GateCurrent interfaces: React-free reconcile rules (GATE-02)"
  - "GateWriter.reconcile.test.ts: 12 cases against a recording fake writer, no render"
  - "useGateRegistrations' identity-lifecycle effect is a call to reconcile; teardown reads registered.current when the cleanup runs"
affects: [28-04, 28-05]
d01_outcome: A
pushstates_extracted: false
actuals:
  tokens: 3770
  tasks: 2
  commits: 2
plan_head_before: c00143a65714683ee528fadb29b41e627b93a48e
plan_head_after: 212dcf48dcdc1a17b1a5e0164b9ac9a2fe06a855
tech-stack:
  added: []
  patterns:
    - "model logic out of effects: a pure function returning the next state, called from one effect"
key-files:
  created:
    - packages/react/test/GateWriter.reconcile.test.ts
  modified:
    - packages/react/src/GateWriter.ts
key-decisions:
  - "reconcile returns a new Map rather than mutating the ref's map; teardown therefore reads registered.current at cleanup time and resets it to a new empty Map"
  - "pushStates was not extracted: the per-render state push stays in its own effect, unchanged"
  - "GREEN commit typed feat(28-03), not the plan's refactor(28-03), so the TDD gate check sees a GREEN descending from the RED"
requirements-completed: [GATE-02, WX-04, WX-06]
coverage:
  - id: D1
    description: "reconcile is exported from GateWriter.ts, imports nothing from react at runtime, and calls only writer.register and handle.unregister"
    requirement: GATE-02
    verification:
      - kind: unit
        ref: "packages/react/test/GateWriter.reconcile.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "useGateRegistrations' lifecycle effect calls reconcile; every existing react test passes unedited"
    requirement: GATE-02
    verification:
      - kind: unit
        ref: "pnpm vitest run --project react (25 files, 415 tests)"
        status: pass
    human_judgment: false
duration: 25min
completed: 2026-11-11
status: complete
---

# Phase 28 Plan 03: Reconcile extraction Summary

**The gate reconcile (unregister what changed or left, register what is new, leave the rest) is a React-free `reconcile` function tested against a recording fake writer, and `useGateRegistrations`' effect now just calls it.**

## Outcome branch

`d01_outcome: A` (28-01), so Tasks 1 and 2 both ran.

## Final signature

```ts
export interface Registered { readonly identity: GateIdentity; readonly handle: GateHandle }
export interface GateCurrent { readonly policy: Policy; readonly resource: Resource | undefined; readonly state: GateRenderState }
export const reconcile = (
  writer: GateWriter,
  live: ReadonlyMap<string, Registered>,
  wanted: ReadonlyArray<GateIdentity>,
  current: ReadonlyArray<GateCurrent | undefined>,
): Map<string, Registered>
```

`pushStates` was not extracted; the state-push effect is untouched.

## Task Commits

1. **Task 1 (RED):** `8b03a02c` `test(28-03): the gate reconcile rules against a fake writer, red`
2. **Task 2 (GREEN):** `212dcf48` `feat(28-03): the gate reconcile is a React-free function`

## RED evidence

`pnpm vitest run --project react packages/react/test/GateWriter.reconcile.test.ts` printed `Test Files  1 failed (1)`, `Tests  12 failed (12)` and exactly 12 `TypeError: reconcile is not a function` lines. Semantic assessment: every case calls `reconcile` by name and fails on the missing export, not on a syntax, import or fixture fault; the plan's no-renderHook / no-react-import check passed.

The four "one field changed" cases (atom, kind, wraps, marker) are one test looping over the fields with the field name on each assertion's message. Vitest folds identical errors from separate tests into one block, which made the plan's `N failed` vs `N` error-line count disagree (12 lines for 15 tests) while they were four separate cases.

## Verification (all green)

- `pnpm vitest run --project react`: 25 files, 415 tests, 28-02 lifecycle cases ("unmount unregisters", "the writer going undefined unregisters") and GateWriter.useGates/kinds unedited.
- `pnpm test:tstyche`, `pnpm typecheck`, `pnpm lint` (existing warnings only, none in the touched files), `pnpm lint:style`, `pnpm circular`, `pnpm spec:api`.
- Plan grep check: one `export const reconcile`, three indented `useEffect(` calls (no effect added).
- Stryker on `GateWriter.ts` (`--mutate`, 41 s): 88.98 (baseline 0.8261). No survivor inside `reconcile` except the `a.id === b.id` conjunct of `sameIdentity`, which is equivalent there because `reconcile` has already matched the id. Remaining survivors are in the pre-existing hook body and in the unreachable `now === undefined` fallback of the effect's glue (the arrays are index-aligned), left for 28-05's comparison. No threshold, budget or script touched.

## Deviations from Plan

**1. [Rule 3 - Process] GREEN commit typed `feat`, not `refactor`**
- **Found during:** Task 2
- **Issue:** the plan names the GREEN commit `refactor(28-03): ...`, but the TDD gate check (`tdd.md` Gate Enforcement) looks for a `feat(28-03):` commit descending from the `test(28-03):` one and would report GREEN missing.
- **Fix:** committed as `feat(28-03): the gate reconcile is a React-free function`.
- **Files modified:** none beyond the plan's
- **Commit:** 212dcf48

**2. [Rule 1 - Test shape] Four per-field cases folded into one test** (see RED evidence), so the plan's RED verify holds.

**Total deviations:** 2 (one commit-type, one test shape). **Impact:** none on behaviour or scope.

## Threat model

T-28-05 (stale registration): dropped-id, empty-wanted and changed-identity cases, plus the unchanged 28-02 unmount/teardown cases. T-28-06 (registration timing): `reconcile` is called only from the existing effect; the `useEffect` count did not grow.

## Issues Encountered

None. Teardown change (read `registered.current` at cleanup, reset to a new `Map`) was applied in the same step as the extraction, so the 28-02 cases never went red.

## Known Stubs

None.

## TDD Gate Compliance

RED `8b03a02c` (test) precedes GREEN `212dcf48` (feat), which descends from it. No REFACTOR commit.

## Next Phase Readiness

`reconcile` stays with the write side in `GateWriter.ts`; 28-04 can move the hooks out around it. 28-05 still owns the full mutation comparison and its own post-edit Stryker run.

## Self-Check: PASSED

- FOUND: packages/react/test/GateWriter.reconcile.test.ts, packages/react/src/GateWriter.ts
- FOUND commits: 8b03a02c, 212dcf48
