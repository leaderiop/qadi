---
phase: QD-91-named-barrels-and-visibility-only-files-folded-away
plan: 01
subsystem: testing
tags: [stryker, vitest-coverage, mutation-base, coverage-base, scorer]

requires:
  - phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
    provides: the scorer shape (90-mutation.mjs) and the path-filtered coverage command
  - phase: QD-89-one-admission-step-for-a-host-s-audit-batch
    provides: 89-mutation-close.json (ArchiveFacts.ts 54 of 54) and the RENAMED idea
  - phase: QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner
    provides: 86-mutation-close.json (RegistryLease.ts 28 of 28)
provides:
  - 91-mutation.mjs, the phase scorer over three Stryker groups (core, audit, react) with RENAMED fold sums, base and close, coverage base and close, landed checks and a 122-case self-test
  - 91-mutation-base.json, the mutation base of the seven touched files Stryker measures, taken on the unchanged tree
  - 91-coverage-base.json, the coverage base of core, react and audit with every touched file's covered and total counts
affects: [91-02 through 91-21, every later compare against the base]

phase_base: 69e5247d205949df7396dfacb0a29bc96a02f321
plan_head_before: 69e5247d205949df7396dfacb0a29bc96a02f321
plan_head_after: 1aacd98a93edb0989edbc597a32de303c9ceb94e
base_record: d491c0c1
coverage_base: 1aacd98a

actuals:
  tokens: 21700
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "one scorer, one group per Stryker config, each run strictly one at a time"
    - "a folded file's base side is the sum over its sources, compared by integer cross-multiplication"
    - "coverage compared as covered and total counts, never a rounded percentage"

key-files:
  created:
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-mutation.mjs
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-mutation-base.json
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-coverage-base.json
  modified: []

key-decisions:
  - "Each group reads the report its own Stryker config writes (reports/mutation, reports/mutation-audit, reports/mutation-react), not one shared path"
  - "A folded file's close is judged against the summed base side; a source's survivors are matched by the text of their line, the file's own by the line mapped through git diff -U0"
  - "unmeasured_why is an object keyed by path (eleven entries), each with its reason"

requirements-completed: []

duration: 25min
completed: 2026-11-26
status: complete
---

# Phase QD-91 Plan 01: Mutation and coverage base Summary

**A three-group Stryker scorer plus the phase's mutation base (core, audit, react, one config at a time) and its core, react and audit coverage base, measured on the unchanged tree and committed before anything moved.**

## Performance

- **Duration:** about 25 minutes
- **Started:** 2026-11-26
- **Tasks:** 2 of 2
- **Files created:** 3 (plus this summary)

## Accomplishments

- `91-mutation.mjs` (modes `record base|close --group <g>`, `probe --group <g>`, `compare`, `coverage base|close`, `landed base|coverage-base|close|coverage-close`, `--self-test`): self-test `self-test: 122 passed`, `oxlint` clean, no literal phase directory.
- The mutation base is recorded for the three configs and cross-checked against the wave records.
- The coverage base is recorded for three packages with every touched file's per-metric covered and total counts.

## phase_base

`phase_base: 69e5247d205949df7396dfacb0a29bc96a02f321` (branch `arch-wave-16`; `e89f89ce` is its ancestor and nothing outside `.planning/` differs between them).

## base_record

`base_record: d491c0c1` (`docs(91-01): record the mutation base`, a child of `phase_base`, exactly `91-mutation.mjs` and `91-mutation-base.json`, one trailer). Each invocation is the exact string the plan gives; each group's `head` equals `phase_base`.

| Group | File | killed | timeout | survived | noCoverage | ignored | detected | valid |
| ----- | ---- | -----: | ------: | -------: | ---------: | ------: | -------: | ----: |
| core | `PortSpanEncode.ts` | 16 | 0 | 4 | 0 | 14 | 16 | 20 |
| core | `PortSpan.ts` | 0 | 0 | 0 | 0 | 0 | 0 | 0 (absent, no mutant) |
| core | `PortSpanDecode.ts` | 1 | 0 | 0 | 0 | 1 | 1 | 1 |
| core | `PortInterpreter.ts` | 0 | 0 | 0 | 0 | 4 | 0 | 0 (present, ignored mutants only) |
| audit | `ArchiveFacts.ts` | 54 | 0 | 0 | 0 | 4 | 54 | 54 |
| audit | `SequenceIntegrity.ts` | 0 | 0 | 0 | 0 | 0 | 0 | 0 (absent, no mutant) |
| react | `RegistryLease.ts` | 28 | 0 | 0 | 0 | 0 | 28 | 28 |

Cross-checks (both passed, read from the wave records by directory prefix): `ArchiveFacts.ts` 54 of 54 equals `89-mutation-close.json`; `RegistryLease.ts` 28 of 28 equals `86-mutation-close.json`.

Fold sums the close is judged against: `PortSpanEncode.ts` 17 of 21 (16/20 + 1/1), `PortSpan.ts` n/a (0/0 + 0/0), `ArchiveFacts.ts` 54 of 54 (54/54 + 0/0).

Measured-not-expected finding: the four survivors of core's base, all on `PortSpanEncode.ts` line 59 (`if (raw === undefined || field === undefined) continue;`: a `LogicalOperator` and three `ConditionalExpression` mutants). Research ran no Stryker, so this was unknown; they are base survivors, carried through the line mapping, so they are not new in the close. The Phase 91 core fold edits that file, and plan 21 must not let any of them become a new open mutant.

## coverage_base

`coverage_base: 1aacd98a` (`docs(91-01): record the coverage base`, the second plan commit, exactly `91-coverage-base.json`, one trailer; every figure measured by `pnpm exec vitest run packages/<p>/test --coverage.enabled --coverage.include=packages/<p>/src/** --coverage.exclude=packages/<p>/src/index.ts --coverage.reporter=json-summary …`).

| Package | Files | lines | functions | branches | statements |
| ------- | ----: | ----: | --------: | -------: | ---------: |
| core | 94 | 99.89 | 99.78 | 98.4 | 99.64 |
| react | 21 | 99.5 | 98.68 | 99.04 | 99.54 |
| audit | 24 | 100 | 100 | 100 | 100 |

Touched files, line counts (covered/total): core `PortSpanEncode.ts` 37/37, `PortSpan.ts` 0/0 (no executable line), `PortSpanDecode.ts` 2/2, `PortInterpreter.ts` 1/1; react `GateRegistry.ts` 2/2, `GateWriter.ts` 56/56, `Hydration.ts` 4/4, `HydrationEngine.ts` 96/96, `QadiAtoms.ts` 29/29, `QadiProvider.tsx` 35/35, `DevtoolsFeed.ts` 12/12, `hooks.ts` 30/30, `RegistryLease.ts` 21/21; audit `ArchiveFacts.ts` 28/28, `SequenceIntegrity.ts` 0/0. Functions, branches and statements are in the record.

Measured against research: audit (24 files, 100 all four) and react (21 files, 99.5/98.68/99.04/99.54) match exactly. Core was not re-measured by research and is new here: 94 files, 99.89/99.78/98.4/99.64, which equals what the research cites from Phase 90's close record.

## Deviations from Plan

### Plan defects (checks fixed to be honest, nothing weakened)

**1. [Plan defect] One shared report path.** The plan's interfaces say all three configs write `reports/mutation/mutation.json`. Only core's does; `stryker.audit.mjs` writes `reports/mutation-audit/mutation.json` and `stryker.react.mjs` `reports/mutation-react/mutation.json`. Before: one `REPORT` constant. After: each group names its own report and `record` refuses a config whose `jsonReporter.fileName` is not that path.

**2. [Plan defect] A self-test case the plan's own rule contradicts.** The plan lists "50/54 + 3/3 against a close of 52/57 passes, 51/57 fails". The base side is 53/57 by the plan's own sum rule, and its must-have truth says "a tie passes, one below fails", so 52/57 cannot pass. The self-test asserts 53/57 passes (tie), 52/57 fails and 51/57 fails.

### Choices the plan left open (autonomous, most complete option)

**3.** `unmeasured_why` is an object keyed by path (eleven entries), not an array, so each reason sits beside its file. `landed base` compares it to the constant whole.

**4.** `MAY_BE_ABSENT` is every group file, as the action says; the report must still hold at least one of them. `PortSpan.ts` and `SequenceIntegrity.ts` were absent (no mutant); `PortInterpreter.ts` was present with four Ignored mutants only.

**5.** `record close --restart` replaces that group's entry only (a re-close of one group does not wipe the others); a held record naming a different `phase_base` is replaced whole.

**6.** The scorer's `landed` checks `EXACT`, a literal copy of the plan's invocation strings, as well as `invocation()`, so an edit of `GROUPS` alone cannot move what `landed` expects.

**7.** Attribution: the task brief fixes the trailer as `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; both commits carry exactly that line.

No Rule 1 to 3 auto-fixes of source were needed; no file under `packages`, `spec` or `scripts` changed.

## Authentication gates

None.

## Known Stubs

None.

## Threat Flags

None. T-91-01 and T-91-02 are mitigated as planned: each record names `phase_base` and the exact command, is refused on a dirty tree or a foreign report, was cross-checked, and was committed alone and first; `coverage` refuses a summary with zero files or a missing touched file.

## Issues Encountered

None. `.stryker-tmp/` and `.vitest/` were never left behind.

## Task Commits

1. Task 1 (tracer): `d491c0c1` `docs(91-01): record the mutation base`; verified with `node 91-mutation.mjs landed base` (`landed base: ok`).
2. Task 2: `1aacd98a` `docs(91-01): record the coverage base`; verified with `node 91-mutation.mjs landed coverage-base` (`landed coverage-base: ok`).

## Self-Check: PASSED

- Files found: `91-mutation.mjs`, `91-mutation-base.json`, `91-coverage-base.json`.
- Commits found as ancestors of HEAD: `d491c0c1`, `1aacd98a`.
- `git status --porcelain -- packages spec scripts` prints nothing.
