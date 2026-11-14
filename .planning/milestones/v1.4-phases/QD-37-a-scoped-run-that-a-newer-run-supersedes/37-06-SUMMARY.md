---
phase: QD-37-a-scoped-run-that-a-newer-run-supersedes
plan: 06
subsystem: devtools
tags: [effect, re-entrancy, superseding-run, simulation-session, devtools]
plan_head_before: 1dcf5e363d6ec2f771555acaa0e51e3f3f45694a
plan_head_after: 5e72a2eb3a58b81cccbead61a52e98c0e5405245
status: complete

requires: ["37-05"]
provides:
  - "SimulationSession.ts on makeSupersedingRun, its guarded stop deleted; SR5"
affects: [37-07, 37-08, 37-09]

actuals:
  tokens: 2000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns: ["closed() / begin() / Running / commit() / fork(token, land(token, ...)) with an unconditional stop() as supersede"]

key-files:
  created: []
  modified:
    - packages/devtools/src/model/SimulationSession.ts
    - packages/devtools/test/model/SimulationSession.runs.test.ts

key-decisions:
  - "supersede stays a named one-line function (runs.stop()) so its doc carries the BEH-QD-322 reason at the one place a reader looks; the guard that forked only when the handle held a fiber is deleted"
  - "The session passes no onFailure hook; land keeps mapping every non-success exit of a current run to Broke, self-interrupt included"

requirements-completed: [RUN-02, RUN-04, RUN-05, RUN-06, WX-04, WX-06]

duration: 12 min
completed: 2026-11-14
---

# Phase 37 Plan 06: The simulation session on the superseding run Summary

The simulation session now runs through `makeSupersedingRun` with an unconditional `stop()` as its supersede, and a run started while its ports layer is being built leaves the newest run live instead of a session reading `Running` with no run behind it.

## RED evidence (unconverted SimulationSession.ts, commit 188de790)

`SimulationSession.runs.test.ts`: 1 failed (SR5), 4 passed (SR1 to SR4). SR5 failed on an `AssertionError`: `expected 'Running' to equal 'Ran'`. Observed tally on the base after 5 s of `TestClock`: `{ started: 1, finished: 1, interrupted: 0 }`: the stale outer run's resolver ran to the end (its result was fenced out by the token) while the newest run was interrupted before its resolver was reached, so the session stayed on `Running`. The hook is a `Layer.effectDiscard` merged into the ports layer, whose construction runs in the run's synchronous prefix.

## GREEN evidence (commit 5e72a2eb)

SR5 passes with `SimulationSession.runs.test.ts` byte-identical to its RED commit. Full devtools project: 1391 tests, all passed (1390 after 37-05 plus SR5). `SimulationSession.test.ts` ran 100 of 100 and is byte-identical to the phase base `637c0601`; SR1 to SR4, the root-span case and the stop-at-once pins pass unchanged. `pnpm typecheck`, `pnpm lint` (house-style: 496 files clean, 3 declared switches) and `pnpm circular` pass. The shape check (`let closed`, `FiberHandle`, `addFinalizer`, `Option.`, `getUnsafe` and the word `generation` all absent; `start` ordered closed, begin, Running, commit, fork; `supersede` is `runs.stop()` alone) passes. Mutation of `SimulationSession.ts` was not measured here; 37-09 compares against 0.9767 with 8 recorded survivors.

## Task commits

| Task | Commit | Message |
|---|---|---|
| 1 | 188de790 | test(37-06): a run started while its ports are built leaves the newest run live (RED) |
| 2 | 5e72a2eb | fix(37-06): the simulation session runs through the superseding run, and its stop is unconditional |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. T-37-13, T-37-14 and T-37-15 are mitigated as planned (unconditional stop, `isCurrent` guard in `land`, SR5 RED then GREEN).

## Next

Ready for 37-07 (ADR-QD-150, amendments, changeset, AGENTS.md section 10).
