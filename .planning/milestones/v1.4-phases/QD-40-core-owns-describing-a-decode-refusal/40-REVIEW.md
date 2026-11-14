---
phase: QD-40-core-owns-describing-a-decode-refusal
reviewed: 2026-11-14T16:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - packages/devtools/src/model/Source.ts
  - packages/devtools/test/model/Source.test.ts
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 40: Code Review Report (iteration 3)

**Reviewed:** 2026-11-14T16:00:00Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** clean

## Summary

Re-review of the iteration-2 fix (commit 0c4f5545) for IN-01, `thrownName` not hardened. The diff against 1ff97a55 touches only `Source.ts` (a doc comment and a `try`/`catch` around `thrownName`) and `Source.test.ts` (three table-driven tests).

IN-01 is resolved:

- `thrownName` is now total. `thrown instanceof Error` throws on a revoked Proxy, and a throwing `name` getter throws on read. Both land in the `catch` and return `"unknown"`. Without that, `Effect.try`'s `catch: thrownName` mapper would throw inside the mapper and turn into a defect, which ends the stream.
- A non-string `name` falls back to `typeof thrown`. This closes the case where a hostile `name` object would otherwise reach the log annotation.
- It still returns only a name or a type, never a message, so INV-QD-104 holds.
- The doc comment states the contract in one line and gives the why in the `catch` comment, as AGENTS.md asks.

New defect check, none found:

- House style is met. There is no `as`, `!`, `any`, `switch` or `Record<string, unknown>`, and no forbidden ambient API. Bare `catch {` already appears in `packages/*/src` (`CustomPredicate.ts`, `Filters.ts`, `SimulationForm.ts`, `Capture.ts`), so it is not a new pattern.
- The three tests drive each branch through the real `onMalformed` path. A revoked proxy is thrown and expects `"unknown"`. A throwing `name` getter is thrown and expects `"unknown"`. A non-string `name` is thrown and expects `"object"`, which equals `typeof thrown` for an Error instance. Each asserts that the next good record is still delivered, that exactly one log line is written, that the `qadi.thrown` value is as expected, and that the sender-like text is absent from the serialized log. Removing any of the three branches (`catch`, the `typeof name` guard, either ternary arm) fails a test.
- The test table is typed as `ReadonlyArray<readonly [string, () => never, string]>`, and each thrower really never returns. There are no unsafe casts.

Known and accepted items (Breaking change, `qadi.frame`, `onDisconnect`, the `"unknown"` fallback name) were not re-raised.

All reviewed files meet quality standards. No issues found.

---

_Reviewed: 2026-11-14T16:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
