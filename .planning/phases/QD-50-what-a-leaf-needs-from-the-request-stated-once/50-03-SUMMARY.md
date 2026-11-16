---
phase: QD-50-what-a-leaf-needs-from-the-request-stated-once
plan: 03
subsystem: core
tags: [bench, gate, leaf-needs, verdict]
plan_head_before: 4b5098bfa48839d788671b76517f5759573a3a81
plan_head_after: cec75b99481f0577cb422b7fa3e49ab1ec6f4dc2
commits: 2
requires: [50-02]
provides:
  - "bench/gate/: six interleaved runs of prototype P1 against the base, with the D-03a analysis (verdict: pass)"
  - "50-BENCH.md with verdict: pursue, the line every later plan's verdict guard reads"
affects: [50-04, 50-05, 50-06, 50-07, 50-08]
key-files:
  created:
    - .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/bench/gate/ (28 files)
    - .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/50-BENCH.md
  modified: []
key-decisions:
  - "Bench gate passed: 0 of 35 workloads slower than their band, so the phase pursues the leaf-needs table (50-04..50-08 run)"
requirements-completed: []
metrics:
  tasks: 3
  files: 2
actuals:
  tokens: 9000
  tasks: 3
  commits: 2
status: complete
---

# Phase QD-50 Plan 03: The bench gate Summary

The gate passed: prototype P1 (direct imports) against the phase base, interleaved 3 + 3, median of per-run minima, found 0 of 35 workloads slower than their band. The verdict is `pursue`; Task 3 changed nothing outside `.planning/`.

## Results

- **Uptime before the gate:** `13:53 up 2:24, load averages: 4.01 4.09 3.54` (Apple M3 Pro, Node v26.13.0). The run took about 4.5 minutes; nothing else heavy ran meanwhile. Per-run load averages were 2.95 to 4.13 (1 min), recorded in `bench/gate/*.load-*` and in 50-BENCH.md `## Host`.
- **Run:** `ab.sh` exit 0 on the first attempt, no failed run, no re-run. `done.txt` reads `src restored to HEAD`; `packages/core/src` is clean and unchanged since `phase_base`. `meta.txt` records the patch sha256 `109f2545...e98e78` (equal to the committed patch's).
- **Gate lines (`analysis.tsv`):** `# workloads: 35`, `# slower: 0`, `# geomean_d_min_pct: 2.75`, `# worst_d_min: 8.7 evaluate :: rules FirstApplicable — 8, last applies`, `# gate: pass`. The worst workload's band was 10.0%; every band was the 10% floor (no base spread exceeded it).
- **Leaf-heavy rows:** `reference neither` base 7,958 ns, prototype 8,459 ns, +6.3% (spread 2.6%, ok); `reference action and resource` base 7,959 ns, prototype 8,459 ns, +6.3% (spread 3.1%, ok). The control differs from the referencing workload by 0.0 points.
- **Note for 50-06:** 29 of 35 deltas are positive (geomean +2.75%), for a prototype with direct imports and no tuning. Nothing is beyond a band, so the rule says pursue; the after-run measures the real implementation on the same statistic and the same 10% band.
- **Verdict:** `pursue`, by `analysis.tsv`'s last line, not by the p50 or mean columns (recorded, not deciding).
- **Task 3:** no change (pursue). `git diff 5ab8d0c0 HEAD -- 'packages/*/src/*' spec .changeset` is empty; REQUIREMENTS.md carries no `Not pursued (measured): ADR-QD-163`. `check:pr` is not needed in this plan (no src, test or spec change).

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 | `0efafb6d` | chore(50-03): the bench gate's runs and analysis |
| 2 | `cec75b99` | docs(50-03): bench verdict |
| 3 | none | pursue: nothing to change |

## Deviations from Plan

**1. [Rule 3 - Blocking] The six `.log` files are gitignored**
- **Found during:** Task 1 commit (22 files staged, the verify expects 28).
- **Issue:** `.gitignore` ignores `*.log`, so `git add bench/gate` skipped `base-{1,2,3}.log` and `proto-{1,2,3}.log`, which the plan names as part of the 28 committed gate files.
- **Fix:** `git add -f` of those six files only (bench output, nothing sensitive), then `git commit --amend --no-edit` on the unpushed gate commit. The commit now carries exactly the 28 files under `bench/gate/`, with the trailer.
- **Commit:** `0efafb6d`.

**2. REQUIREMENTS.md not touched by this plan.** The orchestrator re-opened LEAF-01 and LEAF-05 after 50-02's `mark-complete`; they are ticked by 50-08 only, so `requirements.mark-complete` was not run here.

## Known Stubs

None.

## Threat Flags

None. No source, `package.json` or lockfile change.

## Self-Check: PASSED

- FOUND: `bench/gate/analysis.tsv`, `analysis.txt`, `meta.txt`, `done.txt`, six `.json` and six `.log` runs, `50-BENCH.md`
- FOUND commits: `0efafb6d`, `cec75b99` (ancestors of HEAD)
- `packages/core/src` clean; no `packages/*/src` change since `phase_base`.
