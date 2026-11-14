---
phase: QD-38-the-sink-wire-version-stated-once
reviewed: 2026-11-14T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - packages/core/src/SinkWire.ts
  - packages/core/src/SinkCodec.ts
  - packages/core/test/SinkWire.tst.ts
  - packages/core/test/SinkCodec.test.ts
findings:
  critical: 0
  warning: 0
  info: 3
  total: 3
  necessity: 0
status: issues_found
---

# Phase 38: Code Review Report

**Reviewed:** 2026-11-14T00:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Reviewed the phase's changes against base `b1e8ecbf` (`SinkWire.ts` read whole; `SinkCodec.test.ts` 155 tests pass).

- **The version is stated once.** The scoped grep over `packages/core/src/Sink*.ts` for `Literal(2)`, `version: 2` and `= 2` matches only the constant in code (D-04); the other hits are doc prose, which D-11 leaves alone.
- **Wire bytes are unchanged.** The encoder writes `version: WIRE_VERSION` after the record spread, so key order holds; `WIRE_VERSION` is `as const` and does not widen in the spread.
- **Read set and write version are separate.** `versionThenEnvelope` tests membership in `WIRE_VERSIONS` through `Schema.is(Schema.Literals(WIRE_VERSIONS))`; a non-2 version is still `UnsupportedVersion({ version, supported })`, and an absent `version` still reports `undefined`.
- **No house-style breaks.** No `as`, `!`, `any` or `switch`; the codec's private constant is gone, so nothing shadows the export.
- **The type pins are sound.** `SinkWire.tst.ts` writes its expectations by hand, and the refusal rows hard-code `[2]` and `2`.

## Info

### IN-01: `isReadVersion` can accept a version that has no decode schema

**File:** `packages/core/src/SinkCodec.ts:458-476`
**Issue:** The guard is built from `WIRE_VERSIONS`, but the strict decode knows only `Schema.Literal(WIRE_VERSION)`. A version added to `WIRE_VERSIONS` without a schema would pass the version check and fail the strict decode as `Malformed` rather than `UnsupportedVersion`. The docs say a retained version is listed "beside a schema for it", but nothing enforces it. A latent hazard on a future edit, not a defect today.
**Fix:** Optional: a test that every member of `WIRE_VERSIONS` decodes a fixture of its own version, or leave it as ADR-QD-151 documents the convention.

### IN-02: The two new `MAX_DECODE_DEPTH` boundary tests assert only a lower bound on the path

**File:** `packages/core/test/SinkCodec.test.ts:1220-1230`
**Issue:** Sibling tests pin exact refusals (`EncodeRefusal.TooDeep({ path: [...], maxDepth })`); these two check only `path.length > 1` and `> 3`. Both titles claim the record "passes the pre-check; the final walk refuses it", but any TooDeep with a longer path passes, so the assertion does not identify the refusing stage.
**Fix:** Assert the exact path the final walk produces (for the trace case a `path` starting `["outcome", "decision", "trace", ...]`), or reword the titles if the exact path cannot be stated.

### IN-03: The `SinkWire.ts` header comment is badly wrapped

**File:** `packages/core/src/SinkWire.ts:1-4`
**Issue:** The edit left a ragged break ("…`decodeSinkRecord` reads, why it" / "refuses its input, …"). Cosmetic.
**Fix:** Re-wrap the paragraph to about 90 columns.
