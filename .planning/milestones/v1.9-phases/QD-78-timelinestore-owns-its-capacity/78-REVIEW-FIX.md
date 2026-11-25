---
phase: QD-78-timelinestore-owns-its-capacity
fixed_at: 2026-11-24T00:00:00Z
review_path: .planning/phases/QD-78-timelinestore-owns-its-capacity/78-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 1
skipped: 2
status: partial
---

# Phase QD-78: Code Review Fix Report

**Fixed at:** 2026-11-24
**Source review:** .planning/phases/QD-78-timelinestore-owns-its-capacity/78-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3
- Fixed: 1
- Skipped: 2 (both dispositions are "no change needed", decided by the orchestrator)

Verification ran in the main checkout (`workflow.use_worktrees` is `false`), from the repo root.

## Fixed Issues

### WR-01: `bound` publishes for a record a full timeline drops, contradicting its own contract

**Files modified:** `packages/devtools/src/model/Timeline.ts`, `packages/devtools/test/model/Timeline.test.ts`
**Commit:** f3afbc5c
**Status:** fixed: requires human verification (logic change)
**Applied fix:** `bound` now returns `self` when `sameElements(kept, self.entries)` and a new timeline otherwise. `sameElements` is imported from `./ExternalStore.ts`, as `HeldChoice.ts` and `SeededChoice.ts` do. The `nothingChanged` local is gone. The doc comment was left as written: both statements hold, since the zero-capacity empty case is a case of `kept` equal to `self.entries`, and an over-bound timeline still differs from its emptied `kept`, so it comes back as a new value (pinned by the existing test "a timeline holding entries over a zero bound is emptied by the next record").

Tests, written first in `Timeline.test.ts` under `describe("capacity")`:
- "an older record a full timeline evicts at once returns the identical timeline": a capacity-2 timeline holds `at` 200 and 300, then an `at` 100 record is ingested, and `assert.strictEqual(next, full)`. RED against the old code, with `expected {...} to equal {...}, compared values have no visual difference`. GREEN after the fix.
- "a newer record a full timeline keeps returns a new timeline with the oldest dropped": no existing test pinned a new identity for a changed full timeline ("drops the oldest" checks entries only), so this one was added. It is green before and after the fix and guards the other direction.

**Verification:**
- RED to GREEN: `Timeline.test.ts` went from 1 failed, 39 passed (40) to all passing.
- `npx vitest run --project devtools` on Timeline, TimelineStore, TimelineFeed, DockModel and useTimeline: 5 files, 178 tests, all passed.
- `node scripts/check-house-style.mjs`: 590 files clean.
- `pnpm exec tsc -b packages/devtools/tsconfig.src.json`: exit 0. `tsc -p tsconfig.test.json --noEmit` reports nothing on `Timeline.ts` or `Timeline.test.ts`. `pnpm circular`: no cycle.
- Mutation, Timeline group (`pnpm exec stryker run stryker.devtools.mjs --mutate packages/devtools/src/model/Timeline.ts`): 100.00%, 106 killed, 0 survived, 0 no-coverage, 9 Ignored. The close record held 113 killed of 113 valid with 9 Ignored. The count fell by 7 because the `nothingChanged` conditional and its mutants were deleted. That is the removed-mutant rule: no new open or Ignored mutant. `78-mutation-base.json` and `78-mutation-close.json` were not touched, so the group's recorded close still names the pre-fix head. Re-recording it is the orchestrator's call (`record close timeline --restart`).

## Skipped Issues

### IN-01: `DockSession.setTimeline`'s `next === timeline` guard is not redundant

**File:** `packages/devtools/src/model/DockSession.ts:99`
**Reason:** no change needed. The guard is load-bearing: `publish` notifies unconditionally and `build()` allocates a fresh snapshot, and `DockModel.configure` calls `setTimeline` with the same reference. The file is outside the phase scope.
**Original issue:** A reader could mistake this guard for the redundant one in `TimelineStore.accept`.

### IN-02: `effectiveCapacity` and the feed constructor repeat a default `emptyTimeline` already applies

**File:** `packages/devtools/src/model/TimelineFeed.ts:110-112`, `:144-145`
**Reason:** no change needed. The call-site `?? DEFAULT_TIMELINE_CAPACITY` states the "omitted equals default" rule that TF33 pins.
**Original issue:** Necessity finding: the `??` cannot change behavior, since `emptyTimeline` applies the same default.

---

_Fixed: 2026-11-24_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
