---
phase: 35-the-atom-set-owns-its-eviction-sweep
plan: 03
subsystem: testing
tags: [react, spike, effect-reactivity, eviction-sweep, e2e, playwright]
phase_base: 14dc8212d591d04291e002d08780dc9f75ce549a
plan_head_before: 52443e8df02caea43daf044e8dc44bd94cd02305
plan_head_after: 0a8f57b2530db521897b0b2b7ba1c49c3d5821dd

requires:
  - phase: 35-the-atom-set-owns-its-eviction-sweep
    provides: 35-02's candidate 1 evidence, the harness, the admission and release-guard decisions
provides:
  - 35-SPIKE.md with Candidate 2, Candidate 3, the Phase 36 carry-over and the Conclusion (Winner, Admission trigger, Release guard lines)
affects: [35-04, 35-05, 35-06, 35-07]

actuals:
  tokens: 3400
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "D-02 ranking applied mechanically over all measured candidates; rule 1 (no timer) decided"

key-files:
  created: []
  modified:
    - .planning/phases/35-the-atom-set-owns-its-eviction-sweep/35-SPIKE.md

key-decisions:
  - "Winner candidate-1: candidate 2 also passes every criterion but carries a Schedule.spaced timer and an interval option (D-02 rule 1); candidate 3 fails (d)"
  - "Admission trigger kept and release guard (entry.inBook) kept, per 35-02's measured decisions"

requirements-completed: []

coverage:
  - id: D1
    description: "Candidate 2 measured against (a)-(f) and D-03, e2e 30 passed"
    requirement: SWEEP-02
    verification:
      - kind: other
        ref: "35-SPIKE.md Candidate 2 table; node verify of its rows"
        status: pass
    human_judgment: false
  - id: D2
    description: "Candidate 3 measured: fails (d) (one sweeper per reading registry, none for a never-read question); probe3 reproduced"
    requirement: SWEEP-02
    verification:
      - kind: other
        ref: "35-SPIKE.md Candidate 3 table and probe3 reproduction"
        status: pass
    human_judgment: false
  - id: D3
    description: "Conclusion applies D-02 in order; prototypes reverted, no packages/ change committed"
    requirement: SWEEP-01
    verification:
      - kind: other
        ref: "node verify: one Winner/Admission/Release-guard line, clean packages tree, spike commit carries 35-SPIKE.md alone"
        status: pass
    human_judgment: false

duration: 30min
completed: 2026-11-12
status: complete
---

# Phase 35 Plan 03: Spike Candidates 2 and 3, and the Conclusion Summary

**Candidate 2 passes every criterion including the e2e (30 passed) but carries a timer, candidate 3 fails (d) by construction, so D-02 rule 1 picks candidate 1 (release-plus-admission, `entry.inBook` guard kept).**

## Candidate 2: self-terminating book-level fiber

| Criterion | Result | Evidence |
|---|---|---|
| (a) | PASS | smoke + QadiAtoms: `Tests  46 passed (46)`; W1: 0 sweeps synchronously, 1 after settle |
| (b) | PASS | eviction suite plus released form: `Tests  10 passed (10)` |
| (c) | PASS | `30 passed (8.0s)` (base `30 passed (7.2s)`), log `e2e-candidate2.log` |
| (d) | PASS | four registries, 12 releases: 1 sweep, 1 fork (12 signals); three providers: 1 sweep, 1 fork |
| (e) | PASS | StrictMode: 1 fork per episode, 0 without pressure; Activity: hide/show 0, pressure exactly 1 |
| (f) | PASS | 300 atom sets: handles 1 before, 0 after; all-live episode: sweeps stay at 1 over a further 100 ms, 0 handles |
| D-03 | PASS | no `scheduleTask`/`defaultIdleTTL`/`setTimeout`/`setInterval` token; flag is closure state; 0 sweeps synchronously |

Whole react project: `Tests  6 failed | 463 passed (469)`, the six old-owner pins only. Forks equalled sweeps in every case: the interval never ran, because after one sweep `overBoundCold()` was false everywhere, so `Effect.repeat` exited after its first iteration. One fiber per episode, exits by itself, a new episode is a new fork.

## Candidate 3: layer-scoped periodic fork

| Criterion | Result | Evidence |
|---|---|---|
| (a), (b), (c), (e) | NOT RUN | failed (d) (an isolated StrictMode/Activity observation is recorded in the spike, not as a pass) |
| (d) | FAIL | four registries: 4 layer builds (`expected 4 to be 1`); three providers: 3 (`expected 3 to be 1`); never-read questions have no sweeper (R1/S1': `asked()` 5 over a bound of 2); S1 as written also stays at 5 because the layer closes with the runtime node before its first tick |
| (f) | PASS | 300 sets: handles 1 before, 300 while reading, 0 after dispose; 300 builds, 300 closes |
| D-03 | PASS | no `scheduleTask`/`defaultIdleTTL`/timer token; nothing module-scope; W1 `asked()` 3 before and after synchronously |

probe3 reproduction (`node $P/probe3-layer.mjs`, log `$S/p35-spike/probe3.log`): a registry that never reads builds no layer; two reading registries build it twice (`BUILT #1`, `BUILT #2`); one unmount closes one scope (`CLOSED`) while the other's fiber keeps ticking; a re-read rebuilds (`#3`); each dispose closes its own.

## Conclusion (verbatim lines from 35-SPIKE.md)

- Winner: candidate-1
- Admission trigger: kept
- Release guard (entry.inBook): kept

D-02 ranking applied: passing candidates are candidate-1 (release-plus-admission) and candidate-2. Rule 1 (no timer or interval) keeps candidate-1 (a one-shot `yieldNow` fiber) over candidate-2 (`Schedule.spaced`, `sweepIntervalMillis`) and decides; rules 2 to 4 not reached, and the spike records what each would have said.

## e2e summary lines run in this plan

- Candidate 2: `30 passed (8.0s)` (`$S/p35-spike/e2e-candidate2.log`; `$S` is `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/13b3a680-6983-4c4f-9cad-4ed79d71ff4f/scratchpad`)
- Candidate 3: not run (failed (d))

## Checkpoint

Task 3 (conditional checkpoint:decision) not reached: checkpoint not reached: Winner is candidate-1.

## Carried to Phase 36

The `subject` atom is not `keepAlive`, so its seeded value is lost once the last decision atom unmounts. Reproduced on the real tree (`while mounted: subject=u1; after unmount: node present=false value=undefined`). Not fixed here; recorded in the spike's `## Pre-existing finding carried to Phase 36`.

## Saved prototypes (scratch, never committed)

`$S/p35-spike/candidate2.diff`, `$S/p35-spike/candidate3.diff`; harness: `$S/p35-spike/c2/`, `$S/p35-spike/spike.c3.test.tsx`.

## Task Commits

1. **Tasks 1 and 2: the spike record** - `0a8f57b2` (docs). Candidate measurements have no commit of their own; the plan's single commit is the record (Task 2 step 6).

**Plan metadata:** the `docs(35-03)` commit that follows this file.

## Deviations from Plan

None in outcome. Mechanical notes, all recorded in `35-SPIKE.md`:

- Candidate 3's `book.sweep`-count assertions (candidate 1's harness) cannot be met by a 5 ms timer after a 20-yield settle (12 of 16 failed for that reason), so a dedicated harness counting layer builds and closes with wall-clock waits was used and the failed run is disclosed, not used as evidence.
- Candidate 2's fork count is a prototype-only `globalThis` counter; candidate 3's build/close counts likewise. Neither is part of a candidate.
- The `subject` finding was re-measured on the real tree with a scratch test (deleted), beyond the plan's citation of the research probe.

**Total deviations:** 0 auto-fixed. **Impact:** none; no `packages/` file changed in any commit; `lib/` rebuilt from base sources.

## Known Stubs

None.

## Threat Flags

None. T-35-05 mitigated: the ranking is applied in order over all three measured candidates with exactly one Winner line. T-35-06 mitigated: `git status --porcelain -- packages` empty, no `spike.*` copy left, the spike commit carries `35-SPIKE.md` alone.

## Next Phase Readiness

35-04 builds candidate 1 with the admission trigger and the `entry.inBook` release guard (35-SPIKE.md Conclusion).

## Self-Check: PASSED

- `35-SPIKE.md` verifies (sections, rows, one Winner, Admission trigger and Release guard line each); commit `0a8f57b2` is an ancestor of HEAD and touches only that file.
- `git status --porcelain -- packages` prints nothing.
