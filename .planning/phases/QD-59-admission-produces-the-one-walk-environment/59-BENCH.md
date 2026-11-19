---
verdict: pursue
phase_base: e9b98bb8e2b3d43ccae6801704a24a7cea3e10c1
measured_at: e9b98bb8e2b3d43ccae6801704a24a7cea3e10c1
prototype: research-probes/proto-p1.patch.txt
prototype_sha256: 7cd868b63554766fe928355e9d4478a166df91fc12d20ec6ad40b7015b144ee3
statistic: median of per-run minima; band = max(10%, the base's spread of that statistic) (D-04)
slower: 0
---

# Phase 59 bench gate

## Gate

The research's prototype P1 (`admit(question, rowSource)` gives one `Admitted` environment; recursion passes `(policy, evaluation, depth)`, D-01..D-03) was measured against the phase base on `Evaluate.bench.ts` (35 workloads), interleaved 3 + 3 (base, proto, base, proto, ...), `bench/ab.sh` applying and reversing the patch around each prototype run so no source is committed. The decision statistic is the median of per-run minima per workload; a workload is slower only when the prototype's delta is strictly greater than its band, max(10%, the base's own spread of that statistic) (D-04). The gate passes when no workload is slower; the verdict follows `bench/gate/analysis.tsv`'s last line (`# gate: pass`), not judgement.

Result: slower 0 of 35; geomean delta of minima -1.15%; worst 6.7% filter — 500 items, concurrency :: sequential (default). **gate: pass**

A second, confirming run (5 + 5, `bench/gate-r2/`, same patch, same head) gave slower 0 of 35; geomean -0.03%; worst 5.6% evaluate — width scaling :: width 8; **gate: pass**. The 3 + 3 run is the gate of record (D-04 names three runs each); the 5 + 5 run is corroboration.

## Workloads (gate of record, 3 + 3)

Decision statistic: median of per-run minima (ns). Delta is prototype over base.

| workload | base min (ns) | prototype min (ns) | delta | base spread | band | verdict |
|---|---|---|---|---|---|---|
| evaluate :: one node | 5,875 | 5,791 | -1.4% | 4.3% | 10.0% | ok |
| evaluate — rules DenyOverrides 8, concurrency :: sequential (default) | 7,458 | 7,666 | +2.8% | 2.8% | 10.0% | ok |
| evaluate — anyOf Union 8, concurrency :: sequential (default) | 7,750 | 7,958 | +2.7% | 4.3% | 10.0% | ok |
| evaluate — wide, concurrency :: sequential (default) | 7,833 | 7,958 | +1.6% | 5.8% | 10.0% | ok |
| evaluate :: wide — allOf of 8 | 7,916 | 7,708 | -2.6% | 6.8% | 10.0% | ok |
| evaluate :: rules DenyOverrides — 8 permits | 7,916 | 7,500 | -5.3% | 6.3% | 10.0% | ok |
| evaluate — anyOf Union 8, concurrency :: concurrency: unbounded | 8,041 | 8,500 | +5.7% | 2.1% | 10.0% | ok |
| evaluate :: anyOf First — 8, last allows | 8,083 | 7,750 | -4.1% | 6.2% | 10.0% | ok |
| evaluate — wide, concurrency :: concurrency: unbounded | 8,125 | 8,333 | +2.6% | 3.6% | 10.0% | ok |
| evaluate :: rules FirstApplicable — 8, last applies | 8,250 | 7,708 | -6.6% | 10.1% | 10.1% | ok |
| evaluate :: wrapper-heavy — 10 nested labeled/not/obliged | 8,292 | 8,125 | -2.0% | 3.0% | 10.0% | ok |
| evaluate :: anyOf Union — 8 | 8,333 | 7,708 | -7.5% | 8.0% | 10.0% | ok |
| evaluate :: field-heavy — anyOf of 8 under Union | 8,708 | 8,500 | -2.4% | 6.2% | 10.0% | ok |
| evaluate :: rules PermitOverrides — 8 denies | 8,875 | 8,541 | -3.8% | 3.3% | 10.0% | ok |
| evaluate — width scaling :: width 4 | 8,875 | 8,583 | -3.3% | 3.8% | 10.0% | ok |
| evaluate :: leaf-heavy — allOf of 8, matchers reference neither | 9,583 | 9,500 | -0.9% | 6.1% | 10.0% | ok |
| evaluate :: leaf-heavy — allOf of 8, matchers reference action and resource | 9,750 | 9,458 | -3.0% | 0.4% | 10.0% | ok |
| evaluate — rules DenyOverrides 8, concurrency :: concurrency: unbounded | 9,750 | 10,083 | +3.4% | 4.3% | 10.0% | ok |
| evaluate :: deep — 10 levels | 10,458 | 10,166 | -2.8% | 8.8% | 10.0% | ok |
| evaluate — width scaling :: width 8 | 10,708 | 10,458 | -2.3% | 3.9% | 10.0% | ok |
| evaluate :: deep rules — 10 nested | 10,792 | 10,250 | -5.0% | 1.5% | 10.0% | ok |
| evaluate :: matcher-heavy — 3 refs | 11,166 | 11,208 | +0.4% | 4.5% | 10.0% | ok |
| evaluate :: resolver miss — one port call | 11,833 | 11,667 | -1.4% | 4.9% | 10.0% | ok |
| evaluate — depth scaling :: depth 5 | 11,958 | 11,625 | -2.8% | 1.7% | 10.0% | ok |
| evaluate :: obligation-heavy — allOf of 8 distinct obligations | 12,458 | 12,209 | -2.0% | 5.4% | 10.0% | ok |
| evaluate — width scaling :: width 16 | 14,333 | 14,292 | -0.3% | 3.8% | 10.0% | ok |
| evaluate — depth scaling :: depth 10 | 16,750 | 16,292 | -2.7% | 4.7% | 10.0% | ok |
| evaluate :: field-heavy — allOf of 8 under Intersection | 17,250 | 16,875 | -2.2% | 9.9% | 10.0% | ok |
| evaluate — width scaling :: width 32 | 21,458 | 21,500 | +0.2% | 5.6% | 10.0% | ok |
| evaluate — depth scaling :: depth 20 | 25,750 | 25,792 | +0.2% | 1.1% | 10.0% | ok |
| evaluate — depth scaling :: depth 40 | 43,625 | 43,500 | -0.3% | 1.3% | 10.0% | ok |
| filter — 500 items, concurrency :: sequential (default) | 4,025,125 | 4,295,500 | +6.7% | 6.6% | 10.0% | ok |
| filter — 500 items, concurrency :: concurrency: unbounded | 4,054,541 | 4,259,625 | +5.1% | 6.8% | 10.0% | ok |
| filter — 500 items :: hasPermission | 4,122,375 | 4,046,708 | -1.8% | 9.9% | 10.0% | ok |
| decideSubjects — 500 subjects :: hasPermission | 5,439,416 | 5,262,417 | -3.3% | 6.4% | 10.0% | ok |

### Recorded, not deciding

| workload | delta p50 | delta mean of means |
|---|---|---|
| evaluate :: one node | 0.0% | -23.3% |
| evaluate — rules DenyOverrides 8, concurrency :: sequential (default) | +3.1% | +21.9% |
| evaluate — anyOf Union 8, concurrency :: sequential (default) | +1.5% | +15.0% |
| evaluate — wide, concurrency :: sequential (default) | +3.0% | +25.3% |
| evaluate :: wide — allOf of 8 | 0.0% | -34.1% |
| evaluate :: rules DenyOverrides — 8 permits | -7.8% | -31.7% |
| evaluate — anyOf Union 8, concurrency :: concurrency: unbounded | +4.9% | +23.8% |
| evaluate :: anyOf First — 8, last allows | -5.7% | +1.8% |
| evaluate — wide, concurrency :: concurrency: unbounded | +3.9% | +20.8% |
| evaluate :: rules FirstApplicable — 8, last applies | -7.5% | +3.8% |
| evaluate :: wrapper-heavy — 10 nested labeled/not/obliged | +2.4% | +39.8% |
| evaluate :: anyOf Union — 8 | -8.5% | -25.5% |
| evaluate :: field-heavy — anyOf of 8 under Union | -3.6% | -1.1% |
| evaluate :: rules PermitOverrides — 8 denies | -7.3% | -34.5% |
| evaluate — width scaling :: width 4 | -1.3% | +25.9% |
| evaluate :: leaf-heavy — allOf of 8, matchers reference neither | -0.8% | -20.3% |
| evaluate :: leaf-heavy — allOf of 8, matchers reference action and resource | -5.1% | -17.6% |
| evaluate — rules DenyOverrides 8, concurrency :: concurrency: unbounded | +2.8% | +20.0% |
| evaluate :: deep — 10 levels | -1.1% | +22.3% |
| evaluate — width scaling :: width 8 | -2.6% | +37.7% |
| evaluate :: deep rules — 10 nested | -6.5% | -49.2% |
| evaluate :: matcher-heavy — 3 refs | -1.4% | +18.2% |
| evaluate :: resolver miss — one port call | -3.9% | +12.6% |
| evaluate — depth scaling :: depth 5 | -4.5% | -50.6% |
| evaluate :: obligation-heavy — allOf of 8 distinct obligations | -4.9% | -4.0% |
| evaluate — width scaling :: width 16 | +2.5% | +38.1% |
| evaluate — depth scaling :: depth 10 | -3.3% | -63.8% |
| evaluate :: field-heavy — allOf of 8 under Intersection | -1.9% | -0.8% |
| evaluate — width scaling :: width 32 | +1.3% | +24.8% |
| evaluate — depth scaling :: depth 20 | -2.7% | +4.5% |
| evaluate — depth scaling :: depth 40 | -1.3% | +19.2% |
| filter — 500 items, concurrency :: sequential (default) | +7.3% | +35.6% |
| filter — 500 items, concurrency :: concurrency: unbounded | +4.9% | +22.5% |
| filter — 500 items :: hasPermission | -0.5% | -44.3% |
| decideSubjects — 500 subjects :: hasPermission | -3.4% | -11.4% |

## Confirmation (5 + 5)

| workload | base min (ns) | prototype min (ns) | delta | base spread | band | verdict |
|---|---|---|---|---|---|---|
| evaluate :: one node | 6,042 | 5,791 | -4.2% | 8.3% | 10.0% | ok |
| evaluate :: rules DenyOverrides — 8 permits | 7,500 | 7,708 | +2.8% | 4.4% | 10.0% | ok |
| evaluate — wide, concurrency :: sequential (default) | 7,625 | 7,708 | +1.1% | 8.7% | 10.0% | ok |
| evaluate — rules DenyOverrides 8, concurrency :: sequential (default) | 7,708 | 7,333 | -4.9% | 9.7% | 10.0% | ok |
| evaluate :: rules FirstApplicable — 8, last applies | 7,833 | 8,000 | +2.1% | 5.3% | 10.0% | ok |
| evaluate :: wide — allOf of 8 | 7,833 | 7,875 | +0.5% | 6.9% | 10.0% | ok |
| evaluate — anyOf Union 8, concurrency :: sequential (default) | 7,833 | 7,791 | -0.5% | 13.8% | 13.8% | ok |
| evaluate :: anyOf First — 8, last allows | 7,875 | 7,875 | -0.0% | 4.2% | 10.0% | ok |
| evaluate :: anyOf Union — 8 | 7,916 | 7,917 | 0.0% | 4.7% | 10.0% | ok |
| evaluate — wide, concurrency :: concurrency: unbounded | 8,041 | 7,959 | -1.0% | 10.4% | 10.4% | ok |
| evaluate :: wrapper-heavy — 10 nested labeled/not/obliged | 8,375 | 8,167 | -2.5% | 7.5% | 10.0% | ok |
| evaluate — anyOf Union 8, concurrency :: concurrency: unbounded | 8,500 | 8,125 | -4.4% | 9.8% | 10.0% | ok |
| evaluate :: rules PermitOverrides — 8 denies | 8,541 | 8,916 | +4.4% | 6.8% | 10.0% | ok |
| evaluate :: field-heavy — anyOf of 8 under Union | 8,583 | 8,750 | +1.9% | 8.3% | 10.0% | ok |
| evaluate — width scaling :: width 4 | 8,667 | 9,083 | +4.8% | 7.7% | 10.0% | ok |
| evaluate :: leaf-heavy — allOf of 8, matchers reference action and resource | 9,209 | 9,583 | +4.1% | 5.9% | 10.0% | ok |
| evaluate :: leaf-heavy — allOf of 8, matchers reference neither | 9,375 | 9,458 | +0.9% | 5.8% | 10.0% | ok |
| evaluate :: deep rules — 10 nested | 10,125 | 10,125 | -0.0% | 5.8% | 10.0% | ok |
| evaluate — rules DenyOverrides 8, concurrency :: concurrency: unbounded | 10,250 | 9,750 | -4.9% | 8.1% | 10.0% | ok |
| evaluate — width scaling :: width 8 | 10,500 | 11,083 | +5.6% | 7.5% | 10.0% | ok |
| evaluate :: deep — 10 levels | 10,666 | 10,375 | -2.7% | 6.6% | 10.0% | ok |
| evaluate :: matcher-heavy — 3 refs | 11,750 | 11,167 | -5.0% | 7.4% | 10.0% | ok |
| evaluate — depth scaling :: depth 5 | 11,750 | 11,750 | 0.0% | 7.4% | 10.0% | ok |
| evaluate :: resolver miss — one port call | 11,833 | 11,791 | -0.4% | 6.7% | 10.0% | ok |
| evaluate :: obligation-heavy — allOf of 8 distinct obligations | 12,250 | 12,542 | +2.4% | 8.5% | 10.0% | ok |
| evaluate — width scaling :: width 16 | 14,333 | 14,625 | +2.0% | 7.6% | 10.0% | ok |
| evaluate — depth scaling :: depth 10 | 16,375 | 16,333 | -0.3% | 6.6% | 10.0% | ok |
| evaluate :: field-heavy — allOf of 8 under Intersection | 16,875 | 17,166 | +1.7% | 5.4% | 10.0% | ok |
| evaluate — width scaling :: width 32 | 21,875 | 22,083 | +1.0% | 9.0% | 10.0% | ok |
| evaluate — depth scaling :: depth 20 | 25,834 | 26,042 | +0.8% | 6.5% | 10.0% | ok |
| evaluate — depth scaling :: depth 40 | 44,417 | 44,666 | +0.6% | 7.9% | 10.0% | ok |
| filter — 500 items :: hasPermission | 3,949,459 | 4,071,500 | +3.1% | 9.5% | 10.0% | ok |
| filter — 500 items, concurrency :: sequential (default) | 4,207,750 | 3,993,541 | -5.1% | 10.8% | 10.8% | ok |
| filter — 500 items, concurrency :: concurrency: unbounded | 4,283,459 | 4,076,000 | -4.8% | 9.5% | 10.0% | ok |
| decideSubjects — 500 subjects :: hasPermission | 5,167,916 | 5,246,250 | +1.5% | 8.2% | 10.0% | ok |

## Host

Apple M3 Pro (12 cores), Node v26.13.0. Gate of record: run start 2026-11-19T03:20:09Z, base head e9b98bb8e2b3d43ccae6801704a24a7cea3e10c1. Confirmation: run start 2026-11-19T03:25:10Z. **The host was not quiet**: an unrelated Rust build and test job from another project on the same machine was running, and the 1-minute load average was 6 to 19 around the runs (Phase 50's was 3 to 4). The statistic (per-run minima, median over runs) and the band (the base's own spread, floored at 10%) are what make the verdict meaningful under that load; the base's own spreads reached up to 10.1% (gate) and 13.8% (confirmation), which is why the confirmation run exists. Load averages (1, 5, 15 min) around every run of the gate of record:

- base-1 before: 8.53 15.01 16.61
- base-1 after: 8.55 14.19 16.23
- proto-1 before: 8.55 14.19 16.23
- proto-1 after: 6.11 12.61 15.53
- base-2 before: 6.11 12.61 15.53
- base-2 after: 16.61 14.37 16.01
- proto-2 before: 16.61 14.37 16.01
- proto-2 after: 13.92 14.36 15.95
- base-3 before: 13.92 14.36 15.95
- base-3 after: 18.36 15.71 16.37
- proto-3 before: 18.36 15.71 16.37
- proto-3 after: 16.89 15.66 16.31

Confirmation loads are in `bench/gate-r2/*.load-before` and `*.load-after`.

## Verdict

Pursue. No workload of 35 is slower than its band in either run. The prototype is not slower than the base on this statistic (geomean -1.15% and -0.03%); the after-run (D-06) re-measures the real implementation on the same statistic.

## After-run

The final source (HEAD `a49596805636a19cfd90e51aa5915c25420851a9`) measured against the phase base with the same harness as the gate (D-06, D-18): `bench/ab.sh bench/after/to-base.patch bench/after 3 final base`, interleaved 3 + 3, the base arm applying `to-base.patch` (`git diff <head> <phase_base> -- packages/core/src`, SHA-256 `e6cf4159c6986ce4f3f39c3ee9f2e7ff522a463394a5e6f53322ef2bb881550c`) and reversing it; analysed by `bench/analyze.mjs bench/after base final` (reference base, candidate final). The statistic and the slower rule are the gate ones (D-04).

Host: Mac15,7, Apple M3 Pro; Node v26.13.0; started 2026-11-19T04:50:12Z.

| run | load before (1, 5, 15 min) | load after |
|---|---|---|
| base-1 | 126.48 58.74 36.96 | 110.26 67.52 41.62 |
| base-2 | 57.70 59.48 39.98 | 37.32 53.54 38.78 |
| base-3 | 27.47 48.37 37.71 | 20.80 44.00 36.67 |
| final-1 | 60.04 37.02 28.38 | 126.48 58.74 36.96 |
| final-2 | 110.26 67.52 41.62 | 57.70 59.48 39.98 |
| final-3 | 37.32 53.54 38.78 | 27.47 48.37 37.71 |

Result: slower 0 of 35; geomean delta of minima 1.60%; worst 7.3 evaluate — wide, concurrency :: concurrency: unbounded. **gate: pass**

Decision statistic: median of per-run minima (ns). Delta is final over base.

| workload | base min (ns) | final min (ns) | delta | base spread | band | verdict |
|---|---|---|---|---|---|---|
| evaluate :: one node | 6,000 | 6,000 | 0.0% | 2.1% | 10.0% | ok |
| evaluate :: rules DenyOverrides — 8 permits | 7,833 | 7,708 | -1.6% | 3.2% | 10.0% | ok |
| evaluate :: rules FirstApplicable — 8, last applies | 8,166 | 7,958 | -2.5% | 3.1% | 10.0% | ok |
| evaluate :: anyOf Union — 8 | 8,083 | 8,041 | -0.5% | 2.1% | 10.0% | ok |
| evaluate :: anyOf First — 8, last allows | 8,209 | 8,208 | -0.0% | 4.1% | 10.0% | ok |
| evaluate :: wrapper-heavy — 10 nested labeled/not/obliged | 8,500 | 8,208 | -3.4% | 2.9% | 10.0% | ok |
| evaluate :: wide — allOf of 8 | 8,125 | 8,042 | -1.0% | 1.5% | 10.0% | ok |
| evaluate :: rules PermitOverrides — 8 denies | 8,792 | 9,250 | +5.2% | 3.3% | 10.0% | ok |
| evaluate :: field-heavy — anyOf of 8 under Union | 8,916 | 8,750 | -1.9% | 2.3% | 10.0% | ok |
| evaluate :: leaf-heavy — allOf of 8, matchers reference action and resource | 9,791 | 10,042 | +2.6% | 2.6% | 10.0% | ok |
| evaluate :: leaf-heavy — allOf of 8, matchers reference neither | 9,958 | 10,125 | +1.7% | 2.9% | 10.0% | ok |
| evaluate :: deep rules — 10 nested | 10,292 | 10,708 | +4.0% | 5.3% | 10.0% | ok |
| evaluate :: deep — 10 levels | 10,791 | 10,333 | -4.2% | 1.5% | 10.0% | ok |
| evaluate :: matcher-heavy — 3 refs | 11,750 | 11,375 | -3.2% | 1.4% | 10.0% | ok |
| evaluate :: obligation-heavy — allOf of 8 distinct obligations | 12,833 | 12,542 | -2.3% | 2.3% | 10.0% | ok |
| evaluate :: resolver miss — one port call | 12,291 | 11,916 | -3.1% | 5.1% | 10.0% | ok |
| evaluate :: field-heavy — allOf of 8 under Intersection | 17,792 | 17,292 | -2.8% | 4.7% | 10.0% | ok |
| filter — 500 items :: hasPermission | 4,174,667 | 4,337,708 | +3.9% | 2.8% | 10.0% | ok |
| decideSubjects — 500 subjects :: hasPermission | 5,333,750 | 5,618,500 | +5.3% | 4.7% | 10.0% | ok |
| evaluate — depth scaling :: depth 5 | 11,833 | 12,084 | +2.1% | 6.0% | 10.0% | ok |
| evaluate — depth scaling :: depth 10 | 16,542 | 17,208 | +4.0% | 4.5% | 10.0% | ok |
| evaluate — depth scaling :: depth 20 | 26,125 | 26,667 | +2.1% | 4.9% | 10.0% | ok |
| evaluate — depth scaling :: depth 40 | 44,583 | 45,459 | +2.0% | 1.5% | 10.0% | ok |
| evaluate — width scaling :: width 4 | 8,792 | 9,208 | +4.7% | 8.1% | 10.0% | ok |
| evaluate — width scaling :: width 8 | 10,750 | 11,042 | +2.7% | 9.3% | 10.0% | ok |
| evaluate — width scaling :: width 16 | 14,541 | 15,125 | +4.0% | 7.2% | 10.0% | ok |
| evaluate — width scaling :: width 32 | 21,875 | 22,875 | +4.6% | 8.4% | 10.0% | ok |
| evaluate — wide, concurrency :: sequential (default) | 7,625 | 8,167 | +7.1% | 8.2% | 10.0% | ok |
| evaluate — wide, concurrency :: concurrency: unbounded | 8,000 | 8,583 | +7.3% | 7.8% | 10.0% | ok |
| evaluate — anyOf Union 8, concurrency :: sequential (default) | 7,708 | 8,209 | +6.5% | 6.5% | 10.0% | ok |
| evaluate — anyOf Union 8, concurrency :: concurrency: unbounded | 8,125 | 8,583 | +5.6% | 6.2% | 10.0% | ok |
| evaluate — rules DenyOverrides 8, concurrency :: sequential (default) | 7,458 | 7,958 | +6.7% | 6.7% | 10.0% | ok |
| evaluate — rules DenyOverrides 8, concurrency :: concurrency: unbounded | 9,958 | 10,417 | +4.6% | 5.0% | 10.0% | ok |
| filter — 500 items, concurrency :: concurrency: unbounded | 4,331,792 | 4,324,042 | -0.2% | 5.3% | 10.0% | ok |
| filter — 500 items, concurrency :: sequential (default) | 4,297,666 | 4,212,459 | -2.0% | 0.4% | 10.0% | ok |
