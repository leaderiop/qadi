---
phase: 28-gate-registry-dependency
plan: 04
subsystem: react-gate-registry
tags: [react, gate-writer, useGate, import-graph, madge]
requires:
  - phase: 28-gate-registry-dependency
    provides: "28-01: d01_outcome A; 28-03: reconcile/Registered/GateCurrent in GateWriter.ts"
provides:
  - "GateWriter.ts is the React-free write side: types, OwnedGateRegistry, makeOwnedGateRegistry, gateWriterFor, GateIdentity, sameIdentity, Registered, reconcile"
  - "useGate.ts holds KIND_FACTS, GateScope, GateScopeContext, GateRead, Gates, useGates, useGateRegistrations, useGate"
  - "GateAtoms = Pick<QadiAtoms, \"decision\" | \"decisions\"> (GATE-03)"
affects: [28-05]
d01_outcome: A
actuals:
  tokens: 5800
  tasks: 2
  commits: 1
plan_head_before: 4d554c3580fa3bc2fc081960add8ba27c53981c0
plan_head_after: 585707b53b1dc71bd9c10f09f7d61a4063b1dfc7
tech-stack:
  added: []
  patterns:
    - "write side below the registry, hooks above the atom set: a type derived from QadiAtoms is legal only in the module that nothing in QadiAtoms.ts's closure imports"
key-files:
  created: []
  modified:
    - packages/react/src/GateWriter.ts
    - packages/react/src/useGate.ts
    - packages/react/src/QadiProvider.tsx
    - packages/react/src/hooks.ts
    - packages/react/src/MissingQadiProviderError.ts
    - packages/react/test/GateWriter.test.tsx
key-decisions:
  - "GateWriter.ts lost its \"use client\" directive: it now imports nothing from react"
  - "sameIdentity is exported from GateWriter.ts (it was module-private) because useGateRegistrations, now in useGate.ts, keys its stable-identity ref on it; still out of the barrel"
requirements-completed: [GATE-03, WX-03, WX-04]
coverage:
  - id: D1
    description: "GateWriter.ts imports nothing from react, @effect/atom-react or effect/reactivity at runtime; useGate.ts derives GateAtoms as Pick<QadiAtoms, decision | decisions>"
    requirement: GATE-03
    verification:
      - kind: other
        ref: "plan Task 1 node check (runtime-import scan, Pick present, type-only QadiAtoms import, no hand-written decisions signature)"
        status: pass
    human_judgment: false
  - id: D2
    description: "pnpm circular green, GateRegistry.ts still imports only GateWriter.ts and DeveloperSignals.ts, export surface unchanged"
    requirement: GATE-03
    verification:
      - kind: other
        ref: "pnpm circular; pnpm spec:api (906 exports, no drift)"
        status: pass
    human_judgment: false
  - id: D3
    description: "stale comments naming GateWriter.ts as the home of useGates or the thrower of MissingQadiProviderError are gone"
    requirement: WX-03
    verification:
      - kind: other
        ref: "plan Task 1 stale-comment node check"
        status: pass
    human_judgment: false
  - id: D4
    description: "every react test passes and tests changed only by import lines"
    requirement: WX-04
    verification:
      - kind: unit
        ref: "pnpm vitest run --project react (25 files, 415 tests); plan Task 2 diff check"
        status: pass
    human_judgment: false
duration: 8min
completed: 2026-11-11
status: complete
---

# Phase 28 Plan 04: Gate write side split Summary

**GateWriter.ts is now a React-free leaf (types, private writer slot, `reconcile`) and the hooks moved into useGate.ts above QadiAtoms.ts, where `GateAtoms` is derived as `Pick<QadiAtoms, "decision" | "decisions">`.**

## Outcome branch

`d01_outcome: A` (28-01), so both tasks ran.

## Final member list

- `GateWriter.ts`: `GateKind`, `GateRenderState`, `GateInstance`, `GateHandle`, `GateWriter`, `GateRegistry`, `makeOwnedGateRegistry` (class `OwnedGateRegistry` stays private), `gateWriterFor`, `GateIdentity` (marker typed `{ readonly current: HTMLSpanElement | null }`), `sameIdentity`, `Registered`, `GateCurrent`, `reconcile`. Runtime imports: none. Type imports: `@qadi/core`, `DecisionOutcome.ts`.
- `useGate.ts`: `KIND_FACTS` (private), `useGateRegistrations`, `GateAtoms`, `GateScope`, `GateScopeContext`, `GateRead`, `Gates`, `NOT_YET` and `useGateScope` (private), `useGates`, `useGate`.
- Re-pointed: `QadiProvider.tsx` (`GateScopeContext` from `./useGate.ts`), `hooks.ts` (`useGates` from `./useGate.ts`), `GateWriter.test.tsx` (`useGateRegistrations` from `../src/useGate.ts`). `GateRegistry.ts` untouched (its header names no moved member).
- Comments fixed: `MissingQadiProviderError.ts` header, the `QadiProvider.tsx` re-export comment, `useGate.ts`'s own header.

## Verification

- `pnpm circular`: `No circular dependency found!`
- `pnpm spec:api`: 906 exports documented, no drift (barrel unchanged; `useGate.ts` and `GateWriter.ts` still out of `src/index.ts`).
- `pnpm typecheck`, `pnpm lint` (house-style clean, only pre-existing oxlint warnings), `pnpm test:tstyche` (230 tests), react vitest project (25 files, 415 tests), devtools vitest project (46 files, 1222 tests), `tsc -b tsconfig.json` + `pnpm test:bdd` (34 files, 568 tests): green.
- Tests changed only by import lines since 28-03: the only test diff is the one import of `useGateRegistrations` in `GateWriter.test.tsx`.

## Task Commits

1. **Tasks 1 and 2 together (as the plan directs): the split, import re-points, comment fixes** - `585707b5` (refactor)

**Plan metadata:** the docs(28-04) commit following this file.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `sameIdentity` exported from GateWriter.ts**
- **Found during:** Task 1
- **Issue:** the plan's member list names `sameIdentity` for the write side, but it was module-private and `useGateRegistrations` (moved to `useGate.ts`) uses it for its stable-identity ref
- **Fix:** `export const sameIdentity`; no barrel change
- **Files modified:** packages/react/src/GateWriter.ts
- **Committed in:** 585707b5

**Total deviations:** 1 auto-fixed (1 blocking). **Impact:** none on behaviour or public surface.

## Mutation survivors for 28-05

No Stryker run was made in this plan (28-05 owns the fresh run and the comparison). Moved code is byte-identical apart from imports, so scores should track the 28-02 baseline (`28-mutation-base.json`: GateWriter.ts 0.826, useGate.ts 0.800). Expect the per-file scores to redistribute because the hooks and `KIND_FACTS` now count under `useGate.ts` and `reconcile` alone under `GateWriter.ts`. No survivors were recorded here.

## Known Stubs

None.

## Threat Flags

None. No export was added to a barrel (T-28-07) and no cycle exists (T-28-08, `pnpm circular` green).

## Self-Check: PASSED

- packages/react/src/useGate.ts and GateWriter.ts exist; commit 585707b5 is an ancestor of HEAD.
