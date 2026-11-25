---
phase: QD-87-one-scoped-run-that-states-its-stop
plan: 02
subsystem: testing
tags: [devtools, characterisation, pinned-check, timeline-feed, diagnostics-feed, simulation-session, stated-run]

phase_base: 56b9ae4d98ebd1f950369c9830d4a310727895ac
cells: b923640d4e5831eea33635f3f4bb5d52c0904d1a
plan_head_before: 58689e6b8794597e2a5d5c3e0cc2050794435952
plan_head_after: 08ed2498e8d89970c4f3e0c28f6cb4e4e9d0ae74

requires:
  - phase: QD-87-one-scoped-run-that-states-its-stop
    provides: 87-01's phase_base, mutation base, born red rows and 87-RED-EVIDENCE.md line forms
provides:
  - StatedRun.characterisation.test.ts, SC1 to SC12 green on the base, each seen failing under a scratch edit
  - 87-pinned-check.mjs, the computed held set, two declared files, five born files, --all-applied and --self-test
  - the base facts of the gates and suites, measured, for every later plan to compare with
affects: [QD-87 plans 03 to 11, StatedRun.ts, ConfigurePrologue.ts, SimulationSession.ts, TimelineFeed.ts, DiagnosticsFeed.ts, GatesFeed.ts, SupersedingRun.test.ts, builtFeeds.ts]

actuals:
  tokens: 12519
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a characterisation row that arms its throwing listener once, on the start-up publish a restart makes, after taking the run to Stopped so the publish is not a repeat that notifies nothing"
    - "a pinned check whose declared file is judged by ordered regions: anchors found once at the base, the text between regions found in order, kept lines compared by trimmed text and count"

key-files:
  created:
    - packages/devtools/test/model/StatedRun.characterisation.test.ts
    - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-pinned-check.mjs
  modified:
    - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-RED-EVIDENCE.md

key-decisions:
  - "The held set is computed from the base (123 files under packages/devtools/test, less the two declared, plus useConfigured.ts), so the printed count is 122 and a test the base holds cannot be left out."
  - "A kept law line in SupersedingRun.test.ts is compared by trimmed text and by count, so a re-indent of the property passes and a reworded or dropped assertion fails."

patterns-established:
  - "Seen failing for a row that guards three stores at once: each of the three guards removed alone also fails it, not only the three together"

requirements-completed: [STOP-01, STOP-02, STOP-03, STOP-05, WX-06, WX-07]

coverage:
  - id: D1
    description: "SC1 to SC12 hold the status sequences each store keeps, green on the base three runs in a row beside the four held store suites"
    requirement: STOP-01
    verification:
      - kind: unit
        ref: "packages/devtools/test/model/StatedRun.characterisation.test.ts; the Task 1 verify"
        status: pass
    human_judgment: false
  - id: D2
    description: "every cell seen failing under one scratch edit, the edit and the failing-row count in 87-RED-EVIDENCE.md"
    requirement: WX-06
    verification:
      - kind: other
        ref: "87-RED-EVIDENCE.md section 87-02 the stated-run cells; the Task 1 verify"
        status: pass
    human_judgment: false
  - id: D3
    description: "87-pinned-check.mjs prints its pass line on the tree, refuses --all-applied before any declared edit, passes its self-test and was seen failing for five kinds of change"
    requirement: STOP-05
    verification:
      - kind: other
        ref: "node 87-pinned-check.mjs, --all-applied, --self-test (35 passed); the Task 2 verify"
        status: pass
    human_judgment: false
  - id: D4
    description: "the base facts measured and recorded, and no file under packages/*/src differs from phase_base"
    requirement: WX-07
    verification:
      - kind: other
        ref: "git diff --quiet phase_base -- packages/devtools/src packages/core/src stryker.devtools.mjs"
        status: pass
    human_judgment: false

duration: 13min
completed: 2026-11-25
status: complete
---

# Phase 87 Plan 02: The stated-run cells and the pinned-test check Summary

**Twelve characterisation cells pin what the timeline feed, the diagnostics feed and the simulation session publish while a run starts, ends, dies, restarts and is superseded from inside a listener, and one computed check holds every other devtools test byte for byte apart from two bounded declared files.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-11-25T18:57:00Z
- **Completed:** 2026-11-25T19:10:00Z
- **Tasks:** 2 (one tracer, one auto)
- **Files created:** 2, one modified (the evidence file); no file under `packages/*/src` moved

## Accomplishments

- `StatedRun.characterisation.test.ts` holds SC1 to SC12 as the plan words them. Green three runs in a row alone and once beside `TimelineFeed.test.ts`, `DiagnosticsFeed.test.ts`, `SimulationSession.runs.test.ts` and `ConfigureRule.test.ts` (110 tests). It reads each store through its public interface and builds each one the way a host does.
- Every cell was seen failing under one scratch edit, restored from a copy; the evidence file names the edit and the number of rows that failed under it. SC1 (a read that dies after it ends) and SC2 (the stop body emptied) also fail the other cells that read a source through the same code, 3 rows each; every other edit fails exactly its own row. SC12's three closed guards each fail the row alone, not only together.
- The throw-and-supersede rows (SC7 to SC9) first take their run to `Stopped` (a dying live stream, a collector whose snapshot throws) and arm the throwing listener once, because a repeat publish of `Reading` or `Starting` notifies nothing. Each asserts the throw count (one), the identity (`thrownBy(...).thrown` is the thrown object) and which run's work happened (reads, samples, resolver calls: `a` read once, the newer run read once).
- `87-pinned-check.mjs` prints `pinned: 122 files hold their base text, 5 of 5 born files held, 0 of 2 declared edits applied` on the tree; `--all-applied` exits 1 now (neither declared edit is applied); `--self-test` passes 35 cases; oxlint is clean. It was seen failing for a held test, the hook, a born file, a line outside a declared region and a dropped export.
- The declared-region judge was also run against the real `SupersedingRun.test.ts` with a scratch rewrite of `onFailure` and `ForkHooks` inside the regions only: it passed with `1 of 2 declared edits applied`, and a changed `law 2` line failed naming the dropped kept line. The file was restored with `cp`.

## Base facts

Measured at `08ed2498` (the plan's two commits on `phase_base` plus plan 01's), repository root, stdin closed. Each line is `command | exit status | last line as printed`.

```
node scripts/check-house-style.mjs | exit 0 | house-style: 630 file(s) clean (3 declared switch(es), 79 type-test file(s))
node scripts/check-api-surface.mjs | exit 0 | api-surface: 942 export(s) documented across 9 package(s)
node scripts/check-dod-table.mjs | exit 0 | dod-table: 26 step(s) match pnpm check, 181 reference(s) resolve
node scripts/check-doc-examples.mjs | exit 0 | doc-examples: 122 block(s) compile
node scripts/check-devtools-claims.mjs | exit 0 | devtools-claims: 8 claim(s) registered across 6 file(s)
node scripts/check-website-doc-examples.mjs | exit 0 | website-doc-examples: 77 block(s) compile
bash spec/scripts/verify-traceability.sh --strict | exit 0 | PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)
shasum -a 256 qadi-reserved-ids.json | exit 0 | 61c5ff8b69267834068d7c605ec7c9e0bd6146c583c4682bcef5030a552adaf0  .git/qadi-reserved-ids.json
pnpm exec vitest run --project devtools | exit 1 |       Tests  10 failed | 2025 passed (2035)
vitest failing rows: DX1 DX2 SB2 SB3 SB4 SX1 SX2 SX3 TX1 TX2 
pnpm test:tstyche | exit 0 | Duration:   10.1s
pnpm circular | exit 0 | ✔ No circular dependency found!
pnpm exec tsc -p tsconfig.test.json --noEmit | exit 0 |
```

The devtools run is 2023 tests from plan 01 plus the twelve cells, and exactly the ten plan-01 red rows fail: SX1 to SX3, SB2 to SB4, TX1, TX2, DX1 and DX2.

## Held files

`87-pinned-check.mjs` holds three kinds, and computes the first from `phase_base`; it lists none of them by hand.

- **Held, 122 files.** Every path `git ls-tree -r --name-only <phase_base> -- packages/devtools/test` lists (123 files), less the two declared files, plus `packages/devtools/src/react/useConfigured.ts`: 123 - 2 + 1 = 122. Byte for byte, line endings included; a held file reported as moved or deleted by `git diff -M --name-status` fails, naming both paths for a move.
- **Declared, 2 files.**
  - `packages/devtools/test/builtFeeds.ts` is declared whole: any text passes that still declares `export const timelineFeedOf`, `diagnosticsFeedOf`, `gatesFeedOf` and `dockModelOf`; it counts as applied when it differs from the base and holds exactly one `Effect.tap(`.
  - `packages/devtools/test/model/SupersedingRun.test.ts` is held outside six regions, in file order: `head` (file start to `const body = (log`), `listener` (`/** What `onFailure` heard` to `/** Lets every fiber reach`), `R3` (`  it.effect("R3 ` to `  it.effect("R4 `), `R5toR7` (`  it.effect("R5 ` to `  it.effect("R8 `), `R9` (`  it.effect("R9 ` to `  it.effect("R10 `) and `property` (`describe("PROPERTY:` to the end of the file). Each anchor occurs once at the base, the text between regions is held byte for byte and found in order, and the property region keeps every base line holding `"law 1:`, `"law 2:`, `"law 3:`, `"law 4:` or `"law 6:` and the two law 7 lines other than the heard one (`law 7: nothing starts after close`, `law 7: nothing lands after close`), by trimmed text and at least as many times as the base has it. The file counts as applied when it differs from the base and holds neither `ForkHooks` nor `onFailure`.
- **Born, 5 files**, each held byte for byte against the one commit that adds it, all five present and held now: `test/model/SimulationSession.stop.test.ts`, `test/model/TimelineFeed.stop.test.ts`, `test/model/DiagnosticsFeed.stop.test.ts`, `test/model/StatedRun.characterisation.test.ts` and `test/react/Simulator.broke.test.tsx`, all under `packages/devtools/`.
- **Held per-feed rows, unedited in every case:** TF21 to TF23 and TF28 in `test/model/TimelineFeed.test.ts`; F28 to F31 and F33 in `test/model/DiagnosticsFeed.test.ts`; SR1 (`test/model/SimulationSession.runs.test.ts:55`; the id also starts rows in `DiagnosticsFeed.superseded.test.ts` and `SimulationSession.test.ts`), SR5 and SR6 in `test/model/SimulationSession.runs.test.ts`. All of those files are in the held set, and none is declared.

## Task Commits

1. **Task 1: twelve stated-run cells born green on the base, each seen failing (tracer)** - `b923640d` (test), `test(87-02): characterise the stated runs on the base`
2. **Task 2: the pinned-test check, seen failing; the base facts measured** - `08ed2498` (chore), `chore(87-02): add the pinned-test check`

The tracer was verified green (its `<automated>` verify, with the one change recorded below) before Task 2 started. The base facts and this summary are committed by the plan's metadata commit.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] The declared-region judge compares the property's kept lines by trimmed text and by count**
- **Found during:** Task 2
- **Issue:** the plan says each kept line "must still occur" in the region, and does not say how a line is compared. An exact comparison would make a plan that only re-indents the property body fail the check, and a presence-only comparison would let a kept assertion be duplicated away.
- **Fix:** a kept line is its trimmed text, and the region must hold it at least as many times as the base does.
- **Files modified:** `87-pinned-check.mjs`
- **Commit:** `08ed2498`

**2. [Rule 2 - Missing critical functionality] The declared-region check was run against the real file with a simulated edit**
- **Found during:** Task 2
- **Issue:** the plan's self-test plants a synthetic file; nothing showed that the anchors and the held text between regions resolve on the real `SupersedingRun.test.ts` once an edit lands in its regions, which is what plans 04 and later will do.
- **Fix:** a scratch rewrite of `onFailure` and `ForkHooks` inside the regions only passed with `1 of 2 declared edits applied`, a changed law line failed naming it, and the file was restored from a copy. Nothing is kept.
- **Files modified:** none kept
- **Commit:** none

### Plan defects

None: every verify ran as written, except that the first `<automated>` of Task 1 contains `rm -rf .vitest`, and the harness refuses a `bash -c` script that contains a removal it cannot check. I ran the same script without that one statement, and removed `.vitest` in a separate command. Nothing the verify proves changed: the clean tree is checked by the `git status --porcelain -- packages` line it keeps, and no `.vitest/` remains.

**Total deviations:** 2 auto-fixed (Rule 2), 0 plan defects, 1 environment note. **Impact:** none on scope; the check is stricter than the plan's text where the text was silent.

## Issues Encountered

- The first run of SC6 listened after `diagnosticsFeedOf` had configured the feed, and the collector that dies in its first sample had already stopped by then, so the tape was empty. The row now builds the feed bare, listens, then configures, and its tapes are `Starting, Stopped` and `Starting, Live, Stopped`.
- `tsc` and oxlint flagged an unused type import in the first draft of the test file; it was removed before the commit.

## Known Stubs

None.

## Threat Flags

None: this plan adds a test file and a phase script, no network endpoint, auth path or schema.

## Self-Check: PASSED

- Files: `StatedRun.characterisation.test.ts`, `87-pinned-check.mjs` and the two evidence sections exist (checked by the two task verifies).
- Commits: `b923640d` and `08ed2498` are ancestors of HEAD, each with the one `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer.
- `git diff --quiet 56b9ae4d -- packages/devtools/src packages/core/src stryker.devtools.mjs` holds; nothing is modified under `packages` or `spec`; no `.vitest/` and no scratch file remain under `packages`; `pnpm exec tsc -p tsconfig.test.json --noEmit` exits 0.
