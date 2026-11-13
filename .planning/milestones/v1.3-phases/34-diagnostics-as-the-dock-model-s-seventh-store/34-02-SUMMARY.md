---
phase: 34-diagnostics-as-the-dock-model-s-seventh-store
plan: 02
subsystem: devtools
tags: [effect, fiberhandle, diagnostics, dock-model, testclock, stryker]

requires:
  - phase: 34-01
    provides: the mutation baseline and the lifecycle pins this plan must keep green
provides:
  - model/DiagnosticsFeed.ts, a scoped diagnostics poll with a closed status (Off, Starting, Live, Stopped) and restart()
  - DockModel.diagnostics, the seventh store, with DockModelInputs.diagnostics and DockModelInputs.reading
  - DiagnosticsDockOptions declared in the model, re-exported by react/useDiagnostics.ts
  - DiagnosticsFeed.test.ts (F1..F23), DockModel.test.ts M18..M28, settleTurns in test/helpers.ts
affects: [34-03, 34-05, 34-06, 34-07, 34-09]

actuals:
  tokens: 21000
  tasks: 3
  commits: 3
plan_head_before: f4c8973abf8e4dc8914607688cb86b6490110f54
plan_head_after: fcd2bee75b3bfbf12a8de4be8eac2907b71e460c
commits: 3

tech-stack:
  added: []
  patterns:
    - "a feed observes its own run's exit (Effect.onExit) with a generation token, because a FiberHandle drops a dead fiber silently"
    - "Starting is published before the fork, since the fork's synchronous prefix may already reach Live or Stopped"

key-files:
  created:
    - packages/devtools/src/model/DiagnosticsFeed.ts
    - packages/devtools/test/model/DiagnosticsFeed.test.ts
    - .planning/phases/34-diagnostics-as-the-dock-model-s-seventh-store/34-mutation-survivors.json
  modified:
    - packages/devtools/src/model/DockModel.ts
    - packages/devtools/src/react/useDiagnostics.ts
    - packages/devtools/test/model/DockModel.test.ts
    - packages/devtools/test/helpers.ts

key-decisions:
  - "sampled means the reading shown holds an accepted sample and resets only on Off, so a stop after a restart from Live reports true (the flagged assumption, kept)"
  - "the run token in the marking accept stays, and is named as a Stryker survivor: a stale accept is unreachable because a replaced run is interrupted before it reaches accept"

requirements-completed: []

coverage:
  - id: D1
    description: "A sample that dies is stated as Stopped with its reason and the last reading kept; restart by a changed field or restart() resumes it; an interruption is never a stop"
    requirement: DIAG-05
    verification:
      - kind: unit
        ref: "packages/devtools/test/model/DiagnosticsFeed.test.ts F4..F9, F17, F23; DockModel.test.ts M18"
        status: pass
    human_judgment: false
  - id: D2
    description: "The poll is forked from the model's init inputs and never awaited, so an asynchronous layer leaves the store Starting after the build"
    requirement: DIAG-01
    verification:
      - kind: unit
        ref: "DiagnosticsFeed.test.ts F3; DockModel.test.ts M20"
        status: pass
    human_judgment: false
  - id: D3
    description: "The seventh store holds the merged reading, recomputed on a feed change or a new reading identity, with the feed's snapshot itself when nothing is supplied"
    requirement: DIAG-02
    verification:
      - kind: unit
        ref: "DockModel.test.ts M21..M24, M27, M28"
        status: pass
    human_judgment: false
  - id: D4
    description: "Start, restart, stop, merge, undefined-and-back and rebuild are proved under TestClock with no render"
    requirement: DIAG-06
    verification:
      - kind: unit
        ref: "DiagnosticsFeed.test.ts F1..F23 and DockModel.test.ts M18..M28 (Tests  87 passed (87) with DiagnosticsStore.test.ts)"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-11-12
status: complete
---

# Phase 34 Plan 02: The diagnostics feed and the dock model's seventh store Summary

**A scoped diagnostics feed with a closed Off/Starting/Live/Stopped status (a throwing sample is stated, not frozen) and the merged reading as `makeDockModel`'s seventh store, proved under `TestClock` with no render.**

## Performance

- **Duration:** 10 min
- **Tasks:** 3
- **Files:** 3 created, 4 modified

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 (tracer) | `1cc85831` | feat(34-02): the diagnostics poll is the dock model's seventh store |
| 2 | `096bc765` | test(34-02): the diagnostics feed under TestClock with no render |
| 3 | `fcd2bee7` | test(34-02): the seventh store's rules, headlessly |

The tracer gate: Task 1's verifies passed (M18 and every existing DockModel and DiagnosticsStore case green, typecheck, lint, madge) before Task 2 began.

## Test results

- `DiagnosticsFeed.test.ts`: 20 cases at the Task 2 commit (`Tests  20 passed (20)`), 23 at the Task 3 commit.
- `DockModel.test.ts`: 36 cases, `Tests  36 passed (36)` (M18..M28 are new).
- DockModel, DiagnosticsFeed and DiagnosticsStore together: `Tests  87 passed (87)`.
- Whole devtools project: `Test Files  51 passed (51)`, `Tests  1278 passed (1278)`, so the 34-01 pins (H1..H3, K1..K5, L1..L4) stay green.
- `pnpm typecheck`, `pnpm lint` (house-style: 474 files clean) and `pnpm circular` pass.

## Mutation result

`pnpm exec stryker run stryker.devtools.mjs --mutate 'packages/devtools/src/model/DiagnosticsFeed.ts,packages/devtools/src/model/DockModel.ts'`, logs `stryker-34-02.log` (first run) and `stryker-34-02b.log` (final) in the scratchpad.

| File | Base | First run | Final | Killed | Survived |
|------|------|-----------|-------|--------|----------|
| `DockModel.ts` | 1 | 98.63 | **100.00** | 73 | 0 |
| `DiagnosticsFeed.ts` | new | 88.78 | **93.88** | 92 | 6 (all named) |

Survivors met on the first run and how each was closed:

- `DiagnosticsFeed.ts:179:38` (`current.reading === reading` forced true in `show`): killed by new F21 (a Live feed whose sample changed the reading notifies once).
- `DiagnosticsFeed.ts:185:45` and `:185:9` (`true` and `EqualityOperator`: the collector dropped from the run options): killed by new F22 (a handed collector reads into `portCalls`).
- `DiagnosticsFeed.ts:226:15` (`sampled = false` in `off()` forced true): killed by new F23 (a stop after Off and a new start is unsampled).
- `DockModel.ts:144:12` (`mergedOf` always builds a new object): killed by new M28 (with no reading supplied the store's snapshot is the feed's own, `diagnosticsOff` by identity).
- Named in `34-mutation-survivors.json` (equivalent or unreachable; no input can distinguish them):
  - `:184:9`, `:185:9`, `:186:9` ConditionalExpression `false`: a key present with `undefined` reads the same as an absent key; the conditional spread exists only for `exactOptionalPropertyTypes`.
  - `:191:5` and `:222:5` `generation -= 1`: the token only has to be distinct per run, and a decreasing counter is as distinct.
  - `:200:13` the run token in the marking `accept`: the flagged assumption's expected candidate; F16 drives the re-entrant case and the replaced run is interrupted before it reaches `accept`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug, in my own test] M23 reused a fresh reading literal**
- **Found during:** Task 3 (first run of M23)
- **Issue:** the second configure passed `{ activity: suppliedActivity }` as a new literal, which is a new reading identity and rightly notified; the plan's wording is "the same reading".
- **Fix:** hold one `reading` object and configure with it twice. No feed or model change.
- **Files modified:** packages/devtools/test/model/DockModel.test.ts
- **Commit:** fcd2bee7

### Additions beyond the plan's case list (the plan's own survivor rule)

Task 3 allows a case killing a survivor: F21, F22, F23 in `DiagnosticsFeed.test.ts` and M28 in `DockModel.test.ts`, all in the Task 3 commit. Consequence: the Task 2 verify's `Tests  20 passed (20)` held at its commit and the file now holds 23 cases.

No feed fix was forced by a test: all of F1..F20 passed on their first run against Task 1's module.

## Known Stubs

None.

## Threat Flags

None. The `Cause.pretty` reason lives only in the in-memory snapshot (T-34-06 accepted); no sink, log, metric or network call was added.

## Self-Check: PASSED

- FOUND: packages/devtools/src/model/DiagnosticsFeed.ts, packages/devtools/test/model/DiagnosticsFeed.test.ts, 34-mutation-survivors.json
- FOUND commits `1cc85831`, `096bc765`, `fcd2bee7` (ancestors of HEAD; each message ends with the Opus 5.5 trailer)
- `.planning/config.json` and `.planning/state.json` were never staged.

---
*Phase: 34-diagnostics-as-the-dock-model-s-seventh-store*
*Completed: 2026-11-12*
