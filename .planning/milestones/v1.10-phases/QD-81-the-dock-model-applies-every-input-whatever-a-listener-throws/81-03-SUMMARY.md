---
phase: QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws
plan: 03
subsystem: devtools-model-tests
tags: [regression-tests, red-first, begin-to-fork-window, reentrancy, pinned-check, devtools]
requires:
  - phase: QD-81
    provides: 81-check.mjs (seen-failing, unchanged, scan-ids, scan-forbidden, commit), phase_base, 81-RED-EVIDENCE.md
provides:
  - TF28, TF29 and F31 retitled and flipped, with their before and after in 81-RED-EVIDENCE.md
  - TF37, SR6 added and seen red on the phase base; G49 added and seen failing under a scratch edit
  - 81-pinned-check.mjs, holding every other existing test of the touched files to its base text
affects: [81-05, 81-06, 81-10]
key-files:
  created:
    - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-pinned-check.mjs
  modified:
    - packages/devtools/test/model/TimelineFeed.test.ts
    - packages/devtools/test/model/DiagnosticsFeed.test.ts
    - packages/devtools/test/model/SimulationSession.runs.test.ts
    - packages/devtools/test/model/GatesFeed.test.ts
    - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-RED-EVIDENCE.md
key-decisions:
  - "Decided autonomously: G49 configures the feed with no questions thunk first, then hands it one, because a feed that already has a thunk keeps a cadence running that reads the held thunk, so a configure whose own fork is skipped still shows reads and the test passes under the scratch edit; only a feed with no cadence yet makes the configure's own fork observable"
  - "Decided autonomously: the pinned check cuts an added test together with the one blank line that separates it from the test above, unless the block already took its own trailing blank, so a test appended before the closing `});` and one inserted mid-file both reduce to the base text"
  - "The pinned check counts a flip as applied only when its block differs from its base and the evidence holds a `- flip <label>: ` line, so CR22 stays unapplied until its restatement"
requirements-completed: [COLL-05, WX-06, WX-07]
duration: 10min
completed: 2026-11-24
status: complete
commits: 2
plan_head_before: 948c4342caa21b037897281f933967b4ce603de5
plan_head_after: 5926cfc748bb72bbe6e4fc4014339b144e9016cc
actuals:
  tokens: 9000
  tasks: 3
  commits: 2
coverage:
  - id: D1
    description: "TF28, TF29 and F31 flipped: a throw on the status that announces the work is rethrown and the work starts; TF29 keeps both throws as one AggregateError, the timeline's first, with the exact message"
    requirement: COLL-05
    verification:
      - kind: unit
        ref: "packages/devtools/test/model/TimelineFeed.test.ts#TF28, TF29; packages/devtools/test/model/DiagnosticsFeed.test.ts#F31 (red on the base)"
        status: fail
    human_judgment: false
  - id: D2
    description: "SR6 the run's window and TF37 the nested timeline configure, red on the base"
    requirement: COLL-05
    verification:
      - kind: unit
        ref: "packages/devtools/test/model/SimulationSession.runs.test.ts#SR6; packages/devtools/test/model/TimelineFeed.test.ts#TF37 (red on the base)"
        status: fail
    human_judgment: false
  - id: D3
    description: "G49 the gates feed forks before it publishes, green on the base and failing once under a scratch edit that publishes first"
    requirement: COLL-05
    verification:
      - kind: unit
        ref: "packages/devtools/test/model/GatesFeed.test.ts#G49 (green on the base; failed under a scratch edit)"
        status: pass
    human_judgment: false
  - id: D4
    description: "81-pinned-check.mjs holds the three dock model test files byte for byte and the five touched files outside their declared flips, additions and import edit"
    requirement: WX-06
    verification:
      - kind: command
        ref: "node 81-pinned-check.mjs --self-test; node 81-pinned-check.mjs"
        status: pass
    human_judgment: false
---

# Phase QD-81 Plan 03: the begin-to-fork windows and the nested timeline configure, seen red Summary

Five tests pin the three begin-to-fork windows and the nested timeline `configure` on the untouched phase base: TF28, TF29
and F31 are flipped from "the throw leaves the work unstarted" to "the throw is rethrown and the work starts", TF37 and SR6
are new, and each is red for the reason it states. G49 pins that the gates feed, which forks first, already has no window.
`81-pinned-check.mjs` then holds every other existing test of the touched files to its base text. No file under
`packages/devtools/src` changed.

phase_base: e757ef370731c8388de9924e6ad1744cd6363e89

## Performance

- **Duration:** about 10 min (2026-11-24)
- **Tasks:** 3 (one tracer, two auto)
- **Files created:** 1 check script; **modified:** 4 test files and the evidence file
- **Commits:** `a31388b0` (the four test files and the evidence), `5926cfc7` (the pinned check and the evidence)

## Accomplishments

- TF29 (a timeline listener and a status listener both throw on a capacity change over a `Stopped` read) now asserts one
  `AggregateError` whose `errors` are `[timelineBoom, statusBoom]` by identity, the exact message `More than one step of the
  timeline feed's configure threw.`, status `Reading`, two reads, entries `x` and `y`, capacity 2. The tracer ran it on the
  base first: it fails there on `expected Error: status boom to be an instance of AggregateError`.
- TF28 and F31 assert the throw as itself and the work started (two reads and `x`, `y`; the new collector sampled and the
  status `Live`). TF37 asserts the capacity 2, B's entry and C read 0 times after a listener configures the feed again from
  inside the outer `configure`. SR6 asserts `boom` rethrown, the resolver asked once and the run `Ran`.
- Each flipped test has a `before (passing on the base)` line, a `red on the base` line with its failing assertion and a
  `flip` line in `81-RED-EVIDENCE.md`.
- `81-pinned-check.mjs` holds `DockModel.test.ts`, `DockModel.characterisation.test.ts` and `ExternalStore.test.ts` byte for
  byte, and `ConfigureRule.test.ts` (flip CR22), `TimelineFeed.test.ts` (flips TF28, TF29, added TF37),
  `DiagnosticsFeed.test.ts` (flip F31), `GatesFeed.test.ts` (added G49) and `SimulationSession.runs.test.ts` (added SR6,
  the `thrownBy` import edit) outside those changes. It was seen failing once, by a planted comment line in
  `DockModel.test.ts`.

## Base results

Red on the base (5): TF28 (reads 1, not 2), TF29 (`statusBoom` alone, not an `AggregateError`), F31 (the new collector
never sampled), TF37 (entries `from-b`, `from-c`: the outer read took its entry-time source), SR6 (the resolver never
asked).

Green on the base, shown failing once by a copy-backed scratch edit (1): G49, with `cadence()` moved after the `publish`
call in `GatesFeed.configure` (`expected 1 to be at least 3`), restored with `cp`.

Passing on the base before the flip (3): the old TF28, TF29 and F31, each recorded with its title.

The pinned check on the tree prints `pinned: 8 files hold their base text, 3 of 4 declared flips applied`; `--all-applied`
fails on `CR22` alone, as expected until CR22 is restated.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] G49's first scenario passed under the scratch edit**
- **Found during:** Task 2 (the scratch edit moving `cadence()` after `publish` left G49 green)
- **Issue:** the feed was configured with a thunk first, so a cadence was already running and reads the held thunk; the
  configure under test then changed the thunk, and the old run kept reading the new one, so the skipped fork was invisible.
- **Fix:** the feed is built with a registry only, then handed the counting thunk and interval 5000 in the configure that
  throws, so the configure's own fork is the only cadence; the thunk is read once at the configure and at least twice more
  over ten seconds. The scratch edit now fails it with `expected 1 to be at least 3`.
- **Files modified:** packages/devtools/test/model/GatesFeed.test.ts
- **Verification:** green on the base; failing under the scratch edit; `GatesFeed.ts` restored with `cp`.
- **Commit:** a31388b0

**Total deviations:** 1 auto-fixed (1 scenario correction). **Impact:** none on scope; G49 holds the title and assertion
kind the plan names.

## Issues Encountered

None beyond the deviation above.

## Known Stubs

None.

## Next Phase Readiness

Ready for 81-04. 81-05 closes the three windows and the timeline's read step and must turn TF28, TF29, F31, TF37 and SR6
green; 81-06 restates CR22, after which `81-pinned-check.mjs --all-applied` passes (81-10 runs it).

## Self-Check: PASSED

The pinned check, the four test files and the evidence file exist, commits `a31388b0` and `5926cfc7` are ancestors of HEAD, the measured commit count is 2, and no file under `packages/devtools/src` differs from `phase_base`.
