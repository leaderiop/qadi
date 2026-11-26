---
phase: QD-91-named-barrels-and-visibility-only-files-folded-away
plan: 02
subsystem: testing
tags: [phase-check, scratch-clones, variants, barrels, folds, red-evidence]

requires:
  - phase: QD-91-named-barrels-and-visibility-only-files-folded-away
    provides: 91-mutation.mjs (its modes are the second half of the evidence) and the recorded phase_base
  - phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
    provides: 90-check.mjs, the pure-judge plus thin-reader shape this script ports
provides:
  - 91-check.mjs, the phase's one check script, with every mode a later plan runs, a 473-case self-test and PHASE_COMMITS (every subject of the 91-01 table with its exact path set)
  - 91-RED-EVIDENCE.md with 38 blocks, one per mode of 91-check.mjs and of 91-mutation.mjs, each seen failing on a scratch clone
affects: [91-03 through 91-21, every plan that commits through 91-check.mjs commit]

phase_base: 69e5247d205949df7396dfacb0a29bc96a02f321
plan_head_before: 0eb46dc7e3f53a3dad460416ad06e4d0943afb50
plan_head_after: f6719e7ffe08df4b5a95bfac6e56cb2da1204134

actuals:
  tokens: 55600
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a mode is a pure judge over text plus a thin reader; the self-test drives the judges with planted text and never reads a real constant of the tree"
    - "a variant runs one check inside a scratch clone and writes its block only when the run failed"
    - "the base facts a later plan lands (surface snapshot, spike record, fold commits) are read through readers that fail with a named reason while they are absent"

key-files:
  created:
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-check.mjs
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-RED-EVIDENCE.md
  modified: []

key-decisions:
  - "Variant kind script accepts a script of the phase directory or an existing repo-relative scripts/*.mjs file, so plan 03's surface-diff variants run through the same kind"
  - "The coverage floor is seen failing through coverage close on a clone with the core tests deleted and committed; coverage base is seen failing separately, because it refuses any committed source change outside .planning before it measures"
  - "A variant of the surface kind (and any script variant) runs with QD91_MAIN_TREE set to the main tree, so the clone reads the main tree's base snapshot and surface record"

requirements-completed: []

duration: 3h
completed: 2026-11-26
status: complete
---

# Phase QD-91 Plan 02: The phase check Summary

**One script, `91-check.mjs`, that owns every mode the remaining nineteen plans run (commit hygiene, scratch clones and variants, the barrel, home, fold, escape, rule, changeset, spike and record judges, and the close), committed with a 473-case self-test, and 38 recorded failures of its own modes and the mutation scorer's.**

## What was built

`91-check.mjs` (2681 lines, plain Node ESM, finds its own directory from `import.meta.url`, refuses to run outside the repository root or outside a `QD-91-` directory). Each mode is a pure judge over text plus a reader that gathers the text; a failure prints its reasons to stderr and exits 1.

**Shared modes:** `base`, `commit "<subject>" <paths...>`, `unchanged`, `scratch <name> [--at <rev>]`, `scratch-clean [--check]`, `variant <name> <label> <kind> [args...] --edit "<what>"`, `seen-failing <file> [--if-present]`, `vitest`, `suite`, `scan-ids`, `scan-forbidden`, `trailers [--message <file>]`, `records [--close]`, `circular`, `surface`, `structural --record <BARRELS|FOLDS> "<subject>"`.

**Shape judges:** `barrels [--text]`, `homes`, `folds`, `escape`, `escape-scan <lib-dir>`, `rule`, `changesets`, `spike [--rerun]`; and `close`, which runs the pinned-test and earlier-phase checks, every judge above once, the three surface tests, the seen-failing checks, the scorer's `compare`, `landed close` and `landed coverage-close`, and `escape` last, then the no-release facts.

**Variant kinds:** `vitest`, `tstyche`, `tsc-src`, `tsc-test`, `house-style`, `api`, `circular`, `surface`, `package`, `lint`, `script`.

`PHASE_COMMITS` holds every subject of the 91-01 table byte for byte with its exact paths; the spike, sweep and mutation-test rows read their path sets from the commit's own records (`91-SPIKE.md` and `spike/`, the `## Fixed` rows of `91-SWEEP.md`, a subset of the born mutation tests plus the evidence file). `GUARDED` is `.oxlintrc.json` byte for byte, `AGENTS.md` outside sections 7a, 9 and 16, and every `*_BUDGET` and `*_BUDGET_NAMES` literal of `scripts/check-house-style.mjs` (read with its own scanner, because that file holds regex literals the blanking reader would misread).

## Self-test

`node 91-check.mjs --self-test` ends `self-test: 473 passed`. The shared half (commit, trailer, ids, forbidden forms, guards, evidence, vitest reports, scratch root, variants, the dynamic PHASE_COMMITS rows) is 268 cases; the shape judges, the records judge and the close add 205. Both halves were built and committed as one script, so the Task 1 count is the count with the later sections removed from a throwaway copy of the same file.

## Evidence: every mode seen failing

Each block is in `91-RED-EVIDENCE.md`, written by `variant`, with the edit, the sha256 of the clone's diff, the run, a non-zero exit and the failing text. Label, edit, and the reason that was recorded:

| Mode | Label | Edit | Recorded reason |
| ---- | ----- | ---- | --------------- |
| base | `91-check base` | base record deleted | phase_base is not recorded |
| commit | `91-check commit` | none | 0 commits since phase_base have the subject |
| unchanged | `91-check unchanged` | a held test edited | differs from phase_base |
| vitest | `91-check vitest` | one core assertion inverted | expected 'a' to equal 'b' |
| suite | `91-check suite` | the same inversion | the same failure through all six projects |
| scan-ids | `91-check scan-ids` | `D-12` comment in a core src file | names a decision number |
| scan-forbidden | `91-check scan-forbidden as-cast` / `agents-section-6` / `budget-number` | an `as` cast; a line in AGENTS.md section 6; a SWITCH_BUDGET number raised | an as cast; differs outside sections 7a, 9 and 16; an entry of SWITCH_BUDGET differs |
| trailers | `91-check trailers` | a commit with no trailer | 0 Co-Authored-By lines |
| records | `91-check records` | a pinned-by test renamed | names a test that does not exist |
| records --close | `91-check records-close` | none | no CCR-QD-483 row, no BEH-QD-791 heading, and the rest |
| circular | `91-check circular` | PortName.ts imports ./Ports.ts | the three cycles |
| surface | `91-check surface` | none | scripts/surface-diff.mjs and the base snapshot do not exist |
| structural | `91-check structural` | none | no commit with the subject |
| seen-failing | `91-check seen-failing` | evidence lacking the last title's line | no seen failing line for that title |
| barrels | `91-check barrels` | none | the `export *` lines |
| homes | `91-check homes` | none | the base snapshot does not exist |
| folds | `91-check folds` | none | no commit with each fold subject |
| rule | `91-check rule` | none | no NAMED_BARRELS, no self-test tag, DEVTOOLS_BARRELS still declared |
| changesets | `91-check changesets` | none | 0 changesets added, not 3 |
| spike / spike --rerun | `91-check spike`, `91-check spike-rerun` | none | 91-SPIKE.md does not exist |
| escape | `91-check escape` | none | the escape module does not exist |
| escape-scan | `91-check escape-scan` | none | the escape module does not exist |
| close | `91-check close` | none | the pinned-test, earlier-phase and records children exit 1 |
| scratch-clean --check | `91-check scratch-clean-check` | none | the scratch root exists |
| scratch | `91-check scratch-name` | a name holding `..` | not a scratch name |
| landed base | `91-mutation landed-base` | the recorded phase_base moved | groups.*.head is not phase_base |
| landed coverage-base | `91-mutation landed-coverage-base` | coverage base deleted | the file does not exist |
| landed close, landed coverage-close | `91-mutation landed-close`, `landed-coverage-close` | none | exactly one commit must carry the subject, found 0 |
| compare, probe, record close | `91-mutation compare`, `probe`, `record-close` | none | no close record or report (a raw ENOENT, see below) |
| record base | `91-mutation record-base-dirty` | an uncommitted source edit | record from a clean tree |
| coverage base | `91-mutation coverage-base-moved-source` | a source edit committed in the clone | the tree outside .planning differs |
| coverage close | `91-mutation coverage-close-floor` | every core test but one deleted and committed | coverage far below the threshold |

## Verification

- `node 91-check.mjs --self-test` exits 0, 473 passed; `pnpm exec oxlint 91-check.mjs` is clean.
- On the tree at this plan's start: `barrels --text`, `homes`, `folds`, `rule`, `changesets`, `spike` and `records --close` each exit 1 with reasons naming base facts; `base` prints `69e5247d205949df7396dfacb0a29bc96a02f321`.
- Task 3's verify: `commit "docs(91-02): record the phase check seen failing" <D>91-RED-EVIDENCE.md` and `trailers` both exit 0; the first commit also verifies through `commit` with its two paths.

## Task Commits

1. Tasks 1 and 2, the script, and the evidence file's heading: `a672a6f3` `chore(91-02): add the phase check` (exactly `91-check.mjs` and `91-RED-EVIDENCE.md`)
2. Task 3, the 38 evidence blocks: `f6719e7f` `docs(91-02): record the phase check seen failing` (exactly `91-RED-EVIDENCE.md`)

## Deviations from Plan

### Plan defects resolved by the smallest honest reading

**1. [Plan defect] `script` variant kind for `scripts/surface-diff.mjs`**
- **Found during:** reading plan 03 against plan 02's kind list.
- **Issue:** plan 02 defines `script <phase-script>` as a script of the phase directory; plan 03's variants run `node scripts/surface-diff.mjs ...` through the same kind.
- **Fix:** `script` takes either a name of the phase directory (no `/`) or an existing repo-relative `scripts/*.mjs` path inside the clone.
- **Commit:** a672a6f3

**2. [Plan defect] the "coverage clone" variant**
- **Issue:** `coverage base` refuses any change outside `.planning` before it measures, and refuses a dirty tree, so a clone with the core tests deleted cannot show the floor through `base`.
- **Fix:** the floor is seen failing through `coverage close` on a clone with every core test but one deleted and committed (`91-mutation coverage-close-floor`); `coverage base` is seen failing separately on a committed source edit (`91-mutation coverage-base-moved-source`).
- **Commit:** f6719e7f

**3. [Plan defect] the `landed base` edit**
- **Issue:** the plan says to set phase_base to "the parent of the recorded commit"; the recording commit's parent is phase_base itself, so that edit changes nothing.
- **Fix:** phase_base of the clone's base record was set to the parent of the recorded phase_base commit.
- **Commit:** f6719e7f

### Not fixed

**4. The scorer's `compare`, `probe` and `record close` fail with a raw ENOENT stack, not a message.** They are `91-mutation.mjs` from plan 01, which this plan may not edit; the evidence block records the first three stderr lines (the stack's head). The failures are real (no close record, no Stryker report) and exit 1.

**5. `homes` and `surface` cannot read their base facts yet.** The surface snapshot and record are plan 03's; until then both fail with a reason naming the missing file, which is what the unedited-clone variants record.

**6. The pinned-by judge checks that named test files exist, not that quoted titles exist.** The plan asks only for existence; the title check of plan 90 is not ported.

### Auto-fixed issues

None beyond the above; the self-test and the lint were clean on the first full run after four small fixes made before the first commit (an unused parameter, two unused helpers and an unused test helper, all removed) and one wrong planted case in the self-test.

## Authentication gates

None.

## Known Stubs

None.

## Threat Flags

None: the script reads git and the tree, writes only under the scratch root and to the phase's own record files, and runs no network call.

## Self-Check: PASSED

- `91-check.mjs` and `91-RED-EVIDENCE.md` exist.
- `a672a6f3` and `f6719e7f` are ancestors of HEAD, each with the one trailer.
- 38 evidence blocks, each with a non-zero exit and a failing text line.
