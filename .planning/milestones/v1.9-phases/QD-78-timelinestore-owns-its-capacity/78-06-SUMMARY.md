---
phase: QD-78-timelinestore-owns-its-capacity
plan: 06
subsystem: devtools-model
tags: [timeline, bound, capacity, useTimelineStore, type-pins, tracer]
requires: [78-05]
provides:
  - bound(self, entries) returning the timeline it was given for a record kept nowhere
  - useTimelineStore building at the capacity option and resizing its one store from a layout effect
  - the TimelineStore resize type pinned in the root surface, each pin seen failing once
affects: [78-07, 78-08, 78-09]
key-files:
  created: []
  modified:
    - packages/devtools/src/model/Timeline.ts
    - packages/devtools/src/react/useTimeline.ts
    - packages/devtools/test/surface.tst.ts
    - .planning/phases/QD-78-timelinestore-owns-its-capacity/78-RED-EVIDENCE.md
decisions:
  - "the zero-capacity fix sits at the root, in bound, so the store's existing identity check and the feed (now that same store) stop publishing without a second guard"
  - "surface.tst.ts gained a local type import of TimelineStore (the file only re-exported it); no negative callable pin, so no budget moved"
  - "the first fix commit was amended once, before any later commit, to wrap a 91-column line the plan's own column check refuses"
requirements-completed: []
metrics:
  duration: 25min
  completed: 2026-11-24
status: complete
commits: 3
plan_head_before: 03f627c6
plan_head_after: 9f5292b020d19d0ac9429f4b3c5046f410a9fe3c
actuals:
  tokens: 6000
  tasks: 3
  commits: 3
---

# Phase QD-78 Plan 06: a record kept nowhere changes nothing Summary

`bound` in `Timeline.ts` now takes the timeline and the entries it would hold and returns the timeline itself when
nothing is kept and nothing was held, so `ingest` returns the identical timeline for a decision or an orphaned obligation
a zero-capacity timeline cannot keep; the store's identity check and the feed publish nothing for it. A timeline that
holds entries over a zero bound is still emptied, as a new value. `useTimelineStore` builds at
`options?.capacity ?? DEFAULT_TIMELINE_CAPACITY` and resizes its one store from a layout effect keyed on `[store,
capacity]`, and `surface.tst.ts` pins `TimelineStore["resize"]`, that a store without it is not a `TimelineStore`, and
that `TimelineFeed["timeline"]` is `TimelineStore`.

## Commits

| Task | Commit | Files |
| ---- | ------ | ----- |
| 1 (tracer) | `d9e1d9a1` | `Timeline.ts` |
| 2 | `cb5abcfe` | `useTimeline.ts` |
| 3 | `9f5292b0` | `surface.tst.ts`, `78-RED-EVIDENCE.md` |

## Results

- The tracer gate: after Task 1 the devtools project failed exactly UT4; the three zero-capacity RED tests and the
  zero-bound characterisation passed. After Task 2 the whole devtools project passes (1817 tests, 76 files), UT4 and UT5
  included. No RED test remains.
- `pnpm test:tstyche` whole: both passes green (75 files each). The type-test file count is unchanged and
  `check-house-style.mjs` printed the base fact's switch and type-test counts.
- The three type pins were each seen failing against an uncommitted edit of the committed tree (resize returning `void`,
  resize optional, the feed's `timeline` as a `Pick`), restored from byte copies; `git diff -- packages/devtools/src` is
  empty. The evidence is in `78-RED-EVIDENCE.md` under "Shown failing once, after the change".

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Task 1's verify refuses an import line that 78-05 legitimately changed**
- **Found during:** Task 1 verify
- **Issue:** the check that no `TimelineStore.test.ts` line written by the RED commit was changed flags the single `-import { decisionRecord, obligationRecord } ...` line, which 78-05 extended to import `heardOn` and `thrownBy` for its nine resize tests. No RED test body line was removed.
- **Fix:** ran the verify with that one removed line (`^-import `) excluded from the "-" scan; every other check ran unmodified and passed.
- **Files modified:** none

**2. [Rule 1 - Bug] 91-column line in the first fix commit**
- **Found during:** Task 1 verify
- **Issue:** the single-line `return ... ? self : { ...self, entries: kept }` was over the plan's 90-column limit.
- **Fix:** named the test `nothingChanged` and returned on a second line; amended the unpushed fix commit before any later commit existed, so the one-commit-per-task shape holds.
- **Files modified:** `packages/devtools/src/model/Timeline.ts`
- **Commit:** `d9e1d9a1`

**3. [Rule 3 - Blocking] `TimelineStore` not nameable in `surface.tst.ts`**
- **Found during:** Task 3
- **Issue:** the file only re-exported the type, so the new pins failed with TS2304.
- **Fix:** added `type TimelineStore` to the existing value/type import from `../src/index.ts`.
- **Files modified:** `packages/devtools/test/surface.tst.ts`
- **Commit:** `9f5292b0`

## Known Stubs

None.

## Threat Flags

None. T-78-14 and T-78-15 are mitigated as planned.

## Self-Check: PASSED

- `d9e1d9a1`, `cb5abcfe`, `9f5292b0` are ancestors of HEAD; each task's `<automated>` verify exited 0 (Task 1 with deviation 1).
- `Timeline.ts`, `useTimeline.ts`, `surface.tst.ts` and `78-RED-EVIDENCE.md` exist.
