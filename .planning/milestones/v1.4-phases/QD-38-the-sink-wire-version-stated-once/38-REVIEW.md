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
  info: 0
  total: 0
  necessity: 0
status: clean
---

# Phase 38: Code Review Report (iteration 2)

**Reviewed:** 2026-11-14T00:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** clean

## Summary

Re-reviewed `git diff cb303ea6 HEAD`. Only `SinkWire.ts` (comment) and `SinkCodec.test.ts` changed; `SinkCodec.ts` and `SinkWire.tst.ts` are untouched, so there is no codec behavior change. `packages/core/test/SinkCodec.test.ts` runs 156/156 (was 155; one new row for the single member of `WIRE_VERSIONS`). `scripts/check-house-style.mjs` reports 496 files clean.

Previous findings:

- **IN-01 resolved.** `SinkCodec.test.ts:2042-2047` loops over `WIRE_VERSIONS` and asserts each version decodes a record of its own version (`decodeRefusalOf(...) === undefined`). A version added to the read set without a schema would now fail as `Malformed`. The loop reads the set itself, so it follows additions, and the hard-coded `[2]` pin at line 1996 still guards against a silent retype.
- **IN-02 resolved.** Both boundary tests now `deepStrictEqual` the exact `EncodeRefusal.TooDeep`. The paths are arithmetically correct at `MAX_DECODE_DEPTH = 256` (`UntrustedDecode.ts:63`). The policy path is `["policy", ("policies", 0) x 128]`, length 257. The trace path is `["outcome", "decision", "trace", ("children", 0) x 127]`, length 257. Both are `MAX_DECODE_DEPTH + 1`, which matches the sibling "deep resource" test and the new titles ("one past the bound"). The test passes, which confirms the walk is deterministic. The `/ 2` and `(MAX - 2) / 2` expressions assume an even bound; 256 is even, and a change to an odd bound would fail the test loudly rather than silently.
- **IN-03 resolved.** The `SinkWire.ts` header now wraps cleanly at line 3.

New defects from the fixes: none found. The tests use no `as`, `!` or `any`; imports are unchanged; the `for ... of` generating `it` titles is an established vitest pattern; and the new comment states its why in one line.

---

_Reviewed: 2026-11-14T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
