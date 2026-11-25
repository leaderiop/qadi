---
phase: QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime
plan: 04
subsystem: react-registry-lease
tags: [lease, tdd, red-first, react, mutation, match, package-private]
requires: [82-03]
provides:
  - packages/react/src/RegistryLease.ts, a headless package-private lease (`makeRegistryLease`, `RegistryLease`, `LeaseDefer`) over a closed `Unheld | Held | Releasing` union
  - packages/react/test/RegistryLease.test.ts, RL1 to RL9, each recorded red before the module existed
  - stryker.react.mjs mutating RegistryLease.ts, with what a surviving mutant there means
affects: [82-05, 82-06, 82-07, 82-08, 82-09, 82-10]
key-files:
  created:
    - packages/react/src/RegistryLease.ts
    - packages/react/test/RegistryLease.test.ts
  modified:
    - stryker.react.mjs
    - .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-RED-EVIDENCE.md
key-decisions:
  - "The two matchers are built once per lease inside `makeRegistryLease`, not hoisted: a module-scope matcher's arm object is an Ignored mutant under `ignoreStatic: true`, which the absolute mutation bar refuses. Still built once per lease, never per call; no `// Stryker disable`, no object-literal dispatch table"
  - "The state union is three named `type` declarations joined by `type LeaseState = Unheld | Held | Releasing`, not a multi-line `|` union: the phase's `scan-forbidden` reads a module-scope line holding a quote as a static literal and skips only a line that starts with `type`/`interface`"
  - "`cancel` is the only cancellation: `fire` sets `Unheld` and then calls `recycle`, with no second guard; the state is assigned only after `defer` returns, so a throwing defer leaves the lease held and a throwing recycle leaves it unheld and usable"
  - "The default defer is a block-bodied `setTimeout(run, 0)` arrow returning a block-bodied `clearTimeout` arrow, which Stryker's arrow mutator does not touch; RL9 exercises it with a real 10 ms macrotask because an injected defer never runs it"
  - "Decided autonomously: the Stryker header sentence is kept on one line so the stated survivor meaning is greppable as written"
requirements-completed: [LEASE-02, LEASE-03, WX-04, WX-06]
duration: 12min
completed: 2026-11-25
status: complete
commits: 3
plan_head_before: 54c591bd6e08c6323f6513ee21494c6f91c87cf0
plan_head_after: 0d6e55ba3f87b5287c2b01bffd4229a5fd9ec22c
actuals:
  tokens: 3000
  tasks: 2
  commits: 3
---

# Phase QD-82 Plan 04: the registry lease Summary

**A headless, package-private lease that recycles a provider's registry one macrotask after the last release unless it is held again first: a closed `Unheld | Held | Releasing` union dispatched by two `Match.tagsExhaustive` matchers, nine tests seen red before the module existed, and the module under the react mutation gate.**

## Accomplishments

- RED: `RegistryLease.test.ts` (RL1 to RL9) over a defer that really cancels, plus RL9 on the default `setTimeout` defer with a
  real 10 ms macrotask. Every test followed by a further operation so a mutated state shows. All nine failed to load on the
  absent module and are recorded `- red on the base: RLn …` in `82-RED-EVIDENCE.md`, with the failure line and a semantic
  assessment (the cause is the missing module, not a fixture or syntax fault).
- GREEN: `RegistryLease.ts` exports exactly `makeRegistryLease(recycle, defer = timeoutDefer)`, `RegistryLease` (`hold`,
  `release`) and `LeaseDefer`. It imports only `effect/Match`, holds no module-scope `let`, and is not in the barrel. Hold:
  `Unheld` to `Held`, `Held` stays, `Releasing` calls `cancel()` then `Held`. Release: `Held` to `Releasing` with
  `cancel: defer(fire)`, the others stay. All nine pass; oxlint, `check-house-style`, `tsc` on the src project and
  `check-api-surface` (942 exports, equal to the base's line) are clean.
- `stryker.react.mjs` mutates `packages/react/src/RegistryLease.ts`, says a surviving mutant there is a registry released twice,
  never released, or released while held (ADR-QD-195), and names `RegistryLease.test.ts`; thresholds, `ignoreStatic` and the
  report path are unchanged. `82-check.mjs single-owner` now fails with exactly the five provider reasons.
- The full react project reads `15 failed | 659 passed (674)`: the same fifteen reds as at the end of 82-03 (LT1 to LT4, LT6 to
  LT15, the edges unmount test), nine more passes. `QadiProvider.tsx` and `index.ts` equal `phase_base`.

## Task commits

| Task | Commit | Files |
| ---- | ------ | ----- |
| 1 (RED) | e0be9a0e `test(82-04): the registry lease's rule over every state, seen red` | `RegistryLease.test.ts`, `82-RED-EVIDENCE.md` |
| 1 (GREEN) | d7fc1f1e `feat(82-04): a package-private lease decides when a provider's registry is recycled` | `RegistryLease.ts` |
| 2 | 0d6e55ba `chore(82-04): the react mutation run covers the registry lease` | `stryker.react.mjs` |

## Deviations from Plan

None - plan executed exactly as written. Inside the plan's latitude: the state union is written as three named `type`
declarations and a joining `type LeaseState`, because the phase's `scan-forbidden` flags a continuation line of a multi-line
`|` union that holds a quote (it reads it as a module-scope string literal). The reconciliation the plan asked to record is
decision 1 above: the matchers are per lease, inside the builder, because under `ignoreStatic` a hoisted one is an Ignored
mutant and the phase's mutation bar is absolute; they are still not rebuilt per call.

## Authentication Gates

None.

## Known Stubs

None.

## Threat Flags

None. The lease is out of the barrel and the `exports` map is closed; no endpoint, auth path or schema changed.

## TDD Gate Compliance

RED `e0be9a0e` (`test(82-04)`) precedes GREEN `d7fc1f1e` (`feat(82-04)`); no REFACTOR commit was needed.

## Issues Encountered

None. The Stryker run on the new module is 82-09's, not this plan's, so no mutation score is claimed here.

## Next Phase Readiness

Ready for 82-05: the provider moves onto the lease (`hold` in its effect, `release` in the cleanup, one lease per provider),
which is what turns LT1 to LT4, LT6 to LT15 and the edges unmount test green and clears the five remaining `single-owner`
reasons.

## Self-Check: PASSED

- FOUND: `packages/react/src/RegistryLease.ts`, `packages/react/test/RegistryLease.test.ts`, `stryker.react.mjs`, `82-RED-EVIDENCE.md`, this file
- FOUND: commits e0be9a0e, d7fc1f1e, 0d6e55ba on `arch-wave-15`; `git rev-list --count 54c591bd..HEAD` read 3 at the last task commit
- Task 1 verify exit 0 (nine RL passes, nine red lines recorded, three exports, no React import, barrel clean, `Match.tagsExhaustive`, oxlint, house style, api-surface equal, test then feat, `scan-ids`, `scan-forbidden`, `trailers`); Task 2 verify passed up to its `commit` step, which `82-check.mjs commit` then confirmed after the commit
