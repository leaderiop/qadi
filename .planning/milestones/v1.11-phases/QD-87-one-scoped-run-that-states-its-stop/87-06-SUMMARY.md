---
phase: QD-87-one-scoped-run-that-states-its-stop
plan: 06
subsystem: devtools-model
tags: [devtools, stated-run, configure-prologue, timeline-feed, diagnostics-feed, gates-feed]

phase_base: 56b9ae4d98ebd1f950369c9830d4a310727895ac
plan_head_before: ad97bd0385aeb9a52fb50e0a72abd71fc3e55210
plan_head_after: 47b6b207a91245fa224e61b19dbe7bed217841a0

requires:
  - phase: QD-87-one-scoped-run-that-states-its-stop
    provides: 87-05's makeStatedRun, RunPlan, makeConfigure and ConfigureRule
provides:
  - TimelineFeed.ts and DiagnosticsFeed.ts supplying only their engine and their states to the stated run
  - a self-interrupting read or collector reading Stopped (TX1, TX2, DX1, DX2 green)
  - all three feeds configuring through makeConfigure
affects: [QD-87 plans 07 to 11 (session and Simulator rows remain red)]

actuals:
  tokens: 6500
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "a feed as a plan factory (starting, engine over a guard) plus a configure rule; no begin, fork, isCurrent or finally in the feed"
    - "gates keeps its own superseding run and forks its cadence before it publishes; only its configure order is shared"

key-files:
  created: []
  modified:
    - packages/devtools/src/model/TimelineFeed.ts
    - packages/devtools/src/model/DiagnosticsFeed.ts
    - packages/devtools/src/model/GatesFeed.ts

key-decisions:
  - "The Stopped docs of both feeds state the one rule (own work ended on anything but success, a self-interruption included; an outside interruption never stops it); the rethrow paragraph of the readouts is a pointer to StatedRun.ts."
  - "Diagnostics keeps `off` and `start` only as the two arms of the configure step and `plan(held)`; there is no second copy of publish-then-fork."

requirements-completed: []

coverage:
  - id: D1
    description: "a timeline read or live stream that interrupts itself reads Stopped; outside interruptions state nothing (TX1 to TX7)"
    requirement: STOP-02
    verification:
      - kind: test
        ref: "packages/devtools/test/model/TimelineFeed.stop.test.ts#TX1 to TX7"
        status: pass
    human_judgment: false
  - id: D2
    description: "a collector whose snapshot interrupts itself reads Stopped with sampled false before a sample and true after; outside interruptions state nothing (DX1 to DX7)"
    requirement: STOP-04
    verification:
      - kind: test
        ref: "packages/devtools/test/model/DiagnosticsFeed.stop.test.ts#DX1 to DX7"
        status: pass
    human_judgment: false
  - id: D3
    description: "all three feeds configure through makeConfigure; gates passes the watch-retry gate as `same` and still forks its cadence before it publishes"
    requirement: STOP-03
    verification:
      - kind: other
        ref: "87-check.mjs feeds-supply-only-engine (timeline, diagnostics, gates); GatesFeed.test.ts G49 held and green"
        status: pass
    human_judgment: false
  - id: D4
    description: "no held test moved; the earlier-phase checks match their ledger"
    requirement: WX-06
    verification:
      - kind: other
        ref: "87-pinned-check.mjs; 87-earlier-checks.mjs; 87-check.mjs suite, trailers, scan-forbidden, scan-ids"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-11-25
status: complete
---

# Phase 87 Plan 06: The three feeds on the stated run and the prologue Summary

**The timeline and diagnostics feeds now supply only their engine and states to `makeStatedRun`, so a read or collector that interrupts itself reads `Stopped`; all three feeds configure through one `makeConfigure`, gates keeping its own cadence run that forks before it publishes.**

## Performance

- **Duration:** about 20 min
- **Tasks:** 3 (one tracer, two auto)
- **Files:** 3 modified, all in `packages/devtools/src/model`; 126 insertions, 136 deletions

## Accomplishments

- **Tracer, `TimelineFeed.ts`.** `readSource`, the `makeSupersedingRun` and `causeMessage` imports and the hand-written configure prologue are gone; a `plan()` supplies `starting` (publish `Reading`) and an `engine` (`runSource` over the guarded `timeline.accept` and the held source or the empty one), and `configure` is `makeConfigure` with `sameFields` and the same `callAll` message. TX1 to TX7 and SC1 to SC4, SC7, SC12 pass before the next task started. The `Stopped` doc states the one rule; the readout's rethrow paragraph points at `StatedRun.ts`. `feat(87-06): the timeline feed runs its read through the stated run`.
- **`DiagnosticsFeed.ts`.** `plan(next)` publishes `diagnosticsStarting` over the held reading and runs `runDiagnostics` over the guarded sink; `configure` is `makeConfigure` with `sameFieldsOrAbsent`, absent options being the `if` arm that stops the run, resets `sampled` and publishes `diagnosticsOff`; `restart` starts the held options only when held. The module paragraph "An interruption is not a stop" moved out (it lives once in `StatedRun.ts`). DX1 to DX7 and SC5, SC6, SC8 pass. `feat(87-06): the diagnostics feed runs its poll through the stated run`.
- **`GatesFeed.ts`.** Only `configure` changed: `makeConfigure` with `same: (a, b) => sameFields(a, b) && watchFailure === undefined` and the old body as the step, reading `before` where it read the old held value; the cadence is untouched, so it forks before it publishes (INV-QD-408, G49 green unedited). `refactor(87-06): the gates feed configures through the shared prologue`.
- **Gates.** After each task: `feeds-supply-only-engine` for the feeds built so far, the full devtools suite judged by `suite --passing` (10 red on the base, then 8 after Task 1, 6 after Task 2 and 3: exactly SX1 to SX3 and SB2 to SB4 remain), the pinned check, `tsc -p tsconfig.test.json`, oxlint, house style, `scan-forbidden`, `scan-ids`; after Task 3 also `87-earlier-checks.mjs`, `pnpm circular` and `trailers` (18 commits since the base).

## Deviations from Plan

### Auto-fixed Issues

None.

### Interpretations

**1. Each verify's `commit` step runs after the commit, not before.** The `<automated>` ends with `87-check.mjs commit`, which asserts the commit already exists, so the sequence was: write, run every other check, commit with the one trailer, then run the `commit` mode (and `trailers` after Task 3). All three exited 0. The `rm -rf .vitest` inside the verify was run as a separate command, as the harness requires.

**2. `restart` no longer tests `closed()` itself in diagnostics and timeline.** `StatedRun.start` returns on a closed scope, so the explicit guard each feed carried is the stated run's.

**Total deviations:** 0 auto-fixed, 2 interpretations. **Impact:** none on scope.

## Issues Encountered

None.

## Known Stubs

None.

## Threat Flags

None: package-private model code; no endpoint, auth path or schema. T-87-15 (a feed that shows `Reading` or `Starting` with nothing running) is mitigated and pinned by TX1, TX2, DX1 and DX2 (green), with TX3 to TX7 and DX3 to DX7 pinning that outside interruptions state nothing. T-87-16 (configure after close or with refused input) is held by the prologue's order (CP1, CP2), SC12 over the real feeds, and gates' watch-retry gate as its `same` parameter.

## Self-Check: PASSED

- Files exist and are modified: `TimelineFeed.ts`, `DiagnosticsFeed.ts`, `GatesFeed.ts`.
- Commits are ancestors of HEAD, each with the one `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer: `35ffc6a7` timeline, `7214ebb1` diagnostics, `47b6b207` gates; `87-check.mjs commit` for each and `trailers` exit 0.
- No scratch file under `packages`, no `.vitest/`; no test, `SupersedingRun.ts`, `StatedRun.ts`, `ConfigurePrologue.ts` or session edited.
