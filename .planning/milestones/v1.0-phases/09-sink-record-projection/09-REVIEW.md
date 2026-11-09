---
phase: 09-sink-record-projection
reviewed: 2026-11-09T00:00:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - packages/core/src/JsonRefusal.ts
  - packages/core/src/SinkWire.ts
  - packages/core/src/SinkEmit.ts
  - packages/core/src/Qadi.ts
  - packages/core/src/SinkCodec.ts
  - packages/core/src/Errors.ts
  - packages/core/src/EncodeRefusalReport.ts
  - packages/core/src/JsonHazard.ts
  - packages/core/src/PortWireEncode.ts
  - packages/core/src/AttributeResolver.ts
  - packages/core/src/CustomPredicate.ts
  - packages/core/src/index.ts
  - packages/core/test/DecisionSink.test.ts
  - packages/core/test/EncodeRefusalReport.test.ts
  - packages/core/test/Errors.tst.ts
  - packages/core/test/SinkCodec.test.ts
  - scripts/check-house-style.mjs
  - .changeset/sink-record-projection.md
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
status: issues_found
---

# Phase 09: Code Review Report

**Reviewed:** 2026-11-09
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

The JSON-refusal move (09-02) is a clean cut: the moved declarations are
byte-identical to what `SinkWire.ts` held, every importer was repointed, no stale
`SinkWire.ts` import of the moved names remains in `packages/*/src`, `index.ts`
still exports every name once, and the `no-refusal-annotation-outside-core`
exemption moved with the code that holds the `"qadi.refusal"` / `"qadi.path"`
literals. No cycle is introduced.

The obligation projection move (09-01) is not strictly behaviour-preserving, as
the changeset claims ("No ... record byte ... changed"). It changes *when* the
projection reads the caller's mutable resource, and *where* a failure in it
surfaces. One warning below; the pinning tests do not cover it.

## Warnings

### WR-01: obligation projection is now evaluated lazily, after the handler, instead of once before it

**File:** `packages/core/src/Qadi.ts:146-147`, `packages/core/src/SinkEmit.ts:114-123`
**Issue:** Before the change, `discharge` computed `obligationIds` and
`resourceIdOf(question.resource)` once, up front, before the handler ran, and the
`record(outcome)` closure only stamped the outcome. Now `record(outcome)` calls
`obligationRecord(...)`, which calls `resourceIdOf(question.resource)` and
`decision.obligations.map(...)` on every invocation, i.e. after the handler has
run (`Effect.tap` / `Effect.tapError` callbacks, and again for `Refused` /
`NotRequired`). Two consequences, neither covered by the new whole-record pin
(its resources are never mutated and never throw):

1. The `Question`'s resource is the caller's own object, not a snapshot
   (`questionOf` does not copy it). A handler that assigns or changes
   `resource.id` (plausible for a create-then-audit duty) now produces an
   obligation row whose `resourceId` differs from the one on the decision row
   the same evaluation already emitted. Previously the row was pinned to the id
   the allow was decided for. The docs for the function promise exactly that
   ("the row cannot disagree with what was asked").
2. `record(...)` is evaluated synchronously inside the `tap`/`tapError`
   callback, outside `sinkEmitter`'s `catchCause`. If the projection throws (a
   throwing `id` getter on the resource), it is now a defect raised after the
   handler's side effects have run, and inside `tapError` it replaces the
   handler's own failure with that defect. Previously the same throw happened
   before the handler ran, so no duty had been performed. This is the "an
   observer must never change the outcome" guarantee (INV-QD-035) being weaker
   for the obligation row than for the decision row.

**Fix:** Project once, before the handler, and let the closure only stamp the
outcome. For example, make `obligationRecord` curried on the stable parts:

```ts
// SinkEmit.ts
export const obligationRecordFor = (question: Question, decision: Allow, at: number) => {
  const resourceId = resourceIdOf(question.resource);
  const obligationIds = decision.obligations.map((o) => o.id);
  return (outcome: ObligationOutcome): ObligationRecord =>
    new ObligationRecord({
      evaluationId: decision.evaluationId,
      at,
      outcome,
      obligationIds,
      subjectId: question.subject.id,
      ...(question.action === undefined ? {} : { action: question.action }),
      ...(resourceId === undefined ? {} : { resourceId }),
    });
};

// Qadi.ts
const record = obligationRecordFor(question, decision, at);
```

Add a test where the handler mutates `resource.id` and assert the row still
carries the original id.

## Info

### IN-01: `JsonRefusal.ts` documentation still speaks only of "records"

**File:** `packages/core/src/JsonRefusal.ts:20-23, 82, 132, 151`
**Issue:** The leaf now exists precisely because the port wire reads it too, but
`WirePath` ("from the wire record's root"), `encodeRefusalPath` ("Where in the
record"), `where` (`the record`) and `describeEncodeRefusal`'s `EncodeFailed`
sentence ("the record could not be encoded") describe a record. For a refused
port question or answer, the sentence a caller reads says "the record". The
sentence text is deliberately unchanged this phase, so only the doc comments are
cheaply fixable.
**Fix:** Say "wire value (a sink record, or a port question or answer)" in the doc
comments; leave the sentences alone unless a later change is allowed to move them.

### IN-02: the "projection is the question's" test cannot catch a divergent projection

**File:** `packages/core/test/DecisionSink.test.ts:710-730`
**Issue:** The test compares the emitted row to `obligationRecord(discharge.question,
discharge.decision, 0, "Discharged")`, i.e. the function under test called with the
same inputs. It passes for any implementation of `obligationRecord`, and it also
cannot see the timing change in WR-01 because the resource is not mutated by the
handler. The whole-record pin above it is the real protection.
**Fix:** Either drop it, or have the handler mutate `resource.id` and assert the
row keeps the id the question was decided with (see WR-01).

---

_Reviewed: 2026-11-09_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
