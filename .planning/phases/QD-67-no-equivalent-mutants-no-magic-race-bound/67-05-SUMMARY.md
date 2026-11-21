---
phase: QD-67-no-equivalent-mutants-no-magic-race-bound
plan: 05
subsystem: testing
tags: [bench, gate, decision-cache, single-flight, run-of-record]
phase_base: eacf89b4b3ab9ef6189312ab904f7d4943714550

requires:
  - phase: QD-67-no-equivalent-mutants-no-magic-race-bound
    provides: 67-02's harness and gate, 67-03's eviction, 67-04's table dispatch (choice table)
provides:
  - the bench of record: the final committed source measured once, 3 + 3 interleaved, against the phase base, passing the gate fixed before any run
affects: [67-07]

actuals:
  tokens: 6000
  tasks: 2
  commits: 1
plan_head_before: 2d81bd57f8a30ebbb562c2a682b578e5b5a462e7
plan_head_after: 0e3f9cbd1db5e5a2d70e7dbbf372a69202aed0b2

tech-stack:
  added: []
  patterns:
    - "a run of record analysed by the committed analyzer, reproduced byte for byte by the verify, with the gate seen failing on doctored copies of the same run"

key-files:
  created:
    - .planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-BENCH.md
    - .planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/bench/final/
  modified: []

key-decisions:
  - "The run of record passed the gate on its one run (slower 0, geomean -2.51%), so the phase continues; the bench is the last executable change"

requirements-completed: [MUTE-02, WX-06]

coverage:
  - id: D1
    description: "The final source (eviction and table dispatch) is no more than 5% slower on any workload and no worse than +2% on the geomean against the phase base"
    requirement: MUTE-02
    verification:
      - kind: other
        ref: "Task 2 verify: bench/final/analysis.tsv holds # workloads: 5, # slower: 0, # max_slowdown_pct: 5.0, # max_geomean_pct: 2.0, # gate: pass; the analyzer re-run on the committed runs equals it byte for byte; to-base.patch equals git diff <measured head> <phase_base> -- packages/core/src"
        status: pass
    human_judgment: false
  - id: D2
    description: "The gate is seen failing on doctored copies of this run's own data"
    requirement: WX-06
    verification:
      - kind: other
        ref: "Task 1 verify: 1.06/1 fail, 1.049/1 pass, 1.025/1.025 fail, 1.019/1.019 pass"
        status: pass
    human_judgment: false

duration: 2min
completed: 2026-11-21
status: complete
---

# Phase 67 Plan 05: The bench of record Summary

**The final committed source (`Chunk.splitAt` and `HashMap.removeMany` eviction, claim dispatched through the arm table) was measured once, 3 + 3 interleaved, against `phase_base` and passes the fixed gate: no workload slower, geometric mean of the five deltas -2.51%.**

## Performance

- **Duration:** 2 min (plan 01:54:47Z to 01:57Z); the run itself took 45 s (02:54:56Z to 02:55:41Z by the run directory's file times, local clock)
- **Tasks:** 2
- **Files modified:** 0 source files; 23 committed record files (`67-BENCH.md` and 22 under `bench/final/`: six run JSONs, twelve load files, `meta.txt`, `to-base.patch`, `analysis.tsv`, `done.txt`)

## Accomplishments

- `to-base.patch` is `git diff HEAD eacf89b4 -- packages/core/src` (413 lines over `DecisionCache.ts`, `SharedComputation.ts` and `TraceDiff.ts`), SHA-256 `efcdd14f...`. Measured head `2d81bd57f8a30ebbb562c2a682b578e5b5a462e7`; `ab.sh` exited 0, `packages/core/src` was clean afterwards.
- The result lines:

```text
# slower: 0
# geomean_d_min_pct: -2.51
# worst_d_min: 2.8 DecisionCache.getOrCompute — miss :: distinct policy per call, cache grows across the run
# gate: pass
```

| Workload | base min (ns) | final min (ns) | delta | base spread |
| --- | --- | --- | --- | --- |
| hit | 7333 | 6916 | -5.7% | 4.0% |
| hit, realistic tree | 8666 | 8166 | -5.8% | 1.0% |
| hit, fresh-but-equal subject per lookup | 13667 | 13041 | -4.6% | 2.7% |
| miss | 11833 | 12167 | +2.8% | 0.4% |
| miss, capacity-bound | 12458 | 12584 | +1.0% | 3.7% |

- The four doctored copies of this run, built by `synth.mjs` from the run's `base` arm: 1.06 on the capacity-bound workload gives fail, 1.049 gives pass, 1.025 on all five gives fail, 1.019 on all five gives pass.
- **Host load:** the quiet-host check printed `quiet: load 9.43 on 12 cpus, top process at 96.2%` immediately before the run. The twelve load files read a 1-minute load of 9.43 down to 6.32 on 12 CPUs. Top process above 50% in 2 of 12 files: `check-links` (SpecForge-targets) at 97.9% in `final-1.load-before`, and a Google Chrome renderer helper at 94.5% in `base-3.load-after`.

## Task Commits

1. **Task 1 (tracer) and Task 2: the run and its record** - `0e3f9cbd` (docs: the bench of record). The run itself leaves nothing to commit apart from the record, so both tasks' output is this one commit, which is the only commit the plan makes before this summary.

## Deviations from Plan

None - plan executed exactly as written.

The `.log` files `ab.sh` writes beside each run (`final-N.log`, `base-N.log`) are gitignored by the repository's `*.log` rule, so the commit holds every non-ignored file in `bench/final/`; the verify does not count them.

## Issues Encountered

None.

## Flagged for the owner

- **The run is not noise-free.** The quiet-host check passes when the 1-minute load is at most the CPU count and the top process at most 100%; it did (9.43 on 12, 96.2%), but another project's `check-links` was at 97.9% just before the first run, and the 5- and 15-minute loads (14.43 and 17.94 at the start) were still draining. The gate does not read the load; it decided on the fixed band and geomean, and the run was neither set aside nor repeated.
- **The two miss workloads are the ones that moved the wrong way** (+2.8% and +1.0%), both inside the 5% band; the three hit workloads were 4.6% to 5.8% faster. The numbers do not say why, and the base arm's spread on `miss` was 0.4%.
- **The bench is now the last executable change.** `git diff --quiet 2d81bd57 HEAD -- packages/*/src packages/*/bench scripts package.json` is clean; 67-07's close scan checks it again.

## Known Stubs

None.

## Threat Flags

None. No source, network endpoint, auth path or schema changed; only measurement records were added.

## Next Phase Readiness

67-06 and 67-07 follow. No blockers.

## Self-Check: PASSED

- `67-BENCH.md` and `bench/final/{meta.txt,to-base.patch,analysis.tsv,done.txt}` exist; commit `0e3f9cbd` is an ancestor of HEAD; Task 1 and Task 2 verifies exit 0.
