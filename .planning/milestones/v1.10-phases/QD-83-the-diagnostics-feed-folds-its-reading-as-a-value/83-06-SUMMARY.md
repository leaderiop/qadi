---
phase: QD-83-the-diagnostics-feed-folds-its-reading-as-a-value
plan: 06
subsystem: devtools
tags: [diagnostics, fold, value-tests, identity]
requires:
  - phase: QD-83-the-diagnostics-feed-folds-its-reading-as-a-value
    provides: the four-field Diagnostics reading (plan 05), the renamed module (plan 04), the characterisation and checks (plans 01 to 03)
provides:
  - foldReading, the one pure per-field keep-if-equal fold of the diagnostics reading, with value tests and a root refusal pin
affects: [83-07, 83-08, 83-09, 83-10, 83-11]
phase_base: bc02e8e625eed08227910dfdfd4544ae66ed23ca
plan_head_before: 61dc36603eab37d762b04e4fa65e8bff98947360
plan_head_after: 972fa4a8652e35b873886e250c19e1b2f30b8c24
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
tech-stack:
  added: []
  patterns: [a pure value function declared with `function`, identity decided by sameFields, value tests with no Effect, store or clock]
key-files:
  created: []
  modified:
    - packages/devtools/src/model/Diagnostics.ts
    - packages/devtools/test/model/Diagnostics.test.ts
    - packages/devtools/test/surface.tst.ts
    - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-RED-EVIDENCE.md
key-decisions:
  - "foldReading is a `function` declaration exported from the module only; keep stays private and is called only inside it"
requirements-completed: []
duration: 15min
completed: 2026-11-25
status: complete
---

# Phase 83 Plan 06: The diagnostics reading is folded by one pure per-field law Summary

`foldReading(previous, next)` in `Diagnostics.ts` keeps each field's reference while `Equal.equals` says it is unchanged,
builds the result as a `Diagnostics` object literal naming every field, and returns `previous` itself when `sameFields`
says nothing moved. The store's `accept` is `store.set(foldReading(store.getSnapshot(), next))`; the five-clause `===`
chain is gone.

## What was done

- **Value tests first** (`Diagnostics.test.ts`, `describe("foldReading")`, replacing the store describe): previous itself for a
  structurally equal fresh sample; each field moved alone (table-driven, with a row-per-field check against the keys of a
  fully moved `Diagnostics` literal); five identical folds from `noDiagnostics` change identity once; a first sample equal to
  the empty reading keeps its `wiring` and `activity`; fresh equal copies keep the previous references. Seen red on the base
  (5 failed, `TypeError: foldReading is not a function`; the row-coverage row reads no fold and passes by design), green after.
- **The function and the store** in `Diagnostics.ts`; the module header's fold paragraph restated.
- **Root refusal** (`surface.tst.ts`): a scratch barrel export of `foldReading` made the typecheck fail with
  `TS2578: Unused '@ts-expect-error' directive`; the barrel was restored by `cp` and `git diff --quiet HEAD -- packages/devtools/src`
  held afterwards. Both are recorded in `83-RED-EVIDENCE.md`, `## 83-06 the fold`.

## Verification

Devtools suite 1955 passed; typecheck clean; `pnpm test:tstyche packages/devtools/test` 53 passed in both passes; house style
clean; `83-check.mjs single-fold`, `scan-ids`, `scan-forbidden` pass; `83-pinned-check.mjs --all-applied` holds (6 files at base
text, 2 of 2 born files, 1 of 1 flips).

## Commits

- `97af1461` feat(83-06): the diagnostics reading is folded by one pure per-field law
- `972fa4a8` test(83-06): the root does not export foldReading

## Deviations from Plan

None - plan executed exactly as written. (The store describe's rows about notification, which exercised `store.set`, went with the
describe as the plan states; the characterisation file and the `runDiagnostics` describe still pin the store's publishing.)

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- `foldReading` present in `packages/devtools/src/model/Diagnostics.ts`; both commits are ancestors of HEAD.
