---
phase: QD-37-a-scoped-run-that-a-newer-run-supersedes
plan: 01
subsystem: testing
tags: [stryker, vitest, devtools, mutation-baseline, characterisation]
phase_base: c52e0d653e84702d64d7e18ac6c4505182dfe34b
plan_head_before: c52e0d653e84702d64d7e18ac6c4505182dfe34b
plan_head_after: 2209c47a4a63430602ffc17ec4451f5e1b7be9c5
status: complete

requires: []
provides:
  - "37-mutation-base.json: per-file Stryker baseline of TimelineFeed.ts, DiagnosticsFeed.ts, SimulationSession.ts at the phase base"
  - "TF20: the timeline's publish-before-fork ordering pin"
  - "SimulationSession.runs.test.ts: SR1 (self-interrupt reads Broke) and SR2 to SR4 (a stop with no run does nothing visible)"
affects: [37-02, 37-05, 37-06, 37-09]

actuals:
  tokens: 2163
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns: ["characterisation committed green on the untouched base before the code it guards moves"]

key-files:
  created:
    - .planning/phases/QD-37-a-scoped-run-that-a-newer-run-supersedes/37-mutation-base.json
    - packages/devtools/test/model/SimulationSession.runs.test.ts
  modified:
    - packages/devtools/test/model/TimelineFeed.test.ts

key-decisions:
  - "Baseline recorded as measured; the Stryker pattern naming the not-yet-existing SupersedingRun.ts was accepted as is (no pattern dropped)"

requirements-completed: [WX-02, WX-05, WX-06, RUN-04, RUN-06]

duration: 8 min
completed: 2026-11-14
---

# Phase 37 Plan 01: Mutation baseline and green-on-base run characterisations Summary

Per-file Stryker baseline of the three stores the phase converts, then TF20 and SR1 to SR4 pinned green on the untouched base, with no `packages/*/src` change.

## Accomplishments

- `37-mutation-base.json` committed alone as the phase's first plan commit, from the phase's one Stryker invocation on the untouched tree.
- TF20 added as the last case of the timeline feed describe: a restart from Stopped over `{ read: Effect.die(...) }` records `[Reading, Stopped]`, so a store that published after its fork would fail it.
- `SimulationSession.runs.test.ts` created with exactly four cases: SR1 (a resolver that interrupts itself reads `Broke`, message includes `Interrupt`), SR2 (never ran), SR3 (after a finished run), SR4 (closed session); SR2 and SR3 notify exactly once.

## phase_base

`c52e0d653e84702d64d7e18ac6c4505182dfe34b`, the parent of the `chore(37-01)` commit. 37-02 to 37-09 read it from here.

## Reserved numbers

ARCH-84, ADR-QD-150, CCR-QD-428, BEH-QD-521 to 525, INV-QD-319, INV-QD-320: `git grep` over `spec packages .changeset AGENTS.md CONTRIBUTING.md features apps/website/src examples` printed nothing for each, and `ls spec/decisions | grep '^150-'` printed nothing. All ten are free. `node scripts/next-id.mjs` was not run.

## Baseline (writer output)

```json
{"measured":{"packages/devtools/src/model/TimelineFeed.ts":1,"packages/devtools/src/model/DiagnosticsFeed.ts":0.9279279279279279,"packages/devtools/src/model/SimulationSession.ts":0.9766763848396501},"unmeasured":{},"new":["packages/devtools/src/model/SupersedingRun.ts"],"deleted":{}}
```

Stryker: 550 mutants instrumented, 500 killed, 16 survived, 0 no-coverage, 0 timeout, overall 96.90, done in 1 min 24 s. Command: `pnpm exec stryker run stryker.devtools.mjs --mutate '<TimelineFeed,DiagnosticsFeed,SimulationSession,SupersedingRun .ts>'`. The fourth, non-existent path was accepted ("Found 3 of 4899 file(s) to be mutated"), so no pattern was dropped. Numbers match research (TimelineFeed 62/62, SimulationSession 335/343, DiagnosticsFeed 103/111).

### Survivors per store (line, mutator, replacement)

- TimelineFeed.ts: none.
- SimulationSession.ts (8): L413 ConditionalExpression -> false; L415 ConditionalExpression -> false; L359 AssignmentOperator `generation -= 1`; L406 ConditionalExpression -> false; L462 ConditionalExpression -> true; L409 ConditionalExpression -> false; L409 StringLiteral -> ""; L495 ConditionalExpression -> false.
- DiagnosticsFeed.ts (8): L193, L194, L195 ConditionalExpression -> false; L200 `generation -= 1`; L209 ConditionalExpression -> false; L178 `generation -= 1`; L231 `generation -= 1`; L245 ConditionalExpression -> true.

## Test results

- TF20: `TimelineFeed.test.ts` 20 passed (20).
- SR1 to SR4: `SimulationSession.runs.test.ts` 4 passed (4).
- `pnpm typecheck` rc 0; `pnpm lint` rc 0 (oxlint warnings are pre-existing, none name the new files; house-style 494 files clean).

## Task commits

| Task | Commit | Message |
|---|---|---|
| 1 | c8accf4c | chore(37-01): mutation baseline for the superseding-run stores |
| 2 | 796648b0 | test(37-01): pin that a restart publishes Reading before its read stops |
| 3 | 2209c47a | test(37-01): pin the session self-interrupt and its stops with no run |

The three are the first three plan commits, each carrying exactly one file; verified by the plan's commit-order check.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Next Phase Readiness

Ready for 37-02. The baseline is written once and must not be edited again.

## Self-Check: PASSED

Files exist (37-mutation-base.json, SimulationSession.runs.test.ts, TimelineFeed.test.ts) and commits c8accf4c, 796648b0, 2209c47a are ancestors of HEAD; no `packages/*/src` file changed.
