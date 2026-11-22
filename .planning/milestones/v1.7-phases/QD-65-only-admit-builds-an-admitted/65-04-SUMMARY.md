---
phase: QD-65-only-admit-builds-an-admitted
plan: 04
subsystem: core
tags: [admission, bench, evaluate-bench, phase-59-harness]
phase_base: d1ac1df0629e95797f406c5c46da364e6542dce2

requires:
  - phase: QD-65-only-admit-builds-an-admitted
    provides: 65-02's private-constructor `Admitted` and 65-03's single matcher context, the committed source measured here
provides:
  - the bench of record (3 + 3 interleaved, Phase 59's harness and bands) of the committed source against the phase base
  - 65-BENCH.md, the verdict read from the run directory
affects: [QD-65-05, QD-65-06]

actuals:
  tokens: 9000
  tasks: 2
  commits: 2
plan_head_before: 6843e25e54d4bee5d1af1c5e2ba94cd88d95b3af
plan_head_after: 7d61fac20b5b61ba2a99937d37ce3fbc8598cf29
commits: 2

tech-stack:
  added: []
  patterns:
    - "a bench verdict is generated from the run directory's analysis.tsv and meta.txt, not retyped"

key-files:
  created:
    - .planning/phases/QD-65-only-admit-builds-an-admitted/65-BENCH.md
    - .planning/phases/QD-65-only-admit-builds-an-admitted/bench/final/ (22 tracked files)
  modified: []

key-decisions:
  - "None beyond the plan; the harness is Phase 59's, byte for byte, and was not run twice"

requirements-completed: [ADMT-04]

duration: 12min
completed: 2026-11-20
status: complete
---

# Phase 65 Plan 04: The bench of record Summary

**The committed `packages/core/src` (head `6843e25e54d4bee5d1af1c5e2ba94cd88d95b3af`) is no slower than the phase base on any of the 35 `Evaluate.bench.ts` workloads, beyond its band: Phase 59's harness, 3 + 3 interleaved, gate pass.**

## Accomplishments

- Harness unchanged: `ab.sh` SHA-256 `9ef5811a460ebe6f2431116c505077a4b658d62711e5375b31cf97ddddffd303`, `analyze.mjs` SHA-256 `4259fafc33a3505deece8fa50896363387db504cb9b09cf52c36fe5f37394695`; `analyze.mjs --self-test` printed `self-test: 4 passed`.
- `to-base.patch` is `git diff HEAD <phase_base> -- packages/core/src` (`packages/core/src/Admission.ts` only); `ab.sh` exited 0 and left `done.txt` reading `src restored to HEAD`. `meta.txt`: `rounds: 3`, `head_label: final`, `patched_label: base`, `patch_sha256: 20c8ce56eb40e97721f6fd1d7024fd1e5c4acbd57e81793001c6999e8f14c45e`, node v26.13.0, Apple M3 Pro.
- The four trailer lines of `analysis.tsv`, in its words:

  ```text
  # workloads: 35
  # slower: 0
  # geomean_d_min_pct: -0.51
  # worst_d_min: 1.6 evaluate — width scaling :: width 8
  # gate: pass
  ```

  All 35 rows read `ok`; the worst delta is 1.6% against a 10.0% band. Delta is the committed source over the phase base, by the statistic of the median of per-run minima.
- Wall time: `meta.txt` start 18:48:17Z (19:48:17 local) to the last load file at 19:53:00 local, 4 min 43 s. The 1-minute load across the twelve readings ranged 4.44 to 7.77 (15-minute 9.20 to 10.61).
- The machine was not quiet: macOS's `mediaanalysisd` was the top CPU consumer before the run (201.2%) and second after (113.7%, behind Spotlight's `mds` at 126.2%). Recorded in 65-BENCH.md with the `uptime` lines; the arms alternate, so it falls on both sides, and the gate passed.
- No `packages/*/src` change after the measured head; `git log <phase_base>..HEAD -- packages/*/src` lists `fix(65-03)` and `fix(65-02)` only, both before the bench commit. Both task verifies exited 0.

## Task Commits

1. **Task 1 (tracer): the bench of record** - `6c4be029` (docs)
2. **Task 2: the bench verdict** - `7d61fac2` (docs)

## Deviations from Plan

None - plan executed exactly as written. The tracer gate (`# gate: pass`) held, so no expansion was blocked; nothing was re-run.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- 65-BENCH.md, `bench/final/analysis.tsv`, `meta.txt`, `done.txt`, `to-base.patch`: found on disk.
- Commits `6c4be029` and `7d61fac2` are ancestors of HEAD.
- Task 1 and Task 2 verifies re-run after the commits: exit 0.
