---
phase: QD-59-admission-produces-the-one-walk-environment
plan: 10
subsystem: process
tags: [phase-close, scan, check-pr, release-check, requirements]
requires: [59-09]
provides:
  - "59-scan.mjs, the phase's close scan (verbatim, SHA-256 f9a0b16f...b18e), clean over the whole history since phase_base"
  - "D-15 re-run on the closed tree: WX-05 holds"
  - "pnpm check:pr green (16 of 16 steps, exit 0) after the last record commit"
  - "WENV-01..04 marked Complete in REQUIREMENTS.md; WX-01..07 left Pending"
affects: [milestone v1.6 close]
actuals:
  tokens: 3000
  tasks: 2
  commits: 1
plan_head_before: 6499d724c768cc037e338611a219f6f17df68b78
key-files:
  created:
    - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-scan.mjs
    - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-10-SUMMARY.md
  modified:
    - .planning/REQUIREMENTS.md
key-decisions:
  - "The first check:pr run stopped at step 9 (spec:gates, check-dod-table) on a stale bare `gate 13` in ADR-QD-172; the orchestrator fixed the record in 6499d724 and check:pr was re-run alone from the start"
requirements-completed: [WENV-01, WENV-02, WENV-03, WENV-04]
duration: 70min
completed: 2026-11-19
status: complete
---

# Phase QD-59 Plan 10: Phase close

**The whole phase history and tree pass the verbatim close scan, D-15 holds on the closed tree, `pnpm check:pr` is green on all 16 steps with core coverage at 99.61% statements, nothing was released, and WENV-01..04 are marked Complete with WX-01..07 still Pending.**

## Phase scan

`59-scan.mjs` was extracted mechanically from the plan; `node --check` passes and its SHA-256 is `f9a0b16f57295f0a8d9cbf398f74e0c9b7abd8b1be9e9574b156418cbbffb18e`. It was run twice, before and after the orchestrator's ADR fix (6499d724, an allowed spec path):

```
phase scan clean
```

No orchestrator-authorised verify-script deviation was needed (the 59-06 gap test `WalkDepthGuard.test.ts` was accepted by the scan as shipped).

## D-15

`node 59-mutation.mjs compare 59-mutation-static.json`, on the closed tree:

```
packages/core/src/Admission.ts 1 -> 1 (detected 6 -> 15; lost 5, rewritten 0, deleted 5; survivors +0 -0, moved 0)
  static: all 3 new ignored mutant(s) of packages/core/src/Admission.ts are Killed in ...59-mutation-static.json
packages/core/src/Predicate.ts 1 -> 1 (detected 284 -> 280; lost 7, rewritten 1, deleted 6; survivors +0 -0, moved 0)
packages/core/src/Walk.ts 0.9498207885304659 -> 0.9523809523809523 (detected 265 -> 260; lost 40, rewritten 30, deleted 10; survivors +0 -1, moved 9)
  static: all 1 new ignored mutant(s) of packages/core/src/Walk.ts are Killed in ...59-mutation-static.json
packages/core/src/Admission.ts detects 6 -> 15 (+9, static +3); detected mutants that left the fallen files: 0
WX-05 holds (D-15)
```

Third verify: `one after-bench, no changeset` (exactly one commit touches `bench/after/analysis.tsv`; no changeset added).

## check:pr

`pnpm check:pr < /dev/null`, run alone in the background, exit 0 (`run-check: ran 16 of 17 steps; "pnpm mutation" was skipped (release PRs run it).`). Steps, all passed: 1 typecheck, 2 lint, 3 circular, 4 test:tstyche, 5 coverage, 6 test:bdd, 7 spec:examples, 8 spec:verify:strict, 9 spec:gates, 10 spec:claims, 11 spec:api, 12 spec:package, 13 example, 14 spec:website-examples, 15 website, 16 spec:publish.

- Coverage step: 242 test files, 5935 tests passed; all-files 99.61% statements, 98.46% branches, 99.48% functions, 99.83% lines (thresholds core 95%, others 90% held).
- BDD: 34 files, 568 tests. Strict traceability PASS 21, FAIL 0.
- Host 1-minute load average was 7.5 at the start of the passing run.

## Release check

```
nothing released; WENV-01..04 complete; WX rows Pending
```

Run after the REQUIREMENTS edit: on `arch-wave-11`, HEAD on no remote branch, no tag on a phase commit, no version or changelog change, no `.changeset` change, nothing staged outside the close, WENV-01..04 checked and Complete in both places, WX-01..07 Pending and unchecked.

## Deviations from Plan

**1. [Orchestrator fix to 59-07's record] ADR-QD-172 line 60 named bare `gate 13`**
- **Found during:** Task 2, first `pnpm check:pr` run, step 9 (`pnpm spec:gates`, `check-dod-table.mjs`): `[stale] names gate 13, and the command in this paragraph is step 1.`
- **Action:** stopped and reported (the plan forbids editing a spec file here). The orchestrator fixed the record in commit `6499d724` (`docs(59)`), changing it to "gate 13 (`scripts/check-api-surface.mjs`)". No revision bump: the ADR is Rev 1.0 within this unreleased phase. `check-dod-table` then passed (25 steps, 144 refs), `spec-revise --check` passed, strict traceability PASS 21 FAIL 0.
- **Resume:** scan and compare re-run clean; `check:pr` re-run alone from the start and green.
- **Files modified here:** none (the fix is the orchestrator's commit).

**Total deviations:** 1 (orchestrator fix to a 59-07 record). **Impact:** wording only; no scope change.

## Task Commits

1. **Task 1: phase scan and D-15** - verification only; `59-scan.mjs` committed with the close commit.
2. **Task 2: check:pr, release check, WENV-01..04** - verification plus the REQUIREMENTS edit; committed with the close commit.

**Plan metadata:** the single `docs(59-10)` commit (SUMMARY, `59-scan.mjs`, REQUIREMENTS.md, STATE.md, ROADMAP.md).

## Known Stubs

None.

## Issues Encountered

The red step above; resolved by the orchestrator fix.

## Next Phase Readiness

Phase 59 (10 of 10 plans) is complete. WX-01..07 stay Pending until the v1.6 milestone closes; nothing was released, tagged, pushed or versioned.

## Self-Check: PASSED

- `59-scan.mjs` exists with the verbatim hash; scan, compare and the release check exit 0.
- `pnpm check:pr` exit 0 on the committed tree (the only change after it is the planning-only close commit).
