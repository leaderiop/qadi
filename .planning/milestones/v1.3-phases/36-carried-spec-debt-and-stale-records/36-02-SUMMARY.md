---
phase: 36-carried-spec-debt-and-stale-records
plan: 02
subsystem: devtools
tags: [devtools, timeline, tdd, red-tests, effect, status-shape]

requires:
  - phase: 36-carried-spec-debt-and-stale-records
    provides: "36-01 mutation baseline and ledger (phase_base e0182035)"
provides:
  - "TF9 RED on the phase base: a replaced timeline read keeps writing its backlog"
  - "TimelineStatus (Reading | Stopped { reason }), TimelineStatusReadout, idleTimelineStatus, TimelineFeed.status, DockModel.timelineStatus, UseTimeline.status and UseTimeline.restart, TimelineStatus exported from @qadi/devtools/react (shape only)"
  - "TF10..TF17, M29, UT1..UT3: RED where 36-06 lands the fix, green where they state what must not change"
affects: [36-06, 36-07, 36-13, 36-14]

actuals:
  tokens: 5618
  tasks: 3
  commits: 3

plan_head_before: a5d118c2d4c6cbb26a203e165a97843a4309c681
plan_head_after: c7e6ce8a6376b4755b67b5ddbeca1e9da63c21c7

tech-stack:
  added: []
  patterns:
    - "Status shape landed ahead of behaviour so RED tests fail on an assertion, not on a missing member"
    - "TimelineStatus mirrors DiagnosticsStatus: Data.TaggedEnum with a Data.taggedEnum value, one module-private READING value so a repeat set notifies nothing"

key-files:
  created: []
  modified:
    - packages/devtools/src/model/TimelineFeed.ts
    - packages/devtools/src/model/DockModel.ts
    - packages/devtools/src/react/useTimeline.ts
    - packages/devtools/src/react/index.ts
    - packages/devtools/test/surface.test.ts
    - packages/devtools/test/surface.tst.ts
    - packages/devtools/test/model/TimelineFeed.test.ts
    - packages/devtools/test/model/DockModel.test.ts
    - packages/devtools/test/react/useTimeline.test.tsx

key-decisions:
  - "useTimelineStore keeps the one UseTimeline shape: a hand-fed store has no read, so it returns idleTimelineStatus's Reading and a restart that does nothing (pinned by UT3)"
  - "The react barrel carries one `export { TimelineStatus }`, which exports the value and the type of the merged declaration, exactly as DiagnosticsStatus does; no second `export type` line was needed"
  - "Gate 13 (spec:api) is red from the shape commit until 36-13 adds the overview row; per-task verifies here do not run it"

requirements-completed: [DEBT-04, WX-06]

duration: 15min
completed: 2026-11-13
status: complete
---

# Phase 36 Plan 02: Timeline status RED tests and shape Summary

**TF9 pins the late-accept defect RED on the base, a no-behaviour `TimelineStatus` shape reaches the model, the hook and the public barrel, and TF10..TF17, M29 and UT1..UT3 pin the stop/restart rules RED where 36-06 lands the generation token, `Effect.onExit` and `restart`.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-11-13T00:04Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- TF9 is committed alone, test file only, before any src change, and fails on the base on its assertion.
- The status shape (`TimelineStatus`, `TimelineStatusReadout`, `idleTimelineStatus`, `TimelineFeed.status`, `DockModel.timelineStatus`, `UseTimeline.status`/`restart`) reaches the public barrel and both surface pins; status never leaves `Reading` and `restart` does nothing, so behaviour is unchanged.
- The status rules are pinned: TF10, TF11, TF14, TF15, TF16, M29 and UT1 are RED on a behaviour assertion; TF12, TF13, TF17, UT2 and UT3 are green and keep the preserved rules (interruption is not a stop, an end by itself is not a stop, a closed feed does nothing).

## Task Commits

1. **Task 1: TF9, RED on the phase base** - `3b5a9c60` (test)
2. **Task 2: the status shape, threaded from the feed to the public barrel** - `fbc775a9` (refactor)
3. **Task 3: TF10..TF17, M29 and UT1..UT3** - `c7e6ce8a` (test)

**Plan metadata:** the docs commit that follows this file.

## RED evidence

TF9's failure on the base (commit `3b5a9c60`, src untouched):

```
AssertionError: expected [ 'a1', 'a2', 'a3', 'b' ] to deeply equal [ 'a1', 'b' ]
    at packages/devtools/test/model/TimelineFeed.test.ts:191:14
```

After Task 3 (devtools project, 1333 assertions): the eight failures are exactly the eight RED labels, each on an assertion:

| Case | Failure |
|---|---|
| TF9 | expected [ 'a1', 'a2', 'a3', 'b' ] to deeply equal [ 'a1', 'b' ] |
| TF10 | expected 'Reading' to equal 'Stopped' |
| TF11 | expected 'Reading' to equal 'Stopped' |
| TF14 | expected 'Reading' to equal 'Stopped' (the precondition stop) |
| TF15 | expected 'Reading' to equal 'Stopped' (the precondition stop) |
| TF16 | expected 1 to equal 2 (the read count; restart does nothing) |
| M29 | expected 'Reading' to equal 'Stopped' |
| UT1 | expected 'Reading' to equal 'Stopped' |

Passing: TF12, TF13, TF17, UT2, UT3 and every pre-existing devtools case (1325 passed, 8 failed).

Semantic assessment: every RED fails on the planned assertion for the planned reason, not on a missing member or a typo; the shape commit lands before TF10..UT1 so `pnpm typecheck` stayed green at every commit.

Green-reachability check: a scratch copy of the fix recorded in the research (generation token, `Effect.onExit` with `Cause.hasInterruptsOnly`, `restart`, `runSource` taking `Pick<TimelineStore, "accept">`) turned all 62 tests in the three files green; it was reverted before the commit, and `git status` showed no src change at Task 3. 36-06 lands the real fix.

## Files Created/Modified

- `packages/devtools/src/model/TimelineFeed.ts` - `TimelineStatus`, `TimelineStatusReadout`, `idleTimelineStatus`, `TimelineFeed.status` (shape only)
- `packages/devtools/src/model/DockModel.ts` - `timelineStatus: timelineFeed.status`
- `packages/devtools/src/react/useTimeline.ts` - `UseTimeline.status` and `restart` in both hooks
- `packages/devtools/src/react/index.ts` - exports `TimelineStatus`
- `packages/devtools/test/surface.test.ts`, `surface.tst.ts` - name `TimelineStatus`
- `packages/devtools/test/model/TimelineFeed.test.ts` - `delayed`, `counting`, `flaky`, `heardStatus` helpers; TF9..TF17
- `packages/devtools/test/model/DockModel.test.ts` - M29
- `packages/devtools/test/react/useTimeline.test.tsx` - `flaky` helper; UT1..UT3

## Decisions Made

- `useTimelineStore` keeps the one `UseTimeline` shape (a hand-fed store reads `Reading`, `restart` does nothing); restated in BEH-QD-510 by 36-13.
- One `export { TimelineStatus }` in the barrel carries both the value and the type, as `DiagnosticsStatus` does.

## Deviations from Plan

None - plan executed exactly as written. (The plan's "add `TimelineStatus` to a type export from the same module" is satisfied by the single merged value/type export; no separate `export type` line exists for `DiagnosticsStatus` either.)

## Known Gates

- **Gate 13 (`pnpm spec:api`) is red from `fbc775a9` until 36-13 Task 2**: the barrel gains `TimelineStatus` here and its `spec/overview.md` row lands after the CCR-QD-427 row in 36-13. 36-14's `pnpm check:pr` is the gate.
- The devtools project is red on the eight RED labels until 36-06.

## Issues Encountered

None.

## Known Stubs

`TimelineFeed.status.restart` and `idleTimelineStatus.restart` are deliberately inert and status never leaves `Reading`: the shape commit is behaviour-free by plan. 36-06 supplies the behaviour; TF10..TF16, M29 and UT1 are the pins that go green then.

## Threat Flags

None. T-36-03 mitigated (shape landed before the status tests; each RED verified from vitest's JSON); T-36-04 pinned RED by TF9 and fixed by 36-06.

## Next Phase Readiness

Ready for 36-03. 36-06 turns TF9, TF10, TF11, TF14, TF15, TF16, M29 and UT1 green.

## Self-Check: PASSED

- `3b5a9c60`, `fbc775a9`, `c7e6ce8a` are ancestors of HEAD; each message ends with the `Co-Authored-By: Claude Opus 5.5` trailer.
- TF9's commit touches only `packages/devtools/test/model/TimelineFeed.test.ts` and precedes every src change in this plan.
- All nine modified files exist; typecheck, lint and tstyche exit 0 at the shape commit; typecheck and lint exit 0 at HEAD.

---
*Phase: 36-carried-spec-debt-and-stale-records*
*Completed: 2026-11-13*
