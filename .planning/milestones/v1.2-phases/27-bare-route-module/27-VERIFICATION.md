---
phase: 27-bare-route-module
verified: 2026-11-11T15:45:00Z
status: passed
score: 12/12 must-haves verified
covered_files:
  - ".planning/phases/27-bare-route-module/27-01-PLAN.md"
  - ".planning/phases/27-bare-route-module/27-01-SUMMARY.md"
  - ".planning/phases/27-bare-route-module/27-02-PLAN.md"
  - ".planning/phases/27-bare-route-module/27-02-SUMMARY.md"
  - ".planning/phases/27-bare-route-module/27-03-PLAN.md"
  - ".planning/phases/27-bare-route-module/27-03-SUMMARY.md"
  - "packages/http/src/GuardRoute.ts"
  - "packages/http/src/PermissionRegistry.ts"
  - "packages/http/src/PermissionRegistryRoute.ts"
  - "packages/http/src/UnguardedRoute.ts"
  - "packages/http/src/index.ts"
  - "packages/http/test/GuardRoute.tst.ts"
covered_digest: "v4:sha256:f2de3f9777af0354177643808054f7b41d3a98a4191f9a2d666bb099964fdd5c"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 27: Bare-route module Verification Report

**Phase Goal:** `addGuardedRoute` is the one bare-route seam: its typing rule is pinned on the public function, and the route-method union is stated once.
**Verified:** 2026-11-11
**Status:** passed
**Re-verification:** No, initial verification

## Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1: `GuardRoute.tst.ts` pins `CurrentSubject` exclusion, the error channel and the method union on `addGuardedRoute` | VERIFIED | `packages/http/test/GuardRoute.tst.ts` imports `addGuardedRoute` from `../src/GuardRoute.ts` and has 8 tests. Handler `Requires<>` is `never` for both overloads. A loader needing `CurrentSubject` leaves `From<"Requires", CurrentSubject>`. A handler that may deny yields `ErrorMarkers` of `never`, with a positive control on the same extract. `Parameters<typeof addGuardedRoute>[0]` equals `UnguardedRouteSpec["method"]`. `pnpm exec tstyche packages/http/test/GuardRoute.tst.ts`: 8 tests and 12 assertions passed. |
| 2 | SC2: `guardRoute` is gone and the public surface is unchanged | VERIFIED | The grep of `packages/*/src`, `packages/*/test`, `spec`, `features` and `scripts` finds only change history, "removed" notes and `check-package-install.mjs`'s list of names that must stay absent. There is no `guardRoute` or `buildGuardedRoute` declaration or live call. `pnpm spec:api` reports 906 exports documented. The barrel gained `export * from "./GuardRoute.ts"` and `"./PermissionRegistryRoute.ts"` and lost nothing. The base exports of `PermissionRegistry.ts` equal the union of the new `PermissionRegistry`, `PermissionRegistryRoute` and `GuardRoute` exports, except `addGuardedRoute`'s overload lines. The types in `GuardRoute.ts` (`GuardedHandler`, `GuardedRoute`) are not exported. |
| 3 | SC3: `pnpm circular` is green with `/__permissions` in `PermissionRegistryRoute.ts` | VERIFIED | `pnpm circular`: "No circular dependency found" (209 files). `permissionRegistryRoute` and `permissionRegistryRouteUnguarded` are in `PermissionRegistryRoute.ts`. Import chain: `PermissionRegistryRoute` to `GuardRoute` to `PermissionRegistry`. |
| 4 | `addGuardedRoute` is declared once, with both overloads, in `GuardRoute.ts` | VERIFIED | Lines 112-135: two overload signatures plus one implementation. No other declaration exists. |
| 5 | `RouteMethod` is declared once, in package-private `UnguardedRoute.ts`, and is not in the barrel | VERIFIED | `UnguardedRoute.ts:53`. The only other use is a type import in `GuardRoute.ts`. The grep for the literal union in `packages/http/src` finds one hit. `index.ts` has no `UnguardedRoute` export. |
| 6 | `PermissionRegistry.ts` holds only the registry; no `/__permissions` re-export left behind | VERIFIED | 83 lines: descriptor types, `PermissionRegistry`, `PermissionRegistryLive`. The header comment records that the routes moved. No re-export. |
| 7 | Enforcement order and fail-closed behaviour preserved | VERIFIED | `GuardRoute.ts:140` still calls `enforceRequest({permission, policy, loadResource}, answerWithResponse, handler)(request)` inside `HttpRouter.add`, plus `Layer.effectDiscard(PermissionRegistry.register(...))`. `pnpm vitest run --project http`: 14 files and 304 tests passed. The orchestrator ran the full suite (4582) and `check:pr` earlier. |
| 8 | BEH-QD-470, CCR-QD-417, the ADR-036 amendment and the changeset exist | VERIFIED | BEH-QD-470 is at `spec/behaviors/23-http.md:824`. CCR-QD-417 is at `spec/README.md:355`. ADR-036 Rev 1.10 has an amended note at line 332. `.changeset/bare-route-module.md` is `@qadi/http: patch`. `node scripts/spec-revise.mjs --check` is green. |
| 9 | WX-03: overview names exports; gate 13 | VERIFIED | `spec/overview.md` rows for `addGuardedRoute` and the `/__permissions` routes are re-pointed to the new files. `pnpm spec:api` is green. |
| 10 | WX-04: no new forbidden constructs; no gate or budget edits | VERIFIED | The grep of the four touched src files for `any`, `switch`, `fnUntraced`, `console`, `process.env`, `async` and casts finds only import lines. `git diff b1e2b1d7 HEAD` over `scripts`, `.github`, root and package `package.json` and config files is empty. Files changed outside `.planning`, `spec`, `packages/http` and the changeset are 3 comment-only edits in `packages/core` (`Errors.ts` and the two `.tst.ts` files). |
| 11 | WX-05: per-file mutation not lower than base | VERIFIED | `27-mutation-base.json` against `27-mutation-after.json`: every shared file is the same or higher. `AuthorizeRequest.ts` rose from 0.9 to 1, and the aggregate from 0.9856 to 1. The new `PermissionRegistryRoute.ts` is 1. I did not re-run Stryker, per instructions; this reads the recorded files. |
| 12 | WX-01, WX-02, WX-06 | VERIFIED | The orchestrator reported `check:pr` exit 0 at the end of 27-03. WX-02: ADR-QD-139 is recorded as unused (roadmap), CCR-QD-417 and BEH-QD-470 are present. WX-06: no defect fix in this phase; it is a refactor with pins that were green on the base (27-01). |

**Score:** 12/12

## Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| ROUTE-01 | SATISFIED, with a recorded deviation | One module (`GuardRoute.ts`) owns `addGuardedRoute`, which absorbed `guardRoute`. `RouteMethod` is written once. Deviation: `unguardedRoutes` stays in the sibling `UnguardedRoute.ts`, not in the same module, for barrel purity (package-private, ADR-QD-099). `RouteMethod` lives there and `GuardRoute.ts` imports it as a type. This is a locked decision in 27-CONTEXT.md, recorded in CCR-QD-417 and the ADR-036 Rev 1.10 amendment. The intent, one seam and one method union, is met. |
| ROUTE-02 | SATISFIED | Truth 1. |
| ROUTE-03 | SATISFIED, with a recorded deviation | `PermissionRegistry.ts` keeps only the registry. `/__permissions` is not in it: it moved to `PermissionRegistryRoute.ts` to break an import cycle (ADR-QD-037). The requirement text says the registry module keeps `/__permissions`; the roadmap SC3 already states the delivered shape. The public surface is unchanged and the overview and changeset are updated. |
| WX-01 to WX-06 | SATISFIED | Truths 7 to 12. |

No orphaned requirements.

## Anti-Patterns

None blocking. No TBD, FIXME or XXX in the touched src files. Review state: 0 critical, 0 warning and 2 info (IN-01 and IN-02, comment wording in `GuardRoute.ts`), both open and non-blocking.

## Gaps Summary

None. The phase goal is achieved in the code. The only deviations are the two wording differences in ROUTE-01 and ROUTE-03, which are locked decisions and recorded. The orchestrator should annotate REQUIREMENTS.md as planned.

Minor note: the method-union pin compares the loose and closed forms for agreement (`Parameters<typeof addGuardedRoute>[0]` equals `UnguardedRouteSpec["method"]`). It does not enumerate the literal members. That is sufficient for "stated once", since one declaration feeds both.

---

_Verified: 2026-11-11_
_Verifier: Claude (gsd-verifier)_
