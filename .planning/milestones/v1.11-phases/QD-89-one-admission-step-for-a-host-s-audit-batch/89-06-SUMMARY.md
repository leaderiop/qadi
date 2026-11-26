---
phase: QD-89-one-admission-step-for-a-host-s-audit-batch
plan: 06
subsystem: audit
tags: [audit, retention, admission-step, read-once]

phase_base: 8ee14f6f703f3121d44d15a1515d02eff62ca63f
plan_head_before: 8472d98267575c71f55e88063b3243743e4a88eb
plan_head_after: c141f446e480025bb69cb6f4c4139f92cb857f54
commits: 2
status: complete

requires:
  - phase: QD-89-one-admission-step-for-a-host-s-audit-batch
    provides: packages/audit/src/HostBatch.ts (admitBatch, NowRefusalCases, AdmittedBatch), plan 05
provides:
  - planRetention and planPurge each admit their batch through the step as their first statement
  - RetentionInputRefusal stated over the two shared fragments, members and constructors unchanged
  - module-private maxAgeOf (one read of the policy) and ageRule (one rule over an admitted batch)
affects: [QD-89 plans 07 to 11]

requirements-completed: []

actuals:
  tokens: 14000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "the terms read is a thunk handed to the step, so the policy is read only for a finite now and once"
    - "one age rule over an admitted batch, comparing with the number the terms check admitted"
    - "the purge's archive pass runs over the admitted rows, never over the list given"

key-files:
  created:
    - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-06-SUMMARY.md
  modified:
    - packages/audit/src/Retention.ts

key-decisions:
  - "A null or undefined policy is read as policy?.maxAgeMs, so it reaches the same MaxAgeInvalid { value: undefined } a missing limit does; the optional chain compiles and lints on the declared non-nullable type, so the Predicate.isObject fallback was not needed."
  - "planPurge runs ageRule over its own admitted batch and does not call planRetention, so the archive is asked only after the step admitted the batch and the pass reads the admitted rows."
---

# Phase 89 Plan 06: Retention through the admission step Summary

**`planRetention` and `planPurge` each open with `admitBatch({ now, terms: () => maxAgeOf(policy), entries })`, share one module-private age rule over the admitted batch, and read `maxAgeMs` once; `RetentionInputRefusal` is stated over `RowsRefusalCases & NowRefusalCases & { MaxAgeInvalid }` with its own constructors, so every tag and field is unchanged.**

## Performance

- **Completed:** 2026-11-26T03:21Z (start time not captured; about 10 minutes); **Tasks:** 2 (one tracer, one auto); two task commits plus the summary commit
- **Files:** 1 source file modified (`packages/audit/src/Retention.ts`), this summary created

## Accomplishments

- **Tracer (Task 1, `ef009ff0`):** `RetentionInputRefusal` over the two fragments (no `NowNotFinite:` member key, no `rowsRefusal` import); `maxAgeOf` reads `policy?.maxAgeMs` once and refuses `NaN`, a negative or an absent value as `MaxAgeInvalid { value }`, keeping `+Infinity`, `0` and `-0` valid; `ageRule(batch: AdmittedBatch<number>)` is the base loop comparing with the admitted number; `planRetention`'s first statement is the step. Its verify passed end to end before Task 2 began (B1, B5, B8 and B12 green).
- **Task 2 (`c141f446`):** `planPurge`'s first statement is the step; a refusal returns before the archive is asked; on success it runs `ageRule`, builds the `expired` set from that plan and makes the base archive pass over `admitted.success.rows.entries`. It does not call `planRetention`. The module doc and the `planRetention` and `planPurge` doc comments say the step in `HostBatch.ts` admits each batch and restate no order.

## Rows that remain red

`node 89-check.mjs suite ... --passing B1 B2 B3 B4 B5 B8 B9 B12 B13` passes: every retention row is green and the four failing rows are red-before rows of the archive entry points, left for plan 07: **B6, B7, B10, B11** (the writer and the sequence check). The vitest run is 726 rows in 34 files, 4 failed.

## Task Commits

1. Task 1 (tracer): `ef009ff0` `refactor(89-06): plan retention over the admitted batch` (`Retention.ts` only)
2. Task 2: `c141f446` `refactor(89-06): plan the purge over its own admitted batch` (`Retention.ts` only)

## Deviations from Plan

### Auto-fixed Issues

None.

### Plan notes (choices the plan left open)

- **The plan commit ledger (protocol 0c) was not created before the first commit.** `plan_head_before` is the HEAD at the start of the plan, `8472d982` (the last commit of plan 05), and `commits: 2` is `git rev-list --count 8472d982..HEAD` taken before the summary commit, as plan 05 did.
- **The `<verify>` texts were run from script files** (`bash <file>`), as the brief asks, rather than as the inline `bash -c '...'` form the plan prints. The Task 1 script is the plan's text verbatim and printed its marker; for Task 2 the same checks were run as separate commands (commit, `entry-points-first planRetention planPurge`, vitest and `suite --passing`, tsc, madge, house style, the `HostBatch.ts` grep, the summary file) and then as the plan's script once this file existed.
- **`maxAgeOf`'s return type** names the member constructor's return type, `ReturnType<typeof RetentionInputRefusal.MaxAgeInvalid>`, so `admitBatch` infers `Refused` and the step's union stays assignable to `RetentionInputRefusal`.

### Auth gates

None.

## Issues Encountered

None. The audit suite stays red by design (B6, B7, B10, B11) until plan 07 lands.

## Next Phase Readiness

- Plan 07 wires `archiveAuditTrail` and `verifySequenceIntegrity` (and `ArchiveInputRefusal`, `verifiedArchiveFacts(rows: AdmittedRows)`) through the step; that turns B6, B7, B10 and B11 green.

## Known Stubs

None.

## Threat Flags

None. T-89-16 is mitigated by `maxAgeOf` reading the policy once and `ageRule` using the checked number (B1, B2, B3); T-89-17 by `policy?.maxAgeMs` and `MaxAgeInvalid { value: undefined }` (B4, B5); T-89-18 because the purge pass reads `admitted.success.rows.entries` (B9, B13).

## Self-Check: PASSED

- `packages/audit/src/Retention.ts` and this summary exist; `ef009ff0` and `c141f446` are ancestors of HEAD.
- Task 1 verify (`verify-89-06-t1.sh`): printed its marker, exit 0 (commit shape, `entry-points-first planRetention`, no `NowNotFinite:` member, vitest and `suite --passing B1 B5 B8 B12`, tsc, `pnpm circular`, house style).
- Task 2 checks: `entry-points-first planRetention planPurge` reports both admit first and `planPurge` does not call `planRetention`; `suite --passing B1 B2 B3 B4 B5 B8 B9 B12 B13` reports 4 failing rows, each red before; tsc and oxlint clean.
