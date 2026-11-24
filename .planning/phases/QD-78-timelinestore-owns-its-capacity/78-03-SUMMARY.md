---
phase: QD-78-timelinestore-owns-its-capacity
plan: 03
subsystem: devtools-model-tests
tags: [characterisation, timeline, feed, hook, tdd]
requires: [78-02]
provides:
  - five characterisations that pass on the phase base beside the eight RED tests
  - each of the five shown failing once against a one-line, uncommitted edit of the base source
affects: [78-04, 78-05, 78-06]
key-files:
  created: []
  modified:
    - packages/devtools/test/model/Timeline.test.ts
    - packages/devtools/test/model/TimelineFeed.test.ts
    - packages/devtools/test/react/useTimeline.test.tsx
    - .planning/phases/QD-78-timelinestore-owns-its-capacity/78-RED-EVIDENCE.md
decisions:
  - "TF33 states the base's identity comparison (an omitted capacity and the default each resize); 78-04 changes exactly its assertions with the effective-capacity rule"
  - "The zero-bound demonstration replaces `bound` with `(self) => self`; the identity assertion still passes there (ingest spreads a new object) and the entries assertion is the first to fail"
requirements-completed: []
metrics:
  duration: 20min
  completed: 2026-11-24
status: complete
commits: 2
plan_head_before: 0fb286d103ece4951a103cd8573a8cd8582c7b23
plan_head_after: 9ab5c35b4295337fe5751f4d523affa4377259f5
actuals:
  tokens: 6000
  tasks: 2
  commits: 2
---

# Phase QD-78 Plan 03: the kept behaviour and the one changed rule, characterised on the base Summary

Five tests that pass on the unchanged `packages/devtools/src` and pin what the change keeps and the one rule it changes:
an omitted capacity and the default each empty and re-read the timeline (TF33, which 78-04 changes with the source), the
store a host holds is one object that hears each capacity change once (TF34), a capacity change while paused releases the
pause (TF35), a hand-built timeline over a zero bound is emptied by the next record, and a same-capacity re-render of the
hand-fed hook keeps its entries (UT5). Each was then seen failing against a one-line edit of the base source it is about,
and the edit was restored. `packages/devtools/src` equals `phase_base`
(`de13eb7f48f2e0e77b374299d20d2e5e891bef95`).

## Characterised and shown failing

| Test | File | Demonstration edit | First assertion message |
| ---- | ---- | ------------------ | ----------------------- |
| TF33 omitted and default capacity each empty and re-read | `TimelineFeed.test.ts` | `const resized = false;` | `expected [ 'manual' ] to deeply equal []` |
| TF34 one store, each emptied timeline heard once | `TimelineFeed.test.ts` | `const push = () => {};` | `expected [] to deeply equal [ 3, 2 ]` |
| TF35 a capacity change while paused releases the pause | `TimelineFeed.test.ts` | `isPaused: () => true,` | `expected true to be false` |
| a timeline holding entries over a zero bound is emptied by the next record | `Timeline.test.ts` | `bound = (self) => self` | `expected [ TimelineDecision{ …(6) }, …(1) ] to deeply equal []` |
| UT5 a same-capacity re-render keeps the hand-fed entries | `useTimeline.test.tsx` | `const [store] = [makeTimelineStore(options)];` | `expected { entries: [], capacity: 3 } to equal { entries: [], capacity: 3 }` |

With the five added, the five files of 78-02 plus `DockModel.test.ts` ran `Tests  8 failed | 157 passed (165)`, and the
eight failures are exactly the eight `- RED:` titles of 78-02.

## Commits

| Task | Commit | Files |
| ---- | ------ | ----- |
| 1 (tracer) | `1188df9e` | `Timeline.test.ts`, `TimelineFeed.test.ts`, `useTimeline.test.tsx`, `78-RED-EVIDENCE.md` |
| 2 | `9ab5c35b` | `78-RED-EVIDENCE.md` |

Both follow the two 78-02 commits and precede every commit that changes `packages/devtools/src` (none does).

## Verification

- Task 1 verify: exit 0 (failing titles exactly the eight RED ones; the five characterised titles pass; no forbidden
  construct, plan-local wording or over-long line in the added test lines; house-style and `pnpm typecheck` clean; the
  commit holds exactly its four files with one trailer; source equals `phase_base`).
- Task 2 verify: exit 0 (each characterised title has a `- shown failing:` line; no demonstration edit left; the commit
  holds exactly the evidence with one trailer and follows the characterisation commit).
- Tracer gate: the task-1 verify passed end to end before the demonstrations began.
- `git diff --quiet de13eb7f48f2e0e77b374299d20d2e5e891bef95 HEAD -- packages/devtools/src` holds.

## Deviations from Plan

None. The plan executed as written. The `Tests` line recorded in the evidence is the JSON reporter's counts (8 failed, 157
passed, 165) rather than a console line.

## Decisions Made

- The `DEFAULT_TIMELINE_CAPACITY` import in `TimelineFeed.test.ts` is wrapped into a multi-line import to stay inside 90
  columns.
- UT5's two renders are distinct `renderHook` calls with their own names (`sized`, `bare`) so the same-capacity and the
  none-after-none cases are asserted against separate held references.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

Files found: `78-RED-EVIDENCE.md` and the three test files; commits `1188df9e` and `9ab5c35b` are ancestors of HEAD.
