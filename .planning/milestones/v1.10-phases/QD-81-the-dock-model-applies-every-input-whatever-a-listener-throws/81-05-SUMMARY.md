---
phase: QD-81
plan: 05
subsystem: devtools-model
tags: [begin-to-fork-window, callAll, try-finally, feeds, devtools]
requires:
  - phase: QD-81
    provides: callAll in ExternalStore.ts (81-04), the red TF28, TF29, TF37, F31, SR6, G49 tests and the pinned check (81-03)
provides:
  - TimelineFeed.configure through callAll over a resize and a read, each reading held when it runs
  - readSource, DiagnosticsFeed.start and SimulationSession.start fork their run in the finally of the publish that announces it
  - the feeds' doc comments restated: a listener throw is rethrown once the work has started
affects: [81-06, 81-07, 81-10]
key-files:
  modified:
    - packages/devtools/src/model/TimelineFeed.ts
    - packages/devtools/src/model/DiagnosticsFeed.ts
    - packages/devtools/src/model/SimulationSession.ts
key-decisions:
  - "Decided autonomously (at planning): try/finally, not callAll, at the three publish-then-fork sites, because only the publish can throw there and a callAll message could never be read; recorded in ADR-QD-194 by 81-07"
requirements-completed: [COLL-03, COLL-05, WX-04, WX-07]
duration: 12min
completed: 2026-11-24
status: complete
commits: 2
plan_head_before: 4d69681f9fc5986a94197e3b68ab6c02098eb03d
plan_head_after: 5eddf074f4514778e8163fe196e29d8f1b2d2b45
actuals:
  tokens: 3000
  tasks: 2
  commits: 2
coverage:
  - id: D1
    description: "TimelineFeed.configure runs its resize and its read whatever a listener throws on either, rethrows one value as itself or both as one AggregateError (resize first), and follows a nested configure"
    requirement: COLL-05
    verification:
      - kind: unit
        ref: "packages/devtools/test/model/TimelineFeed.test.ts#TF28, TF29, TF37"
        status: pass
    human_judgment: false
  - id: D2
    description: "The diagnostics poll and the simulation run start whatever a listener throws on Starting or Running; GatesFeed (fork before publish) is unchanged"
    requirement: COLL-05
    verification:
      - kind: unit
        ref: "packages/devtools/test/model/DiagnosticsFeed.test.ts#F31; SimulationSession.runs.test.ts#SR6; GatesFeed.test.ts#G49"
        status: pass
    human_judgment: false
---

# Phase QD-81 Plan 05: the begin-to-fork windows closed Summary

A listener that throws on `Reading`, `Starting` or `Running` no longer keeps the read, the poll or the run from starting:
each publish is a `try` whose `finally` forks, and the throw is rethrown after the fork. The timeline feed's `configure`
runs its resize and its read through `callAll`, each step reading `held` when it runs, so a nested `configure` wins.

## Tasks

1. Tracer: `TimelineFeed.ts`, `configure` through `callAll` with "More than one step of the timeline feed's configure
   threw."; `readSource` publishes `Reading` in a `try` and forks in the `finally`; doc comments restated
   (`9f39b8e6`). TF28, TF29, TF37 green, whole `TimelineFeed.test.ts` green.
2. `DiagnosticsFeed.start` (`Starting`) and `SimulationSession.start` (`Running` commit) fork in a `finally`; comments
   about the synchronous prefix and the superseded token stay (`5eddf074`). F31, SR6, G49 green; `GatesFeed.ts` unchanged.

## Verification

- `DiagnosticsFeed`, `SimulationSession.runs`, `SimulationSession`, `GatesFeed`, `TimelineFeed` test files: 193 passed.
- Whole model folder: 1498 passed, 10 failed, exactly DL3, DL4, DL5, DL8, DL12 to DL17 (`DockModel.listeners.test.ts`),
  which 81-06 turns green. CR22 already passes at this commit (the plan allowed it to fail).
- `81-pinned-check.mjs`, `scan-ids`, `scan-forbidden`, `unchanged GatesFeed.ts` pass; `tsc -p packages/devtools/tsconfig.src.json --noEmit` clean.

## Deviations from Plan

None - plan executed exactly as written. One wording fix before the second commit: `scan-ids` rejected "no longer" in
a comment, so it reads "a token that has been superseded".

## Known Stubs

None.

## Threat Flags

None. T-81-10 and T-81-11 are mitigated: the fork is in the publish's `finally` (TF28, F31, SR6), and each configure
step reads `held` when it runs (TF37).

## Self-Check: PASSED

- `TimelineFeed.ts`, `DiagnosticsFeed.ts` and `SimulationSession.ts` exist; commits `9f39b8e6` and `5eddf074` are on `arch-wave-15`.
