---
phase: QD-78-timelinestore-owns-its-capacity
plan: 05
subsystem: devtools-model
tags: [dock, configure, capacity, resize, tracer]
requires: [78-04]
provides:
  - DockModel.configure checks the capacity through effectiveCapacity before it moves anything
  - the rest of configure applied in a finally around the timeline feed's configure, so a listener's throw is rethrown after every other input is applied
  - nine resize-rule tests pinning TimelineStore.resize, each shown failing against its own edit
affects: [78-06, 78-07, 78-08]
key-files:
  created: []
  modified:
    - packages/devtools/src/model/DockModel.ts
    - packages/devtools/test/model/TimelineStore.test.ts
    - .planning/phases/QD-78-timelinestore-owns-its-capacity/78-RED-EVIDENCE.md
decisions:
  - "the dock holds no capacity check of its own: it calls effectiveCapacity, so the rule stays stated once in emptyTimeline"
  - "the dock tells a refusal from a listener throw by position, never by reading the error: the check runs before inputs move, the try covers only the feed's configure"
  - "the test fixtures live inside each it; only a pure message builder (refused) is shared in the resizing describe"
requirements-completed: []
metrics:
  duration: 30min
  completed: 2026-11-24
status: complete
commits: 2
plan_head_before: a20e46bb
plan_head_after: 44049265ebe3e83d0cf335baf963271fd5473428
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
---

# Phase QD-78 Plan 05: the dock applies a capacity whole or not at all Summary

`DockModel.configure` now reads the capacity through `effectiveCapacity(next.capacity)` first, so a capacity the timeline
refuses throws before `inputs` moves and the dock keeps its catalogue, roles, ports, gates and diagnostics; past the check
it assigns `inputs`, configures the timeline feed with the effective capacity inside a `try`, and applies the catalogue,
the ports, the gates, the diagnostics and the shown reading in the `finally`, so a timeline listener's throw is rethrown
once everything else is applied. The store's `resize` is pinned by nine tests, each seen failing against its own edit.

## Commits

| Task | Commit | Files |
| ---- | ------ | ----- |
| 1 (tracer) | `7723b7b7` | `DockModel.ts`, `78-RED-EVIDENCE.md` |
| 2 | `44049265` | `TimelineStore.test.ts`, `78-RED-EVIDENCE.md` |

## What changed

- `DockModel.ts`: `effectiveCapacity` imported beside `makeTimelineFeed`; `configure` reordered as above; the header
  paragraph, `DockModelInputs` and `configure` docs state the capacity rule and cite ADR-QD-191 (capacity compared by the
  bound it means, applied whole or not at all, an omitted one being `DEFAULT_TIMELINE_CAPACITY`).
- `TimelineStore.test.ts`: `describe("resizing")` with nine tests (new capacity; same capacity; paused and new; paused and
  same; refused values -1, 2.5, NaN, Infinity on a paused store; zero and negative zero; one listener's throw as itself
  and two as one `AggregateError`; a re-entrant same-capacity resize answered `false`; no capacity, `null`, a string and a
  bigint reached through `Reflect.apply` with no cast).

## Shown failing once

Recorded in `78-RED-EVIDENCE.md` under "The dock, shown failing once after the change" and "The resize rules of the
store, shown failing once".

- M55 under `const capacity = next.capacity;`: `expected 4 to equal +0`.
- M56 with the `try`/`finally` unwrapped: `expected [] to deeply equal [ 'editor' ]`.
- The nine resize tests, one edit each (nine distinct edits), each failing under its own edit and passing restored.

## Verification

- Tracer gate: after Task 1 the devtools project fails exactly the four RED tests 78-06 turns green (the three
  zero-capacity ones and UT4); M55 and M56 pass unedited since the dock RED commit (`DockModel.test.ts` is byte-identical
  to it). Task 1 verify exit 0.
- Task 2 verify exit 0: the store file fails only the one zero-capacity RED test; the nine tests pass and are recorded
  with distinct edits; typecheck and `scripts/check-house-style.mjs` clean; no source edit left; commit holds exactly the
  test file and the evidence with one trailer. oxlint on `packages/devtools` reports only warnings in
  `HeldChoice.test.ts` (not touched by this plan).
- Full devtools run after both commits: 1813 passed, 4 failed (exactly the four waiting tests).

## RED tests that remain

| Test | Waits for |
| ---- | --------- |
| a record a zero-capacity timeline cannot keep returns the identical timeline | 78-06 |
| a record at a capacity of zero notifies no subscriber and keeps the snapshot | 78-06 |
| TF32 a zero-capacity feed tells its timeline listeners nothing for records it cannot keep | 78-06 |
| UT4 a changed capacity empties the hand-fed store at the new bound and keeps the store | 78-06 |

## Deviations from Plan

**1. [Rule 3 - blocking] Restoring a demonstration with `git checkout --` would have discarded the uncommitted fix.**
- **Found during:** Task 1 demonstrations (the first `git checkout -- DockModel.ts` reverted the uncommitted fix to the
  base).
- **Issue:** the plan's restore step assumes the fix is committed; here the fix is the change under commit.
- **Fix:** restored the fix from a byte copy kept in the scratch directory (`cmp` confirmed identity) and ran the M56
  demonstration the same way. Nothing was lost and no demonstration edit reached a commit.
- **Files modified:** none beyond the plan's.

## Decisions Made

- The dock's `try` wraps only `timelineFeed.configure`, so the `finally` applies the other inputs for any throw from that
  call; past `effectiveCapacity` the feed throws only from a listener on a publish it has made (ADR-QD-177), so no error
  is inspected.
- Test 7's edit (`timeline = next` after the publish) is shown by the second resize publishing again and the listener's
  throw escaping; that is the first message recorded, which is the real failure the pinned assertion guards against.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- `DockModel.ts`, `TimelineStore.test.ts`, `78-RED-EVIDENCE.md` exist; commits `7723b7b7` and `44049265` are ancestors of
  HEAD; `git diff --quiet -- packages/devtools/src` holds.
