---
phase: 35-the-atom-set-owns-its-eviction-sweep
plan: 05
subsystem: react
tags: [react, eviction-sweep, breaking-change, changeset, upgrade-guide]
phase_base: 14dc8212d591d04291e002d08780dc9f75ce549a
plan_head_before: c36049a045ffeab05fd113e26055976b8a6c6e92
plan_head_after: c15624a5754dd0e364f6cdf52620aba7e6e6970a

requires:
  - phase: 35-the-atom-set-owns-its-eviction-sweep
    provides: the atom set's own deferred sweep (35-04), 35-SPIKE.md conclusion candidate-1
provides:
  - a QadiProvider that owns a registry and forks no sweep
  - QadiAtoms without sweepEvictions
  - P1..P4 flipped and P5 added, counting the atom set's own forks and sweeps
  - the two Breaking records (changeset and upgrade section)
affects: [35-06, 35-07]

actuals:
  tokens: 9000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "provider pins count forks and sweeps through withSweepFork and makeSweepCounter at three points: synchronously, at the fork, after a settle"

key-files:
  created:
    - .changeset/atom-set-sweep.md
  modified:
    - packages/react/src/QadiProvider.tsx
    - packages/react/src/QadiAtoms.ts
    - packages/react/test/QadiProvider.test.tsx
    - packages/react/test/QadiProvider.sweep.test.tsx
    - packages/react/test/QadiAtoms.test.ts
    - .changeset/question-book.md
    - apps/website/src/content/docs/docs/reference/upgrading.md

key-decisions:
  - "Candidate-1 as 35-SPIKE.md concluded: the interval did not move to QadiAtomsOptions, so the changeset's first lead says delete the prop"

requirements-completed: [SWEEP-02, SWEEP-03, WX-06, WX-07]

coverage:
  - id: D1
    description: "QadiProvider forks no sweep and has no sweepIntervalMillis; the bound holds under one provider, three providers, StrictMode and Activity"
    requirement: SWEEP-03
    verification:
      - kind: unit
        ref: "packages/react/test/QadiProvider.sweep.test.tsx#P1..P4"
        status: pass
      - kind: unit
        ref: "packages/react/test/QadiProvider.test.tsx#the bound under a provider"
        status: pass
    human_judgment: false
  - id: D2
    description: "Two providers over one atom set unmounted in one span: 0 forks and 0 sweeps synchronously, then 1 and 1"
    requirement: SWEEP-02
    verification:
      - kind: unit
        ref: "packages/react/test/QadiProvider.sweep.test.tsx#P5"
        status: pass
    human_judgment: false
  - id: D3
    description: "QadiAtoms.sweepEvictions is removed; the eviction suite is driven by the mechanism with every assertion kept"
    requirement: SWEEP-03
    verification:
      - kind: unit
        ref: "packages/react/test/QadiAtoms.test.ts#the atom set's sweep"
        status: pass
    human_judgment: false
  - id: D4
    description: "The example app passes end to end with the provider forking nothing"
    requirement: SWEEP-02
    verification:
      - kind: e2e
        ref: "pnpm --filter @qadi/example-nextjs test:e2e (30 passed)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Both breaks recorded in a changeset and an upgrade section with a compiled After fence"
    requirement: WX-07
    verification:
      - kind: other
        ref: "pnpm spec:website-examples (57 blocks compile)"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-11-12
status: complete
---

# Phase 35 Plan 05: Provider Forks No Sweep, sweepEvictions Removed Summary

**QadiProvider no longer forks a sweep or takes sweepIntervalMillis, QadiAtoms.sweepEvictions is gone, the provider pins now count the atom set's own one-fork-one-sweep episodes, and both removals are recorded as Breaking.**

## Spike lines honoured

`35-SPIKE.md`: `Winner: candidate-1`. Executed as written: the interval did not move to `QadiAtomsOptions`, so the changeset's first lead tells the reader to delete the prop. No deviation.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 (tracer) | `9614c8f0` | feat(35-05): the provider forks no sweep |
| 2 | `7845e4b6` | feat(35-05): QadiAtoms.sweepEvictions is removed; the atom set sweeps itself |
| 3 | `c15624a5` | docs(35-05): record the two sweep removals as Breaking |

`commits: 3` measured from `plan_head_before` to `plan_head_after`. Every message ends with the `Co-Authored-By: Claude Opus 5.5` trailer.

## The flips, as committed

Task 1 (`9614c8f0`): P1..P4 in `QadiProvider.sweep.test.tsx` stop counting the provider's sweeps (1, 3, 2 under StrictMode, 1 then 2) and count the atom set's own forks and sweeps through `withSweepFork` and `makeSweepCounter`: one fork and one sweep per pressure episode.

| Pin | synchronously | at the fork | after settle |
|-----|---------------|-------------|--------------|
| P1 one provider, bound 1 | asked 2, forks 1, sweeps 0 | sweepsAtFork `[0]`, askedAtFork `[2]` | forks 1, sweeps 1, `[canRead]` |
| P2 three providers, bound 2 | asked 4, forks 1, sweeps 0 | `[0]`, askedAtFork `[3]` | forks 1, sweeps 1, `[canRead, c3]` |
| P3 StrictMode | as P1 | as P1 | as P1, `canRead` listed once |
| P4 Activity hidden then shown | asked 2, forks 1, sweeps 0 | askedAtFork `[2]` | forks 1, sweeps 1, `[canRead]` |
| P5 (new) two providers unmounted in one span | forks 0, sweeps 0, asked 2 | `[0]`, askedAtFork `[2]` | forks 1, sweeps 1 after `waitFor`, asked 1, still 1 and 1 after a further settle |

`QadiProvider.test.tsx`: `describe("sweepIntervalMillis")` renamed `the bound under a provider`, test 1 retitled `evicts a cold question past the bound, never a mounted gate's own`, `sweepIntervalMillis={5}` removed from both providers, two comments rewritten. No assertion line changed.

Task 2 (`7845e4b6`): the eviction suite is `describe("the atom set's sweep")`; the seven `Effect.runSync(set.sweepEvictions)` became `await Effect.runPromise(settleTurns)` (the third test is now `async`); every `expect(` line of the base suite is present, checked against `phase_base`. `.changeset/question-book.md` differs from its base by its one clause, now "the atom set's own sweep forgets a swept question's handle as well as its row".

## Breaking entries written

`.changeset/atom-set-sweep.md` (`"@qadi/react": minor`), in commit order:

1. `**Breaking.** QadiProvider's sweepIntervalMillis prop is removed. The atom set now sweeps its own question book back to maxTrackedQuestions one macrotask after the book goes over it, so the provider forks no sweep and has nothing to time. Delete the prop.`
2. `**Breaking.** QadiAtoms.sweepEvictions is removed. The atom set enforces its own bound wherever it runs: with no provider, on a bare AtomRegistry, or under several providers sharing it, with one sweep per atom set. A hand-written QadiAtoms double drops the member, and a non-React host that ran it on a timer deletes the timer.`
3. A plain paragraph: `maxTrackedQuestions` now holds without a provider and after the provider unmounts (a behaviour change, not a removal; `DEFAULT_SWEEP_INTERVAL_MILLIS` was never exported and is not listed).

`upgrading.md` ends with `## 0.12: the atom set holds its own bound`: a `ts` Before fence (provider with `sweepIntervalMillis={10_000}` and a timer running `atoms.sweepEvictions`) and a compiled `tsx` After fence (`makeQadiAtoms(EvaluationServicesNone, { maxTrackedQuestions: 200 })` at module scope, `App` with no sweep prop).

## Test results

- `QadiProvider.sweep.test.tsx` run three times in a row: `Tests  5 passed (5)` each time; `QadiAtoms.test.ts` twice: `Tests  27 passed (27)`.
- Whole react project after Task 1 and after Task 2: `Test Files  29 passed (29)`, `Tests  473 passed (473)` (472 after 35-04, plus P5).
- `pnpm typecheck`, `pnpm lint` (house-style `484 file(s) clean (3 declared switch(es))`), `pnpm test:tstyche` (`Tests: 252 passed`): exit 0. The oxlint warnings printed are pre-existing.
- `pnpm spec:website-examples`: `57 block(s) compile`.
- e2e (`pnpm build && pnpm --filter @qadi/example-nextjs build && pnpm --filter @qadi/example-nextjs test:e2e`), run after Task 1 with the provider forking nothing: `30 passed (9.3s)`, no failed or flaky, against 35-SPIKE.md's base `30 passed (7.2s)`. Log: `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/13b3a680-6983-4c4f-9cad-4ed79d71ff4f/scratchpad/35-05-e2e.log`.
- `git grep -n "sweepIntervalMillis\|sweepEvictions" -- packages/react/src packages/react/test` prints nothing; `git grep -E "sweepEvictions|sweepIntervalMillis" -- .changeset` prints only `atom-set-sweep.md` (as removals).

## Mutation

This plan measures none. The baseline for `QadiAtoms.ts` (0.8947) and `QadiProvider.tsx` (0.75) is re-measured by 35-07; this plan only deleted code from both files and added the P1..P5 and eviction-suite tests that exercise them.

## Deviations from Plan

None - plan executed exactly as written.

Two test-shape details the plan left open: P2, P5 wrap the `Can` children in a `<span>` because `getByText` cannot find text that shares a parent with other text; P4 awaits the gate before and after the hide so the counted pressure starts from a settled state.

## Known Stubs

None.

## Threat Flags

None. Only deletions plus tests and docs; no new endpoint, auth path or file access. T-35-12 is met: `QadiProvider.tsx` names none of the removed identifiers and the removal is a compile error recorded as Breaking.

## Out-of-plan observations

Source outside this plan still names the removed symbols, and is 35-06's to restate: `AGENTS.md` §13 (`sweepEvictions` fork), `spec/behaviors/09-react.md` (BEH-QD-065 listing), `spec/behaviors/25-inspection.md` (BEH-QD-198), `spec/invariants.md` (INV-QD-105), `spec/process/house-rules-evidence.md` §4. The provider's header now links `spec/decisions/148-the-atom-set-owns-its-eviction-sweep.md`, which 35-06 creates.

## Issues Encountered

None.

## Self-Check: PASSED

- `.changeset/atom-set-sweep.md` exists; commits `9614c8f0`, `7845e4b6`, `c15624a5` are ancestors of HEAD; `git status --porcelain -- packages` is empty; `.planning/config.json` and `.planning/state.json` were never staged.
