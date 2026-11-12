# Phase 27: One bare-route module in `@qadi/http` - Context

**Gathered:** 2026-11-11
**Status:** Ready for planning
**Ticket:** ARCH-75 · 2026-11-11 review candidate #7
**Read first:** `.planning/phases/_SHARED-CONTEXT.md`, then `.planning/phases/_WAVE7-CONTEXT.md` (base `965ff14c`, numbering row 27)
**Runs after:** Phases 21–26 (strict numeric order). None of them is planned to touch `packages/http/src/{GuardRoute,PermissionRegistry,UnguardedRoute}.ts`;
every plan still re-reads those three files at its phase base before editing.

<domain>
## Phase Boundary

`@qadi/http` has a private one-caller shim, `guardRoute`, between the public `addGuardedRoute` and the request-enforcement
module, and the `CurrentSubject` typing rule that matters to callers is documented and type-tested on that shim rather than
on the public function. After this phase `addGuardedRoute` is written once, in `GuardRoute.ts`, with `guardRoute`'s body and
contract absorbed; the type tests pin the rule on `addGuardedRoute`; the bare-route method union is stated once;
`PermissionRegistry.ts` holds the registry and nothing else; the two `/__permissions` route constructors move to their own
module beside `DecisionStreamRoute.ts` and `DecisionBacklogRoute.ts`. No export is added or removed, and no path, status, log
line or type a caller can name changes.
</domain>

<evidence>
## Evidence (re-verified by reading at `965ff14c`, 2026-11-11)

- `packages/http/src/GuardRoute.ts` (83 lines): `guardRoute(permission, policy, loadResource)(handler)(request)` at :58-83 is
  `enforceRequest({ permission, policy, loadResource }, answerWithResponse, ({ authorized, resource }) => handler(authorized, resource))(request)`.
  Its doc comment :25-57 (33 lines) holds the two typing contracts: the closed `HttpEnforcementFailure` error channel (the
  `catchTag` narrowing limit) and the `CurrentSubject` exclusion, `Exclude<R | EvaluationServices, CurrentSubject> | LR | SubjectExtractor` (:75).
- One production caller: `PermissionRegistry.ts:97-108` `buildGuardedRoute` →
  `HttpRouter.add(method, path, guardRoute(permission, policy, loadResource)(handler))` merged with
  `PermissionRegistry.register`. `addGuardedRoute` (:128-152, two overloads plus the implementation, ARCH-61) calls
  `buildGuardedRoute`. One test caller: `packages/http/test/http.test.ts:373-410` ("guardRoute extracts the subject BEFORE
  loading the resource…") mounts `guardRoute(...)` with `HttpRouter.add` directly.
- `packages/http/test/GuardRoute.tst.ts` (75 lines) pins three facts on `guardRoute`: the handler's `CurrentSubject` is
  discharged (:45), a handler whose own guard may deny leaves the route's error channel `never` (:60), the loader's
  `CurrentSubject` is **not** discharged (:67). `packages/http/test/PermissionRegistry.tst.ts` (64 lines) pins
  `addGuardedRoute`'s overloads and its exact `Layer.Services`, but none of the `CurrentSubject` facts.
- The route-method union is written twice, identically: `PermissionRegistry.ts:90`
  `type RouteMethod = "*" | "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS"` and `UnguardedRoute.ts:48`
  (`UnguardedRouteSpec.method`). effect@4.1.2's `HttpRouter.add` accepts one more, `"QUERY"`
  (`node_modules/effect/src/http/HttpRouter.ts:580`); neither copy does.
- `PermissionRegistry.ts` (239 lines) holds the registry service and its layer (:36-88), the bare-route builder
  (:90-152) and both `/__permissions` routes (:154-239). Importers of `addGuardedRoute` from it: `PortRoutes.ts:34`,
  `DecisionStreamRoute.ts:100`, `DecisionBacklogRoute.ts:30`, and `PermissionRegistry.ts` itself (:208). `DevtoolsRoutes.ts:17`
  imports `permissionRegistryRoute`. Tests import `permissionRegistryRouteUnguarded` from it in `PortRoutes.test.ts:48`,
  `decisionStream.test.ts:61`, `decisionBacklog.test.ts:29`.
- `UnguardedRoute.ts` (93 lines) is package-private (not in `src/index.ts`) and imports only `effect`.
- `scripts/check-package-install.mjs:566` asserts the packed `@qadi/http` does not export `guardRoute`; it stays true.
- `pnpm circular` is `madge --circular --extensions ts,tsx packages/*/src` and counts `import type` edges (v1.0 04-01-PLAN).

## Where the review's shape does not fit (re-verification findings)

1. **ROUTE-01 as worded ("one module owns `addGuardedRoute`, `unguardedRoutes` and one route-method union") would make
   `unguardedRoutes` public.** `addGuardedRoute` is public, so its module is in `src/index.ts`, and that barrel is a pure
   `export *` list (AGENTS.md §9; `scripts/check-house-style.mjs` `[barrel-order]` checks only pure barrels). `unguardedRoutes`,
   `DeclaredUnguarded`, `Announce` and `UnguardedRouteSpec` would then all be exported, against ADR-QD-099 ("out of the
   barrel means not importable") and 13-08's deliberate package-private constructor. The alternatives are worse: a named
   barrel line for one module makes `@qadi/http`'s barrel impure, which silently switches `[barrel-order]` off for the whole
   package; making `unguardedRoutes` public adds a surface nobody asked for. **So the phase keeps `UnguardedRoute.ts` as the
   private sibling** and states the method union once there, where both constructors read it (D-02).
2. **ROUTE-03 as worded ("`PermissionRegistry.ts` keeps only the registry and `/__permissions`") closes an import cycle.**
   `addGuardedRoute` must call `PermissionRegistry.register`, so its module imports `PermissionRegistry.ts`; and
   `permissionRegistryRoute` is an `addGuardedRoute` caller. If the route stays in `PermissionRegistry.ts`, the two modules
   import each other and `pnpm circular` fails. Either `addGuardedRoute` stays in `PermissionRegistry.ts` (which re-creates the
   one-caller shim the review wants gone, one level down) or the two `/__permissions` constructors leave. **The phase moves them
   to `PermissionRegistryRoute.ts`**, the same `…Route.ts` naming as the stream and backlog routes (D-03).

The orchestrator owns REQUIREMENTS.md: ROUTE-01 and ROUTE-03 are met in intent (one guarded bare-route module, one method
union, the registry module holds only the registry) and the two deviations are recorded in CCR-QD-417.
</evidence>

<decisions>
## Implementation Decisions

- **D-01 (no defect, so no RED):** nothing here changes behaviour, so WX-06 has no regression test to write. The "tests at the
  new seam first" rule applies instead: plan 27-01 writes the `CurrentSubject` and error-channel type tests against the public
  `addGuardedRoute` and retargets `http.test.ts`'s ordering test to it, all green on the phase base (they hold today, because
  `addGuardedRoute` wraps `guardRoute`), and only plan 27-02 deletes `guardRoute` and the old tests.
- **D-02:** `GuardRoute.ts` keeps its file name (spec, ADRs 036/037/108 and BEH-QD-177 cite it as the bare-route adapter, so
  most citations stay true) and becomes the module of `addGuardedRoute`: both overloads, the implementation with
  `guardRoute`'s `enforceRequest` call inlined, the registry push, and the two typing contracts in `addGuardedRoute`'s own doc
  comment. `buildGuardedRoute` and `guardRoute` are deleted. The module joins `src/index.ts`
  (`export * from "./GuardRoute.ts";`, alphabetically between `GuardApi.ts` and `HttpApiMiddlewareClient.ts`) and exports
  `addGuardedRoute` only. The route-method union is written once, as `export type RouteMethod` in the package-private
  `UnguardedRoute.ts` (which stays a leaf importing only `effect`); `UnguardedRouteSpec.method` and `addGuardedRoute`'s
  `method` both use it. It does not gain `"QUERY"` (closed union; a new method is a decision, see Deferred).
- **D-03:** `PermissionRegistry.ts` keeps `EndpointDescriptor`, `PermissionRegistryData`, `PermissionRegistryShape`,
  `PermissionRegistry` and `PermissionRegistryLive`, and its header doc says the bare-route writer is `GuardRoute.ts`'s
  `addGuardedRoute` (beside `GuardApi.ts`'s `guardApi`). New public `PermissionRegistryRoute.ts` holds `snapshotResponse`
  (private), `permissionRegistryRoute` and `permissionRegistryRouteUnguarded`, moved byte-for-byte apart from imports and the
  doc sentence that names its enforcement ("Enforced through `addGuardedRoute`…"). Barrel line after `PermissionRegistry.ts`.
- **D-04 (import graph, checked by reading):** after the move, `GuardRoute.ts` → `AuthorizeRequest.ts`, `NoResource.ts`,
  `PermissionRegistry.ts`, `UnguardedRoute.ts` (type), `QadiHttpError.ts` (type), `SubjectExtractor.ts` (type);
  `PermissionRegistryRoute.ts` → `GuardRoute.ts`, `PermissionRegistry.ts`, `DevtoolsRouteAddress.ts`, `UnguardedRoute.ts`;
  `PermissionRegistry.ts` → `@qadi/core`, `effect` only. `PortRoutes.ts`, `DecisionStreamRoute.ts`, `DecisionBacklogRoute.ts`
  import `addGuardedRoute` from `GuardRoute.ts`; `DevtoolsRoutes.ts` imports `permissionRegistryRoute` from
  `PermissionRegistryRoute.ts`. No module imported by `PermissionRegistry.ts` or `GuardRoute.ts` imports either back, so
  `pnpm circular` stays green. Plan 27-02's verify runs it.
- **D-05 (ROUTE-02):** the three `GuardRoute.tst.ts` facts are restated on `addGuardedRoute`, read from the returned layer's
  services. `HttpRouter.Request.From` is distributive (`HttpRouter.ts:925`), so "the handler's `CurrentSubject` is discharged" is
  `Extract<Layer.Services<L>, HttpRouter.Request.From<"Requires", CurrentSubject>>` being `never`, and "the loader's is not" is
  the same extract being `HttpRouter.Request.From<"Requires", CurrentSubject>`; "the error channel is closed" is the layer's
  services carrying no `"Error"` marker. Plus one pin that `addGuardedRoute`'s `method` and `UnguardedRouteSpec`'s `method` are
  the same type (green before and after; after 27-02 it is structural).
- **D-06 (records):** behaviour is unchanged, but the `CurrentSubject` rule is a caller-visible typing contract that no BEH
  states. BEH-QD-470 states it in `spec/behaviors/23-http.md` and points at `GuardRoute.tst.ts`. ADR-QD-139 is **unused**: the
  two shape facts (the `/__permissions` routes leave the registry module because of the cycle; `unguardedRoutes` stays a private
  sibling because of the barrel) are consequences of ADR-QD-037 and ADR-QD-099, recorded as a dated amendment to ADR-QD-036
  (Rev 1.9 → 1.10) and a one-line note in ADR-QD-108. No INV. CCR-QD-417. `spec/overview.md`: the source column of the
  `addGuardedRoute` row (`GuardRoute.ts`, and drop "the package-private `guardRoute`") and of the
  `permissionRegistryRoute(…Unguarded)` row (`PermissionRegistryRoute.ts`); no row added or removed. Changeset: `@qadi/http`
  patch ("internal: no export, type, path or log line changed"), the ARCH-49 precedent (ADR-QD-111 Consequences).

### Claude's Discretion
- Whether `GuardRoute.tst.ts` keeps its name or the `addGuardedRoute` pins from `PermissionRegistry.tst.ts` move into it (one
  file per module is preferred: `PermissionRegistry.tst.ts` then holds nothing and is deleted, its rows retargeted).
- Exact wording of the moved doc comments, as long as both typing contracts and the "found only by a tstyche check" history
  survive on `addGuardedRoute`.
</decisions>

<canonical_refs>
## Canonical References
- `packages/http/src/GuardRoute.ts`, `PermissionRegistry.ts`, `UnguardedRoute.ts`, `AuthorizeRequest.ts` (`enforceRequest`,
  `answerWithResponse`), `NoResource.ts`, `PortRoutes.ts`, `DecisionStreamRoute.ts`, `DecisionBacklogRoute.ts`, `DevtoolsRoutes.ts`, `index.ts`
- `packages/http/test/GuardRoute.tst.ts`, `PermissionRegistry.tst.ts`, `http.test.ts` (:373-410)
- `scripts/check-package-install.mjs:566`, `scripts/check-house-style.mjs` (`[barrel-order]`, ~:1662)
- ADR-QD-036 (Rev 1.9), ADR-QD-037, ADR-QD-099, ADR-QD-108; BEH-QD-177, BEH-QD-180, BEH-QD-321, BEH-QD-335; INV at
  `spec/invariants.md:3459` (devtools address Source names `PermissionRegistry.ts`)
- `stryker.http.mjs` (report `reports/mutation-http/mutation.json`)
</canonical_refs>

<deferred>
## Deferred Ideas
- `"QUERY"` in the route-method union (effect@4.1.2's `HttpRouter.add` accepts it). Adding it widens a public parameter; it
  needs its own reason.
- Making `unguardedRoutes` public, or a named-export barrel for `@qadi/http` (see finding 1).
</deferred>

---
*Phase: 27-bare-route-module · Context gathered: 2026-11-11*
