---
phase: QD-53-one-module-owns-the-value-a-leaf-compares
reviewed: 2026-11-18T06:30:00Z
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
  warning: 1
  info: 4
  total: 5
  necessity: 1
status: issues_found
---

# Phase QD-53: Code Review Report

**Reviewed:** 2026-11-18T06:30:00Z
**Depth:** standard
**Files Reviewed:** 17

## Summary

The change moves every read of a decoded key onto `Operand.ts` (`ownValue`, `isOwnKey`, `getByPath`) and re-exports `getByPath` from `Matcher.ts`. I read the full diff against `03bb6545`, grepped the remaining `packages/*/src` for raw `Object.hasOwn` and `x[key]` readers of decoded keys, and ran the five most affected test files (213 tests pass).

No correctness or security defect found in the source. The `evaluate`/`evaluatePredicate` parity fix is real: `Predicate.ts` now reads `row` through `ownValue`, and the "prototype-named column denies on both sides" test fails against the old `row[p.column]`. The `getByPathLocal` binding is declared after `resolveRef` but is only used at call time, so there is no TDZ hazard. The remaining raw `Object.hasOwn` sites are not decoded-key readers: SinkCodec envelope keys, enum-word tables, and the `LAWS` table.

The one real finding is test reliability. Four of the new `Evaluate.test.ts` cases cannot fail if the own-key guard regresses. The rest is quality.

## Warnings

### WR-01: Three of four `Evaluate.test.ts` prototype-ref cases cannot detect a regression

**File:** `packages/core/test/Evaluate.test.ts:4212-4236`
**Issue:** The block claims to pin that "a name the prototype chain supplies is absent". Its three negative cases (`resource('constructor')`, `resource('a.constructor')`, `subject('toString')`) all compare with `M.eq(...)` against the resource id `"r1"` and expect `false`. If `getByPath` regressed to read inherited members, the matcher would compare `Object`, `Object.prototype.constructor` or `Object.prototype.toString` (all functions) with `"r1"` by `eq`, which is also `false`. These cases pass with or without the guard. The fourth case (`__proto__.x` expecting `true`) also passes without the guard, because an own `__proto__` read as `current["__proto__"]` yields the same value. Only `Operand.test.ts` (direct `getByPath` assertions) guards the behavior. Because the title says it pins evaluation, the integration layer gives false confidence.
**Fix:** Use a matcher that an inherited function would satisfy and an absent value would not. For example, expect `false` for `P.hasResourceAttribute("id", M.neq(M.resource("constructor")))` (inherited read gives a function, so `neq` would hold and allow), and likewise `M.neq(M.subject("toString"))` and `M.neq(M.resource("a.constructor"))`. Confirm each case fails when `isOwnKey` in `getByPath` is replaced by `true`.

## Info

### IN-01: `isObject` is now declared twice

**File:** `packages/core/src/Matcher.ts:316` and `packages/core/src/Operand.ts:19`
**Issue:** The two bodies are byte-identical (`typeof v === "object" && v !== null` as a `Record<string, unknown>` guard). `Matcher.ts` keeps its copy only for the `FieldMatch` arm at line 698. This is the duplication the phase set out to remove.
**Fix:** Export `isObject` from `Operand.ts` and import it in `Matcher.ts`, binding it with the other module-locals if the hot path needs that. Alternatively, drop the Matcher copy and use `ownValue`'s own object check.

### IN-02: Double own-key check where one read would do

**Category:** necessity
**File:** `packages/core/src/PortAccess.ts:351-353` and `packages/core/src/FieldPath.ts:333-335`
**Issue:** Both sites call `isOwnKey(x, key)` and then `ownValue(x, key)`, which calls `Object.hasOwn` again. The second check cannot fail (the first just passed), so it is an impossible-state guard repeated on a hot path (`readAttribute` per leaf, `projectAt` per key). In `readAttribute` the narrowed `key` already allows a plain `subject.attributes[attribute]`; `projectAt` could do the same through the `isOwnKey` narrowing. Evidence the second check is dead: `isOwnKey` is a pure `Object.hasOwn` predicate on the same arguments with no intervening mutation. The rule (own key, an own undefined present) is still stated once, in `Operand.ts`. This rests on judgment, because the double call is correct and only costs a few cycles.
**Fix:** Index after the narrowing in both places (`Effect.succeed(subject.attributes[attribute])`, `const child = frame.value[key]`), or add an `ownEntry` helper to `Operand.ts` that returns presence and value together.

### IN-03: `Operand.ts` header says a read "allocates nothing"

**File:** `packages/core/src/Operand.ts:14-15`
**Issue:** The module doc claims reads allocate nothing, but `getByPath` does `path.slice` for each segment, and its own doc comment (lines 54-60) says those per-segment substrings are unavoidable. The two statements contradict each other in the same file.
**Fix:** Change the header to "allocates no segment array", or scope the "allocates nothing" claim to `ownValue` and `isOwnKey`.

### IN-04: `evaluatePredicate` silently stops reading inherited accessors on non-plain rows

**File:** `packages/core/src/Predicate.ts:166-167`
**Issue:** `evaluatePredicate` is public and takes `Row = Readonly<Record<string, unknown>>`. A row that is a class instance with prototype getters (a common ORM or entity shape) used to answer `row[p.column]` through the getter, and now reads as absent, so such a predicate denies. This matches `evaluate` (INV-QD-091) and is probably intended, but the function's doc does not state the contract, and no test pins a prototype-accessor row. Whether anyone passes such rows is a judgment call.
**Fix:** Add one sentence to `evaluatePredicate`'s doc ("a column is read as an own property of the row; an inherited accessor reads as absent") and one test with a class-getter row.

---

_Reviewed: 2026-11-18T06:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
