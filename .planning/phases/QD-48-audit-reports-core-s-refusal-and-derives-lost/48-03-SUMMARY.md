---
phase: QD-48-audit-reports-core-s-refusal-and-derives-lost
plan: 03
subsystem: audit
tags: [refusal, breaking, tracer, tstyche, arch-95]
phase_base: c9fde4ba08f8cb8b4bfd5a230616f026f2a49eaa
requires: [48-02]
provides:
  - "AuditRefusal.tst.ts: four type pins that audit's refusal is core's SinkRecordNotEncodable"
  - "encodeAuditEntry, both onRefused hooks and AuditWriteOutcome.Refused typed with core's SinkRecordNotEncodable"
  - "the audit refusal class deleted with no alias; overview row dropped, two rows amended; CCR-QD-439 started"
affects: [48-04, 48-05, 48-06, 48-07, 48-08]
key-files:
  created:
    - packages/audit/test/AuditRefusal.tst.ts
  modified:
    - packages/audit/src/AuditEntry.ts
    - packages/audit/src/AuditWriteOutcome.ts
    - packages/audit/src/AuditWriteReport.ts
    - packages/audit/src/AuditDecisionSinkLive.ts
    - packages/audit/src/AuditTrailPort.ts
    - packages/core/src/JsonRefusal.ts
    - packages/audit/test/AuditEntry.test.ts
    - packages/audit/test/AuditDecisionSinkLive.test.ts
    - packages/audit/test/AuditWriteOutcome.test.ts
    - spec/overview.md
    - spec/README.md
decisions:
  - "D-01/D-02: the audit refusal class is deleted with no alias; encodeAuditEntry is one fromResult of encodeSinkRecord (one-way, user decision already made, recorded Breaking in 48-06)"
status: complete
plan_head_before: 24c61b2c72945fc76345d2d4da1527c1ae0852b2
plan_head_after: afe4cfb79b6dc19efa9c481a02d7ea15de524699
commits: 3
actuals:
  tokens: 9000
  tasks: 3
  commits: 3
---

# Phase QD-48 Plan 03: Audit reports core's refusal Summary

**`@qadi/audit` now hands over core's `SinkRecordNotEncodable` from `encodeAuditEntry`, both `onRefused` hooks and `AuditWriteOutcome.Refused`; the audit copy of the class is deleted with no alias, and every line, annotation and counter is byte-identical (48-02's 31 rows pass unedited).**

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | c6a925b7 | test(48-03): audit's refusal is core's SinkRecordNotEncodable at the type level (RED) |
| 2 | 849050ae | feat(48-03): audit reports core's SinkRecordNotEncodable (tracer) |
| 3 | afe4cfb7 | feat(48-03): delete the audit refusal class; the overview drops it and CCR-QD-439 is started |

## RED before the retype

Task 1, on the phase base (`git diff <phase_base> -- packages/audit/src packages/core/src` empty), `pnpm exec tstyche packages/audit/test/AuditRefusal.tst.ts`:

```
uses TypeScript 6.0.3 with ./tsconfig.test.json
fail ./packages/audit/test/AuditRefusal.tst.ts
  × onRefused takes core's SinkRecordNotEncodable
  × the emit options' onRefused takes it too
  × Refused carries it
  × encodeAuditEntry fails with it
Error: Type 'AuditEntryNotEncodable' is not the same as type 'SinkRecordNotEncodable'.   (x4)
Targets:    1 failed, 1 total
Test files: 1 failed, 1 total
Tests:      4 failed, 4 total
Assertions: 4 failed, 4 total
```

`tsc -p tsconfig.test.json` and `pnpm lint` were clean with the pin in place.

Task 2, tests edited, src not yet retyped, `pnpm exec tsc -p tsconfig.test.json` (first lines):

```
packages/audit/test/AuditDecisionSinkLive.test.ts(516,87): error TS2379: Argument of type 'AuditEntryNotEncodable' is not assignable to parameter of type 'SinkRecordNotEncodable' with 'exactOptionalPropertyTypes: true'.
  Types of property '_tag' are incompatible.
    Type '"AuditEntryNotEncodable"' is not assignable to type '"SinkRecordNotEncodable"'.
packages/audit/test/AuditDecisionSinkLive.test.ts(516,87): error TS377003: Missing errors AuditEntryNotEncodable in the expected Effect type.
packages/audit/test/AuditDecisionSinkLive.test.ts(707,74): error TS2379: ...
```

## Green after

- tstyche pin: `Tests: 4 passed, 4 total`; whole `pnpm test:tstyche`: 285 passed.
- Audit project 27 files / 510 tests, core project 72 files / 2412 tests, all passing after Task 2 and after Task 3. The five touched/characterisation files together: 140 tests (AuditEntry, AuditDecisionSinkLive, AuditWriteOutcome, AuditWriteOutput 12 rows, AuditLostAgreement 19 rows).
- Gate 13 (`pnpm spec:api`): before the deletion (after Task 2) `929 export(s) documented across 9 package(s)`; after Task 3 `928 export(s)`, one fewer, no `[stale]` or `[missing]`. `pnpm spec:verify:strict`: `PASS: 21   FAIL: 0   SKIP: 0`.
- `pnpm typecheck`, `pnpm lint` (house-style 524 files clean), `pnpm circular` exit 0 after Task 2 and Task 3.
- `observeLeaf.ts`, `AuditWriteOutput.test.ts`, `AuditLostAgreement.test.ts` have no diff since 48-02's last commit.
- Core's only src change since `phase_base` is the `JsonRefusal.ts` doc comment; no changeset added.

## Deviations from Plan

**1. [Ordering, no behaviour change] Module-doc ADR-QD-054 sentence reworded in Task 2, not Task 3.** While rewriting `AuditEntry.ts` for the tracer the module doc's last sentence was reworded to the Task 3 text. Task 3 still deleted the class, its doc and the `Data` / `EncodeRefusal` imports; `describeEncodeRefusal` was dropped from the value import in Task 2 (the class used it only in its doc). Not a gate or evidence change.

**2. [Verify tooling] The Task 1 RED-run verify's `grep "Tests: +4 failed"` does not match tstyche's colored output when piped through `$(...)`.** The failure was confirmed with `NO_COLOR=1` (the output above); the plan's intent (4 failed, type mismatches) is met.

No `reason`-dependent hook-payload assertion was changed beyond the plan's own edits in `AuditDecisionSinkLive.test.ts` (now `describeEncodeRefusal(first.refusal)` plus `Object.hasOwn(first, "reason") === false`).

## Reversibility

Deleting `AuditEntryNotEncodable` is **one-way**: a published `@qadi/audit` export and `onRefused` payload type change with no alias (D-01, D-02, user decision already made; Breaking recorded by 48-06).

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- `packages/audit/test/AuditRefusal.tst.ts` exists; commits c6a925b7, 849050ae, afe4cfb7 are ancestors of HEAD, each ending with the trailer.
- No file under `packages/*/src` or `packages/*/test` names the deleted class (`git grep` exit 1).
