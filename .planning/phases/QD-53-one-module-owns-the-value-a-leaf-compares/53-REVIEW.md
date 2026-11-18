---
phase: QD-53-one-module-owns-the-value-a-leaf-compares
reviewed: 2026-11-18T06:40:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - packages/core/src/Operand.ts
  - packages/core/src/Predicate.ts
  - packages/core/src/Matcher.ts
  - packages/core/src/Walk.ts
  - packages/core/src/PortAccess.ts
  - packages/core/src/FieldPath.ts
  - packages/core/src/Decision.ts
  - packages/core/src/AttributeResolver.ts
  - packages/core/src/CustomPredicate.ts
  - packages/core/test/Operand.test.ts
  - packages/core/test/Predicate.test.ts
  - packages/core/test/Matcher.test.ts
  - packages/core/test/Layers.test.ts
  - packages/core/test/CustomPredicate.test.ts
  - packages/core/test/FieldPath.test.ts
  - packages/core/test/Evaluate.test.ts
  - packages/core/test/PortAccess.test.ts
findings:
  critical: 0
  warning: 0
  info: 4
  total: 4
  necessity: 1
status: issues_found
---

# Phase QD-53: Code Review Report

**Reviewed:** 2026-11-18T06:40:00Z
**Depth:** standard
**Files Reviewed:** 17

## Summary

Iteration 2. I re-read the full diff against `03bb6545` and the iteration-1 fix commit `09f16437`. The necessity rubric (`necessity-review.md`) was read and applied.

Iteration 1's WR-01 is resolved. The three inherited-member cases in `Evaluate.test.ts` (4212-4240) now use `M.neq(...)`. I checked this independently instead of trusting the fix report's single observed failure. With the `isOwnKey` guard removed from `getByPath`, `evaluateMatcher(neq(...), "r1", ctx)` returns `true` (an allow) for each of `resource('a.constructor')`, `subject('toString')` and `resource('constructor')`. Each case therefore expects `false` and would fail on a regression, so all three can now fail. I restored `Operand.ts` afterwards, and `git status` on `packages/` is clean. The shared `it.effect` loop still stops at the first failing assertion. That is a diagnostic limit, not a defect.

The eight test files covering this change pass (601 tests). The source has no correctness or security defect. The `evaluate`/`evaluatePredicate` parity fix is intact, and the remaining raw `Object.hasOwn` sites are not decoded-key readers.

The four Info items below carry over unchanged from iteration 1. They were out of fix scope and the code has not moved. No new findings.

## Info

### IN-01: `isObject` is declared twice

**File:** `packages/core/src/Matcher.ts:316` and `packages/core/src/Operand.ts:22`
**Issue:** The two bodies are identical. `Matcher.ts` keeps its copy only for the `FieldMatch` arm at line 698. This is the duplication the phase set out to remove.
**Fix:** Export `isObject` from `Operand.ts` and import it in `Matcher.ts`, binding it alongside the other module-locals if the hot path needs that.

### IN-02: Double own-key check where one read would do

**Category:** necessity
**File:** `packages/core/src/PortAccess.ts:351-353` and `packages/core/src/FieldPath.ts:333-335`
**Issue:** Both sites call `isOwnKey(x, key)` and then `ownValue(x, key)`, which runs `Object.hasOwn` again. The second check cannot fail. `isOwnKey` is a pure `Object.hasOwn` predicate on the same arguments, with no mutation in between. The narrowed `key` already allows a plain index. The own-key rule is still stated once, in `Operand.ts`. This rests on judgment, since the double call is correct and only costs a few cycles on a hot path.
**Fix:** Index after the narrowing (`Effect.succeed(subject.attributes[attribute])`, `const child = frame.value[key]`), or add an `ownEntry` helper to `Operand.ts` that returns presence and value together.

### IN-03: `Operand.ts` header says a read "allocates nothing"

**File:** `packages/core/src/Operand.ts:14-15`
**Issue:** `getByPath` allocates a substring per segment through `path.slice`, and its own doc comment (lines 52-61) says those substrings are unavoidable. The two statements contradict each other in the same file.
**Fix:** Say "allocates no segment array", or scope the claim to `ownValue` and `isOwnKey`.

### IN-04: `evaluatePredicate` silently stops reading inherited accessors on non-plain rows

**File:** `packages/core/src/Predicate.ts:166-167`
**Issue:** `evaluatePredicate` is public and takes `Row = Readonly<Record<string, unknown>>`. A class-instance row with prototype getters used to answer `row[p.column]` through the getter. It now reads as absent and the predicate denies. This matches `evaluate` (INV-QD-091) and is probably intended. The doc does not state the contract, and no test pins a prototype-accessor row.
**Fix:** Add one sentence to `evaluatePredicate`'s doc ("a column is read as an own property of the row; an inherited accessor reads as absent") and one test with a class-getter row.

---

_Reviewed: 2026-11-18T06:40:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
