---
phase: QD-87-one-scoped-run-that-states-its-stop
plan: 04
subsystem: testing
tags: [devtools, phase-check, earlier-phase-checks, ledger, scratch-copies, red-evidence]

phase_base: 56b9ae4d98ebd1f950369c9830d4a310727895ac
plan_head_before: cdfabb7d1854fed20cbd9ad9cfa5d8ea20e47a95
plan_head_after: 5929ac295be8767c85c74c540d20ffac98dc19e3

requires:
  - phase: QD-87-one-scoped-run-that-states-its-stop
    provides: 87-01's phase_base and evidence file; 87-03's 87-check.mjs (unchanged, commit, trailers)
provides:
  - 87-earlier-checks.mjs, which re-runs Phase 85's and Phase 86's checks from scratch copies against a 28-row ledger measured on the base
  - the finding that both earlier phases' scan-ids exit 1 on five tape comments of this phase's held test files
affects: [QD-87 plans 05 to 11, every later run of the earlier phases' rules over the moved code]

actuals:
  tokens: 9000
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "a ledger of measured runs (exit and one line each) judged by pure functions, with a self-test of the judge and the line rule"

key-files:
  created:
    - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-earlier-checks.mjs
  modified:
    - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-RED-EVIDENCE.md

key-decisions:
  - "No ledger row carries a `when`: every moved file was read against the judges of the sixteen tree-only modes, the pinned checks and the self-tests, and none is read in a way the move changes."
  - "The two earlier `scan-ids` rows are recorded at exit 1, the measured result, rather than the earlier scripts or the held test files being edited."

patterns-established:
  - "an earlier phase's script that derives its directory from its location is run from a copy, and a script that derives the repository root from its location runs only its self-test"

requirements-completed: []

coverage:
  - id: D1
    description: "the earlier phases' checks are copied to scratch and every tree-only mode, both pinned checks and every copied self-test is run from the repository root with stdin closed, each compared with a measured ledger row"
    requirement: WX-01
    verification:
      - kind: other
        ref: "node 87-earlier-checks.mjs (28 runs, exit 0); the Task 1 verify"
        status: pass
    human_judgment: false
  - id: D2
    description: "the earlier phases' directories are only read: nothing under QD-85, QD-86 or .planning/milestones is written or run from"
    requirement: WX-07
    verification:
      - kind: other
        ref: "git status and a find -newer marker over the three paths before and after the run; the Task 1 verify"
        status: pass
    human_judgment: false
  - id: D3
    description: "the script's self-test passes (21 cases) and the comparison was seen failing on a ledger row with one changed character"
    requirement: WX-06
    verification:
      - kind: other
        ref: "node 87-earlier-checks.mjs --self-test; 87-RED-EVIDENCE.md section 87-04; the Task 2 verify"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-11-25
status: complete
---

# Phase 87 Plan 04: The earlier-phase checks Summary

**One committed `87-earlier-checks.mjs` re-runs Phase 85's and Phase 86's checks (sixteen tree-only modes, both pinned checks, eight self-tests) from scratch copies against a 28-row ledger measured on the base, with a 21-case self-test and a recorded failing variant.**

## Performance

- **Duration:** 20 min
- **Tasks:** 2 (one tracer, one auto)
- **Files created:** 1 (`87-earlier-checks.mjs`, 198 lines); one modified (the evidence file); nothing outside the phase directory changed

## Accomplishments

- **Tracer.** One row (`86-check.mjs base`) was wired end to end first: the Phase 85 and 86 directories are found by prefix, their scripts and the files they read are copied to `<S>/p85/` and `<S>/p86/`, each run starts from the repository root with stdin closed, and the line compared is the last stdout line on exit 0, else the first plain stderr line. It ran green before any other row existed.
- **The ledger, measured.** Every row is what the run printed with `packages/*/src` equal to `phase_base`: 85's `base`, `scan-ids`, `scan-forbidden`, `trailers` (33 plan commits), `no-react-in-model`, `three-predicates`, `panel-decides-nothing`, `frame-reads-status`, `records` and `records --close`, its pinned check (18 held, 1 of 1 born, 1 of 1 declared edit); 86's `base`, `scan-ids`, `scan-forbidden`, `trailers` (22), `owner-shape`, `provider-forwards-only`, `records`, `records --close`, its pinned check (59 held, 1 of 1 born); and the `--self-test` of `85-check`, `85-pinned-check`, `85-mutation`, `85-earlier-checks`, `86-check`, `86-pinned-check`, `86-mutation`, `86-earlier-checks` (245, 37, 57, 17, 262, 18, 64, 21 passed). `85-earlier-checks.mjs` and `86-earlier-checks.mjs` compute the repository root from their own location, so only their self-tests run.
- **No `when` row.** The header records the reading: the moved files (the three feeds, the session, the run module, the Simulator, its stopped box, the theme, the two new model files, `ThrownMessage.ts`, `builtFeeds.ts`, `SupersedingRun.test.ts`, the spec records) are not read by any judge in a way the move changes. `three-predicates`, `panel-decides-nothing` and `frame-reads-status` read `DockModel.ts`, `HydrationView.ts`, `QuestionsPanel.tsx`, `DevtoolsDock.tsx` and `useStoreSnapshot.ts`; `85-pinned-check.mjs` holds eighteen devtools tests and `86-pinned-check.mjs` every react test, and the two edits this phase declares are in neither set. The scans hold the moved code to the earlier phases' forbidden forms, which is what they are re-run for.
- **Self-test and seen failing.** `--self-test` (21 cases) drives the ledger judge (changed line, changed exit, a row that was 1 and is now 0, a changed self-test count, a missing run, a run no row names), `chooseRows` with and without `when` rows, the compared-line rule, the prefix search under `.planning/milestones/*-phases/`, and the ledger's shape. The comparison was seen failing once: `85-check.mjs trailers` with `33` changed to `34` printed `85-check.mjs trailers: expected the line "trailers: 34 plan commits, each with the one trailer", got "trailers: 33 plan commits, each with the one trailer"` (exit 1), recorded under `## 87-04 the earlier-phase checks`; the file was restored with `cp` and the plain run exits 0.

## Finding (not a deviation of the script): the earlier `scan-ids` rows are exit 1

Both `85-check.mjs scan-ids` and `86-check.mjs scan-ids` exit 1 on the tree as it is on the base. Five comment lines of this phase's born test files say a feed `publishes from now on` (`DiagnosticsFeed.stop.test.ts:35`, `StatedRun.characterisation.test.ts:45, 54, 63`, `TimelineFeed.stop.test.ts:29`), and the earlier phases' phrase list reads `from now on` as phase-relative wording. This is the same five lines plan 87-03 handled in `87-check.mjs`'s own `scan-ids` by a reviewed pattern edit. Here the files are held byte for byte (`87-pinned-check.mjs`, born files) and the earlier scripts belong to earlier phases, so neither is edited: the two rows record the measured exit 1 and the first stderr line, and the header says why. A later plan whose moved code adds wording to a path that sorts before `packages/devtools/test/model/DiagnosticsFeed.stop.test.ts`, or that makes the exit 0, changes the compared line and is a finding to read, not a row to widen. The phase-close verification should know both rows are exit 1 by design.

## Deviations from Plan

### Plan defects

**1. [Plan defect] The Task 1 verify fails on two untracked entries that predate the phase**
- **Found during:** Task 1
- **Issue:** the verify lists `git status --porcelain` for the Phase 85 and 86 directories and `.planning/milestones`, drops lines ending `.iterN.md`, and fails if anything is left. Two other untracked entries sit there from before the phase and were not written by the script (`.planning/milestones/v1.7-phases/QD-62-type-pins-that-can-fail/.review-diagnostics/`, modified 2026-11-20, and `.planning/milestones/v1.7-phases/QD-68.1-address-tech-debt/.gitkeep`, 2026-11-21), so it reported `an earlier phase directory was written` with the script not having touched them.
- **Fix:** the same verify, with that one check made to prove what it names: `git status --porcelain` over the three paths is captured before the run and compared with the capture after it (equal), and `find <the three paths> -newer <marker created before the run>` prints nothing. Everything else in the command is unchanged. The amended verify exits 0; the Task 2 verify has no such step and ran as written.
- **Files modified:** none (the verify command only)

### Auto-fixed Issues

None.

### Interpretations

- **The seen-failing run is made in the real file.** The plan allows the copy to run from `<S>` only if it finds the phase directories; the script derives the repository root from its own location, as the Phase 86 one does, so a scratch copy fails on `git rev-parse` (not a ledger failure). The one-character change was made in the real file after a `cp` backup to `<S>`, run from the repository root, and restored with `cp` (`cmp` equal, plain run exit 0) before the commit.
- **`chooseRows` is kept though no row has a `when`.** The plan asks for the mechanism and its self-test; the run passes `false` with a comment saying a row that needs a `when` reads its file state there.

**Total deviations:** 1 plan defect (verify), 0 auto-fixed, 2 interpretations. **Impact:** none on scope.

## Issues Encountered

- The first run of `records --close` in my measuring loop passed the two words as one argument and printed the usage line; the ledger row uses `args: ["records", "--close"]` and was measured again.

## Known Stubs

None.

## Threat Flags

None: a phase script and evidence lines, no network endpoint, auth path or schema. T-87-10 held: the earlier scripts run from `<S>`, and nothing under QD-85, QD-86 or `.planning/milestones` changed.

## Self-Check: PASSED

- Files: `87-earlier-checks.mjs` and the `## 87-04 the earlier-phase checks` section exist (the Task 2 verify).
- Commit: `5929ac29` is an ancestor of HEAD, subject `chore(87-04): add the earlier-phase checks`, the one `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer; `node 87-check.mjs commit "chore(87-04): add the earlier-phase checks" <the two paths>` and `trailers` (10 commits since the base) exit 0.
- `node 87-earlier-checks.mjs` exits 0 (28 runs); `--self-test` 21 passed; oxlint clean; `git status --porcelain -- packages spec` prints nothing new; no scratch file under `packages`, no `.vitest/`.
