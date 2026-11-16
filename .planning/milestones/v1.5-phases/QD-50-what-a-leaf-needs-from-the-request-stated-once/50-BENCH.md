---
verdict: pursue
phase_base: 5ab8d0c00075beb08f0206841f96e717a6571979
measured_at: 4b5098bfa48839d788671b76517f5759573a3a81
prototype: research-probes/proto-p1.patch.txt
prototype_sha256: 109f2545ae36374046f8abf6d7cf07604f4b8abc9b4158ba05a7c09595e98e78
statistic: median of per-run minima; band = max(10%, the base's spread of that statistic) (D-03a)
slower: 0
---

# Phase 50 bench gate

## Gate

The research's prototype P1 (direct imports, D-01) was measured against the phase base on `Evaluate.bench.ts` (35 workloads: the 33 existing plus the two leaf-heavy ones of 50-02), interleaved 3 + 3 (base, proto, base, proto, ...), the runner applying and reversing the patch around each prototype run so no source is committed. The decision statistic is the median of per-run minima per workload; a workload is slower only when the prototype's delta is strictly greater than its band, max(10%, the base's own spread of that statistic) (D-03, D-03a). The gate passes when no workload is slower; the verdict follows `bench/gate/analysis.tsv`'s last line (`# gate: pass`), not judgement.

Result: slower 0 of 35; geomean delta of minima +2.75%; worst 8.7 evaluate :: rules FirstApplicable — 8, last applies.

## Workloads

Decision statistic: median of per-run minima (ns). Delta is prototype over base.

| workload | base min (ns) | prototype min (ns) | delta | base spread | band | verdict |
|---|---|---|---|---|---|---|
| evaluate :: one node | 5,416 | 5,541 | +2.3% | 3.8% | 10.0% | ok |
| evaluate :: rules DenyOverrides — 8 permits | 6,875 | 7,000 | +1.8% | 1.8% | 10.0% | ok |
| evaluate :: rules FirstApplicable — 8, last applies | 6,667 | 7,250 | +8.7% | 3.1% | 10.0% | ok |
| evaluate :: anyOf First — 8, last allows | 6,791 | 7,291 | +7.4% | 0.0% | 10.0% | ok |
| evaluate :: wide — allOf of 8 | 6,917 | 7,041 | +1.8% | 1.2% | 10.0% | ok |
| evaluate :: anyOf Union — 8 | 7,250 | 7,500 | +3.4% | 2.9% | 10.0% | ok |
| evaluate :: wrapper-heavy — 10 nested labeled/not/obliged | 7,708 | 7,833 | +1.6% | 7.6% | 10.0% | ok |
| evaluate :: rules PermitOverrides — 8 denies | 7,750 | 8,208 | +5.9% | 3.2% | 10.0% | ok |
| evaluate :: field-heavy — anyOf of 8 under Union | 7,791 | 7,833 | +0.5% | 2.1% | 10.0% | ok |
| evaluate :: leaf-heavy — allOf of 8, matchers reference neither | 7,958 | 8,459 | +6.3% | 2.6% | 10.0% | ok |
| evaluate :: leaf-heavy — allOf of 8, matchers reference action and resource | 7,959 | 8,459 | +6.3% | 3.1% | 10.0% | ok |
| evaluate :: deep rules — 10 nested | 9,250 | 9,875 | +6.8% | 0.5% | 10.0% | ok |
| evaluate :: deep — 10 levels | 9,416 | 9,417 | 0.0% | 3.1% | 10.0% | ok |
| evaluate :: matcher-heavy — 3 refs | 9,791 | 10,167 | +3.8% | 2.1% | 10.0% | ok |
| evaluate :: resolver miss — one port call | 10,541 | 10,833 | +2.8% | 1.6% | 10.0% | ok |
| evaluate :: obligation-heavy — allOf of 8 distinct obligations | 11,166 | 11,416 | +2.2% | 4.5% | 10.0% | ok |
| evaluate :: field-heavy — allOf of 8 under Intersection | 15,833 | 16,125 | +1.8% | 4.7% | 10.0% | ok |
| filter — 500 items :: hasPermission | 3,906,125 | 3,997,416 | +2.3% | 2.0% | 10.0% | ok |
| decideSubjects — 500 subjects :: hasPermission | 4,902,459 | 4,987,583 | +1.7% | 4.3% | 10.0% | ok |
| evaluate — depth scaling :: depth 5 | 11,041 | 11,500 | +4.2% | 3.8% | 10.0% | ok |
| evaluate — depth scaling :: depth 10 | 15,083 | 15,958 | +5.8% | 0.6% | 10.0% | ok |
| evaluate — depth scaling :: depth 20 | 23,583 | 24,166 | +2.5% | 1.4% | 10.0% | ok |
| evaluate — depth scaling :: depth 40 | 40,959 | 43,000 | +5.0% | 6.5% | 10.0% | ok |
| evaluate — width scaling :: width 4 | 8,041 | 8,458 | +5.2% | 3.6% | 10.0% | ok |
| evaluate — width scaling :: width 8 | 9,959 | 9,875 | -0.8% | 4.6% | 10.0% | ok |
| evaluate — width scaling :: width 16 | 13,209 | 13,125 | -0.6% | 5.0% | 10.0% | ok |
| evaluate — width scaling :: width 32 | 19,542 | 19,500 | -0.2% | 5.5% | 10.0% | ok |
| evaluate — wide, concurrency :: sequential (default) | 7,125 | 7,208 | +1.2% | 4.1% | 10.0% | ok |
| evaluate — wide, concurrency :: concurrency: unbounded | 7,250 | 7,750 | +6.9% | 8.1% | 10.0% | ok |
| evaluate — anyOf Union 8, concurrency :: sequential (default) | 7,375 | 7,208 | -2.3% | 7.3% | 10.0% | ok |
| evaluate — anyOf Union 8, concurrency :: concurrency: unbounded | 7,292 | 7,500 | +2.9% | 4.6% | 10.0% | ok |
| evaluate — rules DenyOverrides 8, concurrency :: sequential (default) | 7,000 | 6,875 | -1.8% | 5.4% | 10.0% | ok |
| evaluate — rules DenyOverrides 8, concurrency :: concurrency: unbounded | 8,875 | 8,916 | +0.5% | 4.2% | 10.0% | ok |
| filter — 500 items, concurrency :: sequential (default) | 3,933,417 | 3,968,000 | +0.9% | 1.1% | 10.0% | ok |
| filter — 500 items, concurrency :: concurrency: unbounded | 3,999,917 | 4,026,167 | +0.7% | 0.6% | 10.0% | ok |

### Recorded, not deciding (D-03a)

The median of per-run p50 and the mean of per-run means are recorded beside the decision statistic. They never decide: a single stalled run swung the mean of means 44-134% on this host.

| workload | delta p50 | delta mean of means |
|---|---|---|
| evaluate :: one node | +2.1% | +2.0% |
| evaluate :: rules DenyOverrides — 8 permits | +4.0% | +3.4% |
| evaluate :: rules FirstApplicable — 8, last applies | +7.9% | +6.8% |
| evaluate :: anyOf First — 8, last allows | +6.7% | +6.1% |
| evaluate :: wide — allOf of 8 | +2.7% | +2.8% |
| evaluate :: anyOf Union — 8 | +2.7% | +2.3% |
| evaluate :: wrapper-heavy — 10 nested labeled/not/obliged | +2.0% | +2.1% |
| evaluate :: rules PermitOverrides — 8 denies | +2.5% | +2.9% |
| evaluate :: field-heavy — anyOf of 8 under Union | +2.5% | +2.2% |
| evaluate :: leaf-heavy — allOf of 8, matchers reference neither | +5.2% | +5.4% |
| evaluate :: leaf-heavy — allOf of 8, matchers reference action and resource | +4.8% | +5.5% |
| evaluate :: deep rules — 10 nested | +2.1% | +1.9% |
| evaluate :: deep — 10 levels | +1.2% | +1.5% |
| evaluate :: matcher-heavy — 3 refs | +3.1% | +3.4% |
| evaluate :: resolver miss — one port call | +2.8% | +3.0% |
| evaluate :: obligation-heavy — allOf of 8 distinct obligations | +2.4% | +2.3% |
| evaluate :: field-heavy — allOf of 8 under Intersection | +1.2% | +1.8% |
| filter — 500 items :: hasPermission | +2.0% | +2.2% |
| decideSubjects — 500 subjects :: hasPermission | +0.5% | +0.8% |
| evaluate — depth scaling :: depth 5 | +0.4% | +0.5% |
| evaluate — depth scaling :: depth 10 | +0.8% | +0.5% |
| evaluate — depth scaling :: depth 20 | +1.4% | +1.2% |
| evaluate — depth scaling :: depth 40 | +1.6% | +1.5% |
| evaluate — width scaling :: width 4 | +0.5% | +1.3% |
| evaluate — width scaling :: width 8 | +2.0% | +1.8% |
| evaluate — width scaling :: width 16 | +3.3% | +3.0% |
| evaluate — width scaling :: width 32 | +3.4% | +3.9% |
| evaluate — wide, concurrency :: sequential (default) | +1.6% | +2.2% |
| evaluate — wide, concurrency :: concurrency: unbounded | +2.1% | +2.6% |
| evaluate — anyOf Union 8, concurrency :: sequential (default) | +1.6% | +1.9% |
| evaluate — anyOf Union 8, concurrency :: concurrency: unbounded | +1.6% | +2.2% |
| evaluate — rules DenyOverrides 8, concurrency :: sequential (default) | +1.7% | +1.8% |
| evaluate — rules DenyOverrides 8, concurrency :: concurrency: unbounded | +3.0% | +2.9% |
| filter — 500 items, concurrency :: sequential (default) | +1.2% | +1.3% |
| filter — 500 items, concurrency :: concurrency: unbounded | +1.0% | +1.2% |

## Leaf-heavy

| workload | base min (ns) | prototype min (ns) | delta | base spread | band | verdict |
|---|---|---|---|---|---|---|
| evaluate :: leaf-heavy — allOf of 8, matchers reference neither | 7,958 | 8,459 | +6.3% | 2.6% | 10.0% | ok |
| evaluate :: leaf-heavy — allOf of 8, matchers reference action and resource | 7,959 | 8,459 | +6.3% | 3.1% | 10.0% | ok |

The control (matchers reference neither action nor resource) differs from the referencing workload by 0.0 percentage points of delta; both sit inside the 10% band.

## Host

Apple M3 Pro, Node v26.13.0, run start 2026-11-16T12:53:29Z, base head 4b5098bfa48839d788671b76517f5759573a3a81. Load averages (1, 5, 15 min) around every run:

- base-1 before: 3.93 4.08 3.53
- base-1 after: 4.10 4.13 3.58
- base-2 before: 3.97 4.10 3.60
- base-2 after: 3.35 3.92 3.56
- base-3 before: 3.10 3.77 3.52
- base-3 after: 3.02 3.66 3.49
- proto-1 before: 4.10 4.13 3.58
- proto-1 after: 3.97 4.10 3.60
- proto-2 before: 3.35 3.92 3.56
- proto-2 after: 3.10 3.77 3.52
- proto-3 before: 3.02 3.66 3.49
- proto-3 after: 2.95 3.55 3.46

## Verdict

Pursue. No workload of 35 is slower than its band (slower 0); the geomean delta of minima is +2.75% and the worst single workload is 8.7 evaluate :: rules FirstApplicable — 8, last applies, inside its 10% band. The prototype is not free (the bulk of the deltas are positive), which the gate's band absorbs by rule; 50-04..50-08 proceed and the after-run (50-06) re-measures the real implementation on the same statistic.
