---
phase: QD-62-type-pins-that-can-fail
plan: 03
subsystem: testing
tags: [tstyche, type-tests, flip-sweep, pin-classification, overloads]
phase_base: 4cab2e74afd9487e19d9f025dd7a6436e459ba5c
plan_head_before: eac594bd54b036f29161f57358d5e2401b4c8cb5
plan_head_after: 4aa136c1
requires: [62-02]
provides:
  - 62-FLIP-SWEEP.md (oracle, invocation, tracer run, 87-row sweep: every remaining negative pin fails when flipped)
  - 62-PIN-CLASSIFICATION.md (88 pins classified; overload verdict for the 20 parameter-type subjects)
affects: [62-04, 62-05, 62-06, 62-07, 62-08]
tech-stack:
  added: []
  patterns: ["a flip sweep run through a custom tstyche reporter that reads abilityDiagnostics for the raw TypeScript code"]
key-files:
  created:
    - .planning/phases/QD-62-type-pins-that-can-fail/62-FLIP-SWEEP.md
    - .planning/phases/QD-62-type-pins-that-can-fail/62-PIN-CLASSIFICATION.md
  modified: []
decisions:
  - "The sweep, its reporter and the overload inventory stay scratch scripts outside the repository; the committed record is the evidence"
requirements: [PIN-04, WX-06]
metrics:
  duration: ~25min
  completed: 2026-11-20
status: complete
actuals:
  tokens: 9200
  tasks: 3
  commits: 3
---

# Phase QD-62 Plan 03: Flip sweep and pin classification Summary

All 87 remaining negative pins fail with an allowed TypeScript code when flipped, under `tsconfig.tstyche.json`, and all 88 code pins are classified; exactly one of the 20 parameter-type subjects is overloaded (`askActed`), so 62-04 must write AGENTS.md's last-overload note.

## Sweep

`sweep: 87 flipped pin(s) in 27 file(s), 0 outside the oracle` (exit 0, HEAD `86b80107`, every `SWEEP-PROJECT` line `tsconfig.tstyche.json`).

Code histogram (pins whose diagnostics include the code; S24, S28 and S30 carry one code repeated per arm and count once): TS2322 x33, TS2345 x32, TS2554 x10, TS2353 x5, TS2379 x3, TS2559 x2, TS2375 x2. No code outside the oracle, no `pass`, no missing row, no code 3. The plan-time prediction of "no finding" held.

Tracer: 9 of 9 fail on `Decision.tst.ts` and `WalkEnvironment.tst.ts` (7 constructable, 2 callable). The oracle's pass twin: the reporter on `FloatingEffectPins.tst.ts` reported its four positive pins `pass` and its rule-on negatives with code 3, so the oracle tells a passing pin from a failing one and a language-service code from a TypeScript one.

The tree was as found after every run: no `zz-flip-` file, `git status --porcelain -- packages` empty.

## Classification

88 rows: 75 `plain return`, 12 `Params<F> over an Effect` (`PortAccess` x6, `DiagnosticsStore` x3, `DecisionCache`'s `GetOrCompute` x3), 1 `rewritten (was vacuous)` (`DecisionLog`, base `:30`, now `:34`). All 81 callable and 7 constructable pins have a subject, declared return, form and control. Every pin had a same-file positive control.

## Overloads

`overload inventory: 20 subject(s)`, run on HEAD `1a5e5b4d`: `askActed`, `askCustom`, `askRelationship`, `askSignature`, `DecisionRecord`, `decodeDecisionStream`, `encodeDecisionStream`, `evaluateNode`, `filter`, `filterProjected`, `filterStream`, `filterStreamProjected`, `getOrCompute`, `guard`, `makeDecisionLog`, `ObligationRecord`, `readAttribute`, `route`, `runDiagnostics`, `unwrittenRow`.

- Overloaded: `askActed` only (`PortAccess.ts:414`, two signatures plus a hidden implementation). `Params<typeof askActed>` reads the `ActedLeaf` overload only, so `PortAccess.tst.ts:57`/`:58` say nothing about the `AnyActedLeaf` one.
- The other 19 read as not overloaded (single arrow, `Effect.fn`, curried or class constructor signatures); the verdicts and declarations are in `## Overloads`.
- Outside the inventory: `addGuardedRoute(...)` (S75) is overloaded, but the pin reads the selected overload's returned handler, so nothing is hidden.
- **62-04 must write AGENTS.md's last-overload note** (one subject is overloaded).

Scratch path used: `/private/var/folders/vn/44p0pxgs4z98v7cl11l4_r4c0000gp/T/qd62-sweep` (`SweepReporter.mjs`, `sweep.mjs`, `overload-inventory.mjs`; not committed, outside the repository).

## Deviations from Plan

None - plan executed exactly as written. Two notes that are not deviations: the inventory attributes `DecisionStream.tst.ts:55..67` to both `encodeDecisionStream` and `decodeDecisionStream` because the two file-local `type Options` aliases share a name (recorded in `## Overloads`); and DecisionLog's classification row keeps the base position `:30` as the plan specifies while its control names the current `:33`/`:34`.

## Requirements

PIN-04's classification is satisfied by this plan; per the orchestrator, REQUIREMENTS.md is untouched and the 62-08 sweep closes PIN-*. WX-06 is cross-cutting and untouched.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: 62-FLIP-SWEEP.md, 62-PIN-CLASSIFICATION.md
- FOUND commits 86b80107, 1a5e5b4d, 4aa136c1 (`docs(62-03)`); no commit touches `packages/`
