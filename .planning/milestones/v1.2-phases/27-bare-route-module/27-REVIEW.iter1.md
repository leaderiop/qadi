---
phase: 27-bare-route-module
reviewed: 2026-11-11T00:00:00Z
depth: standard
files_reviewed: 27
files_reviewed_list:
  - .changeset/bare-route-module.md
  - packages/http/src/AuthorizeRequest.ts
  - packages/http/src/DecisionBacklogRoute.ts
  - packages/http/src/DecisionStreamRoute.ts
  - packages/http/src/DevtoolsRoutes.ts
  - packages/http/src/GuardRoute.ts
  - packages/http/src/index.ts
  - packages/http/src/NoResource.ts
  - packages/http/src/PermissionRegistry.ts
  - packages/http/src/PermissionRegistryRoute.ts
  - packages/http/src/PortRoutes.ts
  - packages/http/src/UnguardedRoute.ts
  - packages/http/test/AuthorizeRequest.test.ts
  - packages/http/test/decisionBacklog.test.ts
  - packages/http/test/decisionStream.test.ts
  - packages/http/test/GuardRoute.tst.ts
  - packages/http/test/http.test.ts
  - packages/http/test/PortRoutes.test.ts
  - packages/http/test/QadiHttpError.test.ts
  - packages/http/test/v4-http-smoke.test.ts
  - spec/behaviors/23-http.md
  - spec/decisions/036-qadi-http-package-shape.md
  - spec/decisions/108-a-request-is-enforced-once-through-one-module.md
  - spec/invariants.md
  - spec/overview.md
  - spec/README.md
  - spec/traceability.md
findings:
  critical: 0
  warning: 3
  info: 1
  total: 4
  necessity: 0
status: issues_found
---

# Phase 27: Code Review Report

**Reviewed:** 2026-11-11
**Depth:** standard
**Files Reviewed:** 27
**Status:** issues_found

## Summary

The code change is sound. Enforcement in `addGuardedRoute` is the same pipeline as the removed `guardRoute`: `enforceRequest({permission, policy, loadResource}, answerWithResponse, handler)(request)` inside `HttpRouter.add`, and the registry push is the same `Layer.effectDiscard(PermissionRegistry.register(...))`. The extraction, edge decision, loader, handler order, the 403/502 mapping and the fail-closed behaviour all still live in `AuthorizeRequest.ts`, which this phase touched only in comments. I found no bug and no security defect.

Checked and verified:
- **Typing.** `GuardedRoute<R, LR>` uses `Exclude<R | EvaluationServices, CurrentSubject> | LR | SubjectExtractor`, so a loader's `CurrentSubject` is not discharged and a handler's is. `GuardRoute.tst.ts` pins both directions and the closed error channel. All 46 tstyche files pass, including the type tests moved over from the deleted `PermissionRegistry.tst.ts`.
- **Exports.** The barrel gains only `export * from "./GuardRoute.ts"` and `export * from "./PermissionRegistryRoute.ts"`, in alphabetical order. `GuardRoute.ts` exports only `addGuardedRoute`, and `PermissionRegistryRoute.ts` exports the same two functions as before. `RouteMethod` is exported from the package-private `UnguardedRoute.ts` and is not in the barrel. `pnpm spec:api` reports 906 exports with no drift.
- **Import cycle.** None. `pnpm circular` is clean. The graph is `PermissionRegistryRoute -> GuardRoute -> PermissionRegistry`, with `UnguardedRoute` a leaf.
- **Gates.** `pnpm typecheck`, `pnpm lint:style` and `vitest run packages/http` (304 tests) pass.
- **House rules.** No `as`, `!`, `any`, `switch` or `class` was added. Import style and barrels comply.
- **Span tests.** The two new span-name tests pin `qadi.http.authorizeRequest` and `qadi.http.enforceSubject`. The third span, `qadi.http.enforceRequest`, is already pinned in `GuardApi.test.ts:186`.

All findings below are documentation staleness, which the phase brief asks to be treated as findings. Each is a live statement that names the removed `guardRoute` as if it still existed. None sits in a file listed under `files`, but all are consequences of this phase's removal.

## Warnings

### WR-01: ADR-QD-037's live test table names `guardRoute` as the thing `GuardRoute.tst.ts` pins

**File:** `spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md:95`
**Issue:** The table row for `packages/http/test/GuardRoute.tst.ts` reads "`guardRoute` discharges `CurrentSubject` from a handler's own open `R`...". This is a current-state inventory of permanent type-test files, not change history, so it is exempt under neither the AGENTS.md §15 history rule nor the "removed members" rule. `guardRoute` no longer exists, and the file now pins `addGuardedRoute`. A reader grepping for `guardRoute` lands on a function that is gone. The prose at lines 99 and 169 also calls `GuardRoute.tst.ts` a pin on a finding about `guardRoute`. That part is a historical finding and is acceptable, but the table is not.
**Fix:** Change the row to "`addGuardedRoute` discharges `CurrentSubject` from a handler's own open `R` ... (`guardRoute`, its predecessor, was absorbed by ARCH-75)", and add the Rev bump or an amendment note to the ADR.

### WR-02: Source comments in `@qadi/core` describe `guardRoute` as a live function

**File:** `packages/core/src/Errors.ts:539`, `packages/core/test/Qadi.tst.ts:11`, `packages/core/test/Policy.tst.ts:8`
**Issue:** `Errors.ts:539` says "the middleware reads it from a compile-time endpoint annotation, and `guardRoute` takes it as a layer-construction argument". The two `.tst.ts` header comments cite "`guardRoute`'s `CurrentSubject` discharge" as a sibling test. All three present a removed function as current. Anyone following the pointer finds nothing, and `GuardRoute.tst.ts` is the file that now holds the discharge pin.
**Fix:** Replace `guardRoute` with `addGuardedRoute` in all three. Each is a one-word edit and changes no behaviour.

### WR-03: ADR-QD-046 and ADR-QD-043 body text names `guardRoute` as the live guard

**File:** `spec/decisions/046-a-decision-feed-is-sse-and-guarded.md:48`, `:54`, `:93`; `spec/decisions/043-a-decision-is-computed-from-its-inputs.md:35`, `:126`
**Issue:** The statements are present tense and describe current behaviour:
- ADR-046: "the same `guardRoute` as every other route in the package" (line 48), "`guardRoute` at connect is not enough" (line 54), and "502 because `guardRoute` already says so" (line 93).
- ADR-043: "`guardRoute` in `@qadi/http` loads a resource per request" (line 35) and "`guardRoute`'s resource parameter does what its name says" (line 126).

The phase updated the matching prose in `DecisionStreamRoute.ts` and `spec/invariants.md` (INV-QD-032) to `addGuardedRoute`, but left these decision records. The sources they describe now say something different from them.
**Fix:** Rename to `addGuardedRoute` in these five places. If the project wants decision text frozen, add an ADR-QD-108-style "Note (ARCH-75)" to each instead. Either way, do not leave a present-tense reference to a removed function.

## Info

### IN-01: Ambiguous "the module" in the `addGuardedRoute` doc comment

**File:** `packages/http/src/GuardRoute.ts:79`
**Issue:** "`handler` to the closed `HttpEnforcementFailure` union, which is the one the module accepts". This was written when the function sat beside others in `GuardRoute.ts`. After the move, "the module" is `GuardRoute.ts` itself, but the intended referent is the request-enforcement module, `AuthorizeRequest.ts`. The sentence is now easy to misread.
**Fix:** Write "the one `AuthorizeRequest.ts`'s `enforceRequest` accepts".

---

_Reviewed: 2026-11-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
