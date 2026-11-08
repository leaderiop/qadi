---
phase: 06-dehydration-in-engine
reviewed: 2026-11-08T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - packages/react/src/HydrationEngine.ts
  - packages/react/src/Hydration.ts
  - packages/react/src/QadiAtoms.ts
  - packages/react/test/HydrationEngine.test.ts
  - packages/react/test/HydrationPayload.test.ts
  - packages/react/test/Hydration.tst.ts
findings:
  critical: 0
  warning: 0
  info: 4
  total: 4
  necessity: 0
status: issues_found
---

# Phase 6: Code Review Report

**Reviewed:** 2026-11-08
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

I diffed the six files against `08f3051` and read the moved code line by line against its original in `Hydration.ts`. The refactor is a faithful move. The subject filter, the `ForeignSubject` count, the dropped-entry report, `includeTrace` and the envelope are unchanged. The reporter is still resolved only inside the drop branch. `dehydrateEntry`, `dehydratedPayload` and the `resolveMismatchReporter` wrapper have no remaining references outside the engine (`git grep` is clean apart from the CCR row in `spec/README.md`, which is history). The two engine test files pass (45 tests). I did not run `Hydration.tst.ts` or the typecheck.

I found no bugs and no security regressions. Narrowing the exports closes the "build a payload without the filter" route. The golden-byte pins and the round-trip test do check the behavior that moved. What remains is minor documentation and test-hygiene issues.

## Info

### IN-01: `DehydrateOptions` has no summary line

**File:** `packages/react/src/HydrationEngine.ts:187`
**Issue:** The interface moved from `Hydration.ts` without a doc comment of its own, although the sibling `HydrateOptions` (line 353) has one. AGENTS.md asks for a one-line "what is this" summary on exports. Only the two members are documented. The public re-export in `Hydration.ts` exposes the type with no top-level description.
**Fix:** Add a leading comment, for example `/** Options for {@link dehydrateWith}; re-exported by name from Hydration.ts. */`.

### IN-02: The "Counted here" comment sits above a call whose count lives elsewhere

**File:** `packages/react/src/HydrationEngine.ts:296-302`
**Issue:** The comment was moved verbatim from the old function body. In the new layout, `dehydrateWith` does not count the dehydrated entries. The count happens inside the now-private `dehydratedPayload` (line 253). A reader of `dehydrateWith` sees "Counted here" but no count call, and the `ForeignSubject` count a few lines up is a different counter.
**Fix:** Reword to "Counted by `dehydratedPayload` (`qadi_hydration_dehydrated_total`) rather than left to the caller…", or move `countDehydrated` next to the comment in `dehydrateWith`. The second option would also make the private `dehydratedPayload` a pure envelope builder.

### IN-03: Hard-coded payload version in the new engine test

**File:** `packages/react/test/HydrationEngine.test.ts:~188`
**Issue:** `assert.strictEqual(payload.version, 2)` repeats the literal for the private `PAYLOAD_VERSION`. A deliberate version bump would fail this test and the golden strings in `HydrationPayload.test.ts` together. That duplication is acceptable for the golden pins, which exist to catch byte drift. In the round-trip test, which is about both directions agreeing, the assertion adds a second place to update.
**Fix:** Drop the assertion from the round-trip test, since the golden test already pins the version. The round trip proves the version is consistent by decoding what it encoded.

### IN-04: A throwing `onDropped` aborts dehydration after the count (pre-existing, now more visible)

**File:** `packages/react/src/HydrationEngine.ts:288-294`
**Issue:** `report(...)` runs unguarded between `countDropped` and the payload build. A user-supplied `onDropped` that throws, for example an alerting hook that fails, escapes `dehydrateDecisions` as a defect during server render. The doc comment says the callback "observes; it cannot change the outcome". A throw does change the outcome. The behavior is unchanged by this phase, which is a pure move, so it is not a regression. Now that the engine owns the function, this is the natural place to decide it.
**Fix:** Either document that the callback must not throw, or wrap it, for example `try { report(...) } catch { /* observer failure must not alter the payload */ }`. That would change behavior, so it needs its own spec row and probably belongs in a separate change.

---

_Reviewed: 2026-11-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
