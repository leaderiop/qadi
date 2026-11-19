---
phase: QD-59-admission-produces-the-one-walk-environment
plan: 05
subsystem: core
tags: [benchmark, after-run, walk-environment, wenv]
requires: [59-01, 59-04]
provides:
  - "bench/after/: to-base.patch, six run JSONs, twelve load files, meta.txt, done.txt, analysis.tsv, analysis.txt (23 tracked files)"
  - "59-BENCH.md `## After-run`, rendered by the plan's verbatim renderer"
affects: [59-06, 59-07, 59-10]
actuals:
  tokens: 9500
  tasks: 2
  commits: 1
plan_head_before: a49596805636a19cfd90e51aa5915c25420851a9
plan_head_after: 0691385c54a3d38bd0c84301b10c5b1ed2245d6c
key-files:
  created:
    - .planning/phases/QD-59-admission-produces-the-one-walk-environment/bench/after/
    - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-05-SUMMARY.md
  modified:
    - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-BENCH.md
key-decisions:
  - "The verdict is the analysis's last line, read and not judged: `# gate: pass` (slower 0 of 35); the run was made once and never repeated"
requirements-completed: [WENV-01, WENV-04]
duration: 12min
completed: 2026-11-19
status: complete
---

# Phase QD-59 Plan 05: After-bench Summary

**The committed final source (HEAD `a4959680`, after `docs(59-04)`) measured against `phase_base` with the gate's harness, 3 + 3 interleaved, came out `# gate: pass`: 0 of 35 workloads slower beyond their band, geomean delta of minima +1.60%, worst +7.3% on `evaluate — wide, concurrency :: concurrency: unbounded` (band 10%).**

`commits: 1` is the one `chore(59-05)` task commit (measured from the ledger); the SUMMARY commit is separate and cannot name itself.

## After-run

- **`uptime` before the run (04:49Z):** `load averages: 35.63 31.72 26.44`; 04:50Z at the patch write: `44.55 33.63 27.14`. After the run (04:55Z): `23.78 44.23 36.79`. The host was shared (an unrelated rustc build and a VM); the per-run before and after loads are in `59-BENCH.md` `## After-run` (1-minute loads ranged from 20.80 to 126.48). Nothing of this project ran beside the bench.
- **Commit:** `0691385c` `chore(59-05): after-bench, the final source against the phase base (WENV-04)`, 24 files (the 23 tracked `bench/after/` files and `59-BENCH.md`); the only commit touching `bench/after/analysis.tsv`.
- **Command:** `bench/ab.sh bench/after/to-base.patch bench/after 3 final base` (exit 0), then `bench/analyze.mjs bench/after base final`. Patch SHA-256 `e6cf4159c6986ce4f3f39c3ee9f2e7ff522a463394a5e6f53322ef2bb881550c`; Node v26.13.0, Apple M3 Pro.
- **Result:** slower 0 of 35; geomean delta of minima 1.60%; worst 7.3 `evaluate — wide, concurrency :: concurrency: unbounded`. **gate: pass**

The five `#` lines:

```
# workloads: 35
# slower: 0
# geomean_d_min_pct: 1.60
# worst_d_min: 7.3 evaluate — wide, concurrency :: concurrency: unbounded
# gate: pass
```

The positive geomean and worst delta are inside every workload's 10% band (every verdict `ok`); no `After-run regression` applies.

## Deviations from Plan

None - plan executed exactly as written.

Notes, not deviations: the three verify commands were extracted from the plan and run unedited (Task 1 `after-run complete: # gate: pass`; Task 2 `chore(59-05) 0691385c records the after-run` and `after-run: gate pass`). The renderer's SHA-256 matched `cd0c1528...`. `packages/core/src` is clean and equals the refactor's tree. No requirement was marked Complete (59-10 does that).

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- bench/after files, `59-BENCH.md` `## After-run`: found; `0691385c` is an ancestor of HEAD; `done.txt` reads `src restored to HEAD`.
