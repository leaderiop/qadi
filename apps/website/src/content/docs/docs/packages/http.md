---
title: "@qadi/http"
description: effect/unstable/http and httpapi bindings for @qadi/core — enforcement middleware, subject extraction, and a permission registry.
---

`@qadi/http` wires [`@qadi/core`](/docs/packages/core/) into Effect v4's two
HTTP surfaces: the declarative `HttpApi`/`HttpApiEndpoint`/`HttpApiMiddleware`
layer, and bare `HttpRouter`. Both adapters are thin wrappers over `@qadi/core`'s
`guard` primitive — one enforcement path underneath two frameworks, never a
second implementation.

```sh
pnpm add @qadi/http @qadi/core effect
```

## Authorization is declared, never inferred

An endpoint annotated with neither a permission requirement nor an explicit
public marker is **refused**, with a 500 and a log naming it. Absence of a
requirement never means "unguarded" — forgetting one annotation would
otherwise publish an endpoint with no signal at build time, layer-build time,
or request time.

```ts
HttpApiEndpoint.get("health", "/health").pipe((e) =>
  e.annotate(PublicEndpoint, publicEndpoint("liveness probe, no subject exists yet")),
);
```

`publicEndpoint`'s `reason` is required and never read by the middleware — it
exists purely so a reviewer can see that being public was a decision someone
made, not an oversight.

## Attaching a requirement

`requiresPermission` is not `.pipe()`-composable on its own: TypeScript only
recovers an `HttpApiEndpoint`'s full literal type inside an inline,
unannotated callback passed directly to `.pipe()`. So the canonical shape
splices the requirement into your own inline `.annotate()` call, rather than
being a one-step `.pipe(requiresPermission({...}))`:

```ts
HttpApiEndpoint.get("read", "/documents").pipe((endpoint) =>
  endpoint.annotate(
    RequiredPermission,
    requiresPermission(endpoint, { permission: readPermission, policy: readPolicy }),
  ),
)
```

`requiresPermission` throws if the endpoint already carries a
`RequiredPermission` — never a silent overwrite (which could replace a
requirement with a weaker one) and never automatic `allOf` composition (which
would make the combinator's meaning depend on how many times it was called). A
second permission on one endpoint is written as one `allOf([...])` policy.

One `RequirePermission` middleware handles every annotated endpoint, reading
the annotation back off at request time; mount it once via
`RequirePermissionLive`.

## `HttpRouter`, bare

`guardRoute` is the same enforcement over a plain
`(request) => Effect<Response, E, R>` handler, and `addGuardedRoute` registers
a bare route while also feeding the permission registry — use it in place of a
bare `HttpRouter.add` for any route that should be guarded and registered.

```ts
const WriteRoute = addGuardedRoute(
  "POST",
  "/documents/write",
  writePermission,
  writePolicy,
  (request) => loadResourceFromRequest(request),
)((authorized, resource) => handleWrite(authorized, resource));
```

## Subject extraction

```ts
export interface SubjectExtractorShape {
  readonly extract: (
    request: HttpServerRequest.HttpServerRequest,
  ) => Effect.Effect<AuthSubject, SubjectExtractionFailed>;
}
```

`extract` can fail, and a failure maps to 502, never 403 — a broken credential
store is an outage, not a decision about the caller. A request carrying no
credential at all is a different case and stays a success, resolving to
`anonymous`, which holds no roles or permissions and so denies under any real
policy. `subjectExtractorBearer` is the supplied `Authorization: Bearer …`
implementation, matching the scheme case-insensitively per RFC 7235 §2.1.

## Status mapping

```ts
export const ENFORCEMENT_ERROR_TAGS: ReadonlyArray<EnforcementError["_tag"]>;
export const toResponse: (error: EnforcementError) => HttpServerResponse;
```

| Error | Status | Because |
| ----- | ------ | ------- |
| `AccessDenied`, `UndischargedObligation` | 403 | the policy's answer |
| `AttributeResolveError`, `RelationshipResolveError`, `DecisionHistoryUnavailable`, `CustomPredicateError`, `SignatureHistoryUnavailable` | 502 | a dependency of this service broke |
| `MissingAction`, `MissingResource`, `MissingResourceId`, `PolicyTooDeep` | 500 | a wiring mistake in this service |

Subject extraction failing outright (no credential, or a malformed one the
extractor rejects) is handled separately from this table — it isn't a member
of `EnforcementError`, since it happens before enforcement runs at all.

The 403/502 split is the library's central rule carried to the wire: a broken
attribute store must never be reported as "not permitted." Every response body
is empty — a trace names every node and why it refused, and that detail is not
for the caller.

## The permission registry

```ts
export const registerApi: <Id extends string, Groups extends HttpApiGroup.Constraint>(
  api: HttpApi.HttpApi<Id, Groups>,
) => Layer.Layer<never, never, PermissionRegistry>;
export const addGuardedRoute: (...) => ...;
export const permissionRegistryRoute: (permission: Permission, policy: Policy) => Layer<...>;
export const permissionRegistryRouteUnguarded: (reason: string) => Layer<...>;
```

`PermissionRegistry` answers "which permission does which endpoint require,"
for a mix of both surfaces: seed it from an `HttpApi` with `registerApi`, and
from bare `HttpRouter` routes by registering through `addGuardedRoute` instead
of a plain `HttpRouter.add`. It records the **permission**, not the policy, and
does not participate in any decision — two endpoints reporting the same
permission may enforce entirely unrelated rules, and it cannot answer what is
*un*guarded at all.

`permissionRegistryRoute(permission, policy)` mounts the result at
`/__permissions`, **behind that policy** — the registry is itself a map of
what to attack and where, so it is guarded by default.
`permissionRegistryRouteUnguarded(reason)` is the explicit opt-out for local
development, and it logs a warning on every request rather than once, so a
choice that reaches production stays visible in that environment's logs.

See [ADR-QD-036](https://github.com/leaderiop/qadi/blob/main/spec/decisions/036-qadi-http-package-shape.md)
and [behavior 23](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/23-http.md)
for the full rationale and normative requirements.
