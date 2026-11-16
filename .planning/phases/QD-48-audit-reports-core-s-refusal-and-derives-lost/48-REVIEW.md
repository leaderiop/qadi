---
phase: QD-48-audit-reports-core-s-refusal-and-derives-lost
reviewed: 2026-11-16T03:39:45Z
depth: standard
files_reviewed: 29
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
findings:
  critical: 0
  warning: 1
  info: 8
  total: 9
status: issues_found
---

# Phase QD-48: Code Review Report

**Reviewed:** 2026-11-16T03:39:45Z
**Depth:** standard
**Files Reviewed:** 29
**Status:** issues_found

## Summary

Reviewed the phase diff `c9fde4ba..ea912978` (non-planning files). Checks run:
`vitest --project audit` on the six touched suites (155 passed), `tstyche` on `AuditRefusal.tst.ts` and
`UnwrittenRow.tst.ts` (8 passed), and `scripts/check-house-style.mjs` (clean).

What I verified against the source and found correct:

- **Output unchanged for all eleven leaves.** The rewritten `emitWriteOutcome` (`AuditWriteReport.ts:244-279`) does the
  same thing as the base: `Refused` goes to `reportEncodeRefusal` with the same message and hook, and the other three
  tags go to `logLine`. `logLine` logs exactly when the base's `report.log !== undefined && report.log !== "encodeRefusal"`
  did, with the same level, message, optional cause and `evaluationId` annotation. `unwrittenLine` gives the same levels
  the deleted `warning`/`info` arms gave (NotWired/StageFailed are Warn, Staged is Info). `lostLabel` gives the same
  labels as `lostStaging`, and `durabilityOf` the same values as `unwrittenDurability`. Metric ids and `LOST_COUNTERS`
  keys are unchanged. `AuditWriteOutput.test.ts` was committed before any source edit (`9d948867`/`6c741117` come before
  `849050ae`), and it pins every line's level, message, exact annotation set and cause, plus the span attributes and the
  13 counter deltas.
- **The refusal reaches `onRefused` and the default warning on every path.** Both reach `reportEncodeRefusal` through
  the `Refused` arm. The default line carries exactly `qadi.refusal`, `qadi.path` and `evaluationId`, and the test
  pins the full annotation set at `AuditWriteOutput.test.ts:72`. No record content reaches an audit log line. Core's
  `SinkRecordNotEncodable` has the same `recordTag`, `evaluationId` (the record's, `SinkCodec.ts:390`) and `refusal`
  fields the old class had.
- **`StageResult` is closed.** Only `Staged` carries `commit`. `unwrittenOf` (`AuditDecisionSinkLive.ts:141`) builds a
  fresh `UnwrittenStaging` from the tag alone, so `commit` cannot leak into `onOutcome`. `AuditWriteOutput.test.ts` pins
  `stagingKeys: ["_tag"]` on every unwritten leaf. Adding a `StageResult` tag that `UnwrittenStaging` lacks is a compile
  error at `UnwrittenStaging[self._tag]`.
- **"Lost" is decided only in `UnwrittenRow.ts`.** `unwrittenDurability` and `lostStaging` are gone, and `git grep`
  finds no other mapping. The row's three readers are `durabilityOf`, `lostLabel` and `unwrittenLine`. The import-cycle
  rationale for the structural `UnwrittenTag` holds: madge counts type imports by default and there is no `.madgerc`.
- **The matches are exhaustive.** `writtenStaging`, `unwrittenRow`, `outcomePath` and `evaluationIdOf` are hoisted
  matchers, finished with `tagsExhaustive` or `exhaustive`. `Match.value(outcome)` in `emitWriteOutcome` rebuilds once
  per record (once per evaluation), not once per policy node, and its arms close over `options`, `report` and
  `evaluationId`. AGENTS.md §5a allows this ("fine for a translator invoked once per request"). See IN-01 for a simpler
  shape.
- **No stale references remain.** `AuditEntryNotEncodable` is left only in the upgrade guide's "Before" fence, the
  changeset, superseded ADR text (each marked) and change history.

The one Warning is in documentation. The new 0.13 upgrade entry tells users to log `describeEncodeRefusal`'s sentence,
which the spec, INV-QD-104 and core's own doc comment all say must not go in a log. The Info items cover leftover
redundancy, spec wording and test assertions that cannot fail.

## Warnings

### WR-01: The 0.13 upgrade entry tells users to log the sentence that INV-QD-104 keeps out of logs

**File:** `apps/website/src/content/docs/docs/reference/upgrading.md:852`, `:859`, `:864`
**Issue:** The "After" example logs `Effect.logWarning(describeEncodeRefusal(e.refusal))` and pushes the sentence into a
collected list. The prose at :864 then says: "Log the evaluation id and the sentence, as above, and nothing else from
the refused record: its subject, resource and policy are what the refusal exists to keep out of a log line."

That advice is unsafe. `describeEncodeRefusal`'s `EncodeFailed` arm (`packages/core/src/JsonRefusal.ts:152`) returns
`` `the record could not be encoded: ${refusal.message}` ``. That message is caller text, for example a throwing
getter's message on the resource, so it can carry the very record content the prose says is kept out. Three other
sources say the same:

- INV-QD-104 (`spec/invariants.md:3215-3221`): the sentence "is never an annotation and never a default log message".
- BEH-QD-250's prose, edited in this phase (`spec/behaviors/33-audit-pipeline.md:125-126`): the sentence "can carry
  caller text … and so is for a caller holding the error, not for a log".
- `describeEncodeRefusal`'s own doc comment, also edited in this phase (`JsonRefusal.ts:137-142`).

The guide is the first thing a migrating user copies. Before this phase, `reason` sat on the error and the guide did not
recommend logging it.

**Fix:** Log the location, not the sentence, and keep the sentence for in-process handling:

```typescript
export const encodeOrNull = (record: SinkRecord) =>
  encodeAuditEntry(record).pipe(
    Effect.catchTag("SinkRecordNotEncodable", (e) =>
      Effect.logWarning("audit entry refused").pipe(
        Effect.annotateLogs({ evaluationId: e.evaluationId, refusal: e.refusal._tag }),
        Effect.as(null),
      ),
    ),
  );
```

Then replace :864 with: "`describeEncodeRefusal(e.refusal)` is for code holding the refusal. Its `EncodeFailed`
sentence can carry text from the record (a throwing getter's message), so do not log it (INV-QD-104)." Make the
`onRefused` example consistent with this, or add the same caveat to it.

## Info

### IN-01: Refusal dispatch still happens twice, and the `"encodeRefusal"` marker is no longer read by `emit`

**File:** `packages/audit/src/AuditWriteReport.ts:47-56`, `:136`, `:228-233`, `:251-261`
**Issue:** `describeAuditWriteOutcome` still returns `log: "encodeRefusal"` for `Refused`, and the module doc (:47-50)
says that marker routes the record to `reportEncodeRefusal`. `emitWriteOutcome`, however, now chooses the route with its
own `Match.value(outcome)`, and `logLine` treats the marker the same as `undefined`. So "this outcome is reported by
core" is now stated in two places: the report's marker and emit's tag match. Nothing in `src` connects them. Only
`AuditWriteExits.test.ts:178` reads the marker. The base had the same duplication, but this phase rewrote the branch and
could have closed it.
**Fix:** Pick one source. Either dispatch on `report.log` (a hoisted match over `LogLine | "encodeRefusal" | undefined`
with the refusal passed in), or drop the marker so `log` is `LogLine | undefined` and correct the doc at :47-50. Either
way the per-call `Match.value` goes away.

### IN-02: The message wording still restates lost-ness outside the row

**File:** `packages/audit/src/AuditWriteReport.ts:64-68`, `:101-123`; `spec/decisions/161-audit-reports-cores-refusal-and-decides-lost-once.md:76-79`
**Issue:** The level now comes from `unwrittenRow`, but each arm still picks its message by hand. The Lost arms say
"audit entry dropped: …" and the Staged arms say "… its staged copy is left for reconciliation". The `failed_open`
staging label is chosen per arm in the same way. If a row ever changed (for example NotWired becoming StagingOnly), the
line would read "dropped" at Info level. ADR-QD-161 and D-05a describe the row as "the only place lost-ness is decided",
which overstates it.
**Fix:** Either key the message's prefix to the row, or add a leg to `AuditLostAgreement.test.ts` over the six
unwritten leaves: the message starts with `"audit entry dropped"` exactly when `LOST[leaf]`. Alternatively, narrow the
ADR wording to "the durability, the counter label and the level".

### IN-03: ADR-QD-161 still says the behaviours and invariants are "named, not linked"

**File:** `spec/decisions/161-audit-reports-cores-refusal-and-decides-lost-once.md:91-92`
**Issue:** "…they are written by the plan that follows this one, so they are named, not linked, here." Rev 1.1
(:13, :129-130) now links all seven in Related, so the sentence is stale.
**Fix:** Delete the sentence, or say they are linked under Related.

### IN-04: INV-QD-341's scope sentence literally includes `Refused`

**File:** `spec/invariants.md:3941`
**Issue:** "For an outcome whose write did not happen or failed, … the line is a warning, exactly when the staging
variant's row is Lost". `Refused` is an outcome whose write did not happen, and it warns while having no row and not
being Lost. BEH-QD-579 and D-06a scope this leg to the six unwritten leaves, and the invariant should too.
**Fix:** "For a `WriteFailed` or `Skipped` outcome, `durabilityOf` is `"Lost"` … exactly when its staging's row is
Lost."

### IN-05: `AuditWriteOutput.test.ts` asserts that no refusal arrived when no hook is installed, so it cannot fail

**File:** `packages/audit/test/AuditWriteOutput.test.ts:180`, `:189`
**Issue:** Every row runs `observeLeaf(row.leaf, { onRefused: false })`, which installs no `onRefused`. `refusals` is
only filled by that hook, so `assert.deepStrictEqual(o.refusals, [])` is always true. The intent, that non-refused
leaves never call `onRefused`, is not checked.
**Fix:** Run the non-`Refused` rows with `{ onRefused: true }` and keep the empty-refusals assertion. Line expectations
do not change, because `onRefused` only replaces the refusal's own warning.

### IN-06: The leaf lists the tests loop over are not checked for completeness

**File:** `packages/audit/test/AuditLostAgreement.test.ts:29-50`; `packages/audit/test/AuditWriteOutput.test.ts:63`
**Issue:** `LOST` is a mapped type over `LeafPath`, so it is complete. `ALL`, `UNWRITTEN` and `ROWS` are plain arrays,
though, and dropping a leaf from any of them compiles and silently shrinks the "all eleven leaves" claim in
BEH-QD-579 and D-06.
**Fix:** Derive `ALL` from the record (`Object.keys(LEAF_SPECS)` narrowed through a type guard). Alternatively, assert
`ROWS.map((r) => r.leaf)` and `ALL` against the eleven `LeafPath` members once, in a dedicated `it`.

### IN-07: `StageResult`'s doc comment does not cite ADR-QD-161 (known, accepted)

**File:** `packages/audit/src/AuditDecisionSinkLive.ts:111-117`
**Issue:** It explains why only `Staged` carries `commit`, but not which decision made it so. The other edited doc
comments cite ARCH-95 / ADR-QD-161.
**Fix:** Append "(ARCH-95, ADR-QD-161)".

### IN-08: `durability(...)` wraps a value that is already typed `Durability`

**File:** `packages/audit/src/AuditWriteOutcome.ts:114-115`
**Issue:** The helper exists so that a bare `"Lost"` literal in a `Match` arm does not widen to `string` (:100).
`unwrittenRow(o.staging).durability` is already typed `"StagingOnly" | "Lost"` and needs no help, so the wrap reads as
though it were required.
**Fix:** Use `WriteFailed: (o) => unwrittenRow(o.staging).durability`, and the same for `Skipped`.

---

_Reviewed: 2026-11-16T03:39:45Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
