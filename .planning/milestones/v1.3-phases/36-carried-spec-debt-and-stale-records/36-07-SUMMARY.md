---
phase: 36-carried-spec-debt-and-stale-records
plan: 07
subsystem: devtools
tags: [devtools, react, timeline, a11y, stopped-notice]
requires:
  - phase: 36-06
    provides: TimelineStatus readout, StoppedBox, StopLedger, focusRingProps
provides:
  - TimelineNotice (package-private), readsTimeline record, timelineAnnounced ledger, focusable dock body
  - TN1..TN10
affects: [36-08, 36-13, 36-14]
tech-stack:
  added: []
  patterns: ["closed Record<TabId, boolean> so a new tab must decide", "second StopLedger ref per feed"]
key-files:
  created:
    - packages/devtools/src/react/TimelineNotice.tsx
    - packages/devtools/test/react/TimelineNotice.test.tsx
  modified:
    - packages/devtools/src/react/DevtoolsDock.tsx
    - packages/devtools/src/react/useDockModel.ts
key-decisions:
  - "The notice props are memoised in DockFrame (as the diagnostics ones are) and Screen takes them as one `timeline` prop"
requirements-completed: [DEBT-04]
status: complete
commits: 3
plan_head_before: bc3455bf13327e73b62398ad80182fb7b634b0da
plan_head_after: 0637ed5234cb4ba5a566745dd1b26e9f5934fd18
actuals:
  tokens: 9000
  tasks: 2
  commits: 3
duration: 20 min
completed: 2026-11-13
---

# Phase 36 Plan 07: The timeline notice Summary

A stopped timeline is stated above the log, inspector, policies and simulator screens through the shared stopped box, alerting once per stop with a Restart that returns focus to a ringed dock body, and the dock's duplicate empty source is gone.

## Commits

| Task | Hash | Subject |
|------|------|---------|
| 1 (RED) | bca406a2 | test(36-07): TN1..TN10 pin the timeline notice |
| 1 | e00c1113 | feat(36-07): the dock states a stopped timeline above the screens that show it |
| 2 | 0637ed52 | refactor(36-07): the dock passes its source through; the feed owns the empty source |

## Test results

- At the RED commit (`bca406a2`, against the dock of that commit): TN1 passed; TN2..TN10 failed (9 failed, 1 passed). TN8 failed on the missing `qadi-timeline-stopped`, the real reason.
- After `e00c1113` and after `0637ed52`: TN1..TN10 all pass; the devtools project (57 files, 1354 tests) fails exactly D1 (`D1 a description holds the host's own ports; only a preparation wraps them in a recorder`), owned by 36-08.
- Task 2: `DevtoolsDock.test.tsx` (empty-dock case), M30 (`DockModel.test.ts`) and L1..L4 (`TimelineLifetime.test.tsx`) pass: 106 tests. `pnpm typecheck` and `pnpm lint` exit 0.

## Deviations from Plan

None - plan executed exactly as written. One shape choice within the plan: `DockFrame` builds the notice props in a `useMemo` (status, `model.timelineStatus.restart`, ledger ref), mirroring the diagnostics `notice`, and `Screen` receives them as its `timeline` prop.

## Known Stubs

None.

## Threat Flags

None. The stop reason is rendered by the shared box as a React text child in a `<pre>` (T-36-14); TN3 reads it back as text. `readsTimeline` is closed over `TabId` and TN2 pins all seven tabs (T-36-13).

## Self-Check: PASSED

Files exist (`TimelineNotice.tsx`, `TimelineNotice.test.tsx`); commits bca406a2, e00c1113, 0637ed52 are ancestors of HEAD.
