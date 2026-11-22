---
verdict: pass
phase_base: d1ac1df0629e95797f406c5c46da364e6542dce2
measured_at: 6843e25e54d4bee5d1af1c5e2ba94cd88d95b3af
statistic: median of per-run minima; band = max(10%, the base's spread of that statistic)
rounds: 3 + 3
slower: 0
---

# Phase 65 bench gate

## Gate

The committed `packages/core/src` (head arm, label `final`) was measured against the phase base (patched arm, label `base`: `to-base.patch`, the committed source reversed to `d1ac1df0629e95797f406c5c46da364e6542dce2`, touching `packages/core/src/Admission.ts` only) on `Evaluate.bench.ts` (35 workloads), interleaved 3 + 3 with Phase 59's harness byte for byte (`ab.sh` SHA-256 `9ef5811a…`, `analyze.mjs` SHA-256 `4259fafc…`). A workload is slower only when the committed source's delta of the statistic is strictly greater than its band, max(10%, the base's own spread of that statistic). One run of record; no run was repeated or dropped.

Commands as run:

```
bash <H>/ab.sh <D>bench/final/to-base.patch <D>bench/final 3 final base < /dev/null
node <H>/analyze.mjs <D>bench/final base final < /dev/null
```

Result: # slower: 0; # geomean_d_min_pct: -0.51; # worst_d_min: 1.6 evaluate — width scaling :: width 8; # gate: pass.

## Workloads

Decision statistic: median of per-run minima (ns). Delta is the committed source (final) over the phase base.

| workload | base min (ns) | final min (ns) | delta | base spread | band | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| evaluate :: one node | 5833 | 5708 | -2.1% | 5.0% | 10.0% | ok |
| evaluate :: rules DenyOverrides — 8 permits | 7541 | 7541 | -0.0% | 5.0% | 10.0% | ok |
| evaluate :: anyOf Union — 8 | 7958 | 7792 | -2.1% | 10.5% | 10.5% | ok |
| evaluate :: rules FirstApplicable — 8, last applies | 7916 | 7791 | -1.6% | 4.7% | 10.0% | ok |
| evaluate :: anyOf First — 8, last allows | 7916 | 7792 | -1.6% | 14.7% | 14.7% | ok |
| evaluate :: wide — allOf of 8 | 7750 | 7666 | -1.1% | 5.4% | 10.0% | ok |
| evaluate :: wrapper-heavy — 10 nested labeled/not/obliged | 8166 | 8125 | -0.5% | 3.1% | 10.0% | ok |
| evaluate :: field-heavy — anyOf of 8 under Union | 8541 | 8500 | -0.5% | 6.3% | 10.0% | ok |
| evaluate :: rules PermitOverrides — 8 denies | 8500 | 8416 | -1.0% | 3.4% | 10.0% | ok |
| evaluate :: leaf-heavy — allOf of 8, matchers reference action and resource | 9417 | 9333 | -0.9% | 7.1% | 10.0% | ok |
| evaluate :: leaf-heavy — allOf of 8, matchers reference neither | 9541 | 9458 | -0.9% | 7.0% | 10.0% | ok |
| evaluate :: deep rules — 10 nested | 10000 | 10041 | 0.4% | 4.6% | 10.0% | ok |
| evaluate :: deep — 10 levels | 10125 | 10041 | -0.8% | 4.9% | 10.0% | ok |
| evaluate :: matcher-heavy — 3 refs | 11042 | 11084 | 0.4% | 1.5% | 10.0% | ok |
| evaluate :: resolver miss — one port call | 11792 | 11750 | -0.4% | 4.6% | 10.0% | ok |
| evaluate :: obligation-heavy — allOf of 8 distinct obligations | 12417 | 12250 | -1.3% | 3.4% | 10.0% | ok |
| evaluate :: field-heavy — allOf of 8 under Intersection | 17042 | 17166 | 0.7% | 5.6% | 10.0% | ok |
| filter — 500 items :: hasPermission | 4002541 | 3945250 | -1.4% | 2.2% | 10.0% | ok |
| decideSubjects — 500 subjects :: hasPermission | 5143625 | 5191333 | 0.9% | 0.9% | 10.0% | ok |
| evaluate — depth scaling :: depth 5 | 11500 | 11666 | 1.4% | 2.2% | 10.0% | ok |
| evaluate — depth scaling :: depth 10 | 16208 | 16208 | 0.0% | 1.5% | 10.0% | ok |
| evaluate — depth scaling :: depth 20 | 25500 | 25042 | -1.8% | 0.8% | 10.0% | ok |
| evaluate — depth scaling :: depth 40 | 43291 | 42750 | -1.2% | 2.0% | 10.0% | ok |
| evaluate — width scaling :: width 4 | 8583 | 8625 | 0.5% | 2.9% | 10.0% | ok |
| evaluate — width scaling :: width 8 | 10375 | 10541 | 1.6% | 2.0% | 10.0% | ok |
| evaluate — width scaling :: width 16 | 14084 | 14084 | 0.0% | 2.4% | 10.0% | ok |
| evaluate — width scaling :: width 32 | 21458 | 21333 | -0.6% | 2.5% | 10.0% | ok |
| evaluate — wide, concurrency :: sequential (default) | 7625 | 7541 | -1.1% | 2.2% | 10.0% | ok |
| evaluate — wide, concurrency :: concurrency: unbounded | 7958 | 7958 | -0.0% | 2.1% | 10.0% | ok |
| evaluate — anyOf Union 8, concurrency :: sequential (default) | 7583 | 7584 | 0.0% | 2.8% | 10.0% | ok |
| evaluate — anyOf Union 8, concurrency :: concurrency: unbounded | 7916 | 7958 | 0.5% | 2.6% | 10.0% | ok |
| evaluate — rules DenyOverrides 8, concurrency :: sequential (default) | 7250 | 7250 | 0.0% | 4.6% | 10.0% | ok |
| evaluate — rules DenyOverrides 8, concurrency :: concurrency: unbounded | 9708 | 9625 | -0.9% | 5.6% | 10.0% | ok |
| filter — 500 items, concurrency :: sequential (default) | 4021208 | 3942916 | -1.9% | 9.5% | 10.0% | ok |
| filter — 500 items, concurrency :: concurrency: unbounded | 4059125 | 4037166 | -0.5% | 6.1% | 10.0% | ok |

## Host

- cpu: Apple M3 Pro
- node: v26.13.0
- start: 2026-11-20T18:48:17Z

Load averages (1, 5, 15 min) from `uptime`, logged before and after every run, in run order:

| run | load before (1, 5, 15 min) | load after |
| --- | --- | --- |
| final-1 | 5.36, 7.87, 10.61 (19:48:17) | 4.44, 7.23, 10.22 (19:49:03) |
| base-1 | 4.44, 7.23, 10.22 (19:49:03) | 4.52, 6.95, 9.96 (19:49:50) |
| final-2 | 4.52, 6.95, 9.96 (19:49:50) | 4.70, 6.64, 9.69 (19:50:37) |
| base-2 | 4.70, 6.64, 9.69 (19:50:37) | 6.33, 6.64, 9.51 (19:51:24) |
| final-3 | 6.33, 6.64, 9.51 (19:51:24) | 4.88, 6.25, 9.20 (19:52:13) |
| base-3 | 4.88, 6.25, 9.20 (19:52:13) | 7.77, 6.77, 9.24 (19:53:00) |

The machine was not quiet: macOS's own `mediaanalysisd` (a system process outside this project's control) was the top CPU consumer on `ps -Ao pcpu,comm -r | head -5` before the run (201.2%; 68.3% a few seconds earlier) and second after it (113.7%), behind Spotlight's `mds` (126.2%), with `mds_stores` at 67.8%. The harness logs the load instead of waiting for a quiet machine, and the arms alternate, so that load falls on both sides; the 1-minute load ranged 4.44 to 7.77 across the twelve readings of the six runs.

## Verdict

The gate decided `pass`: no workload of 35 is slower than the phase base beyond its band, `# slower: 0`. The geometric mean of the deltas of minima is -0.51% and the worst single delta is 1.6% (evaluate — width scaling :: width 8) against a band of 10.0%. The median of per-run p50 and the mean of means are recorded in `analysis.tsv` and do not decide.
