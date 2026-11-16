---
phase: QD-48-audit-reports-core-s-refusal-and-derives-lost
plan: 02
subsystem: audit
tags: [characterisation, agreement-table, tdd, wx-06]
phase_base: c9fde4ba08f8cb8b4bfd5a230616f026f2a49eaa
requires: [48-01]
provides:
  - "observeLeaf.ts: the leaf driver reporting lines, causes, span, thirteen counters and hook payload for the target record"
  - "AuditWriteOutput.test.ts: the eleven-leaf characterisation plus the hooked refusal, as literals, green on the base"
  - "AuditLostAgreement.test.ts: the D-06/D-06a agreement table, green on the base"
affects: [48-03, 48-04, 48-05, 48-08]
key-files:
  created:
    - packages/audit/test/observeLeaf.ts
    - packages/audit/test/AuditWriteOutput.test.ts
    - packages/audit/test/AuditLostAgreement.test.ts
status: complete
plan_head_before: e9b7483f674b23e045438aa3ce472076617c4bca
plan_head_after: 4ac286ba8109b71518513c9950687476209cf280
commits: 3
actuals:
  tokens: 5800
  tasks: 3
  commits: 3
---

# Phase QD-48 Plan 02: Characterise audit's output on the base Summary

**Everything audit emits for each of its eleven outcome leaves, and the refusal hook's surviving payload fields, is pinned as literals on the untouched base, and the base's `:240` cause gap is now killed.**

## What was built

- `packages/audit/test/observeLeaf.ts` drives the real `AuditDecisionSinkLive` through one named leaf over `AuditTrailPortTest`, `AuditStagingPortTest` and `AuditPortReply` scripts. For the target record alone it returns every line's level, message, annotations and cause, the last `qadi.audit.record` span's attributes, the delta of all thirteen counter series read through `Metric.value(<export>)`, and what `onOutcome` and `onRefused` received. It names a leaf's path from the value's own tags and imports only the three counter exports from `AuditWriteReport.ts`.
- `AuditWriteOutput.test.ts` (12 rows): one table of eleven literal rows plus the hooked-refusal row.
- `AuditLostAgreement.test.ts` (19 rows): durability, lost counter and span agree on all eleven leaves (11), warning equals lost over the six unwritten leaves (6), and `Written.CommitFailed` and `Refused` named as warning without being lost (2).

## Base output

Every row passed on the base exactly as RESEARCH Q3 recorded it; no row needed correcting. Observed per leaf (target record only, counters are deltas, every line's annotations `{ evaluationId: "target" }` unless stated):

| Leaf | Line | Span durability | Counters moved | stagingKeys | rows |
|---|---|---|---|---|---|
| `Refused` | `Warn`, "qadi/audit: a decision record could not be encoded for the audit trail; no row was written", annotations `{ "qadi.refusal": "Opaque", "qadi.path": "resource.tags", evaluationId }` | Refused | `writes.encode_failed` | `[]` | 0 |
| `Written.NotWired` | none | Trail | `writes.written` | `_tag` | 1 |
| `Written.StageFailed` | none | Trail | `writes.written`, `staging.failed` | `_tag` | 1 |
| `Written.Committed` | none | Trail | `writes.written`, `staging.staged` | `_tag` | 1 |
| `Written.CommitFailed` | `Warn`, "audit staging commit failed: entry is durable in the trail, ..." with cause `AuditStagingError` (`cause` "commit offline") | Trail | `writes.written`, `staging.staged`, `staging.commit_failed` | `_tag`, `cause` | 1 |
| `WriteFailed.NotWired` | `Warn`, "audit entry dropped: trail write failed and no staging port wired" | Lost | `writes.write_failed`, `lost.write_failed.not_wired` | `_tag` | 0 |
| `WriteFailed.Staged` | `Info`, "audit entry not written: trail write failed; its staged copy is left for reconciliation" | StagingOnly | `writes.write_failed`, `staging.staged` | `_tag` | 0 |
| `WriteFailed.StageFailed` | `Warn`, "audit entry dropped: trail write failed and staging failed" | Lost | `writes.write_failed`, `staging.failed`, `lost.write_failed.failed` | `_tag` | 0 |
| `Skipped.NotWired` | `Warn`, "audit entry dropped: circuit breaker open and no staging port wired" | Lost | `writes.skipped_open`, `staging.skipped_open`, `lost.skipped_open.not_wired` | `_tag` | 0 |
| `Skipped.Staged` | `Info`, "audit entry not written: circuit breaker open; its staged copy is left for reconciliation" | StagingOnly | `writes.skipped_open`, `staging.staged` | `_tag` | 0 |
| `Skipped.StageFailed` | `Warn`, "audit entry dropped: circuit breaker open and staging failed" | Lost | `writes.skipped_open`, `staging.failed_open`, `lost.skipped_open.failed` | `_tag` | 0 |

`Refused` with `onRefused`: no line, `writes.encode_failed` 1, the hook received one payload that is an `Error`, with `recordTag` `Decision`, `evaluationId` `target` and `refusal` deep-equal `EncodeRefusal.Opaque({ path: ["resource", "tags"], kind: "Set", brand: "Set" })`. Its `_tag` and `reason` are deliberately not asserted (both change by design in 48-03).

Test counts on the base (src equal to `phase_base`): `AuditWriteOutput.test.ts` `Tests  12 passed (12)`; with `AuditLostAgreement.test.ts` `Tests  31 passed (31)`; the whole audit project `Tests  510 passed (510)`, 27 files.

## The commit cause is observable

The cause-gap mutant (`AuditWriteReport.ts:240:43`, `cause === undefined` forced to `true`) survived at the base (48-01). With `AuditWriteOutput.test.ts` present, one Stryker run of `AuditWriteReport.ts` only (evidence; `48-mutation-base.json` untouched, no src edit):

`pnpm exec stryker run stryker.audit.mjs --mutate 'packages/audit/src/AuditWriteReport.ts' < /dev/null` exit 0, 86 killed, 2 survived, score 97.73 (base 85/88, 96.59).

```
survivor 238:57 StringLiteral
survivor 238:42 ConditionalExpression
no mutant survives on line 240 (the commit cause)
```

The two remaining survivors are the base's two equivalent `:238` mutants on `report.log !== "encodeRefusal"`, unchanged.

## Task Commits

1. Task 1 (tracer): `9d948867` test(48-02): observe one audit outcome leaf end to end on the phase base (tracer)
2. Task 2: `6c741117` test(48-02): pin every audit outcome leaf's lines, causes, span and counters on the phase base
3. Task 3: `4ac286ba` test(48-02): durability, the lost counter, the span and the warning agree on every leaf

Each ends with the `Co-Authored-By` trailer and carries only its files. `git diff c9fde4ba -- packages/audit/src packages/core/src packages/testing/src` is empty.

## Deviations from Plan

None - plan executed exactly as written. One typing detail only: `LeafRow.lines` is `Array<Line>` rather than `ReadonlyArray` because `assert.deepStrictEqual` wants a mutable expected value.

## Known Stubs

None.

## Threat Flags

None. Test-only change; no `packages/*/src`, manifest or lockfile touched.

## Self-Check: PASSED

- `observeLeaf.ts`, `AuditWriteOutput.test.ts`, `AuditLostAgreement.test.ts`: FOUND.
- Commits `9d948867`, `6c741117`, `4ac286ba`: FOUND, in order after `chore(48-01)`.
- `tsc -p tsconfig.test.json` and `pnpm lint` exit 0; the three tasks' verifies pass; `git rev-list --count` from `plan_head_before` is 3.
