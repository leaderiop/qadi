---
phase: QD-78-timelinestore-owns-its-capacity
reviewed: 2026-11-24T08:55:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - packages/devtools/src/model/Timeline.ts
  - packages/devtools/test/model/Timeline.test.ts
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
  necessity: 0
status: clean
---

# Phase QD-78: Code Review Report (iteration 2)

**Reviewed:** 2026-11-24T08:55:00Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** clean

## Summary

Re-review of fix commit f3afbc5c. `bound` in `Timeline.ts` now returns `self` when `sameElements(kept, self.entries)` holds. Before, it did so only when both lists were empty.

**WR-01 is resolved.** A full timeline that evicts an older, non-duplicate record at once now gets the identical timeline back. Here `insert` puts the newcomer at index 0, `bound` slices it off, and `kept` holds the same entry objects as `self.entries`, in the same order. The new test "an older record a full timeline evicts at once returns the identical timeline" pins this with `assert.strictEqual`. Its twin, "a newer record a full timeline keeps returns a new timeline with the oldest dropped", pins the opposite branch.

Checks on the fix:

- **Reorder.** `sameElements` compares by index (`one === b[index]`), so a reorder gives a new timeline. `ingest` cannot reorder without adding or removing an entry in any case. `insert` always adds one entry. `ingestDecision` also removes the orphan, and the replacement `TimelineDecision` is a new object, so it never compares equal to the orphan it replaced.
- **Over the bound.** A timeline over its bound has `entries.length > capacity >= kept.length`. The lengths differ, so it is emptied or trimmed as a new value. The existing zero-bound tests still pass.
- **Empty and empty.** `sameElements([], [])` is true, so the zero-capacity case that was already covered is unchanged.
- **Reference comparison.** `insert` and the `filter` keep the existing entry objects and only add the new `TimelineDecision` or `TimelineOrphan`. Reference equality per element is therefore the right test. A kept list containing the newcomer always differs from `self.entries` by that new object, so a real change is never swallowed.
- **Import cycle.** None. `ExternalStore.ts` imports only `effect/Effect` and `effect/Scope`, and it does not reach `Timeline.ts`. `TimelineStore.ts` and the other model files already import `ExternalStore.ts`.

Verification run:

- `npx vitest run --project devtools packages/devtools/test/model/Timeline.test.ts`: 40 of 40 pass.
- `tsc --noEmit -p packages/devtools/tsconfig.src.json`: no diagnostics.

All reviewed files meet quality standards. No issues found.

---

_Reviewed: 2026-11-24T08:55:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
