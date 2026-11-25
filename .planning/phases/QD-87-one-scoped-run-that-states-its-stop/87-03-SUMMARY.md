---
phase: QD-87-one-scoped-run-that-states-its-stop
plan: 03
subsystem: testing
tags: [devtools, phase-check, shape-judges, suite-judge, records, stated-run, red-evidence]

phase_base: 56b9ae4d98ebd1f950369c9830d4a310727895ac
plan_head_before: 7779683ee82d3235a6d513bafb6c8bc8c46fb63c
plan_head_after: 805aaf73471d3d52928f85e882da10c0cf79f889

requires:
  - phase: QD-87-one-scoped-run-that-states-its-stop
    provides: 87-01's phase_base, the ten rows red on the base and the evidence line forms; 87-02's pinned-test check
provides:
  - 87-check.mjs, sixteen modes plus --self-test (301 cases), each seen failing once on a recorded variant
  - the suite judge that lets exactly the ten rows red on the base fail, and nothing else, until each turns green
  - seven shape judges that state what the moved code must look like before it is written
  - the record check for the pinned-by paragraphs and, with --close, every reserved record and amended revision
affects: [QD-87 plans 04 to 11, StatedRun.ts, ConfigurePrologue.ts, the three feeds, SimulationSession.ts, Simulator.tsx, StoppedBox.tsx, theme.ts, builtFeeds.ts, the spec records]

actuals:
  tokens: 31000
  tasks: 3
  commits: 1

tech-stack:
  added: []
  patterns:
    - "a phase check whose base is read from a committed JSON record and whose three ancestry facts are one pure judge"
    - "shape judges that match blanked source text by pattern, name the file and the first rule broken, and are driven by a planted passing text and one planted failing text per rule"
    - "a vitest JSON judge whose allowed failures are read from the evidence file, so a row turning green is the only way the allowed set shrinks"

key-files:
  created:
    - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-check.mjs
  modified:
    - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-RED-EVIDENCE.md

key-decisions:
  - "A phrase judge reads `publishes from now on` as a status tape's own subscription time and still refuses every other `from now on`."
  - "A pinned-by paragraph starts at `Pinned by` or `Enforcement:`, and a quoted title ahead of its first file belongs to that first file."
  - "The gates cadence rule is judged where the plan means it: the steps of the one makeConfigure call `cadence(` before they `publish(`, and the cadence function forks its own superseding run."

patterns-established:
  - "topLevel ends a control statement or a bare block at its closing brace, so a `let` that follows one is read as module state"

requirements-completed: []

coverage:
  - id: D1
    description: "base reads phase_base from the committed record and checks both ancestors and the diff outside .planning; trailers judges every commit since the base; scan-ids and scan-forbidden judge added lines"
    requirement: WX-04
    verification:
      - kind: other
        ref: "node 87-check.mjs base | trailers | scan-ids | scan-forbidden | unchanged packages/devtools/src packages/core/src; the Task 1 verify"
        status: pass
    human_judgment: false
  - id: D2
    description: "suite passes a full devtools run only when exactly the ten red rows fail, and --green refuses it"
    requirement: STOP-05
    verification:
      - kind: other
        ref: "node 87-check.mjs suite <report>, suite --green; the Task 1 verify"
        status: pass
    human_judgment: false
  - id: D3
    description: "the seven shape modes and the record check state the moved code and the records as judges; each shape mode refuses the tree today"
    requirement: STOP-02
    verification:
      - kind: other
        ref: "node 87-check.mjs stated-run-shape | prologue-shape | feeds-supply-only-engine | session-stop | simulator-pre | onfailure-gone | built-feeds-once | records; the Task 2 verify"
        status: pass
    human_judgment: false
  - id: D4
    description: "every mode seen failing once, its first stderr line and variant in 87-RED-EVIDENCE.md, and the check committed once with exactly its two paths"
    requirement: WX-06
    verification:
      - kind: other
        ref: "87-RED-EVIDENCE.md section 87-03; the Task 3 verify"
        status: pass
    human_judgment: false

duration: 14min
completed: 2026-11-25
status: complete
---

# Phase 87 Plan 03: The phase check Summary

**One committed `87-check.mjs` states the phase's shared rules, lets exactly the ten rows red on the base fail, and states the moved code's shape and the close records as pattern judges, each driven both ways by a 301-case self-test and seen failing once.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-11-25T19:12:00Z
- **Completed:** 2026-11-25T19:26:00Z
- **Tasks:** 3 (one tracer, two auto)
- **Files created:** 1 (`87-check.mjs`, 1817 lines), one modified (the evidence file); no file outside the phase directory changed

## Accomplishments

- **Shared modes ported from the previous phase's check.** `base` reads `phase_base` from `87-mutation-base.json` and judges the record, both ancestries and the diff outside `.planning/` between `cbe375bf` and the base as one pure judge; `trailers` judges every commit since the base (8 now, each with the one owner trailer); `scan-ids` refuses the phase's own id tokens and phase-relative wording; `scan-forbidden` refuses the house-rule forms in added source and test lines (a Stryker disable comment, a new module-scope `let`, an `as` cast other than `as const`) and any change to the three guarded files; `commit`, `unchanged` and `seen-failing` unchanged in form.
- **`suite <report> [--green | --passing <id>...]`.** Reads the vitest JSON report of the devtools project and the ten `- red on the base:` titles from the evidence file. On the tree it passes with exactly the ten rows failing and 97 base test files run; `--green` refuses it; `--passing SX1` names the red row.
- **Seven shape judges** (`stated-run-shape`, `prologue-shape`, `feeds-supply-only-engine [timeline|diagnostics|gates ...]`, `session-stop`, `simulator-pre`, `onfailure-gone`, `built-feeds-once`) written from the research's target shapes. Each reads blanked text, names the file and the first rule broken, and exits 1 on the tree today (nothing has moved). Each rule has a planted failing text in the self-test.
- **`records [--close]`.** Without `--close` it passes on the tree: the thirteen existing pinned-by paragraphs (BEH-QD-461 reads through its `Enforcement:` paragraph and package-relative paths) name test files and rows that exist. With `--close` it needs BEH-QD-771 to 775, INV-QD-419 and 420, INV-QD-313's retitled heading with its base anchor linked nowhere under `spec/`, ADR-QD-200 with its audit table, the six amended decisions at their revisions, the CCR-QD-479 row and `ThrownMessage.ts` without the base sentence; it exits 1 today.
- **Every mode seen failing once** (sixteen `- check failed:` lines with their variant in `87-RED-EVIDENCE.md`). Twelve mutations of the judges themselves (a rule removed from a copy) were each killed by the self-test.

## Deviations from Plan

### Plan defects

**1. [Plan defect] The `base` variant the plan names passes**
- **Found during:** Task 3
- **Issue:** the plan seeds `phase_base` with the parent of `cbe375bf` and expects `base` to fail. `cbe375bf` changed only `.planning/` files, so every fact `base` checks still holds and it exits 0 (run, rc 0).
- **Fix:** the variant that fails sets `phase_base` to the commit forty before `cbe375bf`, an ancestor that differs outside `.planning/`: `base` prints `.changeset/react-registry-lifetime-has-an-owner.md differs between cbe375bf and phase_base outside .planning`. Both runs are recorded in the evidence section's introduction. The record was restored with `cp` and `git status` shows it unchanged.
- **Files modified:** `87-RED-EVIDENCE.md`
- **Commit:** `805aaf73`

**2. [Plan defect] `PHRASE` unchanged makes `scan-ids` fail on the tree**
- **Found during:** Task 1
- **Issue:** the plan keeps the phase-relative phrase list unchanged. Five comment lines of the born test files of the two earlier plans say a feed `publishes from now on` (`DiagnosticsFeed.stop.test.ts:35`, `StatedRun.characterisation.test.ts:45, 54, 63`, `TimelineFeed.stop.test.ts:29`). They describe the tape's subscription time, not a time relative to a change, and the pinned check holds those files byte for byte against their adding commits, so rewording them would fail that check.
- **Fix:** a reviewed edit of the pattern, not a weakened judge: `from now on` is refused unless it follows `publishes `. A planted `from now on`, `it holds from now on` and `publishes, from now on` are still flagged; the exact tape wording passes. The self-test holds both ways.
- **Files modified:** `87-check.mjs`
- **Commit:** `805aaf73`

**3. [Plan defect] The unused `edges` binding the run rules name does not exist**
- **Found during:** Task 1
- **Issue:** the run rules ask this plan to remove an unused `edges` declaration at `87-pinned-check.mjs:154`. The file has no `edges` (`/usr/bin/grep -n -i edge` finds nothing), line 154 is `const held = …`, and `tsc --checkJs --noUnusedLocals --noUnusedParameters` and oxlint are clean on it.
- **Fix:** none; no change made to `87-pinned-check.mjs`, which is not among this plan's files, and `--self-test` (35 passed) and the pinned check (122 held, 5 of 5 born) stand as they were.

### Auto-fixed Issues

**4. [Rule 2 - Missing critical functionality] `topLevel` treats a control statement or a bare block as ending at its brace**
- **Found during:** Task 1
- **Issue:** the module-scope reader ported from the previous check ended a statement only at a `;` or at the brace of a function, interface, class or enum, so a `let` that follows an `if (...) { ... }` or a bare block was read as part of that statement and escaped the new module-scope-`let` judge.
- **Fix:** the reader's head pattern also takes `if`, `for`, `while`, `switch`, `try`, `do`, `else`, `catch`, `finally` and a leading `{`, with a self-test case; the planted `let b` after a block is now flagged.
- **Files modified:** `87-check.mjs`
- **Commit:** `805aaf73`

**5. [Rule 2 - Missing critical functionality] The stated-run guard judge accepts the plan's own wording**
- **Found during:** Task 2
- **Issue:** a first draft required the guard as a block-bodied arrow with a parameter named `write`, which would refuse the plan's description ("returns a writer that drops a value when the run is not current before reading it") written as one expression or with another parameter name.
- **Fix:** the judge reads the last `guard` signature (the interface comes first), takes its parameter name, and requires `isCurrent(` between the signature and the first call of that parameter. A planted expression-bodied guard passes, one that writes first and one that never reads `isCurrent` fail.
- **Files modified:** `87-check.mjs`
- **Commit:** `805aaf73`

### Interpretations

- **Gates cadence order.** The plan says the judge finds the cadence function and checks its `fork(` comes before its `publish(`. At the base the publish is not inside `cadence`; it follows the call in `configure`. The judge states INV-QD-408 on both: the steps of the one `makeConfigure` call must call `cadence(` before `publish(`, and the cadence function must fork its own superseding run (and publish only after forking, if it publishes at all).
- **Pinned-by paragraphs.** BEH-QD-461 pins through an `Enforcement:` paragraph with package-relative paths (`test/model/...`), not `Pinned by` with `packages/...` paths; the reader takes both, and a quoted title ahead of the first file belongs to it. The judge passes on the real spec unchanged.
- **Environment note.** The first `<automated>` verify of Task 1 contains `rm -rf .vitest` inside `bash -c`; as recorded by plan 02, I ran the same script without that one statement from a scratch file and removed `.vitest` in a separate command. Nothing the verify proves changed.

**Total deviations:** 3 plan defects, 2 auto-fixed (Rule 2), 3 interpretations. **Impact:** none on scope; the check is stricter than the plan's text where the text was silent and exact where it was wrong.

## Issues Encountered

- The first self-test runs found three wrong expectations of my own (a `Record` key order that moved `047` after the numeric keys, a message that named the earlier step in a swap, and a helper left over from the previous check) and the `topLevel` limit of deviation 4; the first three were fixed in the planted case, not in a judge.
- `scan-forbidden` and `scan-ids` read untracked files whole, so a scratch file under `packages/devtools/src/model/` is judged at once; the evidence variants for both used such a file and removed it.

## Known Stubs

None.

## Threat Flags

None: this plan adds a phase script and evidence lines, no network endpoint, auth path or schema.

## Self-Check: PASSED

- Files: `87-check.mjs` and the `## 87-03 the phase check` section exist (the Task 3 verify).
- Commit: `805aaf73` is an ancestor of HEAD with the one `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer; `node 87-check.mjs commit "chore(87-03): add the phase check" <the two paths>` and `trailers` (8 commits) exit 0.
- `node 87-check.mjs --self-test` 301 passed; oxlint clean on the check; `87-pinned-check.mjs` exits 0 (122 held, 5 of 5 born, 0 of 2 declared edits applied); `git status --porcelain -- packages spec` prints nothing; no scratch file under `packages`, no `.vitest/`.
