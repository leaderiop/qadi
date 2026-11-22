---
verdict: pass
phase_base: eacf89b4b3ab9ef6189312ab904f7d4943714550
measured_at: 2d81bd57f8a30ebbb562c2a682b578e5b5a462e7
statistic: median of per-run minima; fixed 5% band per workload; geometric mean of deltas at most +2%
rounds: 3 + 3
slower: 0
geomean_d_min_pct: -2.51
choice: table
---

# Phase 67 bench gate

Measured 2026-11-21 on an Apple M3 Pro, node v26.13.0, by `bench/ab.sh` over `packages/core/bench/DecisionCache.bench.ts`.
The arm `final` is the committed source at `measured_at`, with the eviction (`Chunk.splitAt` and `HashMap.removeMany`) and the
claim dispatched through the arm table; the arm `base` is the same tree with `packages/core/src` reversed to `phase_base` by
`bench/final/to-base.patch` (patch SHA-256 `efcdd14f3961bf2f6363ab23b6e3e021bb19ad4f19e517900ad1241c9e51f999`), which differs
from the measured source in `DecisionCache.ts`, `SharedComputation.ts` and `TraceDiff.ts`. Both arms carry the same bench file,
with the capacity-bound workload already committed.

## Gate

Fixed in 67-02-PLAN.md and in `bench/analyze.mjs` (committed before any run, candidate or of record), not changed after it:

- The decision statistic per workload is the median of the three per-run minima (`latency.min`) of each arm.
- A workload is SLOWER when the committed source's delta over the base is strictly greater than 5%. The band is fixed at 5%;
  the base arm's spread is recorded and never widens it.
- The gate passes only when no workload is SLOWER and the geometric mean of the five deltas is at most +2%.
- One run of record. A failed gate stops the phase with the evidence committed; there is no re-run.

## Commands as run

`<H>` is `.planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/bench/`, `<S>` is the scratch directory `$TMPDIR/qd67`.

```bash
git diff HEAD eacf89b4b3ab9ef6189312ab904f7d4943714550 -- packages/core/src > <H>final/to-base.patch
bash <H>ab.sh <H>final/to-base.patch <H>final 3 final base packages/core/bench/DecisionCache.bench.ts "^DecisionCache.getOrCompute — " < /dev/null > <S>/ab-final.log 2>&1
node <H>analyze.mjs <H>final base final < /dev/null
```

The quiet-host check printed `quiet: load 9.43 on 12 cpus, top process at 96.2%` immediately before the run. `ab.sh` exited 0
and left `done.txt` (`src restored to HEAD`); `packages/core/src` was clean afterwards. The run took 45 s (02:54:56Z to 02:55:41Z
by the run directory's file times), one bench file per run, in the order final-1, base-1, final-2, base-2, final-3, base-3.

## Result

```text
# slower: 0
# geomean_d_min_pct: -2.51
# worst_d_min: 2.8 DecisionCache.getOrCompute — miss :: distinct policy per call, cache grows across the run
# gate: pass
```

## Workloads

Latencies in ns, the median of the three per-run minima; the delta is the final arm over the base arm.

| Workload | base min | final min | delta | base spread | band | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| `hit`: repeated lookup, same subject/policy/resource | 7333 | 6916 | -5.7% | 4.0% | 5.0% | ok |
| `hit, realistic tree`: repeated lookup, same subject/tree/resource | 8666 | 8166 | -5.8% | 1.0% | 5.0% | ok |
| `hit, fresh-but-equal subject per lookup`: distinct-but-equal subject object per call | 13667 | 13041 | -4.6% | 2.7% | 5.0% | ok |
| `miss`: distinct policy per call, cache grows across the run | 11833 | 12167 | +2.8% | 0.4% | 5.0% | ok |
| `miss, capacity-bound`: distinct policy per call, each insert evicts the oldest | 12458 | 12584 | +1.0% | 3.7% | 5.0% | ok |

Every row is a `DecisionCache.getOrCompute — ` workload. The full figures, with the p50 and mean beside each (recorded, never
deciding), are `bench/final/analysis.tsv`.

Read with the load below: the three hit workloads are faster by 4.6% to 5.8% and the two miss workloads slower by 2.8% and 1.0%,
both inside the 5% band and over base spreads of 0.4% and 3.7%. The gate decides on the fixed band and the geometric mean alone.

## Host load

Logged by `ab.sh` around every run, as the files in `bench/final/`. The 1-minute load started at 9.43 on 12 CPUs
and fell to 6.32 by the last file; the 5- and 15-minute columns (14.43 to 12.90, and 17.94 to 17.19) are still draining work
that finished before the run. A run's `load-after` is the same snapshot as the next run's `load-before`.

| file | uptime | top process |
| --- | --- | --- |
| final-1.load-before | load averages: 9.43 14.43 17.94 | 97.9% check-links (SpecForge-targets) |
| final-1.load-after | load averages: 8.91 14.24 17.86 | 30.4% claude |
| base-1.load-before | load averages: 8.91 14.24 17.86 | 20.7% Google Chrome Helper (Aperitif Renderer) |
| base-1.load-after | load averages: 8.08 13.89 17.69 | 17.9% Herdr |
| final-2.load-before | load averages: 8.08 13.89 17.69 | 17.9% Herdr |
| final-2.load-after | load averages: 7.67 13.71 17.60 | 16.5% Google Chrome Helper (Aperitif Renderer) |
| base-2.load-before | load averages: 7.67 13.71 17.60 | 17.0% Google Chrome Helper (Aperitif Renderer) |
| base-2.load-after | load averages: 6.96 13.36 17.43 | 16.5% Google Chrome Helper (Aperitif Renderer) |
| final-3.load-before | load averages: 6.96 13.36 17.43 | 16.5% Google Chrome Helper (Aperitif Renderer) |
| final-3.load-after | load averages: 6.57 13.17 17.34 | 14.3% Herdr |
| base-3.load-before | load averages: 6.57 13.17 17.34 | 16.3% Google Chrome Helper (Aperitif Renderer) |
| base-3.load-after | load averages: 6.32 12.90 17.19 | 94.5% Google Chrome Helper (Aperitif Renderer) |

Top process above 50% CPU in 2 of 12 load files:

- final-1.load-before: 97.9% `check-links` under `SpecForge-targets` (another project), sampled just before the first run
- base-3.load-after: 94.5% Google Chrome Helper (Aperitif Renderer), sampled just after the last run

The rule halts only before a run, and the check passed; the finished run is neither set aside nor repeated.

## The harness proven

- 67-02's self-test: `node <H>analyze.mjs --self-test` prints `self-test: 7 passed`.
- Its two plants: a copy with the band widened by the reference spread fails naming `one workload 6% slower with a 20% reference
  spread still fails`, and a copy with the geomean condition dropped fails naming `every workload 2.5% slower fails on the geomean`.
- This run's four doctored gates, made from `bench/final/` by `synth.mjs` (SHA-256
  `5ea5963d0a2974039dd0944613e92f369abce3b06a397f2cdc145d58509becba`) building a `final` arm from this run's `base` runs, with
  the capacity-bound workload scaled by the first factor and the other four by the second, then analysed by the same
  `analyze.mjs`:

| factors (capacity-bound, rest) | `# gate:` |
| --- | --- |
| 1.06, 1 | fail |
| 1.049, 1 | pass |
| 1.025, 1.025 | fail |
| 1.019, 1.019 | pass |
