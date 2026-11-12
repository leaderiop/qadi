---
phase: 35-the-atom-set-owns-its-eviction-sweep
plan: 04
subsystem: react
tags: [react, effect-reactivity, eviction-sweep, question-book, stryker]
phase_base: 14dc8212d591d04291e002d08780dc9f75ce549a
plan_head_before: 432386061483f0ee0d4aa76ac2ea757918f4383d
plan_head_after: 83d5ade62b9c1d75e61732d34974a2d8abddbfd5

requires:
  - phase: 35-the-atom-set-owns-its-eviction-sweep
    provides: 35-SPIKE.md conclusion (candidate-1, admission trigger kept, entry.inBook release guard kept), 35-01 pins S1 and the mutation baseline
provides:
  - the book's package-private signal seam and the atom set's own deferred sweep (the bound holds with no provider)
  - SweepScheduler.ts, the per-atom-set coalescer, with an injectable fork and the withSweepFork/sweepForkOf construction path
  - B1..B8, C1..C10, S2..S9 and four registry-timing smoke pins, mock-free
affects: [35-05, 35-06, 35-07]

actuals:
  tokens: 14000
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "edge-triggered coalesced one-shot sweep: closure pending flag, Effect.yieldNow then sweep, no timer"
    - "class-private #fork slot carrying a test fork through options (GateWriter.ts pattern), no public seam"

key-files:
  created:
    - packages/react/src/SweepScheduler.ts
    - packages/react/test/SweepScheduler.test.ts
    - packages/react/test/support/settle.ts
    - packages/react/test/support/sweepCounter.ts
  modified:
    - packages/react/src/QuestionBook.ts
    - packages/react/src/QadiAtoms.ts
    - packages/react/test/QadiAtoms.sweep.test.ts
    - packages/react/test/QadiProvider.test.tsx
    - packages/react/test/QuestionBook.test.ts
    - packages/react/test/v4-reactivity-smoke.test.ts
    - stryker.react.mjs

key-decisions:
  - "Candidate 1 as the spike concluded: admission trigger kept, entry.inBook release guard kept; no cold-count guard"
  - "The one-turn sample in S9 measured as 35-VALIDATION.md predicted (forks 1, sweeps 0), so no deviation"

requirements-completed: [SWEEP-02, SWEEP-03, SWEEP-04, SWEEP-05, WX-04, WX-05, WX-06]

coverage:
  - id: D1
    description: "The atom set enforces maxTrackedQuestions with no provider: S1 flipped, S2, S4 on a bare registry"
    requirement: SWEEP-03
    verification:
      - kind: unit
        ref: "packages/react/test/QadiAtoms.sweep.test.ts#S1 holds the bound with no provider"
        status: pass
    human_judgment: false
  - id: D2
    description: "The book signals on admission past capacity and on a release to zero while over it, never sweeping inside the call"
    requirement: SWEEP-02
    verification:
      - kind: unit
        ref: "packages/react/test/QuestionBook.test.ts#the pressure signal"
        status: pass
    human_judgment: false
  - id: D3
    description: "SweepScheduler.ts coalesces requests into one deferred sweep per episode; one sweeper per atom set; no leaked fibers"
    requirement: SWEEP-02
    verification:
      - kind: unit
        ref: "packages/react/test/SweepScheduler.test.ts#makeSweepScheduler"
        status: pass
      - kind: unit
        ref: "packages/react/test/QadiAtoms.sweep.test.ts#S9 two registries over one atom set"
        status: pass
    human_judgment: false
  - id: D4
    description: "The provider unmount pin returns to the bound"
    requirement: SWEEP-04
    verification:
      - kind: unit
        ref: "packages/react/test/QadiProvider.test.tsx#returns to the bound after the provider unmounts"
        status: pass
    human_judgment: false
  - id: D5
    description: "The registry timings the trigger relies on are canaried"
    requirement: SWEEP-05
    verification:
      - kind: unit
        ref: "packages/react/test/v4-reactivity-smoke.test.ts (four new pins)"
        status: pass
    human_judgment: false
  - id: D6
    description: "SweepScheduler.ts is under Stryker with no survivor; QuestionBook.ts is above its base"
    requirement: WX-05
    verification:
      - kind: other
        ref: "pnpm exec stryker run stryker.react.mjs --mutate SweepScheduler.ts,QuestionBook.ts"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-11-12
status: complete
---

# Phase 35 Plan 04: The Atom Set Sweeps Its Own Question Book Summary

**The question book signals pressure, a one-shot yieldNow-first coalescer in SweepScheduler.ts sweeps once per episode, and the atom set wires them, so maxTrackedQuestions holds on a bare registry with no provider.**

## Spike lines honoured

`35-SPIKE.md` Conclusion: `Winner: candidate-1`, `Admission trigger: kept`, `Release guard (entry.inBook): kept`. Executed as written: `admit` ends with `if (order.length > capacity) signal?.()`; the release signals on `entry.liveCount === 0 && entry.inBook && order.length > capacity`. No opposite-assertion variants of B2/B5/B6 and S4 asserts the bound for never-read admissions (2, q4 and q5).

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 (tracer) | `62897527` | feat(35-04): the atom set sweeps its own question book |
| 2 | `b8c9a2e2` | test(35-04): the book's pressure signal and the sweep scheduler |
| 2 | `0d826f05` | chore(35-04): mutate the sweep scheduler |
| 3 | `83d5ade6` | test(35-04): the atom set's own sweep on a bare registry, and the registry timings it relies on |

`commits: 4` measured from `plan_head_before` to `plan_head_after`. Every message ends with the `Co-Authored-By: Claude Opus 5.5` trailer.

## The two flips, as committed

- **S1** (`QadiAtoms.sweep.test.ts`): title `S1 with no provider nothing sweeps: released readers leave the book over the bound` became `S1 holds the bound with no provider: released readers are swept back to it`. The node-removal wait, the 50 ms wait and the final `toBe(5)` plus the `toEqual(policies)` became `vi.waitFor(() => expect(atoms.asked().length).toBe(2))` and `toEqual(policies.slice(3))` (q4 and q5). The header's why was rewritten.
- **Unmount pin** (`QadiProvider.test.tsx`): title `stops sweeping once the provider unmounts` became `returns to the bound after the provider unmounts`; the first comment was rewritten; the synchronous `toBe(2)` stays; the "No provider is mounted" comment, the 50 ms wait and the second `toBe(2)` became `await waitFor(() => expect(bounded.asked().length).toBe(1))`.

## Test results

- Whole react project after Task 1: `Test Files  28 passed (28)`, `Tests  442 passed (442)`.
- `QuestionBook.test.ts` + `SweepScheduler.test.ts`: `Tests  35 passed (35)` (B1..B8 and C1..C10 added).
- `QadiAtoms.sweep.test.ts` + `v4-reactivity-smoke.test.ts`: `Tests  32 passed (32)` (S2..S9 and four smoke pins added).
- Whole react project at the end: `Test Files  29 passed (29)`, `Tests  472 passed (472)`.
- `pnpm typecheck`, `pnpm lint` (house-style `484 file(s) clean (3 declared switch(es))`), `pnpm circular` (no cycle): exit 0. The oxlint warnings printed are pre-existing; the two in `v4-reactivity-smoke.test.ts` (`_` parameter) are on lines the existing pins already carried.
- e2e (`pnpm build && pnpm --filter @qadi/example-nextjs build && pnpm --filter @qadi/example-nextjs test:e2e`): `30 passed (8.1s)`, against 35-SPIKE.md's base of `30 passed (7.2s)`. Log: `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/13b3a680-6983-4c4f-9cad-4ed79d71ff4f/scratchpad/35-04-e2e.log`.

## S9's measured counts

Two registries over one atom set at bound 2, six questions, all six unmounted in one span: synchronously forks 0, sweeps 0, `asked()` 6; after one `Effect.yieldNow` turn forks 1, sweeps 0; after a settle forks 1, sweeps 1, `sweepsAtFork` `[0]`, `askedAtFork` `[6]`, the policies listed q5, q6. This is the model in 35-VALIDATION.md on this machine, so no deviation is recorded.

## Stryker (SweepScheduler.ts and QuestionBook.ts)

Run alone, in the background (`pnpm exec stryker run stryker.react.mjs --mutate 'packages/react/src/SweepScheduler.ts,packages/react/src/QuestionBook.ts'`), exit 0, 103 killed, 3 survived, 0 no coverage:

- `SweepScheduler.ts`: **100.00%** (18 killed, 0 survived, 0 no coverage). No survivors file is needed, so `35-mutation-survivors.json` was not created.
- `QuestionBook.ts`: **96.59%** (85 killed, 3 survived), above its base of 0.9444. The three survivors are the base's own: line 108 `inBook = true` (BooleanLiteral) and line 169 `if (excess <= 0) return;` (ConditionalExpression and EqualityOperator). The base's survivor at `entry.inBook = true` in `admit` is now killed by B6.
- The verify script (`reports/mutation-react/mutation.json` newer than every file under `packages/react/src` and `packages/react/test` at the time it ran, before Task 3's edits) printed nothing and exited 0. Log: `.../scratchpad/35-04-stryker.log`.

## Deviations from Plan

None - plan executed exactly as written.

The plan says Task 2's `chore(35-04)` config commit comes before running Stryker, and Task 3's tests were written after the Stryker report; the report is therefore older than Task 3's test files, which was the order the plan's own tasks imply.

## Known Stubs

None.

## Threat Flags

None. No new network endpoint, auth path or file access; the new module is package-private and out of the barrel.

## Issues Encountered

None.

## Self-Check: PASSED

- Created files exist: `SweepScheduler.ts`, `SweepScheduler.test.ts`, `support/settle.ts`, `support/sweepCounter.ts`.
- Commits `62897527`, `b8c9a2e2`, `0d826f05`, `83d5ade6` are ancestors of HEAD; `git status --porcelain -- packages` is empty; `.planning/config.json` and `.planning/state.json` were never staged.
