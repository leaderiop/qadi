---
phase: QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure
plan: 17
subsystem: merge-gate
tags: [check-pr, spec-package, requirements, trailer-scan]
requires: ["79-16"]
provides:
  - pnpm check:pr and pnpm spec:package green on the tree the mutation close measured
  - CONF-01 to CONF-06 complete, marked by hand after the gate
  - the plan-commit trailer scan over every commit since phase_base
affects: []
key-files:
  created:
    - .planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-17-SUMMARY.md
  modified:
    - .planning/REQUIREMENTS.md
key-decisions:
  - "No fix was needed: the gate was green on the first run, so no packages/ change followed the mutation close and no group was re-closed"
requirements-completed: [CONF-01, CONF-02, CONF-03, CONF-04, CONF-05, CONF-06]
status: complete
commits: 2
plan_head_before: 04bba7b3745746fd97d978870ef0ee4dd2d59155
plan_head_after: 6a071ef17bc02271e0cf9f6dc50c88aa52114bfc
duration: about 25 minutes (check:pr about 20)
completed: 2026-11-24
---

# Phase 79 Plan 17: the merge gate Summary

`pnpm check:pr` (17 of 18 steps, mutation skipped) and `pnpm spec:package` both exit 0 on the closed tree, and CONF-01 to CONF-06 are marked complete by hand in one commit made after the gate.

phase_base: 910cb7838ac562608880f8e3b067fb2cc4c014b3

## Gate results

| Item | Value |
| ---- | ----- |
| `check:pr` head | `04bba7b3745746fd97d978870ef0ee4dd2d59155` |
| `check:pr` status | 0 |
| `check:pr` last line | `run-check: ran 17 of 18 steps; "pnpm mutation" was skipped (release PRs run it).` |
| `spec:package` status | 0 (`package-install: 9 package(s) pack, resolve and authorize (527 runtime export(s))`) |
| Mutation close head | `c9186646a186526784d7b0a5524360749b9df8cd`, five groups on one head |
| `packages/` between close head and `check:pr` head | identical (`git diff --quiet`); only `.planning/` moved |
| `compare` | passes: no file has an open or Ignored mutant its base did not have, and every score that fell lost only killed mutants |
| gate 13 (`scripts/check-api-surface.mjs`) | `api-surface: 942 export(s) documented across 9 package(s)`, the base fact's line; no fallback export was taken |

Tests in the run: root vitest project 262 files, 6508 tests; further vitest groups 34 files / 568 tests and 7 files / 43 tests; every tstyche pass green, including `ConfigureInputs.tst.ts`.

### Coverage lines (copied from the log as printed)

```
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
All files          |   99.65 |    98.66 |   99.56 |   99.82 |
  DevtoolsDock.tsx |   93.47 |      100 |      88 |   95.55 | 171,230
Statements   : 99.65% ( 7698/7725 )
Branches     : 98.66% ( 3242/3286 )
Functions    : 99.56% ( 3005/3018 )
Lines        : 99.82% ( 6808/6820 )
```

The thresholds are enforced inside the `pnpm coverage` step, which passed. `DevtoolsDock.tsx` is the only devtools file the table lists below 100%.

`check:pr` also printed two `prefer-as-const` lint warnings in `packages/devtools/test/model/HeldChoice.test.ts` (lines 200, 201). That file is unchanged since `aab87576`, which is an ancestor of `phase_base`, so they are not this phase's and were left alone.

## Requirements

`.planning/REQUIREMENTS.md` was edited by hand (`requirements.mark-complete` not used): six checkboxes to `[x]` and six table rows to `| CONF-0N | Phase 79 | Complete |`, twelve lines in all, committed alone as `docs(79-17): CONF-01 to CONF-06 complete` (`25832dd9`) after `check:pr` ran. No WX row changed.

## Trailer scan

Rule: a plan commit's subject is `<type>(79-NN): ` or `<type>(79-NN)!: ` with a two-digit plan number. The scan pattern is `^(docs|test|feat|fix|refactor)[(]79-[0-9]{2}[)]!?: ` over `phase_base..HEAD`. The orchestrator's `docs(79): ...` and `docs(phase-QD-79): ...` commits carry no plan number and are outside it.

- Plan commits read: 69 (before this summary's own commit); each ends with exactly one `Co-Authored-By: Claude <model> <noreply@anthropic.com>` trailer.
- Every commit since `phase_base` that touches a path outside `.planning/` matches the pattern.
- Of the 70 commits in `phase_base..HEAD`, the one that is not a plan commit is an orchestrator commit (`docs(79): show gate 14's final bare-constructor alias failing once`), which touches `.planning/` only.
- No `.planning/config.json`, `.planning/state.json`, `.agents/`, `.codex/` or `*REVIEW*.iter*.md` file is in the phase's diff.

## Deviations from Plan

None. The plan ran as written: no gate step failed, so no fix commit and no re-close was needed. Both plan verifies were run from the plan text unchanged.

## Self-Check: PASSED

Both plan verifies exit 0; commit `25832dd9` exists and holds only `.planning/REQUIREMENTS.md`.
