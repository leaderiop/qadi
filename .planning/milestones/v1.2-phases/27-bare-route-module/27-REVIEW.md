---
phase: 27-bare-route-module
reviewed: 2026-11-11T00:00:00Z
depth: standard
files_reviewed: 33
files_reviewed_list:
  - .changeset/bare-route-module.md
  - packages/core/src/Errors.ts
  - packages/core/test/Policy.tst.ts
  - packages/core/test/Qadi.tst.ts
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
  - spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md
  - spec/decisions/043-a-decision-is-computed-from-its-inputs.md
  - spec/decisions/046-a-decision-feed-is-sse-and-guarded.md
  - spec/decisions/108-a-request-is-enforced-once-through-one-module.md
  - spec/invariants.md
  - spec/overview.md
  - spec/README.md
  - spec/traceability.md
findings:
  critical: 0
  warning: 0
  info: 2
  total: 2
  necessity: 0
status: issues_found
---

# Phase 27: Code Review Report

**Reviewed:** 2026-11-11
**Depth:** standard
**Files Reviewed:** 33
**Status:** issues_found

## Summary

Iteration 2 re-review. The three iteration-1 warnings are resolved, none of the fixes introduced a regression, and the full phase diff (`b1e2b1d7..HEAD`) shows nothing iteration 1 missed. Two Info items remain: the carried-forward IN-01 and one new wording blemish.

**Fix verification (each against its `git show`):**
- **WR-01 (`82895714`)** is fixed. ADR-QD-037's `GuardRoute.tst.ts` table row now names `addGuardedRoute` and records that it absorbed `guardRoute`. Revision went 1.3 to 1.4, and the Change History entry is prepended. The `guardRoute` mentions left in the ADR body are historical findings.
- **WR-02 (`f304bbc0`)** is fixed. `Errors.ts:539`, `Qadi.tst.ts:11` and `Policy.tst.ts:8` are one-word renames. The claim in `Errors.ts` stays true: `addGuardedRoute` takes the policy as a layer-construction argument. The lines stay within the hand-wrap style.
- **WR-03 (`a4be4995`)** is fixed. ADR-QD-043 (lines 35 and 126) and ADR-QD-046 (lines 48, 54 and 93) now name `addGuardedRoute`. Each statement is true of the code. `decisionStreamRoute`, `decisionBacklogRoute`, `permissionRegistryRoute` and `portRoutes` all go through `addGuardedRoute`, and the 403/502 mapping lives in the `AuthorizeRequest.ts` pipeline it calls. Revisions were bumped (043: 1.1 to 1.2, 046: 1.4 to 1.5), and `node scripts/spec-revise.mjs --check` is green.

**Whole-phase re-check:**
- **Behaviour.** `addGuardedRoute` still calls `enforceRequest({permission, policy, loadResource}, answerWithResponse, handler)(request)` inside `HttpRouter.add`. It still pushes the registry descriptor through `Layer.effectDiscard(PermissionRegistry.register(...))`. The removed `buildGuardedRoute` and `guardRoute` added nothing the merged form drops.
- **Typing.** The `GuardedRoute<R, LR>` alias keeps `Exclude<R | EvaluationServices, CurrentSubject> | LR | SubjectExtractor`, so the loader's `CurrentSubject` stays undischarged. The implementation signature's `Resource`-typed loader is compatible with all three overloads.
- **Barrel.** `GuardRoute.ts` and `PermissionRegistryRoute.ts` are added alphabetically. `RouteMethod` stays out of the barrel, in the package-private `UnguardedRoute.ts`.
- **Import cycle.** None. `PermissionRegistryRoute -> GuardRoute -> PermissionRegistry`, with `UnguardedRoute` a leaf.
- **Tests.** The `http.test.ts` rewrite adds `PermissionRegistryLive` to the layer, as `addGuardedRoute` now requires. The `AuthorizeRequest.test.ts` span tests assert on the span names ADR-QD-051 treats as product observability.
- **House rules.** No `as`, `!`, `any`, `switch` or class was added. Import style is correct.
- **Stale references.** A repo-wide grep for `guardRoute` outside `.planning` and `reports` finds only:
  - change-history rows
  - changesets and `CHANGELOG`
  - blockquoted amendments
  - deliberate "was removed" statements in `23-http.md`, ADR-036 and ADR-108
  - the removal check in `check-package-install.mjs`
  - the `GuardRoute.ts` and `GuardRoute.tst.ts` header comments, which say "since removed"
  
  All are exempt or accurate. `PermissionRegistry.ts` references in `overview.md` (lines 609 and 625) match what the file now holds. Remaining `PermissionRegistry.ts` mentions: the `stryker.http.mjs` comment and the `v4-http-smoke.test.ts:106` `registerApi` citation are the known out-of-scope items.

## Info

### IN-01: Ambiguous "the module" in the `addGuardedRoute` doc comment (carried forward from iteration 1)

**File:** `packages/http/src/GuardRoute.ts:83-84`
**Issue:** "`handler` to the closed `HttpEnforcementFailure` union, which is the one the module accepts". The sentence predates the move. "The module" now reads as `GuardRoute.ts` itself, when the intended referent is `AuthorizeRequest.ts`'s `enforceRequest`. Not resolved.
**Fix:** Write "which is the one `AuthorizeRequest.ts`'s `enforceRequest` accepts".

### IN-02: Garbled word in the moved overload paragraph

**File:** `packages/http/src/GuardRoute.ts:73-75`
**Issue:** "ARCH-19's progress log recorded "no cast-free way" ... ; lost ARCH-57's probe (`4b1ed49`) refuted that". "lost" reads as a typo, probably "later" or "last". The text was moved verbatim from `PermissionRegistry.ts` rather than introduced here, but this phase made `GuardRoute.ts` its home, so it is cheap to fix now.
**Fix:** Replace "lost" with "later".

---

_Reviewed: 2026-11-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
