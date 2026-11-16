---
phase: QD-48-audit-reports-core-s-refusal-and-derives-lost
fixed_at: 2026-11-16T03:51:43Z
review_path: .planning/phases/QD-48-audit-reports-core-s-refusal-and-derives-lost/48-REVIEW.md
iteration: 1
findings_in_scope: 9
fixed: 9
skipped: 0
status: all_fixed
---

# Phase QD-48: Code Review Fix Report

**Fixed at:** 2026-11-16T03:51:43Z
**Source review:** .planning/phases/QD-48-audit-reports-core-s-refusal-and-derives-lost/48-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 9 (WR-01, IN-01 to IN-08; scope `--all`)
- Fixed: 9
- Skipped: 0

Verification ran in the main checkout (`workflow.use_worktrees` is `false`).

## Fixed Issues

### WR-01: The 0.13 upgrade entry tells users to log the sentence that INV-QD-104 keeps out of logs

**Files modified:** `apps/website/src/content/docs/docs/reference/upgrading.md`, `.changeset/audit-refusal-is-cores.md`, `spec/behaviors/33-audit-pipeline.md` (Rev 1.23), `spec/decisions/161-audit-reports-cores-refusal-and-decides-lost-once.md` (Rev 1.2), `spec/decisions/056-audit-companion-package.md` (Rev 1.15), `spec/decisions/095-sinkcodec-owns-both-directions.md` (Rev 1.9), `spec/README.md` (Rev 1.211, CCR-QD-439 row)
**Commit:** b054bbdd
**Applied fix:** The After fence's `catchTag` now logs `"audit entry refused"` annotated with `encodeRefusalAnnotations(e)`. That is the set core's `reportEncodeRefusal` puts on the default warning (`qadi.refusal`, `qadi.path`, `evaluationId`), and `@qadi/core` exports it. The `onRefused` example keeps the sentence in an in-process list, with a comment saying it is never logged. The prose now says `describeEncodeRefusal` returns the sentence `reason` held and, like `reason`, may carry caller text (an `EncodeFailed` sentence includes a throwing getter's message). So it is for diagnosis, not a log line or a span, and the prose links INV-QD-104. The same caveat went into the changeset, ADR-QD-161 decision 2, BEH-QD-577's `onRefused` requirement, and the ADR-QD-056 and ADR-QD-095 amendments, all of which gave `describeEncodeRefusal` as the `reason` replacement. The audit README and `capabilities.md` give no such advice, so they are unchanged. BEH-QD-249/250 already carried the caveat.

### IN-01: Refusal dispatch still happens twice, and the `"encodeRefusal"` marker is no longer read by `emit`

**Files modified:** `packages/audit/src/AuditWriteReport.ts`, `packages/audit/test/AuditWriteOutcome.test.ts`, `packages/audit/test/AuditWriteExits.test.ts`
**Commit:** 61aec58f
**Applied fix:** I dropped the marker. `AuditWriteReport` is package-private (it is not in `index.ts` or `spec/overview.md`), and nothing in `src` read the marker. Only `AuditWriteExits.test.ts:178` did. `log` is now `LogLine | undefined`, `Refused`'s report has `log: undefined`, and `logLine` checks `line === undefined`. The module doc now says emit's match is the one place that routes a refusal to core. So "this record is core's to report" is stated once, by `emitWriteOutcome`'s exhaustive match. The per-call `Match.value` stays: AGENTS.md §5a allows it once per record, and its arms close over `options`. `AuditWriteOutcome.test.ts`'s Refused row expects `log: undefined`. `AuditWriteExits.test.ts` now picks the refusal branch by `report.writes === "encode_failed"` and asserts that the projection carries no line there. No spec text named the marker.

### IN-02: The message wording still restates lost-ness outside the row

**Files modified:** `packages/audit/src/AuditWriteReport.ts`, `packages/audit/src/UnwrittenRow.ts` (doc comment), `packages/audit/test/UnwrittenRow.test.ts`, `spec/behaviors/33-audit-pipeline.md` (Rev 1.24), `spec/decisions/161-audit-reports-cores-refusal-and-decides-lost-once.md` (Rev 1.3), `spec/README.md` (Rev 1.212)
**Commit:** 9bbed2ab
**Applied fix:** The wording depends on the row plus the outcome's case: "trail write failed" or "circuit breaker open". The four `DROPPED_*` constants are gone. `unwrittenLine(because, staging)` reads the row:
- A Lost row gives `Warn` and "audit entry dropped: {because} and {LOST_CLAUSE[row.lost]}". `LOST_CLAUSE` is a closed `Record<LostWord, string>`.
- A StagingOnly row gives `Info` and "audit entry not written: {because}; its staged copy is left for reconciliation".

The six arms now pass only the case phrase. All six messages are byte-identical: `AuditWriteOutput.test.ts` passes unchanged. `UnwrittenRow.test.ts`'s D-05a leg now also asserts that the message starts with "audit entry dropped: " exactly when the row is Lost, and with "audit entry not written: " otherwise. BEH-QD-578 and ADR-QD-161 decision 3 now say the row decides the level and the wording. The ADR also narrows its claim: the `qadi_audit_staging_total` label each arm adds, `failed_open` included, records what `stage()` did and is chosen per arm, not read from the row.

### IN-03: ADR-QD-161 still says the behaviours and invariants are "named, not linked"

**Files modified:** `spec/decisions/161-audit-reports-cores-refusal-and-decides-lost-once.md` (Rev 1.4), `spec/README.md` (Rev 1.213)
**Commit:** 65bb2a2d
**Applied fix:** The sentence now says each behaviour and invariant is linked under Related.

### IN-04: INV-QD-341's scope sentence literally includes `Refused`

**Files modified:** `spec/invariants.md` (Rev 1.137), `spec/README.md` (Rev 1.214)
**Commit:** 9f1546ca
**Applied fix:** The opening now reads "For a `WriteFailed` or `Skipped` outcome (the six unwritten leaves)…". It ends by saying that `Refused` has no staging row and is never Lost, though it warns, and links BEH-QD-579 and INV-QD-342.

### IN-05: `AuditWriteOutput.test.ts` asserts that no refusal arrived when no hook is installed, so it cannot fail

**Files modified:** `packages/audit/test/AuditWriteOutput.test.ts`
**Commit:** e09367ae
**Applied fix:** Every non-`Refused` row now runs with `{ onRefused: true }`. `Refused` keeps `false` so it still sees the default warning, and a separate test covers its hook. No expected value changed. To show the assertion can now fail, I made a temporary local edit that called `options.onRefused` from the non-refused arm of `emitWriteOutcome`. The 10 non-Refused rows went red, and I reverted the edit.

### IN-06: The leaf lists the tests loop over are not checked for completeness

**Files modified:** `packages/audit/test/observeLeaf.ts`, `packages/audit/test/AuditWriteOutput.test.ts`, `packages/audit/test/AuditLostAgreement.test.ts`
**Commit:** 5f482fae
**Applied fix:**
- `observeLeaf.ts` exports `LEAF_PATHS`, read off the closed `LEAF_SPECS` record's keys through an `Object.hasOwn` type guard, with no `as`.
- `AuditWriteOutput.test.ts`: the rows are a `BY_LEAF: { [P in LeafPath]: LeafRow & { leaf: P } }`, so the key and the row's `leaf` must agree. `ROWS` is `LEAF_PATHS.map(...)`. Row contents and order are unchanged.
- `AuditLostAgreement.test.ts`: `LOST`, `ALL` and `UNWRITTEN` are replaced by one `LEAVES: { [P in LeafPath]: { lost; unwritten } }`. `ALL` is `LEAF_PATHS`, `UNWRITTEN` is filtered from it, and a new `it` asserts 11 and 6. Expected values are unchanged.

I deleted one entry from each record locally, and each time tsc reported TS2741. Reverted.

### IN-07: `StageResult`'s doc comment does not cite ADR-QD-161

**Files modified:** `packages/audit/src/AuditDecisionSinkLive.ts`
**Commit:** f57dd012
**Applied fix:** I appended "(ARCH-95, ADR-QD-161)" to the why paragraph. The summary line stays first.

### IN-08: `durability(...)` wraps a value that is already typed `Durability`

**Files modified:** `packages/audit/src/AuditWriteOutcome.ts`
**Commit:** eaa0ef15
**Applied fix:** The `WriteFailed` and `Skipped` arms return `unwrittenRow(o.staging).durability` directly. The helper stays for the two literal arms, and its comment now cites `"Trail"` (a literal arm) rather than `"Lost"`.

## Notes

- IN-05, IN-06 and IN-07 were committed as `test(48)`/`docs(48)` rather than `fix(48)`, because they change only tests or a doc comment. The subjects are otherwise in the requested form, and none was rewritten after commit.
- During IN-06, a `git checkout --` that I meant to undo a temporary drop also reverted my uncommitted edit to `AuditLostAgreement.test.ts`. I re-applied the edit before committing, and the committed diff contains only the intended change.

## Checks

- `pnpm exec vitest run --project audit`: 28 files, 526 tests pass. The new IN-06 `it` adds one test to the base's 525.
- `pnpm typecheck`, `pnpm circular` (no cycle), `pnpm test:tstyche` (289 tests, 606 assertions), `pnpm spec:verify:strict` (21 PASS, 0 FAIL), `node scripts/spec-revise.mjs --check`, `pnpm spec:examples` (116 blocks), `pnpm spec:website-examples` (66 blocks) and `pnpm spec:api` (928 exports): all pass.
- `pnpm lint`: house-style clean (526 files). The only warnings are pre-existing ones in files this fix did not touch (`.codex/`, devtools/react tests, `features/`, `scripts/`).

## Mutation

`pnpm exec stryker run stryker.audit.mjs --mutate 'packages/audit/src/AuditWriteReport.ts,packages/audit/src/AuditWriteOutcome.ts,packages/audit/src/AuditDecisionSinkLive.ts,packages/audit/src/UnwrittenRow.ts' < /dev/null`:

| File | Score | Killed | Survived |
| ---- | ----- | ------ | -------- |
| `AuditDecisionSinkLive.ts` | 100 | 49 | 0 |
| `AuditWriteOutcome.ts` | 100 | 2 | 0 |
| `AuditWriteReport.ts` | 100 | 84 | 0 |
| `UnwrittenRow.ts` | 100 | 4 | 0 |

`AuditEntry.ts` was not changed, so it was not re-run.

---

_Fixed: 2026-11-16T03:51:43Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
