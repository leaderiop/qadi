---
phase: QD-50-what-a-leaf-needs-from-the-request-stated-once
plan: 06
subsystem: core
tags: [bench, mutation, leaf-needs, after-run, d-13]
plan_head_before: 94e825e65274d33cd103f1b4232c972a2d7b02c6
plan_head_after: a4ae5813056231073794b1c23c71ec69f728496f
commits: 2
requires: [50-05]
provides:
  - "bench/after/: six interleaved runs of the final source against the phase base, gate: pass (0 of 35 slower)"
  - "50-mutation-after.json: Walk.ts 94.81 (D-13), Predicate.ts and PortAccess.ts 100, LeafNeeds.ts 98.11"
affects: [50-07, 50-08]
key-files:
  created:
    - .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/bench/after/ (29 files)
    - .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/50-mutation-after.json
  modified: []
key-decisions:
  - "After-run gate passed: 0 of 35 workloads slower than their 10% band against the base, geomean +1.87% (the gate's prototype was +2.75%)"
  - "Mutation: no file's score fell except Walk.ts by D-13 (survivors identical, 22 killed mutants left with the deleted checks, 7 more detected outside the leaf arms); no test was needed"
requirements-completed: []
metrics:
  tasks: 2
  files: 2
actuals:
  tokens: 0
  tasks: 2
  commits: 2
status: complete
---

# Phase QD-50 Plan 06: The final source against the base Summary

The shipped source holds every workload's band against the phase base on the gate's statistic (0 of 35 slower, geomean +1.87%), and no touched file's mutation score fell except `Walk.ts` by exactly the amount D-13 explains. No source or test file changed in this plan.

## After-run (Task 1)

- **Verdict guard:** `bench verdict: pursue`; 50-05's SUMMARY tracked; nothing heavy running. HEAD at dispatch `94e825e6`.
- **Uptime before the run:** `14:15 up 2:47, load averages: 2.70 3.36 3.28`. Per-run 1-minute loads before each run: 1.91 to 2.83 (`bench/after/*.load-before`). The run took about 5 minutes with nothing else running.
- **Run:** `ab.sh to-base.patch bench/after 3 final base`, exit 0 on the first attempt; `done.txt` reads `src restored to HEAD`; `packages/core/src` clean afterwards. `to-base.patch` is `git diff HEAD 5ab8d0c0 -- packages/core/src` (425 lines) and applies to HEAD.
- **Analysis (`analyze.mjs bench/after base final`, reference `base`):** `# workloads: 35`, `# slower: 0`, `# geomean_d_min_pct: 1.87`, `# worst_d_min: 9.3 evaluate :: anyOf First — 8, last allows`, `# gate: pass`. Every band is the 10% floor, so the worst row sits 0.7 points inside its band; the next worst are 7.7, 6.8 and 4.6.
- **Leaf-heavy rows:** `reference neither` base 8,125 ns, final 8,417 ns, +3.6% (spread 4.1%); `reference action and resource` base 8,458 ns, final 8,583 ns, +1.5% (spread 2.5%). Both better than the gate's prototype (+6.3% each).
- **Commit:** `9bf0dbfa chore(50-06): the final source against the phase base`, exactly the 29 files under `bench/after/`.

## Mutation after

Uptime before: `14:20 up 2:52, load averages: 2.36 2.72 3.00`; Stryker ran alone (`pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/Walk.ts,packages/core/src/Predicate.ts,packages/core/src/PortAccess.ts,packages/core/src/LeafNeeds.ts'`, exit 0, "Done in 54 seconds", total 97.57). The comparer's output:

```
packages/core/src/PortAccess.ts 1 -> 1 (survivors +0 -0)
packages/core/src/Predicate.ts 1 -> 1 (survivors +0 -0)
packages/core/src/Walk.ts 0.9504643962848297 -> 0.948051948051948 (survivors +0 -0)
  D-13: leaf arms detect 64 at the base and 42 after; outside the arms 243 -> 250; LeafNeeds.ts detects 52
packages/core/src/LeafNeeds.ts 0.9811320754716981 (52 detected, 1 survivors)
  new-file survivor ConditionalExpression | Survived | true | LEAF_NEEDS[leaf._tag].own === "Action" | const isActionLeaf = ...
WX-05 holds (D-13 for Walk.ts)
```

| File | Base | After | Detected / scored (after) |
|------|------|-------|---------------------------|
| `PortAccess.ts` | 100% | 100% | 47/47 |
| `Predicate.ts` | 100% | 100% | 293/293 |
| `Walk.ts` | 95.05% (307/323) | 94.81% (292/308) | 292/308 |
| `LeafNeeds.ts` (new) | n/a | 98.11% | 52/53 |

- **Walk.ts, D-13:** the 16 survivors are identical to the base's, identity by identity (sorted lists equal, +0 -0). Detected mutants fell from 307 to 292, all of them inside the leaf arms (64 to 42; the arms now hold only the table-driven leaf cases, the deleted checks left with them), while detected mutants outside the arms grew from 243 to 250 (the new `supplied` object built in `walk()`). The 22 killed mutants that left Walk.ts reappear as the 52 detected in `LeafNeeds.ts`, where the same checks now live once. The leaf arms hold no survivor, before or after.
- **Untouched evidence:** `stryker.config.mjs` and `50-mutation-base.json` have no change since the commit that created the base JSON (`75580ec0`).
- **Commit:** `a4ae5813 chore(50-06): mutation after-run`, the JSON alone.

## New-file survivors

One, in `packages/core/src/LeafNeeds.ts:95`: `ConditionalExpression | Survived | true | LEAF_NEEDS[leaf._tag].own === "Action"` (`isActionLeaf`'s predicate replaced by `true`). **Equivalent:** `isActionLeaf` has one call site (`absenceOf`, line 116), reached only inside `if (need.own === "Action" && !supplied.action)`, and only `HasAction` has `own: "Action"`; so the predicate is already true wherever it is evaluated, and `true` changes no behaviour. Left as is: restructuring to kill an equivalent mutant is a prohibition, and no test was added.

## Deviations from Plan

**1. [Rule 3 - Blocking] The six `bench/after/*.log` files are gitignored**
- **Found during:** Task 1 commit (same as 50-03).
- **Issue:** `.gitignore` ignores `*.log`; plain `git add bench/after` stages 23 of the 29 files the verify expects.
- **Fix:** `git add -f` of those six logs only, before the single commit.
- **Commit:** `9bf0dbfa`.

**2. Task 2's third verify cannot pass literally.** It runs `git diff --name-only <phase_base> HEAD -- stryker.config.mjs 50-mutation-base.json`; the base JSON is created after `phase_base` (by `75580ec0`), so the diff against `phase_base` lists it as added. Intent applied instead: `git log` shows one commit for the base JSON, `git diff 75580ec0 HEAD` on it and on `stryker.config.mjs` is empty. Nothing was edited or re-baselined.

## Checks

- `check:pr` was not run: no test or source file changed in this plan (no non-equivalent survivor).
- `git diff 5ab8d0c0 HEAD` over `scripts/check-house-style.mjs`, `Policy.ts`, `Decision.ts` and `packages/core/src/index.ts` is empty.
- `requirements.mark-complete` was not run (LEAF-* ids are ticked by 50-08, per the orchestrator).

## Known Stubs

None.

## Threat Flags

None. No source, `package.json` or lockfile change.

## Self-Check: PASSED

- FOUND: `bench/after/analysis.tsv` (`# gate: pass`), `analysis.txt`, `to-base.patch`, `meta.txt`, `done.txt`, 24 per-run files; `50-mutation-after.json`.
- FOUND commits `9bf0dbfa` and `a4ae5813` (ancestors of HEAD).
- `packages/core/src` clean; `reports/` untracked-ignored.
