---
phase: QD-39-each-hydration-drop-reason-stated-once-with-its-kind
reviewed: 2026-11-14T07:25:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - packages/core/src/HydrationMetrics.ts
  - packages/core/test/HydrationMetrics.test.ts
  - packages/core/test/HydrationMetrics.tst.ts
  - packages/react/src/HydrationEvent.ts
  - packages/react/test/Hydration.tst.ts
findings:
  critical: 0
  warning: 0
  info: 3
  total: 3
  necessity: 0
status: issues_found
---

# Phase QD-39: Code Review Report

**Reviewed:** 2026-11-14T07:25:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

The refactor replaces two written-out unions, a written-out value list and a `MEANINGS` mapped type with one `as const satisfies` table. I traced the following and found no defect:

- Key order. `Object.keys` keeps insertion order for non-integer keys, so `hydrationDropReasons` and the preregistered order are unchanged. The new `NINE` test pins this against a fresh registry.
- Load order. `isHydrationDropReason` is declared before `hydrationDropReasons` calls it at load.
- Own-key guard. `Object.hasOwn` rejects inherited names, and the new test covers `toString`, `constructor`, `__proto__` and similar.
- Partition of `HydrationDropReasonOf`. The conditional is non-distributive but each row's `kind` is a literal, so the three kinds are exact and disjoint. A fourth kind is refused by `satisfies`.
- Metric declarations (D-17) are untouched.
- Overview documentation. The new exports are recorded in `spec/overview.md` (CCR-QD-430), which gate 13 requires.
- Test runs. `vitest run packages/core/test/HydrationMetrics.test.ts` passes 25/25. `tstyche` passes both `.tst.ts` files (41 assertions, 3 suppressed).

Only minor consistency items remain.

## Info

### IN-01: Two table lines exceed the hand-wrapped width

**File:** `packages/core/src/HydrationMetrics.ts:99` and `:195`
**Issue:** The `UnencodablePolicy` summary (line 99) and the `PayloadTooDeep` summary (line 195) are single string literals of about 110 and 120 columns. AGENTS.md §17 says this codebase wraps by hand at about ninety columns. Every other string in the table is wrapped with `+` concatenation. This is cosmetic, because `oxfmt` is not a gate. It only makes the table's alignment uneven.
**Fix:** Split the two literals with `" +"` continuation like the `remedy` strings. Keep the text byte-identical so the pinned `summary` substrings in `HydrationMetrics.test.ts` still match.

### IN-02: The type test imports from two different modules for the same package surface

**File:** `packages/core/test/HydrationMetrics.tst.ts:13-20`
**Issue:** `HydrationDropReasonOf` and `HydrationDropRow` come from `../src/index.ts`, while every other symbol comes from `../src/HydrationMetrics.ts`. If the intent is to pin that the new types are public through the barrel, it is not stated, and the split import reads as accidental. If the intent is not that, the barrel import adds a second module to the test's type graph for no reason.
**Fix:** Import all of them from `../src/HydrationMetrics.ts`. Or keep the barrel import and add a one-line comment saying it pins the barrel export.

### IN-03: `hydrationDropMeaning` returns the shared table row, so `kind` is present at runtime and the row is mutable

**File:** `packages/core/src/HydrationMetrics.ts:255-256`
**Issue:** The function is typed to return `HydrationDropMeaning`, but it returns the table row itself. At runtime the object also carries `kind`, and it is the same mutable object for every caller. `as const` only makes the row readonly in the type system. A consumer that spreads or serializes the result would pick up `kind`, and one that casts away readonly could corrupt the shared table for every reader (`@qadi/react` and `@qadi/devtools`). The old `MEANINGS` map had the same sharing, so this is not a regression, only a wider surface now that rows hold a third field. The impact is low.
**Fix:** Nothing is required. If a defensive form is wanted, `Object.freeze` the rows, or return `{ summary: row.summary, remedy: row.remedy }`. Only do this if a consumer ever serializes the result.

---

_Reviewed: 2026-11-14T07:25:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
