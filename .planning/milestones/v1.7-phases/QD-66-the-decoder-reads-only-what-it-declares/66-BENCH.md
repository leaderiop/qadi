---
verdict: pass
phase_base: 48921088b0228724469b6624de91658c650e46c3
measured_at: b7fad179c3170b2b1a33f1ed6ef45fcbf828d963
statistic: median of per-run minima; fixed 5% band per workload; geometric mean of deltas at most +2%
rounds: 3 + 3
slower: 0
geomean_d_min_pct: -2.13
---

# Phase 66 bench gate

Measured 2026-11-20 on an Apple M3 Pro, node v26.13.0, by `bench/ab.sh` over `packages/core/bench/UntrustedDecode.bench.ts`.
The arm `final` is the committed source at `measured_at`; the arm `base` is the same tree with `packages/core/src`
reversed to `phase_base` by `bench/final/to-base.patch` (patch SHA-256 `4a809df0c80678c0c5054b98b95b7cba94f64dc67a54c8344ea6c50fc4f77098`).
Both arms carry the same bench file, with the `ignore` group already committed.

## Gate

Fixed in 66-03-PLAN.md and in `bench/analyze.mjs` (committed before the run), not changed after it:

- The decision statistic per workload is the median of the three per-run minima (`latency.min`) of each arm.
- A workload is SLOWER when the committed source's delta over the base is strictly greater than 5%. The band is fixed at 5%;
  the base arm's spread is recorded and never widens it.
- The gate passes only when no workload is SLOWER and the geometric mean of the six deltas is at most +2%.
- One run of record. A failed gate stops the phase with the evidence committed; there is no re-run.

## Commands as run

`<H>` is `.planning/phases/QD-66-the-decoder-reads-only-what-it-declares/bench/`, `<S>` is the scratch directory `$TMPDIR/qd66`.

```bash
git diff HEAD 48921088b0228724469b6624de91658c650e46c3 -- packages/core/src > <H>final/to-base.patch
bash <H>ab.sh <H>final/to-base.patch <H>final 3 final base packages/core/bench/UntrustedDecode.bench.ts "^(audit|ignore) — " < /dev/null > <S>/ab.log 2>&1
node <H>analyze.mjs <H>final base final < /dev/null
```

`ab.sh` exited 0 and left `done.txt` (`src restored to HEAD`); `packages` was clean afterwards. The run took 56 s
(22:15:19Z to 22:16:14Z), one bench file per run, in the order final-1, base-1, final-2, base-2, final-3, base-3.

## Result

```text
# slower: 0
# geomean_d_min_pct: -2.13
# worst_d_min: 3.5 ignore — the envelope projection: declared keys only, or undeclared keys besides :: decodeStoredRecord, one undeclared key
# gate: pass
```

## Workloads

Latencies in ns, the median of the three per-run minima; the delta is the final arm over the base arm.

| Workload | base min | final min | delta | base spread | band | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| audit: `row decoder, then decodeSinkRecord` | 19416 | 19125 | -1.5% | 9.0% | 5.0% | ok |
| audit: `decodeSinkRecord alone` | 18542 | 18083 | -2.5% | 7.4% | 5.0% | ok |
| ignore: `decodeSinkRecord, one undeclared key` | 18458 | 18458 | -0.0% | 4.7% | 5.0% | ok |
| ignore: `decodeStoredRecord, one undeclared key` | 19000 | 19667 | +3.5% | 5.3% | 5.0% | ok |
| ignore: `decodeStoredRecord` | 19458 | 19792 | +1.7% | 5.1% | 5.0% | ok |
| ignore: `eight declared keys and eight undeclared, sixteen decodes` | 27917 | 24250 | -13.1% | 12.1% | 5.0% | ok |

The `audit` rows are the group `audit — a decision record: one decoder or two`; the `ignore` rows are the group
`ignore — the envelope projection: declared keys only, or undeclared keys besides`. The full figures, with the p50 and mean
beside each (recorded, never deciding), are `bench/final/analysis.tsv`.

Read with the load below: the base arm's spread of the minima is 4.7% to 12.1%, so on a quiet machine the two small
`decodeStoredRecord` deltas (+1.7% and +3.5%) are within what this run cannot tell from noise, and the eight-key row's -13.1%
is the largest movement and sits on a base spread of 12.1%. The gate decides on the fixed band alone.

## Host load

The host was not idle: another project's build and `specforge` processes and Spotlight ran throughout, and the load was
logged, not waited out. `uptime` and `ps -Ao pcpu,comm -r | head -5` are in the twelve `*.load-before` and `*.load-after`
files. Just before the plan's run the machine read load averages 35.05 23.09 25.33 with the top process at 56.7% CPU
(`specforge` from `SpecForge-targets/r5b`); just after, 26.45 23.04 25.18.

| Run | before: load averages (1, 5, 15 min) | after: load averages |
| --- | --- | --- |
| final-1 | 37.45 23.78 25.57 | 35.43 23.81 25.55 |
| base-1 | 35.43 23.81 25.55 | 34.34 23.97 25.59 |
| final-2 | 34.34 23.97 25.59 | 29.77 23.33 25.34 |
| base-2 | 29.77 23.33 25.34 | 27.02 22.94 25.18 |
| final-3 | 27.02 22.94 25.18 | 27.50 23.11 25.23 |
| base-3 | 27.50 23.11 25.23 | 26.45 23.04 25.18 |

Top process above 50% CPU in a load file: `SpecForge-targets/r5b/gsd/debug/deps/cli-65901c99ec5736d2` at 57.1% (final-1
after), 62.1% (base-1 before) and 66.8% (base-2 after); `mds_stores` (Spotlight) at 417.7% (base-1 after, which is the same
sample as final-2 before). In every other file the top process is between 41% and 49.4%. A run's "after" file and the next
run's "before" file are taken within the same second, so most pairs read alike. The load fell from about 37 to about 26 across the run, and the
arms alternate, so a trend in load lands on both arms; it is not removed.

## The harness proven

- `node bench/analyze.mjs --self-test` printed `self-test: 7 passed`.
- A copy with the band widened by the base spread (`const band = Math.max(MAX_SLOWDOWN, rSpread);`) exits 1 naming `one
  workload 6% slower with a 20% reference spread still fails`.
- A copy with the geomean condition dropped from the gate exits 1 naming `every workload 2.5% slower fails on the geomean`.
- Four doctored copies of this run, whose `final` arm is the `base` arm scaled (the first factor on the workload
  `audit: decodeSinkRecord alone`, the second on the other five): 1.06 and 1 gives `# gate: fail`; 1.049 and 1 gives
  `# gate: pass`; 1.025 and 1.025 gives `# gate: fail`; 1.019 and 1.019 gives `# gate: pass`.

The doctoring script is scratch. It picks the first workload by name: vitest orders the tasks of a benchmark by speed, so
the order differs between runs and a position is not one workload. The planned script took the first task of each file
and, on this run, scaled a different workload in each of the three files, so its 1.06 case passed; it is recorded in
66-03-SUMMARY.md as a deviation.
