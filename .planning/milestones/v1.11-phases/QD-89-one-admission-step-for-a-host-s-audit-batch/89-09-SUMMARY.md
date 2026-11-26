---
phase: QD-89-one-admission-step-for-a-host-s-audit-batch
plan: 09
subsystem: audit
tags: [audit, mutation-close, stryker, scratch-variants, coverage, changeset]

phase_base: 8ee14f6f703f3121d44d15a1515d02eff62ca63f
plan_head_before: 48d6c23f23e92357c2c3d01b0ef9d3d701fedf49
plan_head_after: a02209112bee9c8c0d0af507deaa166de7d6a4d0
commits: 3
status: complete

requires:
  - phase: QD-89-one-admission-step-for-a-host-s-audit-batch
    provides: HostBatch.ts and the four entry points admitting through it, 89-check.mjs, 89-mutation.mjs and the base record, plans 01 to 08
provides:
  - thirteen scratch variants recorded failing in 89-RED-EVIDENCE.md (four entry-point variants, nine judge clauses)
  - 89-mutation-close.json, the audit close over six files, with phase91_base
  - EQUIVALENT (one filter mutant) and EXAMINED (one static Ignored mutant) in 89-mutation.mjs, each from the measured report
  - .changeset/audit-batch-admitted-once.md, the one @qadi/audit patch changeset
affects: [QD-89 plans 10 and 11, the fold of SequenceIntegrity.ts into ArchiveFacts.ts]

requirements-completed: []

actuals:
  tokens: 6000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "a variant driver that edits a copy of the source, runs the full audit suite and the judge, lists the failing titles, and restores with cp"
    - "a hand run of the static Ignored mutants through a scratch Stryker config that spreads the audit config with ignoreStatic false and reports to the scratch directory, so the close report is not overwritten"

key-files:
  created:
    - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-mutation-close.json
    - .changeset/audit-batch-admitted-once.md
    - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-09-SUMMARY.md
  modified:
    - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-RED-EVIDENCE.md
    - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-mutation.mjs

key-decisions:
  - "The one survivor, the filter in admitRows, is recorded EQUIVALENT with its reason rather than killed: a hole is refused before the line, so the mutant admits the same elements in the same order."
  - "The static Ignored mutant of takeRows is admitted through EXAMINED after a hand run with ignoreStatic false saw it Killed; no new test file was needed."
  - "Coverage runs with a path filter (packages/audit/test), not --project audit, because the project filter measures no file under the root coverage include."

patterns-established:
  - "A mutation close is committed with its scorer entries and its evidence in one commit, so the numbers and the reasons stand together"

coverage:
  - id: D1
    description: "the four entry-point variants and nine judge clauses each seen failing on the wired code and recorded"
    verified_by: Task 1 verify (v89-09-t1.sh) and 89-RED-EVIDENCE.md under `## 89-09 the entry-point variants` and `## 89-09 the judge clauses`
  - id: D2
    description: "the close holds the base for every touched file, HostBatch.ts has no open mutant but the equivalent one, phase91_base equals ArchiveFacts.ts, unmeasured is empty"
    verified_by: node 89-mutation.mjs compare, and the Task 2 verify
  - id: D3
    description: "audit coverage is 100 percent on every metric with HostBatch.ts measured"
    verified_by: the Task 2 verify coverage step (with the path filter)
  - id: D4
    description: "the one patch changeset added since phase_base, and the earlier-phase ledger passing with its changeset row"
    verified_by: Task 3 verify (v89-09-t3.sh) and node 89-earlier-checks.mjs
---

# Phase 89 Plan 09: The variants, the mutation close and the changeset Summary

**All thirteen remaining variants are seen failing on the wired code, the audit mutation close holds the base for every touched file with `HostBatch.ts` having only its one equivalent survivor and one examined static mutant, `phase91_base` is written, audit coverage is 100 percent, and the one `@qadi/audit` patch changeset is committed.**

## Performance

- **Started:** 2026-11-26T03:34Z; **Completed:** about 03:55Z (roughly 20 minutes)
- **Tasks:** 3 (one tracer, two auto); three plan commits plus the summary commit
- **Files:** 2 created (close record, changeset), 2 edited (scorer, evidence); nothing under `packages` changed
- Scratch files lived in `$TMPDIR/qd89` (originals of the touched sources, the variant reports, the close report copy, the hand-run report and the coverage summaries) and the session scratchpad (the variant driver `variants-89-09.mjs` and the verify scripts `v89-09-t1.sh` to `t3.sh`); `git diff --quiet HEAD -- packages/audit` held after every variant.

## Accomplishments

- **Tracer (Task 1, `bd039183`):** the four entry-point variants each turned the rows the plan predicts red. `verify-span-first` (the public verify named `qadi.audit.verifySequenceIntegrity`): S6, S7, SF3, SF4 and the span-name row of the verify; `purge-maps-retention`: B2, B9, B13; `age-rereads-policy`: B1, B2. `now-restated` turns no test red (types are not checked by the runner) and fails `admission-step` with `NowNotFinite: is a member key in 2 files of packages/audit/src, not one`. The nine judge clauses each fail the named mode: `second-rowsrefusal`, `effect-in-step`, `bare-isfinite`, `step-in-barrel`, `back-edge` and `codecmade-changed` against `admission-step`; `purge-calls-retention`, `first-not-step` and `facts-take-list` against `entry-points-first`. The tracer verify passed before Task 2 began.
- **Close (Task 2, `e9d6588e`):** `pnpm exec stryker run stryker.audit.mjs --mutate` over the five base files plus `HostBatch.ts`, alone on a clean tree with stdin closed, 248 mutants in 33 seconds. Per file (detected over valid): `AuditArchive.ts` 78/78 (14 Ignored, base 82/82 with 14), `ArchiveFacts.ts` 54/54 (4, base 55/55 with 4), `Retention.ts` 56/56 (1, base 57/57 with 2), `CodecMade.ts` 18/18 (0), `SequenceIntegrity.ts` 0/0, `HostBatch.ts` 21/22 with one Survived and one Ignored. Every score that fell lost only killed mutants (the moved checks). `probe` was seen failing on the two `HostBatch.ts` lines, then the filter survivor was recorded `EQUIVALENT` (line text copied from the report) and the static `takeRows` arrow `EXAMINED` after a hand run with `ignoreStatic: false` and `--mutate packages/audit/src/HostBatch.ts`: 23 mutants, 22 Killed including the static ones, the filter the only survivor. `record close` wrote `89-mutation-close.json` and `compare` passes. `phase91_base` is `ArchiveFacts.ts` at 54 detected of 54 valid, score 100, measured at head `bd039183`.
- **Coverage:** audit coverage over `packages/audit/src` (24 files, `HostBatch.ts` among them, 20 of 20 lines, 5 of 5 functions, 10 of 10 branches, 21 of 21 statements): lines 561 of 561, functions 237 of 237, branches 208 of 208, statements 626 of 626, all 100 percent.
- **Changeset (Task 3, `a0220911`):** `.changeset/audit-batch-admitted-once.md`, a `@qadi/audit` patch with the plan's exact text. It names the one-step admission and its order, the refused batch no longer opening the sequence span, `maxAgeMs` read once with a `null` or `undefined` policy refused as `MaxAgeInvalid`, rows read once (INV-QD-399), and that no export changes. It is the one changeset added since `phase_base`; `89-earlier-checks.mjs` exits 0 and prints Phase 88's `records --close` row as `exit 1: 2 changesets are added since phase_base, not one`, which is the row it expects.

## Task Commits

1. Task 1: `bd039183ef30bcda841460ceee3b8d1efbe81797` `docs(89-09): record the scratch variants` (`89-RED-EVIDENCE.md`)
2. Task 2: `e9d6588e` `docs(89-09): record the mutation close` (`89-mutation.mjs`, `89-mutation-close.json`, `89-RED-EVIDENCE.md`)
3. Task 3: `a02209112bee9c8c0d0af507deaa166de7d6a4d0` `chore(89-09): add the patch changeset` (`.changeset/audit-batch-admitted-once.md`)

No `test(89-09): close the surviving mutants of the admission step` commit was needed: the only survivor is equivalent.

## Deviations from Plan

### Plan defects

**1. [Rule 3 - Blocking] The coverage command measures nothing under `--project audit`**
- **Found during:** Task 2, the coverage step the planner flagged.
- **Issue:** `pnpm exec vitest run --project audit --coverage.enabled ...` runs the 724 rows but the coverage report holds zero files (`coverage-summary.json` has only `total` with 0 of 0), with or without the `--coverage.include` override. The `--project` filter roots the run in the project, so the root coverage globs match nothing.
- **Fix:** the verify's coverage command takes a path filter instead. Before: `pnpm exec vitest run --project audit --coverage.enabled --coverage.include="packages/audit/src/**" ...`. After: `pnpm exec vitest run packages/audit/test --coverage.enabled --coverage.include="packages/audit/src/**" ...`. It runs the same 34 files and 724 rows, and the summary then holds the 24 audit files with `HostBatch.ts` measured. The threshold check after it is unchanged (90 percent on each metric). The check is no weaker: it reads the same four metrics over the same files. The plan file itself is unedited; the corrected command lives in the scratch verify script `v89-09-t2.sh`.

### Auto-fixed Issues

None.

### Plan notes (choices the plan left open)

- **The variant driver prints rows in file order.** The Task 1 verify reads the first lines after each behavioural variant, so the failing titles are listed sorted by test file and in definition order; the three behavioural blocks then name S6, S7, SF3 first, B2, B9, B13 and B1, B2.
- **`purge-maps-retention` also turns B2 red** (it re-reads `maxAgeMs` through `planRetention`), and `verify-span-first` also turns S6, S7 and the span-name row red; each block lists every failing row.
- **`now-restated` also run through the suite:** 0 rows fail, which is why its block records a `check failed` line and a `(0 failing row(s) ...)` count.
- **The hand run wrote its report to the scratch directory** (the scratch config sets `jsonReporter` and `htmlReporter` there), so `reports/mutation-audit/mutation.json` stayed the close report `record close` read; the scratch config `stryker.audit.hand.mjs` was removed from the root with a plain `rm`, and no `.stryker-tmp/` remains.
- **A stray background wait loop** matched its own command line in `pgrep` and was killed with `pkill -f`; it touched nothing under the repository.
- **Verifies ran from script files** (`bash <file>`), each the plan's text with the one coverage fix above; none contains `rm`. The trailer on every commit is `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, the value the phase fixes.

### Auth gates

None.

## Issues Encountered

None.

## Next Phase Readiness

- Plan 10 can write ADR-QD-202, BEH-QD-781 to 785, INV-QD-423 and INV-QD-424 and the ADR-QD-190 and ADR-QD-110 amendments; `records --close` for this phase needs the one changeset, which exists.
- Phase 91 judges the fold of `SequenceIntegrity.ts` into `ArchiveFacts.ts` against `phase91_base` in `89-mutation-close.json` (54 of 54).

## Known Stubs

None.

## Threat Flags

None. T-89-25 is mitigated by the close compared against the base (no new open or Ignored mutant, one `EQUIVALENT` with its reason, one `EXAMINED` after a hand run that saw it Killed); T-89-26 by the changeset sentences on the span change and the read-once fix with INV-QD-399; T-89-27 because the changeset is a file only and nothing was versioned, published or pushed.

## Denied commands

None.

## Self-Check: PASSED

- Found: `89-mutation-close.json`, `.changeset/audit-batch-admitted-once.md`, the evidence file with the 13 variant blocks and the `## 89-09 the mutation close` section, this summary.
- Commits `bd039183`, `e9d6588e`, `a0220911` are ancestors of HEAD, each ending with exactly one `Co-Authored-By: Claude Opus 5.5` trailer; `git rev-list --count 48d6c23f..HEAD` is 3 before the metadata commit.
- Task 1, 2 and 3 verifies passed; `compare`, `--self-test` (92 passed), `scan-ids`, `scan-forbidden`, `trailers` (27 commits), `admission-step`, `entry-points-first`, `89-pinned-check.mjs --all-applied` (47 held, 5 of 5 born, 3 of 3 declared) and `89-earlier-checks.mjs` pass; `git diff --quiet 48d6c23f -- packages` holds; no `.vitest/`, `.stryker-tmp/` or scratch Stryker config is left.
