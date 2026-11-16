---
phase: QD-48-audit-reports-core-s-refusal-and-derives-lost
plan: 04
subsystem: audit
tags: [lost, durability, row, tracer, tstyche, arch-95]
phase_base: c9fde4ba08f8cb8b4bfd5a230616f026f2a49eaa
requires: [48-03]
provides:
  - "UnwrittenRow.ts (package-private): LostWord, UnwrittenRow, UnwrittenTag, unwrittenRow"
  - "durabilityOf, the lost label and the unwritten line's level all read the row"
  - "unwrittenDurability, lostStaging, lostWord, warning, info deleted"
affects: [48-05, 48-06, 48-07, 48-08]
key-files:
  created:
    - packages/audit/src/UnwrittenRow.ts
    - packages/audit/test/UnwrittenRow.test.ts
    - packages/audit/test/UnwrittenRow.tst.ts
  modified:
    - packages/audit/src/AuditWriteOutcome.ts
    - packages/audit/src/AuditWriteReport.ts
decisions:
  - "D-05/D-05a: one closed row per unwritten staging decides lost-ness; the row's tags are declared structurally in a leaf so it never imports AuditWriteOutcome.ts (no madge cycle)"
status: complete
plan_head_before: ab9095b652bc76033fbdbf32b6e7ec1f16a300ca
plan_head_after: bf899fcedafe1eebe42bfe72ebb430b25cfa8695
commits: 2
actuals:
  tokens: 8000
  tasks: 2
  commits: 2
---

# Phase QD-48 Plan 04: One row decides "lost" Summary

One package-private row per unwritten staging (`NotWired` -> Lost `not_wired`, `Staged` -> StagingOnly, `StageFailed` -> Lost `failed`) now decides the span's durability, the lost-entry counter's label and the unwritten log line's level; the three restated mappings are deleted.

## RED before the row

`pnpm exec tsc -p tsconfig.test.json` before `UnwrittenRow.ts` existed:

```
packages/audit/test/UnwrittenRow.test.ts(14,30): error TS2307: Cannot find module '../src/UnwrittenRow.ts' or its corresponding type declarations.
```

Task 2's six level rows and the four tstyche pins already passed on the Task 1 tree; they guard the refactor and are not a RED (none could fail on the per-arm literals).

## Results

- Task 1 (`005cc58f`): `UnwrittenRow.test.ts` `Tests 9 passed (9)`; 48-02 files + `AuditWriteOutcome`, `AuditWriteExits`, `Metrics` tests `108 passed (108)` unedited; `pnpm typecheck`, `lint`, `circular`, `spec:api`, `test:tstyche`, audit project (28 files, 519 tests) all exit 0.
- Task 2 (`bf899fce`): `UnwrittenRow.test.ts` + `AuditWriteOutput.test.ts` + `AuditLostAgreement.test.ts` `Tests 46 passed (46)`; `UnwrittenRow.tst.ts` `Tests: 4 passed, 4 total`; typecheck, lint, circular, tstyche, audit project exit 0; `observeLeaf.ts`, `AuditWriteOutput.test.ts`, `AuditLostAgreement.test.ts` unedited.
- `pnpm circular`: `Processed 229 files (2.1s) (68 warnings)` / `No circular dependency found!`.
- `UnwrittenRow.ts` imports only `effect/Match`; not in `index.ts`; `pnpm spec:api` unchanged. Six arms call `unwrittenLine`; the one literal level left is `Written.CommitFailed`'s `Warn`.

## Deviations from Plan

None - plan executed as written. (The Task 1 tests use `as const` on two fixture tables; lint/house-style accepted it.)

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: packages/audit/src/UnwrittenRow.ts, packages/audit/test/UnwrittenRow.test.ts, packages/audit/test/UnwrittenRow.tst.ts
- FOUND commits: 005cc58f, bf899fce
