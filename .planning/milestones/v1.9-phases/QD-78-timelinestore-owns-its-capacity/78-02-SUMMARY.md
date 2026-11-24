---
phase: QD-78-timelinestore-owns-its-capacity
plan: 02
subsystem: devtools-model-tests
tags: [red-evidence, timeline, feed, dock, tdd]
requires: [78-01]
provides:
  - eight capacity defect tests, each seen RED on the phase base
  - 78-RED-EVIDENCE.md, the RED outcome of every one of them
affects: [78-03, 78-04, 78-05, 78-06]
key-files:
  created:
    - .planning/phases/QD-78-timelinestore-owns-its-capacity/78-RED-EVIDENCE.md
  modified:
    - packages/devtools/test/model/Timeline.test.ts
    - packages/devtools/test/model/TimelineStore.test.ts
    - packages/devtools/test/model/TimelineFeed.test.ts
    - packages/devtools/test/react/useTimeline.test.tsx
    - packages/devtools/test/model/DockModel.test.ts
decisions:
  - "TF30 reads RED at its second refusal: the base assigns its inputs on the first refusal, so the second compares equal and throws nothing"
  - "M55 reads RED at the later configure with the held inputs, which moves the rails, the ports and the timeline on the base"
requirements-completed: []
metrics:
  duration: 30min
  completed: 2026-11-24
status: complete
commits: 2
plan_head_before: a57977529c28e4b6dd58ba970fe306071ca53b6e
plan_head_after: 78a06321c23648bf7ed94069b0ba5e31dcf29c92
actuals:
  tokens: 7000
  tasks: 2
  commits: 2
---

# Phase QD-78 Plan 02: the capacity defects, written and seen RED on the base Summary

Eight tests that fail on the unchanged `packages/devtools/src` and name the capacity defects 78-04 to 78-06 fix: a
zero-capacity timeline returning a new object per record, the feed's `configure` half applied by a refused capacity, the
hand-fed hook ignoring a changed capacity, and the dock holding inputs it never applied. `packages/devtools/src` equals
`phase_base` (`de13eb7f48f2e0e77b374299d20d2e5e891bef95`), and no existing test was edited.

## RED rows

| Test | File | First assertion on the base |
| ---- | ---- | --------------------------- |
| a record a zero-capacity timeline cannot keep returns the identical timeline | `Timeline.test.ts` | `expected { entries: [], capacity: +0 } to equal { entries: [], capacity: +0 }` |
| a record at a capacity of zero notifies no subscriber and keeps the snapshot | `TimelineStore.test.ts` | `expected 2 to equal +0` |
| TF30 a capacity that is not a non-negative integer throws and changes nothing, so a later configure compares with the inputs the feed held | `TimelineFeed.test.ts` | `refusal 2 throws: expected false to be true` |
| TF31 a restart after a refused configure reads the source the feed held | `TimelineFeed.test.ts` | `expected { reads: 1 } to deeply equal { reads: +0 }` |
| TF32 a zero-capacity feed tells its timeline listeners nothing for records it cannot keep | `TimelineFeed.test.ts` | `expected 2 to equal +0` |
| UT4 a changed capacity empties the hand-fed store at the new bound and keeps the store | `useTimeline.test.tsx` | `expected 5 to equal 1` |
| M55 a capacity the timeline refuses throws and changes nothing in the dock, so a later configure compares with the inputs the dock held | `DockModel.test.ts` | `expected 6 to equal +0` |
| M56 a timeline listener that throws on a capacity change is rethrown once the dock has applied the rest of the configure | `DockModel.test.ts` | `expected [] to deeply equal [ 'editor' ]` |

The four timeline-side files ran `Tests  6 failed | 91 passed (97)`, and `DockModel.test.ts` ran `Tests  2 failed | 61
passed (63)`; both exit non-zero. M56's last assertion (the diagnostics status is not `Off` after `diagnostics: {}`) was
checked on its own against the base with no throwing listener, so it holds once the throw no longer stops the configure.

## Commits

| Task | Commit | Files |
| ---- | ------ | ----- |
| 1 (tracer) | `324bf9da` | `Timeline.test.ts`, `TimelineStore.test.ts`, `TimelineFeed.test.ts`, `useTimeline.test.tsx`, `78-RED-EVIDENCE.md` |
| 2 | `78a06321` | `DockModel.test.ts`, `78-RED-EVIDENCE.md` |

The timeline commit precedes the dock commit, and both precede every commit that changes `packages/devtools/src` (none
does).

## Verification

- Task 1 verify: exit 0 (the failing titles are exactly the six defects and are RED lines of the evidence; TF4, TF14,
  TF26, TF27 and TF29 byte-identical to `phase_base`; no added forbidden construct, plan-local wording or over-long line;
  house-style clean; the RED commit holds exactly the four tests and the evidence with one trailer; source unchanged).
  It was re-run after the second commit and still exits 0.
- Task 2 verify: exit 0 (the five files fail exactly the eight titles, which equal the evidence's RED lines; no existing
  `DockModel.test.ts` line changed; house-style and `pnpm typecheck` clean; the dock commit follows the timeline commit).
- Tracer gate: the task-1 verify passed end to end before the dock task began.
- Base check: `/usr/bin/grep -nE "DEFAULT_TIMELINE_CAPACITY|capacity: undefined"` over `TimelineFeed.test.ts` prints
  nothing, so no existing feed test pins an omitted capacity against the default.

## Deviations from Plan

None. The plan executed as written. Where the plan said TF30's refusals each throw and "the last step resizes", the test
fails earlier on the base, at the second refusal, for the same cause (the first refusal's inputs were kept); the failure
is the defect and the test is unedited.

## Decisions Made

- The evidence keeps one `## RED rows` section with a `### The dock` subsection, so the file's `- RED:` lines are the eight
  titles and nothing else.
- `Timeline.test.ts` binds the two records to names before the assertions, to stay inside 90 columns.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

Files found: `78-RED-EVIDENCE.md` and the five test files; commits `324bf9da` and `78a06321` are ancestors of HEAD.
