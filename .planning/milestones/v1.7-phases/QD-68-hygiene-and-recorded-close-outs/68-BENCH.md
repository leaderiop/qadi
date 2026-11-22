# Phase 68 bench of record (OI-10)

One run, made once, on a quiet host. It measures the committed source (`final`, head `769bf57c`, whose
`packages/*/src` is plan 68-04's) against the phase base's source (`base`, `3d66becb`), over Phase 65's 35 workloads in
`packages/core/bench/Evaluate.bench.ts`, on `scripts/bench/ab.sh`, 3 + 3 rounds with the arm order alternating by round.
The run was not repeated, whatever the gate said.

## The gate, fixed before the run

- No workload more than 5% slower (`max_slowdown_pct: 5.0`), judged on the median of the per-run minima.
- A geometric mean of the deltas no worse than +2% (`max_geomean_pct: 2.0`).
- Host: `ab.sh` refuses to start (exit 6, a `busy:` line) when the 1-minute load is above the CPU count or a process is
  above 100% CPU. A first attempt of this plan halted on `busy: load 12.19 on 12 cpus, top process at 100.3%` with no
  bench run; this run is the one of record.

## Meta (`bench/final/meta.txt`, verbatim)

```text
head: 769bf57cbe71646a898b10507f5ebcec5108b164
patch: /private/var/folders/vn/44p0pxgs4z98v7cl11l4_r4c0000gp/T/qd68/base-src.patch
patch_sha256: c7b84bd359fb896dd817716cd892fb5404ba173782e330a9259fe34c8889f4f0
head_label: final
patched_label: base
rounds: 3
order: final-1 base-1 base-2 final-2 final-3 base-3
bench_file: packages/core/bench/Evaluate.bench.ts
pattern: .
host: quiet: load 3.72 on 12 cpus, top process at 39.4%
node: v26.13.0
cpu: Apple M3 Pro
start: 2026-11-21T12:27:42Z
```

## Analysis summary (`bench/final/analysis.tsv`, the `#` lines verbatim)

```text
# workloads: 35
# slower: 0
# geomean_d_min_pct: 0.01
# max_slowdown_pct: 5.0
# max_geomean_pct: 2.0
# worst_d_min: 4.7 evaluate :: field-heavy — anyOf of 8 under Union
# gate: pass
```

All 35 workloads read `ok`. The per-workload deltas of the median of minima run from -4.7% to +4.7%.

## Run-to-run noise

The reference arm's per-workload spread (`ref_min_spread_pct`, the range of its three per-run minima over their median),
over the 35 workloads:

- minimum 0.8%, median 5.9%, maximum 11.5%.

The deltas sit inside that noise for every workload but one: the largest, +4.7% on
`evaluate :: field-heavy — anyOf of 8 under Union`, has a reference spread of 2.1%, below the delta and 0.3 points
under the 5% limit. The gate passes it; this record does not read it as zero cost. The geometric mean of the 35 deltas
is +0.01%.

## Host load (`uptime` 1-minute load average, 12 CPUs)

| run | before | after |
| --- | ------ | ----- |
| final-1 | 3.72 | 4.75 |
| base-1 | 4.75 | 4.68 |
| base-2 | 4.68 | 4.14 |
| final-2 | 4.14 | 4.10 |
| final-3 | 4.10 | 3.81 |
| base-3 | 3.81 | 7.39 |

The load after `base-3`, the last run, reads 7.39 against 3.81 before it; it was taken after the run ended and is
below the CPU count. The host check is made at the start only, so this record states it rather than leaving it out.

verdict: pass
