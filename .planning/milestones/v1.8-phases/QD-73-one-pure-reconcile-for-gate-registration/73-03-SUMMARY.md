---
phase: QD-73-one-pure-reconcile-for-gate-registration
plan: 03
subsystem: react
tags: [react, gates, reconcile, hooks, registry]

requires:
  - phase: 73-01
    provides: the characterisation and the shared test fixtures that hold behaviour unchanged
  - phase: 73-02
    provides: ADR-QD-186, whose decisions 1 to 8 this plan implements
provides:
  - "reconcile(writer, live, wanted) keyed by gate id: keeps and updates, unregisters, registers, rolls back on a throw"
  - "GateWanted, an id-less GateIdentity, sameIdentity over kind, atom, wraps and marker"
  - "useGateRegistrations(writer, wanted) with one ref, the writer-keyed teardown and one registration effect"
  - "useGates building entries and the wanted map in one keyed pass"
  - "22 reconcile tests without rendering: update half, order, real registry, idempotency, failure rule"
affects: [73-04, 73-05, 73-06, 73-07]

phase_base: 1dbaf1a932109af41278b9b56892083c6ec40913
plan_head_before: 05430fbc24a2683692ed650d9b47bdc88b55ac30
plan_head_after: 318d667bf5b66e7710d69932d2b77765106695e2

actuals:
  tokens: 40000
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "a wanted set is a map keyed by the id, so the id is stated once and cannot repeat"
    - "a step that can throw rolls back what it made and throws by the count rule (one value as is, several as one AggregateError)"

key-files:
  created: []
  modified:
    - packages/react/src/GateWriter.ts
    - packages/react/src/useGate.ts
    - packages/react/test/GateWriter.reconcile.test.ts
    - packages/react/test/GateWriter.test.tsx
    - .planning/phases/QD-73-one-pure-reconcile-for-gate-registration/73-RED-EVIDENCE.md

key-decisions:
  - "A kept handle is told its state on every reconcile and the equal-state rule stays only in GateHandle.update"
  - "The step order is the live loop (update or unregister) then the registration loop, so a changed identity logs unregister, then the siblings update, then register"

requirements-completed: []  # WX-04, WX-06, WX-07, RECN-02..04 stay Pending by instruction; only 73-07 marks requirements

duration: ~25min
completed: 2026-11-23
status: complete
---

# Phase 73 Plan 03: One keyed reconcile and one registration effect Summary

**`reconcile` now takes the wanted registrations keyed by gate id and keeps, updates, unregisters and registers in one step with a rollback on a throw; `useGateRegistrations` keeps one ref and one registration effect beside its teardown; `useGates` builds the keyed map in one pass; the 19-row characterisation passes untouched.**

## Accomplishments

- Task 1 (tracer), commit `299297ad`: `GateWriter.ts` gained `GateWanted`, lost `GateCurrent` and the id on `GateIdentity`, and `sameIdentity` compares exactly four fields. `reconcile(writer, live, wanted)` visits `live` in order (a kept entry, the same `Registered` object, has its handle told the wanted state; any other unregisters), then registers each unkept wanted id in `wanted` order. In a `catch` it unregisters every handle the call made, each isolated, and throws the one value or one `AggregateError` ("A gate reconcile step threw, and so did its rollback."). The doc comment carries ADR-QD-186 decision 6's failure-rule sentence verbatim. `useGate.ts` lost the identity-pinning ref block, the two latest-value refs and the state-diff effect: the hook holds `registered`, the verbatim teardown first, then one effect with no dependency list. `useGates` makes one `Record.map` pass yielding `{ entry, want }`, reads `entries` off it, and builds `wanted` as `new Map(Record.collect(…))` of `[entry.id, want]` pairs. The signature change and every caller (the 12 reconcile tests, the `run` helper of `GateWriter.test.tsx`) moved in this one commit; typecheck stayed green.
- Task 2 (tdd), commit `0a5c5db4`: ten tests for the rules the change adds, written against the post-change code (the update half was shown RED against the base in 73-01's evidence). `fakeWriter` takes an optional `throwsOn` set and returns the errors it threw; `thrownBy` returns what a call throws.
- Evidence commit `318d667b`: `73-RED-EVIDENCE.md` gained "The keyed reconcile green" (22 passed, 19 passed, head sha).

## Tests

Retargeted (12, in `GateWriter.reconcile.test.ts`): registers every wanted entry in map order, with its identity and its state; registers a new id and calls nothing else; registers a new id with the wanted state, not Pending; registers the policy and resource its identity carries; the three element tests (unchanged wording); keeps unchanged identities with fresh policy objects, calling only update; returns a fresh map and does not mutate the live map it is given; unregisters a dropped id and registers nothing; unregisters everything for an empty wanted map; re-registers when only atom, kind, wraps or marker changed, updating its sibling.

New (10): tells the handle of a kept entry the wanted state; tells a kept handle its state even when unchanged, leaving equality to it; keeps the entry when only the policy or the resource changed; reconciling the same input twice keeps every entry and calls only update; on a real registry a changed identity keeps its id and reports no collision; calls each live update or unregister in order, then each registration; a register that throws rolls back what the call registered, then rethrows it; a throwing unregister or update stops the steps after it and rethrows it; a rollback that also throws joins the throw of the step in one AggregateError; a throw leaves an unregistered entry in live; its second unregister is a no-op.

## Verification

- `73-03-PLAN.md` Task 1 `<verify>` printed `keyed reconcile in place` (run after the refactor commit, when the reconcile file held 12 tests); Task 2 `<verify>` printed `reconcile rules pinned`.
- `pnpm exec vitest run --project react`: 38 files, 654 tests passed. `GateWriter.test.tsx` 8 of 8, the characterisation 19 of 19 (file unchanged, one commit since the phase base).
- `pnpm typecheck` clean; oxlint clean on the four files; `node scripts/check-house-style.mjs` clean; `node scripts/check-api-surface.mjs` reads 941; no added line passes 90 columns.

## Deviations from Plan

**1. [Plan text inconsistency, verification-only] Order of calls in the per-field table test**
- **Issue:** the plan's Task 1 text says title 12's log is `unregister a`, `register a`, followed by the sibling's `update`. The plan's own step rule (and its Task 2 order row) visits every live entry before any registration, so the real order is `unregister a`, `update b`, `register a`.
- **Fix:** the expected log states the order the step makes; the test pins it. No behaviour differs from the decision.
- **Commit:** `299297ad`.

**2. [Test helper] `fakeWriter` also returns `thrown`**
- **Issue:** the plan asks for `toBe` on thrown values and AggregateError members, which needs the original `Error` objects.
- **Fix:** `fakeWriter(throwsOn)` records each `Error` it throws in a returned `thrown` array. File-local.
- **Commit:** `0a5c5db4`.

**3. [Formatting] Three long test titles use the wrapped `it(` form**
- 90-column rule on added lines; titles stay as the plan names them.

**Total deviations:** 3, none changing behaviour or any expected value of the characterisation or `GateWriter.test.tsx`.

## Known Stubs

None.

## Threat Flags

None. `GateWriter.ts` and `useGate.ts` stay out of the barrel (api-surface 941); with `writer` undefined the registration effect returns at once; T-73-06 and T-73-07 mitigations are pinned by the failure-path and real-registry tests.

## Next Phase Readiness

73-04 (type pins and hook-level rows) can build on `GateWanted`, `reconcile` and `Registered` as they now stand.

## Self-Check: PASSED

- `packages/react/src/GateWriter.ts`, `packages/react/src/useGate.ts`, `packages/react/test/GateWriter.reconcile.test.ts`, `packages/react/test/GateWriter.test.tsx` exist and are committed in `299297ad` and `0a5c5db4`.
- Commits `299297ad`, `0a5c5db4`, `318d667b` are ancestors of HEAD; `git rev-list --count 05430fbc..HEAD` is 3 at the time of writing.
