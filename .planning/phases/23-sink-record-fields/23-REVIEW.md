---
phase: 23-sink-record-fields
reviewed: 2026-11-11T06:30:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - .changeset/sink-record-fields.md
  - AGENTS.md
  - packages/core/bench/SinkRecord.bench.ts
  - packages/core/src/DecisionRecord.ts
  - packages/core/src/EvaluationMetrics.ts
  - packages/core/src/Lifecycle.ts
  - packages/core/src/SinkCodec.ts
  - packages/core/src/SinkEmit.ts
  - packages/core/src/SinkRecordFields.ts
  - packages/core/src/SinkWire.ts
  - packages/core/test/DecisionSink.test.ts
  - packages/core/test/Errors.tst.ts
  - packages/core/test/SinkCodec.test.ts
  - packages/core/test/SinkRecord.tst.ts
  - spec/behaviors/24-decision-sink.md
  - spec/behaviors/25-inspection.md
  - spec/decisions/095-sinkcodec-owns-both-directions.md
  - spec/decisions/135-sink-record-fields-stated-once.md
  - spec/decisions/index.yaml
  - spec/invariants.md
  - spec/README.md
  - spec/traceability.md
findings:
  critical: 0
  warning: 1
  info: 3
  total: 4
  necessity: 0
status: issues_found
---

# Phase 23: Code Review Report

**Reviewed:** 2026-11-11
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

Reviewed this phase's diff (`git diff f40bbfb2`) of the core sources, tests, bench, changeset and spec text. Checks run:

- `tsc -p packages/core/tsconfig.src.json --noEmit` is clean.
- `node scripts/check-house-style.mjs` is clean.
- `SinkCodec.test.ts` and `DecisionSink.test.ts` pass (199 tests).
- A scratch probe (deleted afterwards) confirmed the points that looked risky once `project` spreads the whole record.
  - A `StoredRecord`'s extra `environment` key does not reach the wire. The struct encode ignores excess properties, and the output is the same 6 keys as before.
  - A record with an `undefined` required key is refused with `EncodeFailed`, not thrown.
  - A decoded `ObligationRecord` carries only declared keys.

I found no correctness, security or wire-compatibility defect in the source. The spread projection and the `Struct.omit` rebuild preserve the previous bytes and the ADR-QD-106 `Inconsistent` path. The `decisionRecordFor` conditional spreads leave absent keys absent, and the old `failedRecord`/`decidedRecord` names have no remaining source callers (the audit test's `failedRecord` is its own helper in `./helpers.ts`).

What remains is one weak test and three documentation or consistency defects, listed below.

## Warnings

### WR-01: The "undeclared field is refused" type test proves nothing about the shared struct

**File:** `packages/core/test/SinkRecord.tst.ts:155-160`
**Issue:** INV-QD-290's Enforcement line cites this as pinning that an undeclared field is refused. The test is `{ ...validDecision, bogus: 1 }` assigned to `DecisionInput`, with a `@ts-expect-error`. Every object type rejects an excess property in a literal, whether or not it derives from `decisionRecordFields`. The test therefore passes for a hand-written `DecisionRecord` too, and it would keep passing if the derivation were reverted. The comment above it ("which is how a field dropped from the struct shows up") does not describe what the assertion checks. The real derivation pins are the mutual-assignability and `keyof` tests above it. This one adds only false assurance, and the invariant text overstates it. It also sits as a module-scope `const bogus` plus `void bogus` in a `.tst.ts` file.
**Fix:** Delete the `bogus` block. Drop "an undeclared field is refused" from INV-QD-290's Enforcement line in `spec/invariants.md`, and the matching `traceability.md` row text if it repeats it. If a refusal pin is wanted, assert it on a type that depends on the struct:
```ts
test("a key added to the leaf struct is a key of the record's input", () => {
  expect<keyof DecisionInput>().type.toBe<keyof typeof decisionRecordFields.Type | "outcome">();
});
```
That test already exists, so deletion is enough.

## Info

### IN-01: `SinkRecord.tst.ts` header contradicts the file's own content and is stale

**File:** `packages/core/test/SinkRecord.tst.ts:1-15`
**Issue:** The header says the file pins the types "as they stand before their fields are stated once" and that the derived types "are about to derive from one shared statement". They already do. The `Input` interfaces are labelled "today's input, written out from `DecisionRecord.ts`", but `DecisionRecord.ts` no longer writes them. The header also says the file "contains no deliberate compile error", while the last test ends in a deliberate `@ts-expect-error`. Future readers will take the pins for a pre-refactor snapshot instead of the standing contract.
**Fix:** Reword in the present tense: the hand-written interfaces are the independent expectation the leaf-derived types must equal. Remove the "no deliberate compile error" sentence, or delete the `bogus` block per WR-01.

### IN-02: `SinkRecord.bench.ts` restates the field list the phase exists to state once, and its "today" label is now the winning option

**File:** `packages/core/bench/SinkRecord.bench.ts:31-62`
**Issue:** `decisionFields` and `obligationFields` copy `SinkRecordFields.ts` by hand, and they will drift on the next field change. The rows are labelled "today: DecisionRecord" against "A: Data.TaggedClass over a shared struct". After this phase "today" is A, so the two rows measure the same shape, and the file's leading doc describes a decision already taken. The bench is decision evidence for ADR-QD-135, so freezing it is defensible. Nothing in the file says so, and it is not guarded against drift.
**Fix:** Either build the B candidates from the real leaf (`import { decisionRecordFields, obligationRecordFields } from "../src/SinkRecordFields.ts"`) and drop the A rows, or add a header line that this is the frozen record of ADR-QD-135's measurement and its field copies are intentionally independent.

### IN-03: Cosmetic wrapping and whitespace left in `SinkWire.ts` and `SinkCodec.ts`

**File:** `packages/core/src/SinkWire.ts:8-9`, `packages/core/src/SinkCodec.ts:292-293`
**Issue:** The `SinkWire.ts` header comment was edited in place, leaving a long unwrapped line ("two from `SinkRecordFields.ts`, whose import closures do not reach this module. The error classes stay…") in a file that otherwise hand-wraps at about 90 columns (AGENTS.md §17). `SinkCodec.ts` has a doubled blank line before `encodeWire`'s doc comment. The `SinkRecordWire` and `omitUndefined` call lines also run past the file's usual width.
**Fix:** Re-wrap the `SinkWire.ts` comment and delete the extra blank line. No behaviour change.

---

_Reviewed: 2026-11-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
