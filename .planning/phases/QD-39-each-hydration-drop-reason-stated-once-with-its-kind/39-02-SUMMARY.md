---
phase: QD-39-each-hydration-drop-reason-stated-once-with-its-kind
plan: 02
subsystem: hydration
tags: [hydration, drop-reasons, table, tstyche, type-level]
phase_base: b3b8cdcdb7843944a5795c117b82c8dada530c61
requires: [39-01]
provides:
  - HYDRATION_DROP_TABLE, the one module-private table of the nine drop reasons with their kind and meaning
  - HydrationDropReasonOf<K> and HydrationDropRow, two new public types in @qadi/core
  - the reason unions, hydrationDropReasons, isHydrationDropReason and hydrationDropMeaning derived from the table
  - type-level pins for the kind partition and three checked negatives
affects: [39-03, 39-04, 39-05]
tech-stack:
  added: []
  patterns: [as const satisfies keyed table, kind subset read off the table by a mapped type, own-key guard narrowing Object.keys]
key-files:
  created: []
  modified:
    - packages/core/src/HydrationMetrics.ts
    - packages/core/test/HydrationMetrics.tst.ts
key-decisions:
  - "The second public type is HydrationDropRow, so the kind-less and unknown-kind negatives name the same constraint the table satisfies"
  - "Negatives are checked @ts-expect-error directives, because toRaiseError is deprecated in the installed tstyche 7.2.5"
requirements-completed: [DROP-01, DROP-02, DROP-03, WX-04, WX-06]
duration: ~3 minutes
completed: 2026-11-14
status: complete
commits: 2
plan_head_before: e4d0893c076b670b9e2c629648e4c122a6c916f6
plan_head_after: 56facfa11142177dcfb75083dc666073d91fb192
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
---

# Phase 39 Plan 02: One table of hydration drop reasons, with their kinds Summary

Core now states each hydration drop reason once: a module-private `HYDRATION_DROP_TABLE` (`as const satisfies`) holds the nine reasons in their interleaved order, each row `{ kind, summary, remedy }`, with `MEANINGS` folded in; the three reason unions, `hydrationDropReasons`, `isHydrationDropReason` (`Object.hasOwn`) and `hydrationDropMeaning` all read it with no cast, and a reason without a kind or with a fourth kind fails to compile.

## Task commits

| Task | Commit | Files |
| ---- | ------ | ----- |
| 1 refactor | `622c24d2` | packages/core/src/HydrationMetrics.ts |
| 2 test | `56facfa1` | packages/core/test/HydrationMetrics.tst.ts |

## Verification results

- First verify (Task 1, source shape): printed OK. Table keys are the nine in D-01 order; kinds dehydration (ForeignSubject, UnencodablePolicy), payload (PayloadSubjectMismatch, UnsupportedPayloadVersion, MalformedPayload, PayloadTooDeep), entry (MalformedEntry, UndecodablePolicy, EntryTooDeep); every summary and remedy equal to the base's `MEANINGS` row; zero reason string literals in code (18 at the base); each reason a table key once; the order is table, guard, list, metric; all five metric declarations byte-identical; exports are the base's plus `HydrationDropRow` and `HydrationDropReasonOf`; no cast, `any`, `switch`, `Record<string, unknown>` or `Struct.keys`.
- Second verify (the characterisation, run unedited): core `HydrationMetrics.test.ts` 25 of 25 green, devtools `Hydration.test.ts` 15 of 15, react 8 hydration and signal files, all green; nothing under react, devtools, examples or core tests changed since `d84cc614`.
- Third verify: `pnpm typecheck`, `pnpm lint` (`house-style: 496 file(s) clean (3 declared switch(es))`), `pnpm circular`, `pnpm test:tstyche` and `pnpm run build` all exit 0. The emitted `packages/core/lib/HydrationMetrics.d.ts` contains `export type HydrationDropReasonOf<` and `export interface HydrationDropRow extends HydrationDropMeaning` and does not export the table.
- tstyche `pnpm exec tstyche HydrationMetrics.tst`: `Tests: 9 passed, 9 total`, `Assertions: 22 passed, 22 total`, `Suppressed: 3 matched, 3 total`. Full run after Task 2: `Tests: 266 passed`, `Assertions: 537 passed`, `Suppressed: 31 matched, 31 total`.
- The two mechanical negatives against the real table (`tsc -p tsconfig.test.json`), file restored after each:
  - a kind-less row: `packages/core/src/HydrationMetrics.ts TS2741` (and a consequent `TS2536` from the kind subset reading `["kind"]` off the bad row)
  - a row with `kind: "other"`: `packages/core/src/HydrationMetrics.ts TS2322`
  - `git status --porcelain -- packages/core/src/HydrationMetrics.ts` empty afterwards.
- Gate 13 (`pnpm spec:api`) was not run: it is red until 39-04 names the two new types in `spec/overview.md`.

## Deviations from Plan

### Auto-fixed Issues

None. One substitution the plan itself asked for: `toRaiseError` is deprecated in tstyche 7.2.5, so the three negatives are `// @ts-expect-error <fragment>` directives (`does not satisfy the constraint`, `is not assignable to type`, `is missing in type`), checked by tstyche (`Suppressed: 3 matched`).

Observation for the record, not a defect: a kind-less row in the real table reports `TS2741` as the plan expects, plus one `TS2536` where `HydrationDropReasonOf` indexes `["kind"]` on the bad row; the mechanical check looks for the `TS2741` at `HydrationMetrics.ts` and passes.

`pnpm lint` prints one pre-existing oxlint warning in `scripts/check-house-style.mjs:888` (`prefer-string-starts-ends-with`); out of scope, not touched.

Commit trailer: the plan and dispatch brief name `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, which both commits carry; followed as the plan states, as in 39-01.

**Total deviations:** 0 auto-fixed. **Impact:** none.

## Known Stubs

None.

## Threat Flags

None. T-39-03 (inherited key accepted by the guard) is mitigated by `Object.hasOwn` and the 39-01 inherited-name case, still green; T-39-04 (metric key space) by the closed table and the byte-identical metric declarations.

## Notes for the next plans

- `hydrationDropMeaning` now returns the row, so the returned object carries a `kind` field at run time while its type stays `HydrationDropMeaning`; 39-04's changeset should say so (no Breaking marker).
- React's `PayloadRefusalReason` and `EntryDropReason` still restate their literal groups and compile against the unchanged union; 39-03 derives them from `HydrationDropReasonOf`.

## Self-Check: PASSED

- `packages/core/src/HydrationMetrics.ts`, `packages/core/test/HydrationMetrics.tst.ts` and this file exist.
- Commits `622c24d2` and `56facfa1` are ancestors of HEAD; `git rev-list --count` from `plan_head_before` is 2.
