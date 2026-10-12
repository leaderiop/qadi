---
"@qadi/http": minor
---

**Breaking:** a guarded `HttpApi` is registered by the layer that guards it.

`guardApi(api)` provides `RequirePermission` for that API and, by being built, registers every endpoint it enforces with `PermissionRegistry`, so `/__permissions` lists exactly what `@qadi/http` enforces. It requires `PermissionRegistry` (as `addGuardedRoute` always has) in addition to the subject extractor and the standing evaluation services.

Removed from the public surface: `RequirePermissionLive`, `registerApi` and `guardRoute`. Migration:

```ts
// before
HttpApiBuilder.layer(Api).pipe(Layer.provide(Handlers), Layer.provide(RequirePermissionLive));
registerApi(Api).pipe(Layer.provideMerge(PermissionRegistryLive));

// after
HttpApiBuilder.layer(Api).pipe(Layer.provide(Handlers), Layer.provide(guardApi(Api)));
// ...and provide PermissionRegistryLive once, wherever the stack is composed.
```

`addGuardedRoute` replaces `guardRoute` for a route that should be guarded and listed; `authorizeRequest` stays public for a surface this package does not ship, and registers nothing (register such a surface with `PermissionRegistry.register`).

An endpoint of a guarded API that `RequirePermission` is not attached to (`.middleware(RequirePermission)` before `.add(group)`, no middleware, or middleware on one group only) no longer compiles as an argument to `guardApi` where the type is precise, and fails the layer build with `RequirePermissionNotAttached` otherwise; previously such an endpoint was served to anyone while `/__permissions` listed it as guarded. The middleware `guardApi` provides answers 500 with one error log line for an endpoint outside the API it was built for (for example `guardApi(A)` provided to the layer that serves `B`).

Added: `guardApi`, `ApiGuardRefusal`, `UnguardedEndpoints`, `EveryEndpointGuarded`. `MisplacedAccessDeclaration` and `RequirePermissionNotAttached` are now declared in `GuardApi.ts` (same names).
