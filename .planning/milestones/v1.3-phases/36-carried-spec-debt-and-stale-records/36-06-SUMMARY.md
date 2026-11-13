---
phase: 36-carried-spec-debt-and-stale-records
plan: 06
subsystem: devtools
tags: [devtools, timeline, effect, stopped-notice, focus-ring, react]
status: complete

requires:
  - phase: 36-carried-spec-debt-and-stale-records
    provides: "36-02 (TF9..TF17, M29, UT1..UT3 and the TimelineStatus shape), 36-05 (N14, N15 RED)"
provides:
  - "TimelineFeed: generation token, closed flag, exit observer (Cause.hasInterruptsOnly), restart"
  - "runSource(store: Pick<TimelineStore, \"accept\">, ...)"
  - "StoppedBox.tsx (package-private): the one stopped box, StopLedger<S>, noStops, stoppedKey"
  - "focusRing.ts (package-private): focusRingProps, the dock's own CSSOM focus ring"
affects: [36-07, 36-08, 36-14]

actuals:
  tokens: 6000
  tasks: 2
  commits: 2

plan_head_before: a95422258ca18595858a6b112e1b4f8e846e51f1
plan_head_after: b7b6c4937a22dcb8e4942626c65c6b90f82ebc9c
commits: 2

tech-stack:
  added: []
  patterns:
    - "a feed's read carries a generation token; a replaced or closed read's accept and exit change nothing (mirrors DiagnosticsFeed)"
    - "one stopped box shared by two feeds, with the copy and test-id prefix supplied by the caller"
    - "the focus ring is CSSOM writes on focus/blur gated by :focus-visible, no state and no stylesheet"

key-files:
  created:
    - packages/devtools/src/react/StoppedBox.tsx
    - packages/devtools/src/react/focusRing.ts
  modified:
    - packages/devtools/src/model/TimelineFeed.ts
    - packages/devtools/src/model/TimelineStore.ts
    - packages/devtools/src/model/DockModel.ts
    - packages/devtools/src/react/DiagnosticsNotice.tsx
    - packages/devtools/src/react/DevtoolsDock.tsx
    - packages/devtools/test/helpers.ts
    - packages/devtools/test/react/DiagnosticsNotice.test.tsx

key-decisions:
  - "StoppedBox is generic over the stop value (StoppedBox<DiagnosticsStatus>) so the dock's one ledger ref keeps its DiagnosticsStatus type and the box still compares the stop by identity"
  - "the focus-ring doc comment avoids the literal tokens the plan's static check greps for (a style element, React state hooks)"

requirements-completed: [DEBT-04, WX-04]

duration: 20min
completed: 2026-11-13
---

# Phase 36 Plan 06: Timeline stop, one stopped box and the dock's focus ring Summary

**The timeline feed now states a dying read as Stopped (never an interruption), drops a replaced read's late writes and restarts; the Diagnostics notice renders one shared StoppedBox with a hardened Restart button and the dock's own CSSOM focus ring.**

## Performance

- **Started:** 2026-11-13T00:00Z (approx)
- **Completed:** 2026-11-13T00:21Z
- **Tasks:** 2
- **Files modified:** 9 (2 created)

## Accomplishments

- TimelineFeed: each read carries a generation token; its marking `accept` returns when the token moved; the scope finalizer (added after the FiberHandle) bumps the token and sets `closed`. The read runs through `Effect.onExit`, which publishes `TimelineStatus.Stopped({ reason: Cause.pretty(cause) })` only for the current read on a non-interrupt failure. `status.restart` re-reads the current source unless closed.
- `runSource` takes `Pick<TimelineStore, "accept">` (accepts every store it did before); DockModel's header names eight readouts.
- `StoppedBox.tsx` and `focusRing.ts`, both package-private and in no barrel; the Diagnostics notice keeps its copy, test ids, alert-once rule and reason rendering and renders the box; `diagnosticsRootProps` spreads `focusRingProps`, its `style` stays `{ padding: 12 }`.

## Task Commits

1. **Task 1 (tracer): the timeline feed's token, exit observer and restart** - `6cf983c0` (fix)
2. **Task 2: one stopped box, the hardened Restart button and the focus ring** - `b7b6c493` (refactor)

## Test results

- After Task 1: devtools project failed exactly D1, N14, N15; TF9..TF17, M29 and UT1..UT3 all green.
- After Task 2: devtools project failed exactly D1 (1343 passed, 1 failed); N14 and N15 green; N1..N13 and every DiagnosticsScreens case green. `pnpm typecheck` and `pnpm lint` exit 0 (house-style: 491 files clean).
- The react project was not touched by this plan.

## Moved import lines

- `packages/devtools/src/react/DevtoolsDock.tsx`: `noStops` now from `./StoppedBox.tsx` (with `type StopLedger`; the ref is `useRef<StopLedger<DiagnosticsStatus>>(noStops)`).
- `packages/devtools/test/helpers.ts`: `noStops` from `../src/react/StoppedBox.tsx` (1 line changed).
- `packages/devtools/test/react/DiagnosticsNotice.test.tsx`: `noStops` removed from the `DiagnosticsNotice.tsx` import and imported from `../../src/react/StoppedBox.tsx` on its own line. No assertion changed.

## Decisions Made

See key-decisions in the frontmatter. Otherwise followed the plan as specified.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The plan's numstat check cannot hold for DiagnosticsNotice.test.tsx**
- **Found during:** Task 2 (static verify)
- **Issue:** the plan requires the `noStops` import to move to a second module while the test's import line also imports `DiagnosticsNotice` and `diagnosticsRootProps` from `DiagnosticsNotice.tsx`. Two modules need two lines, so `git diff --numstat` reads `2\t1` for that file where the verify script accepts only `1\t1`. `helpers.ts` is `1\t1`.
- **Fix:** split the import into two lines (the only way to import from two modules); no assertion line changed (the N1..N13 assertion-line check passes).
- **Files modified:** packages/devtools/test/react/DiagnosticsNotice.test.tsx
- **Verification:** every other static check of Task 2's verify passed; the typecheck, lint and the devtools run are green apart from D1.
- **Committed in:** b7b6c493
- **For 36-14:** its shape check for this file should expect one removed and two added lines (all import lines).

**2. [Rule 1 - Bug] Focus-ring doc comment tripped the plan's own static check**
- **Found during:** Task 2 (static verify)
- **Issue:** the comment named a style element in backticks, which the "no style element or state" regex matched in the file's text.
- **Fix:** reworded to "an injected stylesheet".
- **Committed in:** b7b6c493

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug in wording). **Impact on plan:** none on behaviour.

## Issues Encountered

None.

## Known Stubs

None.

## Threat Flags

None. T-36-11 (the exit observer and replaced-read writes) is mitigated by the generation token and `Cause.hasInterruptsOnly`; TF9, TF12, TF13 and TF17 pin the paths. T-36-12 accepted as planned.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

36-07 can render `StoppedBox` for the timeline (`hooks="qadi-timeline"`, `focusTarget="[data-testid='qadi-dock-body']"`) and put `focusRingProps` on the dock body. D1 remains RED for 36-08.

## Self-Check: PASSED

- StoppedBox.tsx and focusRing.ts exist; commits 6cf983c0 and b7b6c493 are ancestors of HEAD.

---
*Phase: 36-carried-spec-debt-and-stale-records*
*Completed: 2026-11-13*
