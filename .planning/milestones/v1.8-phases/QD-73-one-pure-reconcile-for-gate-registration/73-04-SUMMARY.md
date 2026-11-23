---
phase: QD-73-one-pure-reconcile-for-gate-registration
plan: 04
subsystem: react
tags: [react, gates, reconcile, type-tests, tstyche, error-boundary]

requires:
  - phase: 73-03
    provides: the keyed reconcile, GateWanted and the id-less GateIdentity that the type pins describe
provides:
  - "GateWriter.reconcile.tst.ts: five type tests and three @ts-expect-error pins for the keyed signature"
  - "Boundary, the shared error boundary with onCaught, in support/trees.tsx"
  - "two hook rows: an unchanged state notifies nothing and keeps the instance; a throwing reconcile leaves nothing registered"
  - "six scratch guts, each shown failing once and reverted, recorded in 73-RED-EVIDENCE.md"
affects: [73-05, 73-06, 73-07]

phase_base: 1dbaf1a932109af41278b9b56892083c6ec40913
plan_head_before: dd9b22450ef1ef6b566fef211b535397540495d2
plan_head_after: 2f8bd3e0e84d9cb399455b6d47ae683280d1569d

actuals:
  tokens: 14000
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "a type-level refusal is a @ts-expect-error fragment on a held value, with an accepted twin differing in one thing"
    - "a rule is pinned by gutting its mechanism once on a scratch edit, reverted, and recording the first failure line"

key-files:
  created:
    - packages/react/test/GateWriter.reconcile.tst.ts
  modified:
    - packages/react/test/support/trees.tsx
    - packages/react/test/edges.test.tsx
    - packages/react/test/GateWriter.test.tsx
    - .planning/phases/QD-73-one-pure-reconcile-for-gate-registration/73-RED-EVIDENCE.md

key-decisions:
  - "The type pins use three @ts-expect-error directives and no toBeCallableWith or toBeConstructableWith pin, so NOT_CALLABLE_PIN_BUDGET and the AGENTS.md section 6 table do not change"
  - "Boundary gains componentDidCatch and an optional onCaught in the shared module; edges.test.tsx's use is unchanged because the prop is optional"

requirements-completed: []  # RECN-02..04, WX-04, WX-06, WX-07 stay Pending by instruction; only 73-07 marks requirements

duration: ~20min
completed: 2026-11-23
status: complete
---

# Phase 73 Plan 04: Type pins, hook rows and six guts Summary

**The keyed reconcile signature is pinned at the type level with a positive twin beside every refusal, the hook is shown to leave nothing registered after a throwing reconcile, and each type guarantee and step rule has been seen failing once on a reverted scratch edit.**

## Accomplishments

- Task 1 (tracer), `2c2e4a4e`: `GateWriter.reconcile.tst.ts` with the five titled tests. The array refusal and the id-literal refusal are fragments of the one suppressed error each (`parameter of type 'ReadonlyMap<string, GateWanted>'`, `'id' does not exist in type 'GateIdentity'`); the third directive sits above a re-export of `GateCurrent` (`has no exported member 'GateCurrent'`). The `keyof` pins compare `GateIdentity`, `GateWanted` and `Registered` with independently written unions. tstyche passes under both compiles (5 tests, 7 assertions, 3 suppressed matched), `pnpm typecheck` is clean, house-style reads `70 type-test file(s)`.
- Task 2 (tdd), `b451064b` and `b162f6a8`: `Boundary` moved from `edges.test.tsx` into `support/trees.tsx` (one header sentence and the class; nothing else lost), gaining `componentDidCatch` and `onCaught`. `edges.test.tsx` passes the same 13 tests. `GateWriter.test.tsx` now counts through `notificationsOf` (no `.subscribe(` left) and passes 10 tests: the 8 unchanged, `an unchanged state makes no notification and keeps the id` (same count, same instance object by `toBe`) and `a reconcile that throws leaves nothing registered once the hook unmounts` (caught value is the held `Error` by `toBe`, empty registry, exactly 4 notifications: register `a`, register `b`, rollback of `b`, teardown of `a`).
- Task 3, `2f8bd3e0`: six guts applied alone to `packages/react/src/GateWriter.ts`, each reverted with `git checkout --` before the next and never committed; `73-RED-EVIDENCE.md` gained the six `###` sections and the green section.

## The guts

| Gut | Command | First failure line |
|-----|---------|--------------------|
| wanted widened to an array | `pnpm test:tstyche GateWriter.reconcile` | `Unused '@ts-expect-error' directive. ts(2578)` at `:48:5` |
| an id on the identity | same | `Property 'id' is missing in type '{ kind: "Can"; ... }' but required in type 'GateIdentity'. ts(2741)` (plus the unused id directive and the `keyof GateIdentity` pin) |
| `GateCurrent` exported again | same | `Unused '@ts-expect-error' directive. ts(2578)` at `:27:1` |
| a state on `Registered` | same | `Type 'keyof Registered' is not the same as type '"identity" \| "handle"'.` |
| no rollback | vitest, `GateWriter.reconcile.test.ts` and `GateWriter.test.tsx` | exactly 3 fail: `a register that throws rolls back what the call registered, then rethrows it`, `a rollback that also throws joins the throw of the step in one AggregateError`, `a reconcile that throws leaves nothing registered once the hook unmounts` |
| registration before unregistration | same | 5 fail, first `on a real registry a changed identity keeps its id and reports no collision` (`expected [ [ 'a~1', 'Allowed' ] ] to deeply equal [ [ 'a', 'Allowed' ] ]`) |

## Verification

- Task 1, 2 and 3 `<verify>` scripts printed `type pins green`, `hook rows pinned`, `each guarantee gutted once` (the scripts were run from the plan text, unmodified).
- On the clean tree: `pnpm test:tstyche GateWriter.reconcile` 5 of 5 under both compiles; vitest `GateWriter.reconcile.test.ts` + `GateWriter.test.tsx` 32 of 32; whole `--project react` passes (run by the Task 2 verify); `pnpm typecheck` clean; oxlint clean on the four test files; no added line passes 90 columns; `packages/react/src` and the characterisation unchanged since the plan start (`git status --porcelain -- packages` empty); `GateWriter.ts` has one commit since `phase_base`.

## Deviations from Plan

None - plan executed exactly as written. Two small notes, neither a deviation: the type-pin file's header wording and a one-line comment above the `GateCurrent` directive are mine (the plan fixes the content, not the prose); the `gut-id` run also fails source files that build identities with no id, which tstyche does not report, so only the three named pins appear.

## Known Stubs

None.

## Threat Flags

None. T-73-09 (a gut reaching a commit) is closed by the verify's refusal of a dirty `packages/` and of a second `GateWriter.ts` commit; T-73-10 (a leak after a throwing reconcile) is pinned by the hook row and shown to fail without the rollback.

## Next Phase Readiness

73-05 can move the three reconcile-rule cases out of `GateRegistry.test.tsx`; `Boundary` and `notificationsOf` are shared and the keyed signature is pinned.

## Self-Check: PASSED

- `packages/react/test/GateWriter.reconcile.tst.ts`, `packages/react/test/support/trees.tsx`, `packages/react/test/edges.test.tsx`, `packages/react/test/GateWriter.test.tsx` and `73-RED-EVIDENCE.md` exist and are committed.
- Commits `2c2e4a4e`, `b451064b`, `b162f6a8`, `2f8bd3e0` are ancestors of HEAD; `git rev-list --count dd9b2245..HEAD` was 4 before this summary.
