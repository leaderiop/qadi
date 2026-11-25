---
phase: QD-78-timelinestore-owns-its-capacity
plan: 04
subsystem: devtools-model
tags: [timeline, store, feed, capacity, resize, tracer]
requires: [78-03]
provides:
  - TimelineStore.resize(capacity): boolean, validate first, same capacity a no-op answering false
  - clear empties at the capacity the store holds now
  - effectiveCapacity in TimelineFeed.ts (module export, not in the package barrel)
  - one store per feed, returned as `timeline`; no mirror, builder or forwarder
  - configure checks the capacity before it assigns inputs, and reads when the store resized or the source moved
  - idleTimeline.resize answers false
affects: [78-05, 78-06]
key-files:
  created: []
  modified:
    - packages/devtools/src/model/TimelineStore.ts
    - packages/devtools/src/model/TimelineFeed.ts
    - packages/devtools/test/model/TimelineStore.test.ts
    - packages/devtools/test/model/TimelineFeed.test.ts
    - .planning/phases/QD-78-timelinestore-owns-its-capacity/78-RED-EVIDENCE.md
decisions:
  - "resize publishes with `publish`, not `set`: a capacity change notifies whatever the identity of the value, and a pause release always publishes"
  - "configure starts a read in a `finally` around `resize`, so a listener that throws on the capacity publish is rethrown only after the read that refills the timeline has started"
  - "effectiveCapacity is a function declaration, so Stryker's ignoreStatic adds no static arrow mutant; it is exported from the module for the dock and kept out of the barrel"
requirements-completed: []
metrics:
  duration: 25min
  completed: 2026-11-24
status: complete
commits: 2
plan_head_before: 8f3d49ebd4cc14a55f240ab69d3e696693ccc903
plan_head_after: c08337eb4b8b70f612234be848e8bf835edd94d3
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
---

# Phase QD-78 Plan 04: the store resizes itself and the feed holds that one store Summary

`TimelineStore.resize(capacity): boolean` validates through `emptyTimeline({ capacity })` before anything moves, answers
`false` for the capacity the store already has (no publish, entries and pause kept), and otherwise empties at the new
bound, releases a pause, publishes once and answers `true`. `clear` now empties at the held capacity. The feed builds one
store at `inputs.capacity ?? DEFAULT_TIMELINE_CAPACITY` and returns it; the per-capacity builder, the replaceable binding,
the mirror store, its publish listener and the six-member forwarder are gone. `configure` calls `effectiveCapacity` first,
so a refused capacity throws with the inputs, the timeline and the read untouched, and an omitted capacity and the
default are one bound.

## Commits

| Task | Commit | Files |
| ---- | ------ | ----- |
| 1 (tracer) | `99e810af` | `TimelineStore.ts`, `TimelineFeed.ts`, `TimelineStore.test.ts`, `TimelineFeed.test.ts`, `78-RED-EVIDENCE.md` |
| 2 | `c08337eb` | `TimelineFeed.test.ts` (TF36), `78-RED-EVIDENCE.md` |

## RED then GREEN, in order

- The clear-after-resize test was seen failing (`expected 5 to equal 3`) with `resize` in place and `clear` unchanged,
  then passed once `clear` read `timeline.capacity`.
- The base form of TF33 was run unedited against the new feed and failed (`expected [ 'manual' ] to deeply equal []`);
  only TF33 was rewritten, to the one-bound rule. TF4, TF14, TF26, TF27, TF29 (against `phase_base`) and TF30, TF31, TF32,
  TF34, TF35 (against the characterisation commit) are byte-identical.
- After the change, TF33 was seen failing under the identity rule (`expected { started: 2, finalized: 1 } to deeply equal
  { started: 1, finalized: +0 }`) and TF36 under `resize: () => true` (`expected true to be false`); both edits were
  restored and `git diff --quiet -- packages/devtools/src` holds.

## RED tests that remain, and why

The devtools project fails exactly six tests, all owned by later plans:

| Test | Waits for |
| ---- | --------- |
| a record a zero-capacity timeline cannot keep returns the identical timeline | 78-06 (`bound` returns `self`) |
| a record at a capacity of zero notifies no subscriber and keeps the snapshot | 78-06 |
| TF32 a zero-capacity feed tells its timeline listeners nothing for records it cannot keep | 78-06 |
| UT4 a changed capacity empties the hand-fed store at the new bound and keeps the store | 78-06 (`useTimelineStore` follows `capacity`) |
| M55 a capacity the timeline refuses throws and changes nothing in the dock | 78-05 (`DockModel.configure` checks first) |
| M56 a timeline listener that throws on a capacity change is rethrown once the dock has applied the rest | 78-05 |

TF30, TF31, TF33 (rewritten), TF34, TF35, TF36 and the clear test pass.

## Verification

- Task 1 verify: exit 0 (the six failing titles exactly; source greps; no second store or forwarder; `effectiveCapacity`
  not in `index.ts`; TF identities; evidence lines; no forbidden construct, plan-local wording or over-long line;
  `pnpm typecheck`, oxlint and `scripts/check-house-style.mjs` clean; the commit holds exactly its five files and one
  trailer).
- Task 2 verify: exit 0 with its first step relaxed (see Deviations); the rest ran as written (TF36 passing, evidence
  lines, no source edit left, no forbidden construct, typecheck, commit scope and trailer).
- Tracer gate: the task-1 verify passed end to end before the demonstrations began.

## Deviations from Plan

**1. [Rule 3 - blocking] The task-2 verify asserts the whole feed file passes, which TF32 prevents.**
- **Found during:** Task 2 verify.
- **Issue:** its first step is `vitest run TimelineFeed.test.ts || exit`, but TF32 is one of the six RED tests the plan
  itself keeps failing until 78-06, so the step cannot pass at this point of the phase.
- **Fix:** ran the verify with only that exit replaced by `|| true`; the next step still requires TF36 to be `passed` in
  the JSON report, and every other check is unchanged. TF32 was not edited.
- **Files modified:** none.

**2. [Rule 3 - blocking] A one-line source statement and the 90-column check disagree.**
- **Found during:** Task 1 verify.
- **Issue:** the verify greps the literal `makeTimelineStore({ capacity: inputs.capacity ?? DEFAULT_TIMELINE_CAPACITY })`
  and rejects added lines over 90 columns; the plan's one-line form is 98 columns.
- **Fix:** the statement is split after `const timeline =` so the call stays on one line of 82 columns. The first commit
  was amended (unpushed, same files) to carry the wrapped doc comments and this split.
- **Files modified:** `TimelineFeed.ts`, `TimelineStore.ts`.

## Decisions Made

- The new TF33 counts timeline notifications with a listener, as the plan states, and asserts the count at each step
  (1, 1, 2, 2), so a silent empty-and-republish would fail it as well as a re-read.
- TF36 is an `it.effect` over `Effect.sync` to match the file's other tests; it builds nothing at module load.
- `resize` is declared after `clear` in the interface and the object literal, ahead of `setPaused`.

## Known Stubs

None.

## Threat Flags

None. T-78-07 (a refused capacity changes nothing) is held by `effectiveCapacity` running before the inputs are
assigned, T-78-08 by the single returned store, T-78-09 by `resize` always publishing.

## Self-Check: PASSED

Files found: the two source files, the two test files and `78-RED-EVIDENCE.md`; commits `99e810af` and `c08337eb` are
ancestors of HEAD.
