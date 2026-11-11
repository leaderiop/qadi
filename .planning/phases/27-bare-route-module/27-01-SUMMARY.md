---
phase: 27-bare-route-module
plan: 01
subsystem: testing
tags: [tstyche, effect-http, stryker, vitest, type-tests]

requires:
  - phase: 26-headless-dock-model
    provides: closed phase base (b1e2b1d7)
provides:
  - per-file Stryker baseline for the nine packages/http/src files phase 27 changes (27-mutation-base.json)
  - CurrentSubject and closed-error-channel type pins on the public addGuardedRoute
  - type pin that addGuardedRoute's method parameter equals UnguardedRouteSpec's method
  - subject-before-loader ordering runtime test mounted through addGuardedRoute
affects: [27-02, 27-03]

actuals:
  tokens: 4500
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Type-test a layer's requirement/error facts by extracting HttpRouter.Request.From<kind, T> markers from Layer.Services, with a positive control over a declared union"

key-files:
  created:
    - .planning/phases/27-bare-route-module/27-mutation-base.json
  modified:
    - packages/http/test/GuardRoute.tst.ts
    - packages/http/test/http.test.ts

key-decisions:
  - "No defect in this phase (D-01): every new or retargeted test is green on the phase base, so there is no RED commit"
  - "Dropped the now-unused guardRoute import from http.test.ts in this plan (the plan said leave it) because noUnusedLocals fails pnpm typecheck"

patterns-established:
  - "Pin a typing rule on the public function callers use, not the private shim it wraps"

requirements-completed: [ROUTE-02, WX-02, WX-05, WX-06]

duration: 11min
completed: 2026-11-11
status: complete
plan_head_before: b1e2b1d7460f8a27c76e3ebf72098e358151835c
plan_head_after: 49c2b064ea433748b88fad3769cc8898b15e9b4f
---

# Phase 27 Plan 01: Tests at the seam this phase keeps Summary

**The CurrentSubject exclusion, the closed error channel and the route-method agreement are now type-tested on the public `addGuardedRoute` (with a positive control), the ordering test runs through it, and a fresh nine-file Stryker baseline is committed first; no src change.**

## Performance

- **Duration:** about 11 min (Stryker run 29 s)
- **Completed:** 2026-11-11T14:02Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 edited; no packages/http/src file)

## Accomplishments

- Phase base recorded: `b1e2b1d7460f8a27c76e3ebf72098e358151835c`. Preconditions held: phase 26 closed (every PLAN has a SUMMARY), no `(27-0` commit existed before this plan.
- Reserved-number check at the phase base (grep over spec, packages, .changeset, AGENTS.md, excluding /lib/): **no output** for each of `ARCH-75`, `ADR-QD-139`, `CCR-QD-417`, `BEH-QD-470`, `BEH-QD-471`, `BEH-QD-472`, `BEH-QD-473`, `BEH-QD-474`, `INV-QD-298`, `INV-QD-299`. `ls spec/decisions | grep '^139-'` printed nothing. `scripts/next-id.mjs` was not run.
- Line facts in 27-CONTEXT.md still hold on GuardRoute.ts, PermissionRegistry.ts and UnguardedRoute.ts: `guardRoute` is at `GuardRoute.ts:58` with the one caller at `PermissionRegistry.ts:106`; the method union is written at `PermissionRegistry.ts:90` and `UnguardedRoute.ts:48`. No drift.
- Mutation baseline (fresh Stryker run, `reports/mutation-http/mutation.json` regenerated; the earlier partial report was not reused). Score is detected (Killed + Timeout) over detected + Survived + NoCoverage:

| File | Score | Mutants (Killed / Survived / Ignored) |
| ---- | ----- | ------------------------------------- |
| GuardRoute.ts | 1 | 4 / 0 / 1 |
| PermissionRegistry.ts | 1 | 30 / 0 / 7 |
| UnguardedRoute.ts | 1 | 11 / 0 / 1 |
| PortRoutes.ts | 1 | 33 / 0 / 9 |
| DecisionStreamRoute.ts | 1 | 32 / 0 / 2 |
| DecisionBacklogRoute.ts | 1 | 9 / 0 / 1 |
| DevtoolsRoutes.ts | 1 | 0 / 0 / 1 (no scoreable mutant; the script scores an empty file 1) |
| AuthorizeRequest.ts | 0.9 | 18 / 2 / 3 |
| NoResource.ts | 1 | 0 / 0 / 1 (no scoreable mutant; scored 1) |
| **aggregate (nine)** | **0.9856115107913669** | 137 detected of 139 |

- `GuardRoute.tst.ts` gained four tests on `addGuardedRoute`: handler's CurrentSubject discharged (three- and four-argument forms), loader's CurrentSubject not discharged, no `"Error"` request marker for a handler that may deny (with a positive control over a declared `Error | Requires` union yielding exactly the `Error` marker), and `Parameters<typeof addGuardedRoute>[0]` equals `UnguardedRouteSpec<never, never>["method"]`.
- `http.test.ts`'s ordering test is renamed "addGuardedRoute extracts the subject BEFORE loading the resource..." and mounts `addGuardedRoute("GET", "/order-check", ...)` with `PermissionRegistryLive` in the layer; it still asserts 502 and zero loads. The old `guardRoute` tests in `GuardRoute.tst.ts` are untouched (27-02 deletes them).

## Task Commits

1. **Task 1: reserved numbers and mutation baseline** - `d28c2841` (chore; JSON only, touches nothing under packages/ or spec/)
2. **Task 2: type pins and ordering test on addGuardedRoute** - `49c2b064` (test)

**Plan metadata:** the docs commit that carries this file and the STATE/ROADMAP update.

## Files Created/Modified

- `.planning/phases/27-bare-route-module/27-mutation-base.json` - per-file baseline for the nine files plus `__aggregate__`
- `packages/http/test/GuardRoute.tst.ts` - four addGuardedRoute pins and a header paragraph (ARCH-75)
- `packages/http/test/http.test.ts` - ordering test retargeted to `addGuardedRoute`; unused `guardRoute` import removed

## Decisions Made

- No RED: nothing changes behaviour (D-01), and the rule holds on the public function at the phase base, so the new tests are green on first run. No finding to report.
- The error-marker pin and its control passed on the phase base, so the effect assumption (`Request<Kind, T>` carries `kind`) holds on effect 4.1.2.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed the unused `guardRoute` import from http.test.ts**
- **Found during:** Task 2
- **Issue:** The plan said to leave the import in place. After retargeting the ordering test nothing in `http.test.ts` reads it, so `pnpm typecheck` failed with `TS6133: 'guardRoute' is declared but its value is never read`, and oxlint warned `no-unused-vars`. Typecheck is a required gate for this plan.
- **Fix:** Deleted the one import line. `GuardRoute.ts` still exports `guardRoute` (its removal is 27-02's job), so no later plan depends on this import. **27-02's step that removes the `guardRoute` import from `http.test.ts` is now a no-op.**
- **Files modified:** packages/http/test/http.test.ts
- **Verification:** `pnpm typecheck` clean, `pnpm vitest run --project http` 302 passed, `pnpm lint:style` clean
- **Committed in:** 49c2b064

**2. [Rule 1 - Bug in my test code] `Layer.Any` constraint on the two helper types**
- **Found during:** Task 2, first tstyche run (ts2208 on `Layer.Services<L>`)
- **Fix:** `type Requires<L extends Layer.Any>`, `type ErrorMarkers<L extends Layer.Any>`. Not a finding about the rule; the pins themselves were unchanged. Fixed before the test commit.

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 test-authoring)
**Impact on plan:** None on scope; one line of work moved from 27-02 to 27-01.

## Issues Encountered

None beyond the deviations. Pre-existing lint warnings in unrelated files (`react`, `devtools`, `features/`, `scripts/check-house-style.mjs:834`) are out of scope and untouched.

## TDD Gate Compliance

The plan is `type: tdd` but D-01 declares no defect, so there is no RED: the new tests pass on the phase base. The `test(27-01)` commit (`49c2b064`) holds them; there is no `feat(27-01)` commit by design (no src change). This is the intended shape, not a gate violation.

## Verification run

- `pnpm exec tstyche packages/http/test/GuardRoute.tst.ts packages/http/test/PermissionRegistry.tst.ts`: 11 passed (3 guardRoute + 4 new + 4 PermissionRegistry), 15 assertions.
- `pnpm vitest run --project http packages/http/test/http.test.ts`: 29 passed. Full `pnpm vitest run --project http`: 302 passed.
- `pnpm test:tstyche`: 233 passed. `pnpm typecheck`: clean. `pnpm lint`: no new warnings; `pnpm lint:style`: 454 files clean.
- No `packages/http/src` file differs from the phase base; the baseline commit touches nothing under packages/ or spec/.

## Known Stubs

None.

## Threat Flags

None. T-27-01 (an over-wide Exclude hiding a loader's CurrentSubject) is mitigated by the loader-not-discharged pin; T-27-02 by leaving the guardRoute tests in place.

## Next Phase Readiness

Ready for 27-02. It can now delete `guardRoute` with the `addGuardedRoute` pins already guarding the result. It should re-point `GuardRoute.tst.ts`'s `addGuardedRoute` import from `../src/PermissionRegistry.ts` to `../src/GuardRoute.ts`, and skip removing the `http.test.ts` `guardRoute` import (already gone).

---
*Phase: 27-bare-route-module*
*Completed: 2026-11-11*
