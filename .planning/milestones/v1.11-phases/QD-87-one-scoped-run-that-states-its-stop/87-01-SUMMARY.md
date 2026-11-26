---
phase: QD-87-one-scoped-run-that-states-its-stop
plan: 01
subsystem: testing
tags: [devtools, stryker, spike, red-on-the-base, supersedingrun, simulation-session, timeline-feed, diagnostics-feed, simulator]

phase_base: 56b9ae4d98ebd1f950369c9830d4a310727895ac
base_record: f00dbdae33297c30b284f00d4026527102d527e8
red_session: 0711409832dc6b54d3fe628f33edf134ccf04d49
red_feeds: 092b4ae79373b82b10807c410a69ee9f37361501
plan_head_before: 56b9ae4d98ebd1f950369c9830d4a310727895ac
plan_head_after: 092b4ae79373b82b10807c410a69ee9f37361501

requires:
  - phase: QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner
    provides: the 86-mutation.mjs scorer and the 86-RED-EVIDENCE.md line forms this plan regroups
  - phase: QD-85-the-dock-s-hydration-block-is-a-model-row
    provides: the devtools Stryker config entry and the born-file rule of 85-mutation.mjs
provides:
  - 87-mutation.mjs, the phase scorer over a touched group (removed-mutant rule, base and close by one invocation), two born groups (absolute rule, own-tests killers) and a sum rule over the moved code
  - 87-mutation-base.json, phase_base and the five touched model files measured on it, committed alone and first
  - SimulationSession.stop.test.ts and Simulator.broke.test.tsx, SX1 to SX3 and SB2 to SB4 red on the base, SB1 green
  - TimelineFeed.stop.test.ts and DiagnosticsFeed.stop.test.ts, TX1, TX2, DX1, DX2 red on the base, TX3 to TX7 and DX3 to DX7 green
  - 87-RED-EVIDENCE.md, every red-on-the-base line, every seen-failing line and the protocol spike lines
affects: [QD-87 plans 02 to 11, StatedRun.ts, ConfigurePrologue.ts, SimulationSession.ts, TimelineFeed.ts, DiagnosticsFeed.ts, GatesFeed.ts, Simulator.tsx, StoppedBox.tsx]

actuals:
  tokens: 21971
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "a scorer with one group measured at base and close, two born groups judged absolutely by who kills each mutant, and a sum rule that sees code moving between files"
    - "a red-on-the-base row whose assertion message carries the base's tape or text, so the evidence line is the failing text vitest printed"

key-files:
  created:
    - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-mutation.mjs
    - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-mutation-base.json
    - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-RED-EVIDENCE.md
    - packages/devtools/test/model/SimulationSession.stop.test.ts
    - packages/devtools/test/react/Simulator.broke.test.tsx
    - packages/devtools/test/model/TimelineFeed.stop.test.ts
    - packages/devtools/test/model/DiagnosticsFeed.stop.test.ts
  modified: []

key-decisions:
  - "The protocol spike holds on the base: every outside interruption (a supersede, stop, scope close, a begin without a fork then stop, each with an engine that swallows its own interruption too) never resumes the forked body; a self-interrupt resumes it current; a natural end after a newer begin resumes it not current. D-08 stands, so the feeds' self-interrupt rule changes and D-09 (remove the hook) follows."
  - "The touched group runs without --disableBail and the born groups with it, so the touched base is the run the research measured and a close is one invocation against it (D-19)."
  - "A record reads the status of the whole of packages and the Stryker config, not only the group's files, so a test file written and not committed refuses a base or a close."

patterns-established:
  - "Seen-failing for a guard that the exit's currency already protects: drop the currency and interrupt checks together, so the outside-interruption rows have a scratch edit that can fail them"

requirements-completed: [STOP-01, STOP-04, STOP-05, WX-05, WX-06, WX-07]

coverage:
  - id: D1
    description: "87-mutation.mjs scorer with touched, stated and prologue groups, refused born bases, the absolute rule with own-tests killers, the sum rule and the EQUIVALENT ledger"
    requirement: WX-05
    verification:
      - kind: other
        ref: "node 87-mutation.mjs --self-test (99 passed) and the Task 1 verify"
        status: pass
    human_judgment: false
  - id: D2
    description: "87-mutation-base.json holding phase_base and the five touched files measured on it (509/518 detected, 9 open, 33 Ignored), committed alone as the first plan commit"
    requirement: WX-05
    verification:
      - kind: other
        ref: "pnpm exec stryker run stryker.devtools.mjs --mutate <the five files> then node 87-mutation.mjs record base touched; the Task 1 verify"
        status: pass
    human_judgment: false
  - id: D3
    description: "SX1 to SX3 and SB2 to SB4 red on the base with their failing text, SB1 green and seen failing"
    requirement: STOP-05
    verification:
      - kind: unit
        ref: "packages/devtools/test/model/SimulationSession.stop.test.ts, packages/devtools/test/react/Simulator.broke.test.tsx; the Task 2 verify"
        status: pass
    human_judgment: false
  - id: D4
    description: "TX1, TX2, DX1, DX2 red on the base, TX3 to TX7 and DX3 to DX7 green and each seen failing under a scratch edit"
    requirement: STOP-04
    verification:
      - kind: unit
        ref: "packages/devtools/test/model/TimelineFeed.stop.test.ts, packages/devtools/test/model/DiagnosticsFeed.stop.test.ts; the Task 3 verify"
        status: pass
    human_judgment: false
  - id: D5
    description: "the spike re-run on the base and its lines written in 87-RED-EVIDENCE.md"
    requirement: STOP-04
    verification:
      - kind: other
        ref: "87-RED-EVIDENCE.md section 87-01 spike confirmation; the Task 3 verify"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-11-25
status: complete
---

# Phase 87 Plan 01: The base, the spike and the rows that are red on it Summary

**The mutation floor of the five touched model files is measured and committed first, the protocol spike confirms on the base that only a run that interrupts itself ever reaches the exit read, and ten rows are red on the base for the two changes the phase makes, with eleven green rows seen failing and no source file moved.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-11-25T18:42:00Z
- **Completed:** 2026-11-25T18:57:00Z
- **Tasks:** 3 (one tracer, two auto)
- **Files created:** 7, none modified

## Accomplishments

- `phase_base` is `56b9ae4d98ebd1f950369c9830d4a310727895ac`, a descendant of `cbe375bf` with nothing outside `.planning/` changed (`git diff --quiet cbe375bf <phase_base> -- . ':!.planning'`). The research ran at `4ee0f408`, two docs-only commits below it.
- The touched base was measured on a clean tree by `pnpm exec stryker run stryker.devtools.mjs --mutate <the five files>` in 2 min 15 s, final score 98.26, and the one Timeout the research saw is the one it found. Detected over valid per file:

| File | detected / valid | killed | timeout | survived | Ignored |
| ---- | ---------------- | ------ | ------- | -------- | ------- |
| `SupersedingRun.ts` | 50 / 53 | 49 | 1 | 3 | 0 |
| `TimelineFeed.ts` | 37 / 37 | 37 | 0 | 0 | 11 |
| `DiagnosticsFeed.ts` | 59 / 59 | 59 | 0 | 0 | 14 |
| `SimulationSession.ts` | 244 / 250 | 244 | 0 | 6 | 4 |
| `GatesFeed.ts` | 119 / 119 | 119 | 0 | 0 | 4 |
| all | 509 / 518 | 508 | 1 | 9 | 33 |

  The nine open mutants are the research's: `SupersedingRun.ts` L121 (`hooks.onFailure?.`) and L94 twice (the token brand), `SimulationSession.ts` L310, L313 twice, L317, L319 and L402 (`if (!runs.isCurrent(mine)) return;`).
- The spike, re-run on the base through the real `makeSupersedingRun` from a scratch file deleted afterwards (lines in `87-RED-EVIDENCE.md`): all eight outside paths, each with `Effect.never` and with an engine that swallows its own interruption, never resume the forked body; a self-interrupt resumes it with `exit=Failure interruptsOnly=true current=true`; a natural end after a newer `begin` resumes it with `current=false`. D-08's condition holds, so the plan set is unchanged.
- Rows red on the base, each for its stated reason (failing text in `87-RED-EVIDENCE.md`): SX1 to SX3 (`Cause([Die(...)])`, `Cause([Die([toString threw])])` and `Cause([Interrupt(<id>)])`), SB2 to SB4 (no group in the broken box), TX1 and TX2 (`tape=[]`, `Reading`), DX1 (`tape=["Starting"]`) and DX2 (`tape=["Starting","Live"]`).
- Rows green on the base and seen failing: SB1 (the stopped box's reason block, `maxHeight: 96` to `97`), TX3 to TX7 and DX3 to DX6 (the `fork` exit guard reduced to `Exit.isFailure(exit)` alone, 9 rows failed) and DX7 (the start-up publish in `start` publishing a `Stopped`, 4 rows failed).

**Every later full-suite run of the devtools project is judged by allowing exactly these ten failures, SX1 to SX3, SB2 to SB4, TX1, TX2, DX1 and DX2, until the plan that turns each green.** Nothing else may fail.

## Task Commits

1. **Task 1: the phase base measured end to end (tracer)** - `f00dbdae` (docs), `docs(87-01): record the mutation base of the touched model files`
2. **Task 2: the broken simulation run pinned on the base** - `07114098` (test), `test(87-01): pin the broken simulation run on the base`
3. **Task 3: the spike and the feeds pinned on the base** - `092b4ae7` (test), `test(87-01): pin the feeds self-interrupt rule and the outside interruptions on the base`

The tracer was verified green (its `<automated>` verify, `self-test: 99 passed`, oxlint clean) before Task 2 started.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] The scorer's clean-tree rule covers `packages` and the Stryker config, not only the group's files**
- **Found during:** Task 1
- **Issue:** the plan says `record base touched` "refuses a tree that is not clean", and the 86 scorer it ports reads the status of the group's own files only. A test file written and not committed would let a base or a close be recorded on a tree no commit names.
- **Fix:** `statusPaths(group)` is the group's files, `packages` and `stryker.devtools.mjs`; the self-test pins it for every group.
- **Files modified:** `87-mutation.mjs`
- **Commit:** `f00dbdae`

**2. [Rule 2 - Missing critical functionality] A survivor carries the trimmed text of its line so EQUIVALENT can match it**
- **Found during:** Task 1
- **Issue:** the plan's EQUIVALENT entries name a `lineText`, but the 86 `classify` records no text for a mutant, so no entry could ever match.
- **Fix:** `classify` reads the text of each mutant's line from the report's `source`; the self-test pins it with a planted report.
- **Files modified:** `87-mutation.mjs`
- **Commit:** `f00dbdae`

**3. [Rule 3 - Blocking] The seen-failing edit the plan names for TX3 to TX7 and DX3 to DX6 is the whole exit guard, not one conjunct**
- **Found during:** Task 3
- **Issue:** read as "drop the interrupt-only check", the edit would leave the rows green, because an outside interruption always leaves the run's token no longer current, and the currency check alone protects them.
- **Fix:** read as the plan's own words say, `Exit.isFailure(exit)` alone (the currency and the interrupt-only checks both gone); that turns all nine rows red. The same edit turns TX1, TX2, DX1 and DX2 green, as it should, and leaves DX7 green, which has the narrower edit the plan names. Recorded in `87-RED-EVIDENCE.md`.
- **Files modified:** none kept (scratch edit restored with `cp`)
- **Commit:** `092b4ae7`

### Plan defects

None: every verify ran as written.

**Total deviations:** 3 auto-fixed (2 Rule 2, 1 Rule 3), none a plan defect. **Impact:** none on scope; the scorer is stricter than the plan's text and the evidence file says what each edit did.

## Issues Encountered

None. The base run had the one Timeout the research recorded, so no re-measure was needed.

## Known Stubs

None.

## Threat Flags

None: this plan adds test files and phase scripts, no network endpoint, auth path or schema.

## Self-Check: PASSED

- Files: the scorer, its base record, the evidence file and the four test files exist (checked by the three task verifies).
- Commits: `f00dbdae`, `07114098` and `092b4ae7` are ancestors of HEAD, each with the one `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer.
- `git diff --quiet 56b9ae4d -- packages/devtools/src packages/core/src stryker.devtools.mjs` holds; nothing is modified under `packages`; no `.vitest/` and no scratch spike file remain; `pnpm exec tsc -p tsconfig.test.json --noEmit` exits 0.
