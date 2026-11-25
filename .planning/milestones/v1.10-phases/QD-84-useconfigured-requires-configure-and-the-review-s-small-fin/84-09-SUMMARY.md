---
phase: QD-84-useconfigured-requires-configure-and-the-review-s-small-fin
plan: 09
subsystem: devtools
tags: [dock, stop-notice, hook]
requires: ["84-08"]
provides:
  - "useStopNotice(status, onRestart): StopNoticeProps<S>, the one ledger ref and memo, called once per feed"
  - "StopNoticeProps<S> declared once beside StopLedger<S>; DiagnosticsNoticeProps and TimelineNoticeProps are aliases of it"
  - "four surface refusals (useStopNotice, StopNoticeProps under both entries)"
affects: [84-10, 84-11]
key-files:
  created:
    - packages/devtools/src/react/useStopNotice.ts
  modified:
    - packages/devtools/src/react/StoppedBox.tsx
    - packages/devtools/src/react/DevtoolsDock.tsx
    - packages/devtools/src/react/DiagnosticsNotice.tsx
    - packages/devtools/src/react/TimelineNotice.tsx
    - packages/devtools/test/surface.tst.ts
    - .planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-RED-EVIDENCE.md
status: complete
completed: 2026-11-25
commits: 1
plan_head_before: 55516916
plan_head_after: 821a5aa3
actuals:
  tokens: 4000
  tasks: 2
  commits: 1
requirements-completed: []
---

# Phase QD-84 Plan 09: one stop-notice hook and one props type Summary

`DockFrame` now calls `useStopNotice(status, model.diagnostics.restart)` and
`useStopNotice(timelineStatus, model.timelineStatus.restart)`; the hook holds its own `useRef<StopLedger<S>>(noStops)`
and a memo keyed `[status, onRestart]`, so a rebuilt feed's new `restart` moves the notice. `StopNoticeProps<S>` lives in
`StoppedBox.tsx` and both notice props are one-line aliases. Markup, copy, test ids and styles did not move.

## Seen failing (84-RED-EVIDENCE.md)

Under scratch exports of `useStopNotice` and `StopNoticeProps` from each barrel (restored with `cp`, barrels equal HEAD),
`surface.tst.ts` failed all four new refusals with `Unused '@ts-expect-error' directive. ts(2578)`.

## Checks

Whole devtools project 94 files, 1966 tests green (DS1 to DS3, TN and N files held and unedited); `pnpm typecheck` clean;
`pnpm test:tstyche` green (422 tests); oxlint and house style clean; `one-ledger` prints its pass line; `scan-ids`,
`scan-forbidden` pass; `84-pinned-check.mjs` reports 8 of 8 refusals added; `84-check.mjs commit` and `trailers` pass
after the commit; the tree under packages, scripts and spec is clean.

## Commits

- 821a5aa3: refactor(84-09): the dock's two stop notices come from one hook and one props type

## Deviations from Plan

- The commit was made with `git commit` directly, then judged with `84-check.mjs commit` (that mode judges an existing
  commit; the plan's verify line passes the message to it as if it committed). The clean-tree check ran after the commit.

## Known Stubs

None.
