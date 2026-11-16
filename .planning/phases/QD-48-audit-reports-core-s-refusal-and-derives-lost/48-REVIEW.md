---
phase: QD-48-audit-reports-core-s-refusal-and-derives-lost
reviewed: 2026-11-16T03:57:21Z
depth: standard
iteration: 2
files_reviewed: 30
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
findings:
  critical: 0
  warning: 1
  info: 3
  total: 4
  necessity: 0
status: issues_found
---

# Phase QD-48: Code Review Report (iteration 2)

**Reviewed:** 2026-11-16T03:57:21Z
**Depth:** standard
**Files Reviewed:** 30
**Status:** issues_found

## Summary

Scope: the iteration-1 fixes (`git diff 0a724d3c..HEAD`, commits `b054bbdd..eaa0ef15`) and the whole non-planning phase
diff `c9fde4ba..7606d97e`. Checks run: `vitest --project audit` (28 files, 526 passed), `tstyche` on
`AuditRefusal.tst.ts` and `UnwrittenRow.tst.ts` (8 passed), `check-house-style.mjs` (clean),
`spec:website-examples` (66 blocks compile, including the new upgrade fence), `spec:verify:strict` (21 PASS) and
`spec-revise --check` (clean). `necessity-review.md` was read; no finding is a necessity finding.

Iteration-1 fixes verified against the source:

- **WR-01 (upgrade guide).** The After fence now logs `"audit entry refused"` annotated with
  `encodeRefusalAnnotations(e)`. That function is exported from `@qadi/core`'s barrel (`index.ts:27`,
  `export * from "./JsonRefusal.ts"`). It takes `{ refusal; evaluationId }`, which `SinkRecordNotEncodable` satisfies,
  and returns exactly the three keys `reportEncodeRefusal` puts on the default warning (`EncodeRefusalReport.ts:37`).
  The prose about `describeEncodeRefusal` matches `JsonRefusal.ts:144-155` (the `EncodeFailed` arm interpolates
  `refusal.message`) and INV-QD-104 (`invariants.md:3215-3221`). The base `reason` was
  `describeEncodeRefusal(error.refusal)` (`git show c9fde4ba:packages/audit/src/AuditEntry.ts:138`), so "byte for byte
  the same sentence" is true. The INV-QD-104 anchor resolves. The same caveat appears, worded consistently, in the
  changeset, ADR-QD-161 decision 2, the ADR-QD-056 and ADR-QD-095 amendments, and BEH-QD-577. `JsonRefusal.ts`'s new
  claim that "no error carries it as a field" holds: the one other caller, `PortWireEncode.ts:89`, turns the sentence
  into a `Result` failure string, and `PortRemote.ts:91-96` and `:142-146` both discard it.
- **IN-01 (marker removed).** `log` is `LogLine | undefined`, `Refused` reports `log: undefined`, and `logLine` logs
  exactly when the base's `typeof line === "object"` did. `Refused` never reaches `logLine`: the `Match.value` routes it
  to `reportEncodeRefusal`. No spec text named the marker.
- **IN-02 (wording moved into the row).** The lines were rebuilt by hand, and all six unwritten messages are
  byte-identical to the deleted constants and template strings:
  - "audit entry dropped: {trail write failed | circuit breaker open} and {no staging port wired | staging failed}";
  - "audit entry not written: {…}; its staged copy is left for reconciliation".

  The levels are unchanged. `AuditWriteOutput.test.ts`'s literal expectations were not edited and still pass.
  `LOST_CLAUSE` is a closed `Record<LostWord, string>`.
- **IN-03, IN-04, IN-07 and IN-08** are as described in the fix report. INV-QD-341 now scopes its claim to
  `WriteFailed`/`Skipped`, which matches BEH-QD-579 and D-06a. `Written` leaves never being Lost is still stated by
  INV-QD-106 (`invariants.md:3304`).
- **IN-06 (closed leaf lists).** `LEAF_PATHS` is `Object.keys(LEAF_SPECS).filter(isLeafPath)`, with an
  `Object.hasOwn` type predicate and no `as`. `BY_LEAF`'s `LeafRow & { leaf: P }` makes the key and the row's `leaf`
  agree, and `LEAVES` is a mapped type over `LeafPath`, so each list really is closed.
- **IN-05** is addressed for the ten non-`Refused` rows, but the change introduces the one Warning below.

## Warnings

### WR-01: The base characterisation no longer pins the default configuration's output for ten of the eleven leaves

**File:** `packages/audit/test/AuditWriteOutput.test.ts:183-185`; `spec/decisions/161-audit-reports-cores-refusal-and-decides-lost-once.md` (Consequences, "Output is byte-identical")
**Issue:** The IN-05 fix runs every non-`Refused` row with `observeLeaf(row.leaf, { onRefused: row.leaf !== "Refused" })`,
which installs an `onRefused` hook. This test is the phase's only literal pin of each line's message, annotation set and
cause, the span and the 13 counter deltas (criterion 4, D-11). Before iteration 1, it pinned those values with no hook,
which is the default `AuditDecisionSinkLive()` configuration. Now it pins them only with a hook installed, for 10 of the
11 leaves.

No other test fills the gap for the default configuration:
- `AuditLostAgreement.test.ts` checks only the line count and level.
- `AuditWriteExits.test.ts` checks lines against the projection, not against base literals.

So a regression that changed a non-refused line only when `onRefused` is absent would pass every test.

ADR-QD-161's Consequences says "the characterisation written before the first source edit passes unchanged after
every commit of the phase". The file was edited at `e09367ae` and `5f482fae`, after the source edits, and now observes
a different configuration, so the claim is no longer literally true. The `Refused` row still asserts
`o.refusals` is `[]` with no hook installed, which cannot fail. The other ten rows' empty-refusals check is now real.
**Fix:** Pin both configurations instead of swapping one for the other. Run the literal row with no hook, then run the
same leaf with a hook and assert identical output plus no refusal:

```ts
const bare = yield* observeLeaf(row.leaf, { onRefused: false });
// …existing literal assertions on `bare`…
if (row.leaf !== "Refused") {
  const hooked = yield* observeLeaf(row.leaf, { onRefused: true });
  assert.deepStrictEqual(hooked.refusals, []);
  assert.deepStrictEqual(hooked.lines.map(({ level, message, annotations }) => ({ level, message, annotations })),
    bare.lines.map(({ level, message, annotations }) => ({ level, message, annotations })));
}
```

Then reword the ADR consequence to "whose expected values are unchanged after every commit of the phase", or keep the
literal claim true by not editing the file's observations.

## Info

### IN-01: The tests still narrow `report.log` with `typeof … === "object"`, which only the removed marker needed

**File:** `packages/audit/test/UnwrittenRow.test.ts:65-66`; `packages/audit/test/AuditWriteOutcome.test.ts:204`
**Issue:** `typeof log === "object"` was needed to exclude the `"encodeRefusal"` string. After the IN-01 fix, `log` is
`LogLine | undefined`, so `log !== undefined` is the whole check. The leftover reads as if a string arm still exists.
**Fix:** `assert.isDefined(log); if (log === undefined) return;` and `log?.level` respectively.

### IN-02: `durabilityOf`'s doc comment names the row's readers without the wording IN-02 added

**File:** `packages/audit/src/AuditWriteOutcome.ts:103-107`
**Issue:** It says the row is "the same row the lost-entry counter's label and the unwritten line's level read". Since
`9bbed2ab`, the line's wording reads the row too, and `UnwrittenRow.ts:4-5`, BEH-QD-578 and ADR-QD-161 decision 3 all say
"level and wording". The statement is still true, but it is now the one description of the row's readers that is
incomplete.
**Fix:** "…the unwritten line's level and wording read…".

### IN-03: The upgrade prose says the annotations carry "nothing else from the refused record", but the path is the record's own keys

**File:** `apps/website/src/content/docs/docs/reference/upgrading.md:867`
**Issue:** `qadi.path` is built from the keys of the caller's object (`JsonRefusal.ts:118-119`). INV-QD-104's
Implication (`invariants.md:3232-3235`) calls this "the one residue": a resource keyed by data puts that key in a log
line. The guide's sentence says the annotations hold "nothing else from the refused record, whose subject, resource and
policy are what the refusal exists to keep out", and does not mention the residue. A reader whose resources are keyed
by personal data would conclude that the annotations are safe to ship.
**Fix:** Append: "The path is made of the record's own keys, so a resource keyed by data puts that key in the line
(INV-QD-104)."

---

_Reviewed: 2026-11-16T03:57:21Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Iteration: 2_
