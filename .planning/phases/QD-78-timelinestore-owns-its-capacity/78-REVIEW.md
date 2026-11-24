---
phase: QD-78-timelinestore-owns-its-capacity
reviewed: 2026-11-24T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - packages/devtools/src/model/Timeline.ts
  - packages/devtools/src/model/TimelineStore.ts
  - packages/devtools/src/model/TimelineFeed.ts
  - packages/devtools/src/model/DockModel.ts
  - packages/devtools/src/react/useTimeline.ts
  - packages/devtools/test/model/Timeline.test.ts
  - packages/devtools/test/model/TimelineStore.test.ts
  - packages/devtools/test/model/TimelineFeed.test.ts
  - packages/devtools/test/model/DockModel.test.ts
  - packages/devtools/test/react/useTimeline.test.tsx
  - packages/devtools/test/surface.tst.ts
  - packages/devtools/README.md
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
  necessity: 1
status: issues_found
---

# Phase QD-78: Code Review Report

**Reviewed:** 2026-11-24
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

The change folds the feed's inner/outer store pair into one `TimelineStore` with `resize`, and makes capacity compared by the bound it means. I traced the changed paths: `resize` ordering (validate, then move, then publish), pause release, the feed's `try/finally` around `resize`, the dock's `try/finally` and the hook's layout effect. I found no defect in them. A refused capacity throws before any state moves in all three callers. A listener's throw leaves the state already changed and still starts the read. `inputs` is assigned only after validation.

One real gap: `bound` claims that a record the timeline keeps nowhere returns the same timeline, but it only does this for the zero-capacity empty case. A full, non-zero timeline still publishes for a record it drops. I traced this from the code and did not run it, because vitest could not start in this sandbox (`Cannot read properties of undefined (reading 'config')`).

The `DockSession` adjacent check is below as IN-01.

necessity: read `necessity-review.md`.

## Warnings

### WR-01: `bound` publishes for a record a full timeline drops, contradicting its own contract

**File:** `packages/devtools/src/model/Timeline.ts:236-252`
**Issue:** The new doc says "A record the timeline keeps nowhere returns the timeline it was given, so a store that compares by identity publishes nothing for it". The implementation covers only `kept.length === 0 && self.entries.length === 0`, which is capacity 0 on an empty timeline.

Failure scenario: capacity 2 holds entries at `at` 200 and 300. A reconnecting SSE source replays the backlog, which includes a record at `at` 100 that was evicted earlier. It is not a duplicate, because dedupe only sees retained entries, so `ingestDecision` goes through `insert`. `insert` places it first, `slice` drops it, and `bound` returns `{ ...self, entries: kept }`. That is a new object holding exactly the same entries.

`TimelineStore.accept` then calls `view.set`, which sees a new reference and notifies. `DockModel`'s listener sees `next !== shown` and runs `spread()`, which recomputes `catalogueOf`, and `DockSession.setTimeline` recomputes `pairedEntries` and the counts. A backlog of N evicted records costs N full recomputes and N renders over an unchanged timeline. This is the "replaying feed costs no render" outcome the `accept` comment promises.

No new test covers it. TF32, the `Timeline` zero-capacity tests and the store zero-capacity test all use capacity 0.

**Fix:** Compare the kept entries with the held ones, instead of testing for empty. `sameElements` already exists in `ExternalStore.ts` and is reference-equal per element:
```ts
import { sameElements } from "./ExternalStore.ts";

const bound = (self: Timeline, entries: ReadonlyArray<TimelineEntry>): Timeline => {
  const kept = entries.slice(Math.max(0, entries.length - self.capacity));
  return sameElements(kept, self.entries) ? self : { ...self, entries: kept };
};
```
This subsumes the zero-capacity case. A timeline holding entries over its bound is still emptied, because `kept` then differs from `self.entries`. Add a test: ingest an older record into a full timeline and expect the identical timeline back.

## Info

### IN-01: `DockSession.setTimeline`'s `next === timeline` guard is not redundant (adjacent spot, out of phase scope)

**File:** `packages/devtools/src/model/DockSession.ts:99`
**Issue:** The `TimelineStore.accept` guard was redundant because `view.set` already notifies only for a new reference. The `DockSession` guard sits in front of a different write: `commit` calls `store.publish(build())`. `publish` notifies unconditionally, and `build()` always allocates a fresh snapshot object. Without the guard, `setTimeline(sameTimeline)` would recompute `pairedEntries`, `countsOf`, `environmentsOf` and `filtered()` and notify every dock subscriber, over a timeline that did not change.

That call happens today. `DockModel.configure` calls `spread()` when only the catalogue changed (`DockModel.ts:221`, `dock.setTimeline(shown)`). `shown` is the same reference there, and the guard is what keeps the dock quiet. `test/model/DockSession.test.ts` ("the same timeline publishes nothing; a new one publishes") pins it. Keep the guard. The one-line inline comment this phase added in `TimelineStore.accept` has no counterpart here, and a reader could mistake the two guards for the same pattern. A short comment such as "`commit` publishes unconditionally, so the identity check is the only no-op guard" would prevent that.
**Fix:** None required. Optionally add that comment.

### IN-02: `effectiveCapacity` and the feed constructor repeat a default `emptyTimeline` already applies

**File:** `packages/devtools/src/model/TimelineFeed.ts:110-112` and `:144-145`
**Issue:** **Category:** necessity (generality without instantiation, `?? DEFAULT_TIMELINE_CAPACITY`).
`emptyTimeline` already reads `options?.capacity ?? DEFAULT_TIMELINE_CAPACITY` (`Timeline.ts:77`). So `emptyTimeline({ capacity: capacity ?? DEFAULT_TIMELINE_CAPACITY })` in `effectiveCapacity` yields the same result without the `??`. The same applies to `makeTimelineStore({ capacity: inputs.capacity ?? DEFAULT_TIMELINE_CAPACITY })` in `makeTimelineFeed`. The behavior cannot differ, which is provable from `Timeline.ts`. It is Info, not Warning, because stating the default at the call site documents the "omitted equals default" rule that TF33 pins. Removing it is a readability judgment for a maintainer.
**Fix:** Optionally drop both `??` and the `DEFAULT_TIMELINE_CAPACITY` import where it becomes unused (`useTimeline.ts` still needs its own, since `resize` takes a `number`).

---

_Reviewed: 2026-11-24_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
