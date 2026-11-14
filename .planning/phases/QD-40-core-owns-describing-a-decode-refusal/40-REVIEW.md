---
phase: QD-40-core-owns-describing-a-decode-refusal
reviewed: 2026-11-14T14:30:00Z
depth: standard
iteration: 2
files_reviewed: 7
files_reviewed_list:
  - packages/core/src/SinkWire.ts
  - packages/core/src/SinkCodec.ts
  - packages/core/test/DecodeRefusal.test.ts
  - packages/core/test/SinkCodec.test.ts
  - packages/devtools/src/model/Source.ts
  - packages/devtools/test/model/Source.test.ts
  - spec/behaviors/27-devtools-timeline.md
findings:
  critical: 0
  warning: 0
  info: 1
  total: 1
status: issues_found
---

# Phase 40: Code Review Report (iteration 2)

**Reviewed:** 2026-11-14T14:30:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found (one Info, no Critical or Warning)

## Summary

I read `git diff 93898e60 HEAD` over the scoped files and 40-REVIEW-FIX.md. All four earlier findings are resolved, and I found no new Critical or Warning defect.

- **WR-01 resolved.** `malformed` in `Source.ts` now runs `onMalformed` under `Effect.try` and catches a throw with `Effect.catch`. The stream continues because the effect always ends in `Result.fail(frame)`. The log message is fixed, and the only annotation is `qadi.thrown`, which is the thrown value's `name` or its `typeof`. The thrown message is never logged, which keeps INV-QD-104. The default branch (no `onMalformed`) is unchanged. Two tests cover the `Error` and non-`Error` branches, and each checks that the next good record is delivered and the sender-like text is absent from the log. BEH-QD-204 gained the matching REQUIREMENT, and Rev 1.13 and its change-history row are consistent with it. `Effect.try`/`Effect.catch` follow house style: no `async`, no `as`, no `catchTags`.
- **`onDisconnect` left alone.** This is accepted per the brief.
- **IN-01 resolved.** The test helper is renamed to `refusalOfText` at its declaration and every use. A grep finds no remaining `decodeRefusalOf` in `SinkCodec.test.ts`, so there is no shadowing of the core export.
- **IN-02 resolved.** The `SinkWire.ts` and `SinkCodec.ts` headers now name the moved and added exports and cite ADR-QD-153.
- **IN-03 resolved.** The `NotJson` and `TooDeep` sentences no longer presume a sender. The literals in `DecodeRefusal.test.ts` match the source. The only remaining quotes of the old text are in `40-03-PLAN.md` and `40-REVIEW.md`, which are historical planning artifacts and need no change.

## Info

### IN-01: `thrownName` is undocumented and reads a foreign value without hardening

**File:** `packages/devtools/src/model/Source.ts:242`
**Issue:** `thrownName` runs as `Effect.try`'s `catch` handler on a value the consumer's callback threw. A throw inside it becomes a defect, not a typed failure, and a defect would end the stream, which is the thing WR-01 fixed. It is reachable only for pathological thrown values, such as a revoked `Proxy` (`instanceof` throws) or an `Error` whose `name` is a throwing getter. A non-string `name` would also be annotated verbatim. The risk is low and rests on judgment, since a real callback rarely throws such a value. The helper also has no doc comment, while its neighbours `decodeFrame` and `malformed` do.
**Fix:** Either accept the risk and add a one-line comment saying so, or make the helper total:
```ts
/** The thrown value's type name for the log, never its message (INV-QD-104). */
const thrownName = (thrown: unknown): string => {
  try {
    return thrown instanceof Error && typeof thrown.name === "string" ? thrown.name : typeof thrown;
  } catch {
    return "unknown";
  }
};
```
A `try`/`catch` in a pure helper is acceptable here because the module already wraps a foreign callback. If adopted, add a test with a revoked proxy.

---

_Reviewed: 2026-11-14T14:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
