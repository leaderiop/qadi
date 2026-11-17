---
phase: QD-48-audit-reports-core-s-refusal-and-derives-lost
reviewed: 2026-11-16T04:06:33Z
depth: standard
iteration: 3
files_reviewed: 31
files_reviewed_list:
  - .changeset/audit-refusal-is-cores.md
  - apps/website/src/content/docs/docs/packages/audit/capabilities.md
  - apps/website/src/content/docs/docs/reference/upgrading.md
  - packages/audit/README.md
  - packages/audit/src/AuditDecisionSinkLive.ts
  - packages/audit/src/AuditEntry.ts
  - packages/audit/src/AuditTrailPort.ts
  - packages/audit/src/AuditWriteOutcome.ts
  - packages/audit/src/AuditWriteReport.ts
  - packages/audit/src/UnwrittenRow.ts
  - packages/audit/test/AuditDecisionSinkLive.test.ts
  - packages/audit/test/AuditEntry.test.ts
  - packages/audit/test/AuditLostAgreement.test.ts
  - packages/audit/test/AuditRefusal.tst.ts
  - packages/audit/test/AuditWriteExits.test.ts
  - packages/audit/test/AuditWriteOutcome.test.ts
  - packages/audit/test/AuditWriteOutput.test.ts
  - packages/audit/test/UnwrittenRow.test.ts
  - packages/audit/test/UnwrittenRow.tst.ts
  - packages/audit/test/observeLeaf.ts
  - packages/core/src/JsonRefusal.ts
  - spec/README.md
  - spec/behaviors/33-audit-pipeline.md
  - spec/decisions/056-audit-companion-package.md
  - spec/decisions/095-sinkcodec-owns-both-directions.md
  - spec/decisions/161-audit-reports-cores-refusal-and-decides-lost-once.md
  - spec/decisions/index.yaml
  - spec/invariants.md
  - spec/overview.md
  - spec/traceability.md
  - packages/core/src/EncodeRefusalReport.ts
findings:
  critical: 0
  warning: 0
  info: 3
  total: 3
  necessity: 0
status: issues_found
---

# Phase QD-48: Code Review Report (iteration 3)

**Reviewed:** 2026-11-16T04:06:33Z
**Depth:** standard
**Files Reviewed:** 31
**Status:** issues_found

## Summary

**Scope:**
- The iteration-2 fixes (`git diff 3186d875..HEAD`, commits `1d7ff083..7ff85185`).
- The iteration-1 fixes (`0a724d3c..HEAD`).
- The whole non-planning phase diff (`c9fde4ba..b7c62f34`).

`EncodeRefusalReport.ts` was read as a callee only; it is not changed in the phase.

**Checks run:**
- `vitest --project audit`: 28 files, 526 passed.
- `check-house-style.mjs`: 526 files clean.

I read `necessity-review.md`. None of the findings is a necessity finding.

**Iteration-2 fixes, checked against the source:**

- **WR-01 (both configurations pinned).**
  - `assertRow` holds every observation to the same row literals. Each leaf runs first with `{ onRefused: false }`, then every non-`Refused` leaf runs again with `{ onRefused: true }` (`AuditWriteOutput.test.ts:210-219`).
  - `git diff 6c741117..HEAD` on the file shows every expected literal unchanged since the base characterisation: messages, annotations, span, counters, `stagingKeys`, `rows`, the commit cause and the `Refused` hook payload. The diff only re-keys `ROWS` as `BY_LEAF` and adds the hooked run.
  - Each `observeLeaf` call builds a fresh layer, logger and tracer under `isolatedMetrics` and measures counter deltas, so the second run cannot see the first run's output.
  - The empty `refusals` check in the hooked run can now fail.
  - ADR-QD-161's reworded Consequences match the file's history.
- **IN-01.** `UnwrittenRow.test.ts:65-66` and `AuditWriteOutcome.test.ts:204` narrow with `undefined`. No `typeof log === "object"` is left.
- **IN-02.** The `durabilityOf` doc comment now says "level and wording".
- **IN-03.** Four places now state the `qadi.path` residue:
  - the 0.13 upgrade prose;
  - the changeset;
  - ADR-QD-161 decision 2;
  - BEH-QD-577.

  The wording matches `encodeRefusalAnnotations`'s doc (`JsonRefusal.ts:118-119`) and INV-QD-104's Implication, which calls it "the one residue". The ADR-QD-056 and ADR-QD-095 amendments make no claim about what the annotations carry, so leaving them alone is consistent.

**Byte-identical output, re-derived from the source diff:**
- The six unwritten messages built by `unwrittenLine` + `LOST_CLAUSE` equal the deleted constants and template strings character for character. The levels are unchanged.
- `outcomePath` and `evaluationIdOf` return the same strings as the old ternaries.
- `Refused` still reaches only `reportEncodeRefusal`, with the same message and the same `{ refusal, evaluationId }` values for its annotations.
- `logLine` logs exactly when the base's `typeof … === "object"` branch did.

**Upgrade fence (WR-01 of iteration 1).**
- `encodeRefusalAnnotations` takes `{ refusal; evaluationId }` and returns exactly the three keys `reportEncodeRefusal` applies (`EncodeRefusalReport.ts:37`).
- The `describeEncodeRefusal` caveat matches `JsonRefusal.ts:144-155` and INV-QD-104.
- The same caveat appears, consistently, in the changeset, ADR-QD-161, the ADR-QD-056 and ADR-QD-095 amendments and BEH-QD-577.

**INV-QD-341.** Its scope ("for a `WriteFailed` or `Skipped` outcome (the six unwritten leaves)… `Refused` has no staging row and is never Lost, though it warns") agrees with BEH-QD-579's three requirements and with INV-QD-342.

**IN-06 (closed leaf lists).** `LEAF_PATHS` is `Object.keys(LEAF_SPECS).filter(isLeafPath)`, with an `Object.hasOwn` predicate and no `as`. `BY_LEAF` and `LEAVES` are mapped over `LeafPath`, so each list is closed.

No source-code defect was found. The three remaining items are documentation that no longer matches the code or the tests.

## Info

### IN-01: The CCR-QD-439 row says the two characterisation files "stay unedited across the phase", and its file list omits `AuditWriteExits.test.ts`

**File:** `spec/README.md:376`
**Issue:** The row's narrative says: "48-02's characterisation of every leaf's output (`AuditWriteOutput.test.ts`) and the agreement … (`AuditLostAgreement.test.ts`) were written on the phase base and stay unedited across the phase."

`git log` contradicts this:
- `AuditWriteOutput.test.ts` was edited at `e09367ae`, `5f482fae` and `1d7ff083`.
- `AuditLostAgreement.test.ts` was edited at `5f482fae` (the switch to `LEAF_PATHS` and the `LEAVES` record).

Iteration 2's WR-01 corrected the same over-claim in ADR-QD-161's Consequences (Rev 1.5) but left this sentence. The row also lists every phase test file except `packages/audit/test/AuditWriteExits.test.ts`, which the phase changed (the `"encodeRefusal"` marker branch was rewritten).
**Fix:** Reword the sentence to match ADR-QD-161 Rev 1.5: "…were written on the phase base; their expected values are unchanged across the phase, and later commits only added the hooked run and closed the leaf lists." Add `packages/audit/test/AuditWriteExits.test.ts` to the file list.

### IN-02: The overview's `durabilityOf` row still names the line's level, not its wording, as a reader of the row

**File:** `spec/overview.md:763` (and its Change History entry 1.116 at `:13`)
**Issue:** The row says: "…the same row the lost-entry counter's label and the unwritten line's level read (ADR-QD-161)."

Since `9bbed2ab` the line's wording reads the row too. These places all say "level and wording":
- `UnwrittenRow.ts:4-5`;
- the `durabilityOf` doc comment (`AuditWriteOutcome.ts:106-107`, as fixed in iteration-2 IN-02);
- BEH-QD-578;
- ADR-QD-161 decision 3.

This row is the public API table entry for the same export, and it is now the one incomplete description of the row's readers. The statement is still true, only incomplete.
**Fix:** "…the unwritten line's level and wording read (ADR-QD-161)."

### IN-03: INV-QD-342 cites as enforcement a hook-payload assertion that cannot tell core's class from the removed one

**File:** `spec/invariants.md:3959`; `spec/traceability.md:175`; `packages/audit/test/AuditWriteOutput.test.ts:226-243`
**Issue:** INV-QD-342 (an audit refusal is core's `SinkRecordNotEncodable`) lists `AuditWriteOutput.test.ts` "(the hook payload)" as enforcement. That assertion compares only these fields of the payload:
- `recordTag`;
- `evaluationId`;
- `refusal`;
- `r instanceof Error`.

It was written on the phase base and passed there, when the hook received the audit class, so it cannot fail if the invariant is broken at runtime. The test that does pin the hook's runtime class is `AuditDecisionSinkLive.test.ts:526-528` (`assert.instanceOf(first, SinkRecordNotEncodable)` and no own `reason`), and neither INV-QD-342 nor its traceability row cites it.

The type-level pins in `AuditRefusal.tst.ts` and the `instanceOf` in `AuditEntry.test.ts:71` do hold the invariant, so coverage is fine. Only the citation points at the wrong test.
**Fix:** Do one of the following:
- Replace "`AuditWriteOutput.test.ts` (the hook payload)" with "`AuditDecisionSinkLive.test.ts` (the hook receives core's class with no `reason`)" in both places.
- Keep the citation, and leave the characterisation's literals untouched: run a separate hooked `Refused` observation outside the base-written assertion and add `isCore: r instanceof SinkRecordNotEncodable` to it.

---

_Reviewed: 2026-11-16T04:06:33Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Iteration: 3_
