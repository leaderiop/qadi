---
phase: QD-50-what-a-leaf-needs-from-the-request-stated-once
plan: 02
subsystem: core
tags: [bench, characterisation, instruments, leaf-needs]
plan_head_before: 1ce072629f85538bdde32b059650c9d235d525ac
plan_head_after: f6322ff9eb4b73c560474c6f108a455667892a92
commits: 3
requires: [50-01]
provides:
  - "Two leaf-heavy bench workloads at the base, each proven to decide Allow before it is timed"
  - "bench/ab.sh and bench/analyze.mjs: the interleaved A/B runner and the D-03a statistic, shared by the gate (50-03) and the after-run (50-06)"
  - "LeafFixtures.ts and LeafMatrix.test.ts: every leaf's absences characterised green on the base (D-14)"
affects: [50-03, 50-04, 50-05, 50-06, 50-08]
tech-stack:
  patterns: ["characterisation with a hand-written oracle, fixtures typed over every leaf tag"]
key-files:
  created:
    - .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/bench/ab.sh
    - .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/bench/analyze.mjs
    - packages/core/test/LeafFixtures.ts
    - packages/core/test/LeafMatrix.test.ts
  modified:
    - packages/core/bench/Evaluate.bench.ts
key-decisions:
  - "The matrix expectations are literals captured on the base (settled and compiled labels) plus a hand-written D-05 oracle; no leaf-needs table and no leafTags is read"
requirements-completed: [LEAF-01, LEAF-05, WX-06]
metrics:
  tasks: 3
  files: 5
actuals:
  tokens: 40000
  tasks: 3
  commits: 3
status: complete
---

# Phase QD-50 Plan 02: Bench instruments and the leaf characterisation Summary

The measuring instruments and the characterisation are on the base before the gate and before any source change: two leaf-heavy workloads, an interleaved A/B runner with the D-03a analysis, and a 126 + 42 cell matrix of every leaf's absences, green on the base. No `packages/*/src` file changed.

## Results

- **Bench smoke** (task 1): a JSON run of `Evaluate.bench.ts` reported `success: true` and **35 tasks**, both `leaf-heavy` workloads among them (the 33 existing names unchanged). `uptime` before it: load averages 2.30 3.67 3.24; the run took about 47 s. The file asserts `isAllowed` of both workloads before `bench.compare`, so a failing or denying workload cannot be timed.
- **Analysis self-test** (task 2): `self-test: 4 passed` (identical arms pass; +15% with 5% reference spread fails; +15% with 20% spread passes; a stalled mean with unchanged minima passes). `analyze.mjs` also ran on six synthetic copies of the smoke JSON (35 workloads, `# gate: pass`, exit 0) and refused a missing run file with exit 2. `ab.sh` refused a missing patch (exit 3) and zero rounds (exit 2), and a one-round run with `proto-p1.patch.txt` completed, applied and reversed the patch, wrote `meta.txt`, load logs and `done.txt`, and left `packages/core/src` clean.
- **Matrix** (task 3): **21 fixtures** over all 10 leaf tags (the research's set), **126 `evaluate` cells** (6 per fixture) and **42 `toPredicate` cells** (2 per fixture). All 5 tests green on the base. Cells where the base run differed from `matrix-base.tsv.txt`: **none** (the outcome kinds and failure payloads match; the Deny reasons and `compiled` labels were captured from the base run). A one-off mutation of the oracle (dropping the `refs: action` rule) failed the matrix at `HasAttribute[ref action] action=- resource=none`, then was reverted.
- **`pnpm check:pr < /dev/null`**: exit 0, 16 of 17 steps ran, `pnpm mutation` skipped by design.

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 | `3d6c3228` | test(50-02): leaf-heavy bench workloads at the base |
| 2 | `163cca85` | chore(50-02): interleaved A/B runner and the D-03a analysis |
| 3 | `f6322ff9` | test(50-02): every leaf's absences characterised on the base |

## Deviations from Plan

None in substance. One note: the first draft of `LeafFixtures.ts`'s header comment named `leafTags`, which the task's own grep check (`leafTags|LEAF_NEEDS|LeafNeeds`) would flag as a read; the comment was reworded and the task 3 commit amended before anything else was committed on top of it.

## Known Stubs

None.

## Threat Flags

None. No `packages/*/src`, `package.json` or lockfile change; `git diff <phase_base> -- 'packages/*/src/*'` is empty.

## Self-Check: PASSED

- FOUND: `packages/core/bench/Evaluate.bench.ts`, `bench/ab.sh`, `bench/analyze.mjs`, `packages/core/test/LeafFixtures.ts`, `packages/core/test/LeafMatrix.test.ts`
- FOUND commits: `3d6c3228`, `163cca85`, `f6322ff9` (ancestors of HEAD)
