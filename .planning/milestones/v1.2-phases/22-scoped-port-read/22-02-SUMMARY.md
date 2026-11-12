---
phase: 22-scoped-port-read
plan: 02
subsystem: testing
tags: [tdd, red, tstyche, vitest, stryker, port-access, scoped-read]

requires:
  - phase: 22-scoped-port-read
    provides: "D-02 = A and D-05 = state-once recorded in 22-01-SUMMARY.md"
provides:
  - "Per-file Stryker baseline at the phase base (22-mutation-base.json)"
  - "D-07 missing-resource-id table closed over ScopedPort, RED on the acted and signature rows"
  - "PortAccess.tst.ts: six assertions that no read takes loose strings, RED"
  - "PortAsks.tst.ts: asks on each description and no leaves on the facet, RED"
affects: [22-03, 22-04]

plan_head_before: 673c767279a8c1a4592f5eb2dc21ce44018b503a
plan_head_after: e7c8d96c8c4d98be88ea2d7fc3b17a689f9c58dc

actuals:
  tokens: 3500
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "tstyche negative call pins over Effect-returning functions go through a result-dropping parameter alias, because the Effect language service reports a bare call as a floating effect and tstyche reads that as 'not callable'"

key-files:
  created:
    - packages/core/test/PortAccess.tst.ts
    - packages/core/test/PortAsks.tst.ts
    - .planning/phases/22-scoped-port-read/22-mutation-base.json
  modified:
    - packages/core/test/PortAccess.test.ts

key-decisions:
  - "The negative call pins use a local Params<F> alias (parameters kept, result dropped) instead of calling the read, so they can actually be RED"

requirements-completed: [SCOPE-02, SCOPE-03, SCOPE-04, WX-05, WX-06]

coverage:
  - id: D1
    description: "Mutation baseline recorded per touched src file before any src change"
    requirement: "WX-05"
    verification:
      - kind: other
        ref: "node check that 22-mutation-base.json names PortAccess, Walk, Predicate, PortRemote, RelationshipResolver, SignatureHistory"
        status: pass
    human_judgment: false
  - id: D2
    description: "D-07 table closed over ScopedPort pinning the single port span and MissingResourceId.relation, RED on exactly the acted and signature rows"
    requirement: "SCOPE-02"
    verification:
      - kind: unit
        ref: "packages/core/test/PortAccess.test.ts#a missing resource id still leaves its question on the span (D-07) (2 failed, 61 passed in the file)"
        status: fail
    human_judgment: false
  - id: D3
    description: "No port read can be called with loose strings, RED on the phase base"
    requirement: "SCOPE-03"
    verification:
      - kind: other
        ref: "pnpm exec tstyche PortAccess (6 assertions fail on 'Type is callable with the given arguments')"
        status: fail
    human_judgment: false
  - id: D4
    description: "Each description has asks and the facet has no leaves, RED on the phase base"
    requirement: "SCOPE-04"
    verification:
      - kind: other
        ref: "pnpm exec tstyche PortAsks (6 assertions fail on toHaveProperty)"
        status: fail
    human_judgment: false

duration: 3min
completed: 2026-11-11
status: complete
---

# Phase 22 Plan 02: Scoped port read, tests committed RED Summary

**Mutation baseline recorded and three RED test commits: the D-07 table fails on exactly the acted and signature rows (nested `qadi.requireScopedResourceId` span), and two tstyche files fail on their assertions (six each) while `pnpm typecheck` stays green.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-11-11T02:37:24Z
- **Completed:** 2026-11-11T02:40:00Z
- **Tasks:** 3
- **Files modified:** 4 (3 created, 1 modified); no file under `packages/*/src` changed

## Mutation baseline (phase base `7f64db9a`, `22-mutation-base.json`)

Killed+Timeout over Killed+Timeout+Survived+NoCoverage, per file:

| File | Score |
| ---- | ----- |
| PortAccess.ts | 0.9759 |
| Walk.ts | 0.9431 |
| Predicate.ts | 0.9968 |
| PortRemote.ts | 0.8242 |
| AttributeResolver.ts | 1 |
| RelationshipResolver.ts | 1 |
| DecisionHistory.ts | 1 |
| CustomPredicate.ts | 0.9444 |
| SignatureHistory.ts | 0.96 |

Overall run score 95.70 (999 mutants).

## RED evidence

- **D-07 table** (`PortAccess.test.ts`, describe "a missing resource id still leaves its question on the span (D-07)"): 2 failed, 61 passed in the file. Failing rows: `askActedForResource` (received `["qadi.acted", "qadi.requireScopedResourceId"]`, expected `["qadi.acted"]`) and `askSignature` (received `["qadi.hasSignature", "qadi.requireScopedResourceId"]`, expected `["qadi.hasSignature"]`). `askRelationship` passes. Semantic assessment: both failures are on the new span-name assertion for the intended reason (the nested helper span D-02 = A removes); the existing attribute, `calls` and `nonZero(portCalls)` assertions and the new `relation` assertion pass on all three rows.
- **`PortAccess.tst.ts`**: 5 tests, 6 assertions, all fail with "Type is callable with the given arguments" (askSignature, askRelationship, askActedForResource, askActedAny, readAttribute, askCustom). Compiles; no compile error.
- **`PortAsks.tst.ts`**: 2 tests, 6 assertions, all fail on `toHaveProperty` (five descriptions lack `asks`; the `DecisionHistory` facet has `leaves`). Compiles; no compile error.
- `pnpm typecheck` exit 0; `node scripts/check-house-style.mjs` clean.

## Task Commits

1. **Task 1: baseline and D-07 table RED** - `aa595231` (test)
2. **Task 2: no read takes loose strings, RED** - `78a14584` (test)
3. **Task 3: asks on the description, no leaves on the facet, RED** - `e7c8d96c` (test)

**Plan metadata:** the STATE/ROADMAP close-out commit follows.

## Files Created/Modified

- `packages/core/test/PortAccess.test.ts` - D-07 table is `{ readonly [K in ScopedPort]: Missing }`, each row carries `asked`; asserts span-name list and `MissingResourceId.relation`
- `packages/core/test/PortAccess.tst.ts` - negative call pins for the six reads
- `packages/core/test/PortAsks.tst.ts` - `asks` on each description (five lines), no `leaves` on the facet
- `.planning/phases/22-scoped-port-read/22-mutation-base.json` - per-file baseline

## Decisions Made

- Negative call pins are written against a result-dropping parameter alias (see deviation), not against the read itself.

## Deviations from Plan

**1. [Rule 1 - Bug] `not.toBeCallableWith` on the reads themselves cannot be RED**
- **Found during:** Task 2
- **Issue:** The plan's assertions (`expect(askSignature).type.not.toBeCallableWith(...)`) passed on the phase base. A probe showed even the positive `toBeCallableWith` fails: the Effect language service reports a bare call to an `Effect`-returning function as a floating effect, which tstyche reads as "not callable". A negative pin on the read would therefore be green whatever its parameters were, and could never be red or guard anything.
- **Fix:** `type Params<F> = F extends (...args: infer A) => unknown ? (...args: A) => void : never` keeps the read's parameters and drops its result; the assertions are `expect<Params<typeof askX>>().type.not.toBeCallableWith(...)`. They are RED today and become green when 22-03 changes the parameters. The file header still contains `not.toBeCallableWith`.
- **Files modified:** `packages/core/test/PortAccess.tst.ts`
- **Verification:** `pnpm exec tstyche PortAccess` fails with 6 failed assertions on "Type is callable with the given arguments"; `pnpm typecheck` green.
- **Committed in:** `78a14584`

---

**Total deviations:** 1 auto-fixed (1 bug in the planned test shape)
**Impact on plan:** None on scope or outcome; 22-03's positive pins should use the same `Params` alias.

## TDD Gate Compliance

RED commits `aa595231`, `78a14584`, `e7c8d96c` are present by design; no GREEN commit exists in this plan (22-03 supplies it, per D-06).

## Issues Encountered

None

## Known Stubs

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

22-03 can implement against these tests: it must make the acted and signature D-07 rows pass by removing the nested span, change the reads' parameters so the six call pins turn green, add `PortDescription.asks` on all five descriptions and remove `PortServingFacet.leaves`. The correlation pins and positive call pins are 22-03's to add, using the same `Params<F>` alias.

## Self-Check: PASSED

- FOUND: packages/core/test/PortAccess.tst.ts, packages/core/test/PortAsks.tst.ts, .planning/phases/22-scoped-port-read/22-mutation-base.json
- FOUND commits: aa595231, 78a14584, e7c8d96c (all ancestors of HEAD)

---
*Phase: 22-scoped-port-read*
*Completed: 2026-11-11*
