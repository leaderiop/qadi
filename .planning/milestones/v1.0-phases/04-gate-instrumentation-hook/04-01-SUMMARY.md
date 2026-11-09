---
phase: 04-gate-instrumentation-hook
plan: 01
subsystem: react
tags: [react, effect, atoms, gate-registry, instrumentation, ARCH-49]

requires:
  - phase: 03
    provides: "Prior architecture wave; the react package at ffa7b37"
provides:
  - "GateWriter.ts useGates(kind, questions): the one hook every gate kind reads, identifies and registers through"
  - "GateScopeContext: an internal context carrying the atoms and the once-resolved writer from QadiProvider to gates"
  - "MissingQadiProviderError.ts: leaf home of the error, re-exported by name from QadiProvider.tsx"
  - "useGate as a thin caller of useGates; useDecisionSuspense suspends on the atom useGates opened"
affects: [04-02, 04-03, 04-04]

plan_head_before: ffa7b37c35735632b6f1340fa8d59115f58dfc36
plan_head_after: a80b39ed57b3aa29ed95ae1ab3c177f8d463408f

actuals:
  tokens: 7500
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Internal context declared in an out-of-barrel module carries a package-private writer, so a public context value never publishes it"
    - "A hook that cannot import its provider (import cycle) reads it through a structurally typed context"

key-files:
  created:
    - packages/react/src/MissingQadiProviderError.ts
    - packages/react/test/GateWriter.useGates.test.tsx
  modified:
    - packages/react/src/GateWriter.ts
    - packages/react/src/QadiProvider.tsx
    - packages/react/src/useGate.ts
    - packages/react/src/hooks.ts

key-decisions:
  - "The provider resolves instrument ? gateWriterFor(gates) : undefined once and gates read it through GateScopeContext, never through the public QadiContextValue (D-01, ADR-QD-099)"
  - "Every gate kind, including a one-question gate, reads through a group of one via atoms.decisions, with a missing entry reading as AsyncResult.initial() (Pending, fail-closed) (D-02)"
  - "useDecisionSuspense takes its atom from useGate and opens none of its own, taking the decision opener count from 2 to 1 (D-04)"

patterns-established:
  - "KIND_FACTS: one Record over GateKind states wraps and grouped once, so a ninth kind fails to compile until both are decided"

requirements-completed: [GATE-01, GATE-02, GATE-03, GATE-05, XC-04]

coverage:
  - id: D1
    description: "The writer is resolved once by QadiProvider and reaches gates through an internal GateScopeContext; nothing is added to the @qadi/react barrel"
    requirement: "GATE-01"
    verification:
      - kind: other
        ref: "pnpm spec:api && grep non-comment gateWriterFor( call sites in packages/react/src == 1"
        status: pass
    human_judgment: false
  - id: D2
    description: "useGates owns the grouped read, atom lookup, identity, marker rule and registration; useGate is a thin caller"
    requirement: "GATE-02"
    verification:
      - kind: unit
        ref: "packages/react/test/GateWriter.useGates.test.tsx#an instrumented <Can> registers once, as Can, carrying its marker"
        status: pass
      - kind: unit
        ref: "packages/react/test/GateWriter.useGates.test.tsx#a one-question gate hands back the very result its decision atom holds"
        status: pass
    human_judgment: false
  - id: D3
    description: "useDecisionSuspense opens its decision atom once"
    requirement: "GATE-03"
    verification:
      - kind: unit
        ref: "packages/react/test/GateWriter.useGates.test.tsx#useDecisionSuspense opens its decision atom once (D-04)"
        status: pass
    human_judgment: false
  - id: D4
    description: "With instrument off nothing registers and no marker renders; the pre-existing React suite passes unedited"
    requirement: "GATE-05"
    verification:
      - kind: unit
        ref: "packages/react/test/GateWriter.useGates.test.tsx#uninstrumented, nothing registers and no marker renders"
        status: pass
      - kind: command
        ref: "pnpm vitest run --project react (349 passed)"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-11-08
status: complete
---

# Phase 04 Plan 01: Gate instrumentation hook, tracer Summary

**One `useGates` hook in `GateWriter.ts` now owns the read, identity, marker rule and registration for every single-question gate, over a writer `QadiProvider` resolves once and hands down on an internal context.**

## Performance

- **Duration:** about 3 min (wall clock)
- **Started:** 2026-11-08T04:46:02Z
- **Completed:** 2026-11-08T04:49:22Z
- **Tasks:** 2
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments

- `QadiProvider` calls `gateWriterFor(gates)` once (behind `instrument`) and provides `{ atoms, writer }` through `GateScopeContext`, declared in the out-of-barrel `GateWriter.ts`. `QadiContextValue` and the barrel are unchanged; `pnpm spec:api` passes.
- `useGates(kind, questions)` reads the group once, looks up each entry's decision atom (memoised on the group), builds each `GateIdentity`, applies the `KIND_FACTS` marker rule and registers. `useGate` is a 3-line caller returning `entries.question`.
- `MissingQadiProviderError` moved to a leaf module and is re-exported by name; class identity and message are unchanged, and `GateWriter.ts` imports none of `QadiProvider.tsx`, `QadiAtoms.ts` or `GateRegistry.ts` (`pnpm circular` clean).
- `useDecisionSuspense` suspends on the atom `useGate` returns instead of opening a second one.

## Recorded facts (plan output spec)

- **PHASE_BASE** (commit before the first phase-4 edit): `ffa7b37c35735632b6f1340fa8d59115f58dfc36`
- **Step A commit** (characterization pins alone, touching only the new test file): `a72a97d`
- **D-04 open counts:** before the GREEN edit 2 (observed RED, `expected 2 to be 1`), after 1.
- **Non-comment `gateWriterFor(` call sites in packages/react/src:** 1, in `QadiProvider.tsx` (baseline 3).
- **Checkpoints raised under Task 1 step 6:** none. Every pre-existing React test passed unedited with one-question gates reading through a group of one, so the architectural checkpoint was not needed.

## Task Commits

1. **Task 1 Step A: characterization pins** - `a72a97d` (test)
2. **Task 1 Steps B-E: resolve once, read through useGates** - `5fff0d8` (refactor)
3. **Task 2: useDecisionSuspense suspends on the atom its gate opened** - `a80b39e` (refactor; RED observed with delta 2 before the edit, not committed separately, as the plan prescribes one commit)

## TDD notes (Task 2)

- **RED:** `useDecisionSuspense opens its decision atom once (D-04)` ran against the code as Task 1 left it and failed on the planned assertion: `expect(opened - before).toBe(1)` received 2. The target test executed and failed for the intended reason (the hook's own memo plus `useGate`'s lookup). Semantic assessment: valid RED.
- **GREEN:** the hook takes `{ atom }` from `useGate`; the test passes (delta 1) and the suite is 349/349.

## Files Created/Modified

- `packages/react/src/MissingQadiProviderError.ts` - leaf home of the error.
- `packages/react/src/GateWriter.ts` - `GateAtoms`, `GateScope`, `GateScopeContext`, `GateRead`, `Gates`, `useGates`, `KIND_FACTS`; header rewritten to state the import rule truthfully.
- `packages/react/src/QadiProvider.tsx` - single writer resolution, `GateScopeContext.Provider`, by-name re-export of the error.
- `packages/react/src/useGate.ts` - thin caller; the `Gate` interface is gone (its docs moved to `GateRead`).
- `packages/react/src/hooks.ts` - `useDecisionSuspense` thinned; `useQuestionsAs` reads the writer from the gate scope (see deviation).
- `packages/react/test/GateWriter.useGates.test.tsx` - four characterization pins plus the D-04 open-count pin.

## Decisions Made

- Writer on an internal context in `GateWriter.ts`, not on the public `QadiContextValue` (D-01).
- A one-question gate reads a group of one, so the rules of hooks hold with one `useAtomValue` per render; a missing entry reads as `AsyncResult.initial()` and `outcomeOf` reads it as `Pending` (fail-closed).
- `useGates` memoises per-entry atoms on `[scope.atoms, group]` so an equal re-render looks nothing up and per-entry identity precision (BEH-QD-068) is kept.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `useQuestionsAs` still called `gateWriterFor`, defeating the "exactly one call site" criterion**
- **Found during:** Task 1, step 6 verification
- **Issue:** The plan's must-have and acceptance criterion require exactly one non-comment `gateWriterFor(` call in packages/react/src, but `hooks.ts:108` (`useQuestionsAs`) kept its own lookup, and the plan defers moving that hook onto `useGates` to 04-02. Plan 04-02's first task also needs `useQuestionsAs` unmoved so its pin runs against the pre-move code.
- **Fix:** `useQuestionsAs` now reads `useContext(GateScopeContext)?.writer` instead of resolving a writer itself. Its identity machinery is untouched and is removed wholesale in 04-02. Behaviour is identical: the provider's writer is the same `instrument ? gateWriterFor(gates) : undefined` value.
- **Files modified:** `packages/react/src/hooks.ts`
- **Verification:** full React suite 348/348 unedited, call-site count 1.
- **Commit:** `5fff0d8`

**Total deviations:** 1 auto-fixed (1 blocking). **Impact:** a temporary bridge of two lines in `useQuestionsAs`, deleted by 04-02; no scope change and no test edited.

## Issues Encountered

None beyond the deviation above. `import * as Record from "effect/Record"` does not shadow the global `Record<K, V>` type here; `Object.values` on a generic-keyed record types as `unknown[]`, so `Record.values` is used.

## Known Stubs

None.

## Threat Flags

None. No new network endpoint, auth path or trust-boundary schema; the writer stays package-private (T-04-01, T-04-02 mitigated as planned).

## Verification Results

- `pnpm vitest run --project react`: 21 files, 349 tests passed (344 pre-existing, unedited, plus 5 new).
- `pnpm typecheck`, `pnpm circular` (no cycle), `node scripts/check-house-style.mjs` (401 files clean), `pnpm spec:api` (862 exports documented): all exit 0.
- `git status -- packages/react/test` shows no pre-existing test file modified.

## Next Phase Readiness

Ready for 04-02: `useGates` exists and is exported from `GateWriter.ts`; `useQuestionsAs` is still the old body (with the writer read from the gate scope) so 04-02's pin can run against pre-move code.

## Self-Check: PASSED

- FOUND: packages/react/src/MissingQadiProviderError.ts
- FOUND: packages/react/test/GateWriter.useGates.test.tsx
- FOUND commits: a72a97d, 5fff0d8, a80b39e
