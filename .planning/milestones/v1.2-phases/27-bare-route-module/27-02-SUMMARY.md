---
phase: 27-bare-route-module
plan: 02
subsystem: api
tags: [effect-http, httprouter, refactor, type-tests, tstyche, madge]

requires:
  - phase: 27-bare-route-module
    provides: addGuardedRoute type pins, the ordering test and the nine-file Stryker baseline (27-01)
provides:
  - addGuardedRoute written once in GuardRoute.ts (both overloads, one body), guardRoute and buildGuardedRoute gone
  - RouteMethod, the one statement of the bare-route method union, in UnguardedRoute.ts
  - PermissionRegistry.ts holding only the registry; the /__permissions routes in PermissionRegistryRoute.ts
  - spec/overview.md rows naming the new sources, no row naming guardRoute (Rev 1.94)
affects: [27-03]

actuals:
  tokens: 32000
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A route module that writes to a service lives beside, not inside, the service's module, so the import graph stays acyclic"
    - "An overload's layer type is named by instantiating HttpRouter.add (typeof HttpRouter.add<E, R>) rather than by a throwaway builder"

key-files:
  created:
    - packages/http/src/PermissionRegistryRoute.ts
  modified:
    - packages/http/src/GuardRoute.ts
    - packages/http/src/PermissionRegistry.ts
    - packages/http/src/UnguardedRoute.ts
    - packages/http/src/index.ts
    - packages/http/src/PortRoutes.ts
    - packages/http/src/DecisionStreamRoute.ts
    - packages/http/src/DecisionBacklogRoute.ts
    - packages/http/src/DevtoolsRoutes.ts
    - packages/http/src/AuthorizeRequest.ts
    - packages/http/src/NoResource.ts
    - packages/http/test/GuardRoute.tst.ts
    - packages/http/test/PortRoutes.test.ts
    - packages/http/test/decisionStream.test.ts
    - packages/http/test/decisionBacklog.test.ts
    - packages/http/test/v4-http-smoke.test.ts
    - packages/http/test/QadiHttpError.test.ts
    - spec/overview.md
  deleted:
    - packages/http/test/PermissionRegistry.tst.ts

key-decisions:
  - "The overload return type is a module-private GuardedRoute<R, LR> alias built from typeof HttpRouter.add<never, ...> and Layer.Services; no second function exists only for its type"
  - "PermissionRegistry.tst.ts's four overload pins moved into GuardRoute.tst.ts (one type-test file per module) and the old file was deleted"

patterns-established:
  - "Pin a typing rule on the public function, in the test file named for the module that declares it"

requirements-completed: [ROUTE-01, ROUTE-02, ROUTE-03, WX-03, WX-04]

duration: 7min
completed: 2026-11-11
status: complete
plan_head_before: 538edb713a5077b4538b609df14ad595fbe5269b
plan_head_after: 496f7dd685827989e877ae0ec97bacc781edd2d8
---

# Phase 27 Plan 02: addGuardedRoute written once Summary

**`guardRoute` is deleted and `addGuardedRoute` is the one bare guarded route constructor in `GuardRoute.ts`; the route-method union is stated once; `PermissionRegistry.ts` holds the registry only and the `/__permissions` routes are in `PermissionRegistryRoute.ts`; no export, path, status or log line changed.**

## Performance

- **Duration:** about 7 min
- **Started:** 2026-11-11T14:05Z
- **Completed:** 2026-11-11T14:12Z
- **Tasks:** 3
- **Files modified:** 19 changed plus 1 created and 1 deleted (packages/http and spec/overview.md)

## Accomplishments

- `GuardRoute.ts` exports `addGuardedRoute` only: two overloads and one implementation that calls `enforceRequest` and `PermissionRegistry.register` directly. Its doc comment carries both typing contracts `guardRoute`'s did (the closed `HttpEnforcementFailure` channel; the `CurrentSubject` exclusion and the tstyche finding) and keeps the ARCH-19/ARCH-57/ARCH-61 history. `guardRoute` and `buildGuardedRoute` are gone.
- `RouteMethod` is declared once in `UnguardedRoute.ts` and used by `UnguardedRouteSpec.method` and `addGuardedRoute`'s `method`. Non-comment lines in `packages/http/src` containing `"OPTIONS"`: 2 at the phase base, 1 now.
- `PermissionRegistry.ts` declares `EndpointDescriptor`, `PermissionRegistryData`, `PermissionRegistryShape`, `PermissionRegistry`, `PermissionRegistryLive` (and the private `addDescriptor`). `permissionRegistryRoute` and `permissionRegistryRouteUnguarded` live in the new `PermissionRegistryRoute.ts`. `pnpm circular`: no cycle. No re-export was left behind.
- `index.ts` gained `export * from "./GuardRoute.ts"` (between `GuardApi.ts` and `HttpApiMiddlewareClient.ts`) and `export * from "./PermissionRegistryRoute.ts"` (after `PermissionRegistry.ts`). `pnpm spec:api`: 906 exports documented, no drift. `pnpm spec:package`: 9 packages pack and authorize.
- Test changes are import re-points, the deleted `guardRoute` type tests and the moved overload pins only. `GuardRoute.tst.ts` now holds 8 tests (4 from 27-01, 4 moved); `pnpm vitest run --project http`: 302 passed, unchanged from 27-01; `pnpm test:tstyche`: 230 passed (233 at 27-01 minus the 3 deleted `guardRoute` tests).
- Comment sweep (separate commit, comment lines and the overview only): no line in `packages/http` names `guardRoute` as live code, `NoResource.ts` and the smoke canary cite `PermissionRegistryRoute.ts`, and the four overview rows name `GuardRoute.ts` / `PermissionRegistryRoute.ts` and no longer mention `guardRoute`.
- Mutation (Stryker on the four files this plan touches logic in): 100% on all, 44 killed, 0 survived, 0 no-coverage (GuardRoute.ts 6, PermissionRegistry.ts 12, PermissionRegistryRoute.ts 15, UnguardedRoute.ts 11). Every file is at or above its 27-01 baseline; no new survivor to kill. The full nine-file comparison is 27-03's.

### Re-measured baselines

| Measure | Plan's baseline | Re-measured at 538edb71 (start of this plan) | After |
| ------- | --------------- | -------------------------------------------- | ----- |
| non-comment `"OPTIONS"` lines in packages/http/src | 2 | 2 | 1 |
| non-comment `guardRoute =` / `guardRoute(` lines in src | 2 | 2 | 0 |
| non-comment lines in packages/http/test naming `guardRoute` | 10 | 7 (27-01 retargeted the ordering test) | 0 |
| lines in src or test naming `guardRoute` (not `addGuardedRoute`) without a history word | 25 | 22 | 0 |
| non-history lines of spec/overview.md naming `guardRoute` | 3 | 3 | 0 |

### How the overload return type was written

`ReturnType<typeof buildGuardedRoute<...>>` was replaced with a module-private alias in `GuardRoute.ts`:

```ts
type GuardedRoute<R, LR> = Layer.Layer<never, never,
  | PermissionRegistry
  | Layer.Services<ReturnType<typeof HttpRouter.add<never,
      Exclude<R | EvaluationServices, CurrentSubject> | LR | SubjectExtractor>>>>;
```

It is cast-free and needs no second function. The implementation's return type is inferred from `Layer.merge(HttpRouter.add(...), Layer.effectDiscard(...))`, so `enforceRequest`'s own return type is what the exact-services pin checks; the pin (`HttpRouter | PermissionRegistry | Request.From<"Requires", StandingEvaluationServices | SubjectExtractor>`) passes.

### Where the `PermissionRegistry.tst.ts` pins ended up

All four (four-argument form hands `Resource`, five-argument form keeps the loader's type, a four-argument handler cannot claim a narrower resource, both forms require exactly the registry + standing services + extractor) are in `GuardRoute.tst.ts`; its header now describes both groups. `PermissionRegistry.tst.ts` is deleted.

### Comments the Task 3 re-grep found beyond the interfaces list

- `DecisionStreamRoute.ts:219` was in the list; `GuardRoute.ts`'s own header (written in Task 1) said "`guardRoute` here and ..." with no history word on the line, so the sweep reworded it to "a `guardRoute` here (since removed)".
- `v4-http-smoke.test.ts:38` ("GuardRoute.ts and PermissionRegistry.ts's `addGuardedRoute` build on") placed `addGuardedRoute` in `PermissionRegistry.ts`; reworded to "GuardRoute.ts's `addGuardedRoute` and PermissionRegistryRoute.ts build on".
- Left alone: `v4-http-smoke.test.ts:106` ("PermissionRegistry.ts's `registerApi`") is a stale pre-existing citation that does not place a moved route; out of scope.

## Task Commits

1. **Tasks 1 and 2 (one commit, the tree does not typecheck between them)** - `11d3ea7a` (refactor)
2. **Task 3: comment and overview sweep** - `496f7dd6` (docs)

**Plan metadata:** the docs commit that carries this file and the STATE/ROADMAP update.

## Files Created/Modified

See the frontmatter `key-files`. The new module is `packages/http/src/PermissionRegistryRoute.ts`; the deleted test is `packages/http/test/PermissionRegistry.tst.ts` (an intended deletion).

## Decisions Made

- The overload layer type is a private alias over `HttpRouter.add`, not a retained `buildGuardedRoute`.
- One type-test file per module: the moved overload pins live in `GuardRoute.tst.ts`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `scripts/spec-revise.mjs` drops its first positional argument when `--date` is absent**
- **Found during:** Task 3 (overview revision)
- **Issue:** the plan's command `node scripts/spec-revise.mjs spec/overview.md "<what>"` prints the usage line and exits 2. The script filters positionals with `index !== dateFlag + 1`, and with no `--date` flag `dateFlag` is -1, so index 0 (the document) is dropped.
- **Fix:** passed `--date 2026-11-11`, which makes the filter correct. The script was not edited (scripts are out of bounds); the defect is reported here.
- **Files modified:** none beyond the intended `spec/overview.md` revision (1.93 to 1.94)
- **Verification:** `node scripts/spec-revise.mjs --check` green
- **Committed in:** 496f7dd6

---

**Total deviations:** 1 auto-fixed (1 blocking, tooling)
**Impact on plan:** none. Also, per the 27-01 handoff, the step that removes the `guardRoute` import from `http.test.ts` was a no-op (27-01 had already removed it).

## Issues Encountered

`pnpm spec:verify:strict` is red after this plan, on two checks that 27-03 already owns, so they are recorded rather than fixed here (the plan did not list `spec/traceability.md` or `spec/README.md`, and 27-03 Task 1 names both edits):

- `§4 test files -> disk: missing: packages/http/test/PermissionRegistry.tst.ts` (`spec/traceability.md:372`; 27-03 retargets that row to `GuardRoute.tst.ts`).
- `CCR register coverage`: drift for `417`, because this plan's prescribed overview Change History entry cites CCR-QD-417 and the register row is 27-03's.

`spec:verify:strict` is not in this plan's gate list. Both clear once 27-03 lands.

## Gates

- `pnpm vitest run --project http` 302 passed; `pnpm test:tstyche` 230 passed; `pnpm typecheck`, `pnpm lint` (no new warnings), `pnpm lint:style` (455 files), `pnpm circular`, `pnpm spec:api`, `pnpm spec:package`, `pnpm spec:examples`, `pnpm spec:gates`, `pnpm spec:claims`, `pnpm test:bdd` all green; `node scripts/spec-revise.mjs --check` green.
- Task verify commands (all four greps, the overview greps, the comment-only diff check from the `refactor(27-02)` commit) pass.

## Known Stubs

None.

## Threat Flags

None. T-27-03 is mitigated: `addGuardedRoute` calls `enforceRequest` exactly as `guardRoute` did and the whole http project ran unedited (besides import lines). T-27-04: `unguardedRoutes` is still package-private and `spec:api` is green. T-27-05: `pnpm circular` green.

## Next Phase Readiness

27-03 owns the spec text (ADR-QD-036 amendment, BEH-QD-470, traceability row retarget, CCR-QD-417 register row, changeset) and the nine-file mutation comparison. The two `spec:verify:strict` failures above go green when it does.

---
*Phase: 27-bare-route-module*
*Completed: 2026-11-11*

## Self-Check: PASSED

Created/changed files exist (`packages/http/src/PermissionRegistryRoute.ts`, `packages/http/src/GuardRoute.ts`, `spec/overview.md`, this file); `packages/http/test/PermissionRegistry.tst.ts` is absent as intended; commits `11d3ea7a` and `496f7dd6` are ancestors of HEAD; `git rev-list --count 538edb71..HEAD` = 2.
