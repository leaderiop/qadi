---
phase: QD-87-one-scoped-run-that-states-its-stop
plan: 07
subsystem: devtools-model-and-react
tags: [devtools, stated-run, simulation-session, simulator, stopped-box, theme]

phase_base: 56b9ae4d98ebd1f950369c9830d4a310727895ac
plan_head_before: 8a79a12517fc9ae0328c65d31cfc55c6b992fbd9
plan_head_after: d7ac15fbc691292f65501ac2ae4eae9bf2e566ea

requires:
  - phase: QD-87-one-scoped-run-that-states-its-stop
    provides: 87-05's makeStatedRun and RunLive; 87-06's feeds on it
provides:
  - SimulationSession.ts starting its runs through makeStatedRun, Broke.message in causeMessage text
  - reasonStyle in react/theme.ts, shared by StoppedBox and the Simulator
  - the Simulator's Broke box as a labelled, focusable pre
affects: [QD-87 plans 08 to 11 (the devtools suite is fully green)]

actuals:
  tokens: 5500
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a session run is a stated run whose stop hook applies only while run._tag is Running, so a landed result stays"
    - "a run's stop reason is rendered in one shared preformatted treatment (reasonStyle)"

key-files:
  created: []
  modified:
    - packages/devtools/src/model/SimulationSession.ts
    - packages/devtools/src/react/Simulator.tsx
    - packages/devtools/src/react/StoppedBox.tsx
    - packages/devtools/src/react/theme.ts

key-decisions:
  - "The session keeps its own Effect.exit read in land (its Broke write needs the exit), and the stated run's stop covers only a defect outside that read, guarded by Running."
  - "reasonStyle moves to theme.ts unchanged in value and key order; StoppedBox's markup is untouched."

requirements-completed: []

coverage:
  - id: S1
    description: "a session run whose ports layer dies reports the error as the first line of Broke.message; a hostile die reports the one placeholder; a self-interrupting resolver reports text naming the interruption (SX1 to SX3)"
    requirement: STOP-01
    verification:
      - kind: test
        ref: "packages/devtools/test/model/SimulationSession.stop.test.ts#SX1 to SX3"
        status: pass
    human_judgment: false
  - id: S2
    description: "a landed Ran is not overwritten by a later defect; SR1, SR5, SR6 and SC9 to SC11 pass unedited"
    requirement: STOP-04
    verification:
      - kind: test
        ref: "SimulationSession.runs.test.ts SR1, SR5, SR6; StatedRun.characterisation.test.ts SC9 to SC11"
        status: pass
    human_judgment: false
  - id: S3
    description: "the Simulator's Broke box renders broke.message in a labelled focusable pre in the stopped box's reason style (SB1 to SB4)"
    requirement: STOP-05
    verification:
      - kind: test
        ref: "packages/devtools/test/react/Simulator.broke.test.tsx#SB1 to SB4"
        status: pass
    human_judgment: false
  - id: S4
    description: "the full devtools suite is green; the shape checks, earlier-phase ledger, pinned check, tsc, oxlint, house style, pnpm circular, scan-forbidden, scan-ids and trailers are clean"
    requirement: WX-06
    verification:
      - kind: other
        ref: "87-check.mjs suite --green, session-stop, simulator-pre, feeds-supply-only-engine, stated-run-shape, prologue-shape, trailers; 87-pinned-check.mjs; 87-earlier-checks.mjs"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-11-25
status: complete
---

# Phase 87 Plan 07: The session on the stated run and the broken-run box Summary

**The simulation session starts its runs through `makeStatedRun` with a stop hook guarded by `Running`, writes `Broke.message` as `causeMessage`'s text, and the Simulator shows it in the stopped box's `reasonStyle` as a labelled focusable `pre`; the devtools suite is now fully green.**

## Performance

- **Duration:** about 15 min
- **Tasks:** 2 (one tracer, one auto)
- **Files:** 4 modified; the session, three react files

## Accomplishments

- **Tracer, `SimulationSession.ts`.** `makeSupersedingRun` and `RunToken` are gone; `runs` is `makeStatedRun` built after `commit`, its hook returning unless `run._tag === "Running"` and otherwise publishing `Broke` with the reason. `land` takes `live: RunLive`, returns on `!live.current()`, and writes `message: causeMessage(exit.cause)`; its span name, `root: true` and `Effect.exit(program(...))` are unchanged. `start` keeps the closed and `Refused` paths, reads `clock` before the start, and calls `runs.start({ starting, engine })` with the pairs read when the engine is built. The `Broke` doc and module paragraph say what the message is. SX1 to SX3, SC9 to SC11, TX1, TX2, DX1, DX2 pass; the full run then failed only on SB2 to SB4. `feat(87-07): a broken simulation run reports its cause in the feeds text` (`49432732`).
- **`theme.ts`, `StoppedBox.tsx`, `Simulator.tsx`.** `reasonStyle` is a named export of `theme.ts`, unchanged in value and key order; `StoppedBox.tsx` imports it, declares none and drops its now-unused `font` import; the Simulator's `Broke` arm renders `<pre role="group" aria-label="Why the simulation failed" tabIndex={0} style={reasonStyle}>`, heading and `data-testid` unchanged. `suite --green` is 0 failing rows over 97 files. `feat(87-07): the simulator shows a broken run in the stopped box reason treatment` (`d7ac15fb`).
- **Gates.** `session-stop`, `simulator-pre`, `feeds-supply-only-engine`, `stated-run-shape`, `prologue-shape`, the pinned check, `87-earlier-checks.mjs`, `tsc -p tsconfig.test.json`, oxlint, `pnpm circular`, house style, `scan-forbidden`, `scan-ids` and `trailers` (20 commits since the base) all exit 0.

## Deviations from Plan

### Auto-fixed Issues

None.

### Interpretations

**1. Each verify's `commit` step runs after the commit.** The `commit` mode asserts the commit exists, so every other check ran first, then the commit with the one trailer, then `87-check.mjs commit` (exit 0 for both). `.vitest` was removed in a separate command.

**2. The module doc's "superseding run (`makeSupersedingRun`)" sentence now names the stated run** (`makeStatedRun`), since the import it described is gone. No behavior change.

**Total deviations:** 0 auto-fixed, 2 interpretations. **Impact:** none on scope.

## Issues Encountered

A first commit attempt for Task 2 failed because the path list was held in a shell variable that zsh does not word-split; no commit was made, the retry used explicit paths.

## Known Stubs

None.

## Threat Flags

None. T-87-17 (a landed `Ran` overwritten) is mitigated by the `Running` guard and pinned by SC10; T-87-18 (stack frames in the `pre`) by React text rendering (SB3); T-87-19 (a hostile die) by `causeMessage`'s placeholder (SX2).

## Self-Check: PASSED

- Files modified: `SimulationSession.ts`, `Simulator.tsx`, `StoppedBox.tsx`, `theme.ts`.
- Commits are ancestors of HEAD, each with the one `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer: `49432732` session, `d7ac15fb` simulator; `87-check.mjs commit` for each.
- No test, feed, `StatedRun.ts`, `ConfigurePrologue.ts` or `SupersedingRun.ts` edited; no scratch file under `packages`, no `.vitest/`.
