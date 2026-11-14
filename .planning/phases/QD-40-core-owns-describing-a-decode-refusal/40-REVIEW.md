---
phase: QD-40-core-owns-describing-a-decode-refusal
reviewed: 2026-11-14T14:00:00Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - packages/core/src/SinkWire.ts
  - packages/core/src/SinkCodec.ts
  - packages/core/test/DecodeRefusal.test.ts
  - packages/core/test/SinkCodec.test.ts
  - packages/core/test/SinkWire.tst.ts
  - packages/devtools/src/model/Source.ts
  - packages/devtools/src/index.ts
  - packages/devtools/test/model/Source.test.ts
  - packages/devtools/test/model/Source.tst.ts
  - packages/devtools/test/surface.tst.ts
  - packages/audit/src/AuditEntry.ts
  - packages/audit/test/AuditEntry.test.ts
  - packages/audit/test/AuditEntryDifferential.test.ts
  - packages/http/src/DecisionStreamRoute.ts
  - examples/nextjs-newsroom/src/client/Dock.tsx
  - examples/nextjs-newsroom/src/server/api.ts
findings:
  critical: 0
  warning: 1
  info: 3
  total: 4
  necessity: 0
status: issues_found
---

# Phase QD-40: Code Review Report

**Reviewed:** 2026-11-14T14:00:00Z
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

Reviewed the single decode (`SinkRecordWithJson` and `decodeSinkRecordWithJson`), core's describer and
annotations, the devtools `onMalformed` change, audit's removal of `recordJsonOf`, and the two example
call sites. I found no incorrect behavior, security defect or data-loss risk in the changed code.

Checked beyond reading:

- The focused core, audit and devtools suites pass (`DecodeRefusal`, `SinkCodec`, `AuditEntry*`,
  `model/Source`: 304 tests).
- I probed the old and new decoders with the same inputs: an `AttributeResolveError` whose `cause` is
  absent, a string, a number, `null`, an `Error`-shaped object, an array, and an object with an extra key.
  Every refusal and every success is identical, including the refusal message with no `["record"]` or
  `["json"]` path prefix. The scratch files I used were removed from the tree.
- `describeDecodeRefusal` never reads a property of the version value, annotations carry only the tag, and
  no `MalformedReason`, `reasonOf`, `recordJsonOf` or `qadi.reason` (for devtools) is left in source. The
  remaining mentions are in changelogs and history.

One pre-existing robustness gap sits in a function this change edits. The rest is naming and
documentation drift.

## Warnings

### WR-01: A throwing `onMalformed` callback ends the stream, against the module's stated contract

**File:** `packages/devtools/src/model/Source.ts:259`
**Issue:** `Effect.sync(() => onMalformed(frame, refusal))` turns a throw from the caller's callback into
a defect. The defect fails the `Filter.FilterEffect` and ends `live` and `backlog`. The doc comment on
`sourceFromEventSource` (lines 111-116) promises that "every failure here degrades a row, never the
stream", and the `onDisconnect` call at line 168 has the same shape. This is not new in this diff, but the
callback now receives a structured `DecodeRefusal`, which callers are encouraged to format. The function
this change rewrites still has the gap. `describeDecodeRefusal` is total, so the example app is not
affected; a custom callback that throws is.
**Fix:** Run the callback under `Effect.try` and report a throw instead of dying:
```ts
: Effect.try(() => onMalformed(frame, refusal)).pipe(
    Effect.catch((thrown) =>
      Effect.logWarning("qadi/devtools: onMalformed threw").pipe(
        Effect.annotateLogs({ "qadi.thrown": thrown instanceof Error ? thrown.name : typeof thrown }),
      ),
    ),
  )
```
Add a test that passes a throwing `onMalformed`, then a good frame, and asserts the good record is
delivered.

## Info

### IN-01: A test helper reuses the name of the new public export `decodeRefusalOf`

**File:** `packages/core/test/SinkCodec.test.ts:1340`
**Issue:** `const decodeRefusalOf = (text: string): DecodeRefusal | undefined` is a local helper that
returns a refusal from text. ADR-QD-153 adds a public export of the same name in `SinkWire.ts` that
maps an `UntrustedRefusal` to a `DecodeRefusal`. The file does not import the real one, so nothing
collides, but a reader or a future edit that adds the import gets a shadowing error or the wrong function.
The new `DecodeRefusal.test.ts` tests the real one in the same package.
**Fix:** Rename the helper to `refusalOfText`.

### IN-02: Module header comments no longer describe the module

**File:** `packages/core/src/SinkWire.ts:1-17` and `packages/core/src/SinkCodec.ts:1-11`
**Issue:** The `SinkWire.ts` header says the module holds "the version... why it refuses its input, and
the tag of a record". It now also holds `decodeRefusalOf`, `describeDecodeRefusal`, and
`decodeRefusalAnnotations`, and imports `effect/Match`. The `SinkCodec.ts` header says "one call out, one
call in" and lists four operations, but `decodeSinkRecordWithJson` is a fifth inbound operation, and
`decodeSinkRecord` and `decodeSinkRecordString` now read through it.
**Fix:** Add one line to each header naming the new exports and pointing to ADR-QD-153.

### IN-03: Two sentences name "the sender" in cases where there is no sender

**File:** `packages/core/src/SinkWire.ts:194-197`
**Issue:** `TooDeep` says "a current sender refuses to emit that, so the sender is older or foreign".
`TooDeep` is also what `decodeAuditEntry` returns for a row read from a store, where a different writer,
or tampering with the row, is the more likely cause. `NotJson` has the same issue. It says "something
between the sender and this reader truncated or replaced it", but the example's ingest route also
returns it for any garbage body a client posts. The text is accurate for the devtools feed it was written
for, but `describeDecodeRefusal` is now core's one wording for every consumer, and the fix it names can
send a reader to the wrong place.
**Fix:** Word the `TooDeep` sentence so it does not assume a sender, for example "nested deeper than N
levels: a current writer refuses to emit that, so the record came from an older or foreign writer or was
altered". Update the literals in `packages/core/test/DecodeRefusal.test.ts`.

---

_Reviewed: 2026-11-14T14:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
