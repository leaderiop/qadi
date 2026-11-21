---
choice: table
match_gate: fail
table_gate: pass
phase_base: eacf89b4b3ab9ef6189312ab904f7d4943714550
measured_at: 070ffb6b55db52bf8a1419badbd0539bf3681d0b
statistic: median of per-run minima; fixed 5% band per workload; geometric mean of deltas at most +2%
rounds: 3 + 3
---

# Phase 67 dispatch choice

## The rule

Fixed by the owner on 2026-11-20 and written in 67-02-PLAN.md and in `bench/analyze.mjs` before any candidate run.

- Gate: per workload, the median over three runs of each arm's per-run minimum (`latency.min`). A workload is slower when the candidate's delta is greater than 5%. The gate passes only when no workload is slower and the geometric mean of the five deltas is at most +2%. The median of per-run p50 and the mean of per-run means are recorded in `analysis.tsv` and decide nothing.
- Rule: take (M), the `Match` form, if its run passes the gate. Otherwise take (T), the arm table, if its run passes the same gate. If neither passes, commit the evidence, stop the phase and return a `checkpoint:decision`. No candidate is re-run. Both were measured, M first.
- Workloads (five): the four `DecisionCache.getOrCompute — ` workloads of the base bench file and `miss, capacity-bound :: distinct policy per call, each insert evicts the oldest`.

## Commands as run

`<H>` is `.planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/bench/`, `<S>` is `$TMPDIR/qd67` (scratch, not committed).

```
bash <H>ab.sh <S>/cand-M.patch <H>match 3 base match packages/core/bench/DecisionCache.bench.ts "^DecisionCache.getOrCompute — " < /dev/null > <S>/ab-match.log 2>&1
node <H>analyze.mjs <H>match base match < /dev/null
bash <H>ab.sh <S>/cand-T.patch <H>table 3 base table packages/core/bench/DecisionCache.bench.ts "^DecisionCache.getOrCompute — " < /dev/null > <S>/ab-table.log 2>&1
node <H>analyze.mjs <H>table base table < /dev/null
```

Both runs: head `070ffb6b55db52bf8a1419badbd0539bf3681d0b` (the bench commit), 3 + 3 interleaved, patch applied before each patched run and reversed after, `packages/core/src` clean afterwards. The quiet-host check printed `quiet: load 3.86 on 12 cpus, top process at 26.6%` before the match run and `quiet: load 10.22 on 12 cpus, top process at 58.7%` before the table run.

## Match

```
# slower: 2
# geomean_d_min_pct: 1.87
# worst_d_min: 7.7 DecisionCache.getOrCompute — miss, capacity-bound :: distinct policy per call, each insert evicts the oldest
# gate: fail
```

| workload | base min (ns) | match min (ns) | delta (%) | base spread (%) | verdict |
| --- | --- | --- | --- | --- | --- |
| DecisionCache.getOrCompute — hit :: repeated lookup, same subject/policy/resource | 6958 | 6708 | -3.6 | 15.0 | ok |
| DecisionCache.getOrCompute — hit, realistic tree :: repeated lookup, same subject/tree/resource | 8209 | 8166 | -0.5 | 12.7 | ok |
| DecisionCache.getOrCompute — hit, fresh-but-equal subject per lookup :: distinct-but-equal subject object per call | 13208 | 13084 | -0.9 | 6.0 | ok |
| DecisionCache.getOrCompute — miss :: distinct policy per call, cache grows across the run | 11583 | 12417 | 7.2 | 7.6 | SLOWER |
| DecisionCache.getOrCompute — miss, capacity-bound :: distinct policy per call, each insert evicts the oldest | 11875 | 12791 | 7.7 | 6.0 | SLOWER |

## Table

```
# slower: 0
# geomean_d_min_pct: -4.15
# worst_d_min: 0.9 DecisionCache.getOrCompute — miss, capacity-bound :: distinct policy per call, each insert evicts the oldest
# gate: pass
```

| workload | base min (ns) | table min (ns) | delta (%) | base spread (%) | verdict |
| --- | --- | --- | --- | --- | --- |
| DecisionCache.getOrCompute — hit :: repeated lookup, same subject/policy/resource | 7917 | 7250 | -8.4 | 1.6 | ok |
| DecisionCache.getOrCompute — hit, realistic tree :: repeated lookup, same subject/tree/resource | 9292 | 8708 | -6.3 | 1.8 | ok |
| DecisionCache.getOrCompute — hit, fresh-but-equal subject per lookup :: distinct-but-equal subject object per call | 15209 | 14166 | -6.9 | 1.1 | ok |
| DecisionCache.getOrCompute — miss :: distinct policy per call, cache grows across the run | 13333 | 13375 | 0.3 | 3.1 | ok |
| DecisionCache.getOrCompute — miss, capacity-bound :: distinct policy per call, each insert evicts the oldest | 13625 | 13750 | 0.9 | 1.8 | ok |

## Host load

Logged by `ab.sh` around every run, as the files in each run directory. In the match run `mds` (Spotlight indexing) was at 207.9% and 210.4% in the samples taken between base-2 and match-1, and `rustc` at 97.8% around base-3 and match-2. The load rose during the table run: it started at 10.22 on 12 CPUs and reached 16.09 by its last run, with `specforge` (another project's build) the top process in most of its samples. The rule halts only before a run, and the check passed; the finished run is neither set aside nor repeated.

### match

start 2026-11-21T01:39:40Z

| file | uptime | top process |
| --- | --- | --- |
| base-1.load-after | load averages: 4.04 7.46 20.52 | 20.6% Herdr |
| base-1.load-before | load averages: 3.95 7.50 20.61 | 55.9% launchd |
| base-2.load-after | load averages: 5.82 7.68 20.37 | 41.7% WindowServer |
| base-2.load-before | load averages: 5.72 7.69 20.45 | 207.9% mds |
| base-3.load-after | load averages: 6.90 7.81 20.19 | 34.1% WindowServer |
| base-3.load-before | load averages: 6.19 7.69 20.22 | 97.8% rustc |
| match-1.load-after | load averages: 5.72 7.69 20.45 | 210.4% mds |
| match-1.load-before | load averages: 4.04 7.46 20.52 | 20.6% Herdr |
| match-2.load-after | load averages: 6.19 7.69 20.22 | 97.8% rustc |
| match-2.load-before | load averages: 5.82 7.68 20.37 | 43.5% WindowServer |
| match-3.load-after | load averages: 8.70 8.18 20.18 | 62.5% Python |
| match-3.load-before | load averages: 6.90 7.81 20.19 | 37.8% WindowServer |

Top process above 50% CPU in 6 of 12 load files:

- base-1.load-before: 55.9% launchd
- base-2.load-before: 207.9% mds
- base-3.load-before: 97.8% rustc
- match-1.load-after: 210.4% mds
- match-2.load-after: 97.8% rustc
- match-3.load-after: 62.5% Python

### table

start 2026-11-21T01:40:35Z

| file | uptime | top process |
| --- | --- | --- |
| base-1.load-after | load averages: 11.08 8.72 20.16 | 57.5% Google Chrome Helper (Aperitif Renderer) |
| base-1.load-before | load averages: 10.22 8.52 20.16 | 53.6% specforge |
| base-2.load-after | load averages: 15.25 9.84 20.30 | 65.2% specforge |
| base-2.load-before | load averages: 13.82 9.39 20.27 | 47.8% (specforge) |
| base-3.load-after | load averages: 16.01 10.26 20.26 | 57.4% specforge |
| base-3.load-before | load averages: 14.99 9.88 20.25 | 58.9% specforge |
| table-1.load-after | load averages: 13.82 9.39 20.27 | 43.3% (specforge) |
| table-1.load-before | load averages: 11.08 8.72 20.16 | 57.5% Google Chrome Helper (Aperitif Renderer) |
| table-2.load-after | load averages: 14.99 9.88 20.25 | 50.8% specforge |
| table-2.load-before | load averages: 15.25 9.84 20.30 | 59.4% specforge |
| table-3.load-after | load averages: 16.09 10.46 20.22 | 56.2% specforge |
| table-3.load-before | load averages: 16.01 10.26 20.26 | 56.8% specforge |

Top process above 50% CPU in 10 of 12 load files:

- base-1.load-after: 57.5% Google Chrome Helper (Aperitif Renderer)
- base-1.load-before: 53.6% specforge
- base-2.load-after: 65.2% specforge
- base-3.load-after: 57.4% specforge
- base-3.load-before: 58.9% specforge
- table-1.load-before: 57.5% Google Chrome Helper (Aperitif Renderer)
- table-2.load-after: 50.8% specforge
- table-2.load-before: 59.4% specforge
- table-3.load-after: 56.2% specforge
- table-3.load-before: 56.8% specforge

## Choice

The match run fails the gate (2 workloads slower, geometric mean of the deltas +1.87%) and the table run passes it (0 workloads slower, geometric mean -4.15%), so the rule takes `table`.
