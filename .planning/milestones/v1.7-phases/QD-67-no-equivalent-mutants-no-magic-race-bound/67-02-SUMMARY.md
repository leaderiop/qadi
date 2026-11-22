---
phase: QD-67-no-equivalent-mutants-no-magic-race-bound
plan: 02
subsystem: testing
tags: [bench, vitest, single-flight, claim-dispatch, decision-cache]
phase_base: eacf89b4b3ab9ef6189312ab904f7d4943714550

requires:
  - phase: QD-67-no-equivalent-mutants-no-magic-race-bound
    provides: 67-01's mutation base and race test (the phase base's source is what both candidates are measured against)
provides:
  - a bench harness (ab.sh, analyze.mjs) with the gate, the five workload keys and a self-test seen failing on a planted defect of each condition
  - a capacity-bound miss workload in DecisionCache.bench.ts, committed before any candidate run
  - both candidates measured 3 + 3 against the phase base, and 67-DISPATCH.md with choice table
affects: [67-04, 67-05]

actuals:
  tokens: 16000
  tasks: 2
  commits: 3
plan_head_before: c2db68870b27e552793ef3fab29c8fe7c58878bd
plan_head_after: 11a16923bfbf5c93940b1f131a03019bf0809037

tech-stack:
  added: []
  patterns:
    - "a gate fixed in a committed analyzer before any run, with a self-test and doctored real runs that show it fails"

key-files:
  created:
    - .planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/bench/ab.sh
    - .planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/bench/analyze.mjs
    - .planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/bench/match/
    - .planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/bench/table/
    - .planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-DISPATCH.md
  modified:
    - packages/core/bench/DecisionCache.bench.ts

key-decisions:
  - "The claim dispatch is the arm table (choice: table): the Match candidate failed the gate with two workloads slower, the table candidate passed it with none slower"

requirements-completed: [MUTE-02, WX-06]

coverage:
  - id: D1
    description: "The gate, the five workload keys and the rule are committed in analyze.mjs before any candidate run, and the harness is seen able to fail"
    requirement: WX-06
    verification:
      - kind: other
        ref: "Task 1 automated verify (self-test: 7 passed; a spread-widened band and a dropped geomean condition each exit 1 naming their case; doctored copies of a real run give fail, pass, fail, pass at 1.06/1, 1.049/1, 1.025/1.025, 1.019/1.019)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The capacity-bound miss workload is in the bench file both arms ran"
    requirement: WX-06
    verification:
      - kind: other
        ref: "Task 1 automated verify (bench file SHA-256 planned; oxlint, typecheck and house-style clean; one smoke run read as five workloads)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Both candidates measured 3 + 3 against the phase base and the choice is the rule's"
    requirement: MUTE-02
    verification:
      - kind: other
        ref: "Task 2 automated verify (each analysis.tsv reproduced byte for byte; 67-DISPATCH.md choice table equals the rule applied to the two committed gate lines)"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-11-21
status: complete
---

# Phase 67 Plan 02: The dispatch candidates measured Summary

**The arm table beat the Match form on the fixed gate: Match slowed both miss workloads by 7.2% and 7.7%, the table passed with a geometric mean of -4.15% and no workload slower, so 67-04 applies the table.**

## Performance

- **Duration:** about 5 min of work; the two bench runs took 45.8 s (match) and about 55 s (table)
- **Tasks:** 2
- **Files:** 2 harness files, 1 bench file, 2 run directories (21 committed files each), 67-DISPATCH.md

## Accomplishments

- The harness is Phase 66's `ab.sh` byte for byte plus an `analyze.mjs` naming the five `DecisionCache.getOrCompute — ` workloads, a 5% per-workload band and a +2% geometric-mean limit. `--self-test` prints `self-test: 7 passed`; a copy with the band widened by the reference spread fails naming `one workload 6% slower with a 20% reference spread still fails`, and a copy with the geomean condition dropped fails naming `every workload 2.5% slower fails on the geomean`.
- The bench file gains the `miss, capacity-bound` workload (a cache at `capacity: 64`, every insert evicting the oldest) and a header naming five workloads over two outcomes. It was committed before any run, so both arms of both runs carry it.
- A real smoke run (identical arms) read as `# workloads: 5`, `# gate: pass`. Doctored copies of it gate as planned: 1.06 on one workload fails, 1.049 passes, 1.025 on all fails, 1.019 on all passes.
- Both candidates measured 3 + 3 interleaved against the phase base's `SharedComputation.ts`, patch SHA-256 recorded in each `meta.txt`, `packages/core/src` clean after each run.

| Workload | Match delta | Table delta |
| --- | --- | --- |
| hit | -3.6% | -8.4% |
| hit, realistic tree | -0.5% | -6.3% |
| hit, fresh-but-equal subject | -0.9% | -6.9% |
| miss | +7.2% (SLOWER) | +0.3% |
| miss, capacity-bound | +7.7% (SLOWER) | +0.9% |
| slower / geomean / gate | 2 / +1.87% / fail | 0 / -4.15% / pass |

Base minima differ between the two runs (for example `hit` 6958 ns against 7917 ns), because each run has its own base arm under its own host conditions; a delta is only ever read within one run.

- `67-DISPATCH.md` records `choice: table`, the rule, the commands as run, each run's numbers, the host load and the one-sentence application of the rule.

## Task Commits

1. **Task 1 harness** - `14cdd768` (docs)
2. **Task 1 bench row** - `070ffb6b` (test)
3. **Task 2 candidates and dispatch** - `11a16923` (docs)

**Plan metadata:** the `docs(67-02): summary` commit that holds this file.

## Deviations from Plan

None - plan executed exactly as written. Run directories also hold `*.log` files from `ab.sh`; the repository's `*.log` ignore rule keeps them out of the commit, and no verify names them.

## Issues Encountered

None that stopped a run. See the host load note below.

## Host load

- The quiet-host check passed before each run: `quiet: load 3.86 on 12 cpus, top process at 26.6%` before match, `quiet: load 10.22 on 12 cpus, top process at 58.7%` before table.
- Match run: load 3.95 to 8.70. `mds` (Spotlight indexing) was at 207.9% and 210.4% in two samples between base-2 and match-1; `rustc` at 97.8% around base-3 and match-2.
- Table run: the load rose from 10.22 to 16.09 on 12 CPUs, with `specforge` (another project's build) the top process at 43 to 65% in nearly every sample. The check passed at its start, and the rule halts only before a run, so the run was neither set aside nor repeated.

## Flagged for the owner

- **The table run was made under load above the CPU count.** Its verdict has a wide margin on the three hit workloads (-6.3% to -8.4%) and a narrow one on the two miss workloads (+0.3% and +0.9%, against a 5% band), and its base arm's spread was 1.1% to 3.1%, small. The gate does not read the load; the decision rests on the gate as fixed. 67-05's run of record measures the committed form again.
- **The match run's base arm is not far from the table run's candidate arm in absolute terms** (for example `miss` 11583 ns base in the match run against 13333 ns base in the table run), so the two runs' absolute numbers should not be compared with each other.
- **The arm table is indexed directly** (`arms[claim._tag]`), not through `Object.hasOwn`: a fail-closed row for a tag `run` itself wrote could never be reached, and its mutant would be equivalent (flagged in 67-01).
- **Match is slower on the miss paths only.** The two SLOWER workloads are exactly the ones that run `answerOwned` through `Match.value(...).pipe(Match.tagsExhaustive(...))` on every call; the hit workloads did not slow. That is what the numbers show; they do not say why.

## Known Stubs

None.

## Threat Flags

None. No source, network endpoint, auth path or schema changed; `packages/core/src` equals the phase base's.

## Next Phase Readiness

67-04 applies the candidate selected by `choice: table` in `67-DISPATCH.md`. No blockers.

## Self-Check: PASSED

- `bench/ab.sh`, `bench/analyze.mjs`, `bench/match/done.txt`, `bench/table/done.txt`, `67-DISPATCH.md` and the bench file exist; commits `14cdd768`, `070ffb6b` and `11a16923` are on `arch-wave-12`.
- Both task verifies exit 0 (the second prints `the rule takes table`); `packages/core/src` equals `phase_base`'s and is clean.

---
*Phase: QD-67-no-equivalent-mutants-no-magic-race-bound*
*Completed: 2026-11-21*
