---
"@qadi/http": patch
---

Fix `RequirePermission`'s TypeScript typing gap where its declared `requires` never expanded to a concrete service union downstream (`HttpApiBuilder.group`, `HttpApiTest.groups`), forcing consumers into a type-widening cast to use the middleware at all.

`RequirePermission` now declares `requires: never` and resolves its six evaluation-service dependencies (`AttributeResolver`, `RelationshipResolver`, `DecisionHistory`, `EvaluationId`, `CustomPredicate`, `SignatureHistory`) as an ordinary `RequirePermissionLive` build-time dependency instead — a ordinary, non-self-referential `Layer.effect` build-time capture, which TypeScript expands eagerly, unlike the deferred conditional type `effect`'s `HttpApiMiddleware.ApplyServices`/`Requires` computes for a self-referential middleware class with a non-trivial `requires`.

`RequirePermission` also now declares `provides: CurrentSubject`, matching what it already does at runtime (`Effect.provideService(CurrentSubject, subject)` around every guarded request) — so a handler that reads `CurrentSubject` (directly, or transitively through `@qadi/core`'s `guard`/`Qadi.assert`) no longer carries an unresolvable `HttpRouter.Request<"Requires", CurrentSubject>` marker in its own type. The `publicEndpoint` branch now explicitly provides `anonymous` as the current subject, so the declaration stays honest for endpoints that skip subject extraction entirely.

No behavior changes: both evaluation-service resolution and per-request subject provision happen exactly as before — only the type-level declaration changed, so `RequirePermissionLive`'s callers get plain, ordinary types end to end with no cast required.
