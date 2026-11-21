---
phase: QD-68-hygiene-and-recorded-close-outs
plan: 05
subsystem: bench of record (OI-10)
status: complete
tags: [hygn-07, oi-10, bench]

requires:
  - phase: QD-68-hygiene-and-recorded-close-outs
    provides: 68-09's last commit 769bf57c (HEAD at start); packages/*/src, packages/*/bench and package.json unchanged since 1e8c9b2b, so the source measured is 68-04's
provides:
  - "OI-10's cost measured once: the committed source against the phase base's, 35 workloads, 3 + 3 interleaved on a quiet host, gate pass (no workload slower than +4.7%, geomean +0.01%)"
affects: [68-12, 68-15]

actuals:
  tokens: 6000
  tasks: 2
  commits: 1
plan_head_before: 769bf57cbe71646a898b10507f5ebcec5108b164
plan_head_after: 17dfa4efab7d195b9891a29d8722e52a770de9d2
commits: 1

tech-stack:
  added: []
  patterns:
    - "one bench run of record, the gate fixed before it, the reference arm's spread stated beside every verdict"

key-files:
  created:
    - .planning/phases/QD-68-hygiene-and-recorded-close-outs/68-BENCH.md
    - .planning/phases/QD-68-hygiene-and-recorded-close-outs/bench/final/meta.txt
    - .planning/phases/QD-68-hygiene-and-recorded-close-outs/bench/final/analysis.tsv
  modified: []

key-decisions:
  - "OI-10's bench of record passed its gate (verdict: pass); the phase goes on. The worst workload, field-heavy anyOf of 8 under Union at +4.7% against a 2.1% reference spread, is recorded as under the 5% limit and not as zero cost"

requirements-completed: [HYGN-07]
completed: 2026-11-21
---

# Phase 68 Plan 05: the bench of record Summary

OI-10's single read on the evaluator's hot path was benched once against the phase base's source on the shared harness, on a quiet host, and the gate fixed before the run passed.

## Commit

- `17dfa4ef` `docs(68-05): the bench of record` (`68-BENCH.md`, `bench/final/`: meta, analysis, six run JSONs, the load files, `done.txt`)

## The run

- Source: head `769bf57c` (`packages/*/src` is 68-04's) as `final`, against `3d66becb` (the phase base) as `base`, patch `git diff HEAD <base> -- ':(glob)packages/*/src/**'` (SHA-256 `c7b84bd3...f4f0`, in `meta.txt`).
- `scripts/bench/ab.sh ... 3 final base packages/core/bench/Evaluate.bench.ts .`, order `final-1 base-1 base-2 final-2 final-3 base-3`, started on `quiet: load 3.72 on 12 cpus, top process at 39.4%`, exit 0.
- `scripts/bench/analyze.mjs`: `# workloads: 35`, `# slower: 0`, `# geomean_d_min_pct: 0.01`, `# worst_d_min: 4.7 evaluate :: field-heavy — anyOf of 8 under Union`, `# gate: pass`. All 35 rows `ok`.
- Run-to-run noise (reference arm's `ref_min_spread_pct`): minimum 0.8%, median 5.9%, maximum 11.5%. Deltas span -4.7% to +4.7%; only the field-heavy workload's delta (+4.7%) exceeds its own spread (2.1%), 0.3 points under the 5% limit. The record says so rather than reading it as no cost.
- Host load: 3.7 to 4.8 before and after each run, except 7.39 after the last run (`base-3`), taken once it ended; stated in `68-BENCH.md`.
- Not re-run. `packages/` was clean after the run (the harness printed `packages/ restored to HEAD`).

## Verification

- Task 1 verify: passed (`the bench of record ran once on a quiet host: # gate: pass`).
- Task 2 verify: passed (`bench of record committed: verdict pass`).
- `git rev-list --count 769bf57c..HEAD` is 1 at the point the SUMMARY was written (the bench commit).

## Deviations from Plan

None. The earlier attempt halted on `busy: load 12.19 on 12 cpus, top process at 100.3%` with no run; this attempt redid the precondition and the base patch (`git apply --check` held) and ran once on a quiet host.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- `68-BENCH.md`, `bench/final/meta.txt`, `bench/final/analysis.tsv` exist; commit `17dfa4ef` is an ancestor of HEAD; `68-BENCH.md` holds exactly one `verdict:` line, `verdict: pass`.
