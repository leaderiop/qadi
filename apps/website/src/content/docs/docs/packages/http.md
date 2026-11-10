---
title: "@qadi/http"
description: effect/http and httpapi bindings for @qadi/core — enforcement middleware, subject extraction, and a permission registry.
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
public marker is **refused**: `guardApi` fails to build, naming the group and the
endpoint (`AccessNotDeclared`). Absence of a requirement never means
"unguarded" — forgetting one annotation would otherwise publish an endpoint
with no signal at build time, layer-build time, or request time.

```ts
HttpApiEndpoint.get("health", "/health").pipe((e) =>
  e.annotate(PublicEndpoint, publicEndpoint("liveness probe, no subject exists yet")),
);
```

`publicEndpoint`'s `reason` is required and never read by the middleware — it
exists purely so a reviewer can see that being public was a decision someone
made, not an oversight.

Only an endpoint declares access. A `RequiredPermission` or `PublicEndpoint` on
a group or on the API is **refused** too, never ignored: `guardApi` fails with
`MisplacedAccessDeclaration`, naming the group or the API. To declare for a whole
group, write it into each endpoint's own annotations:

```ts
HttpApiGroup.make("documents")
  .add(HttpApiEndpoint.get("read", "/documents"), HttpApiEndpoint.get("list", "/documents/all"))
  .annotateEndpoints(RequiredPermission, requiresPermission(anEndpoint, { permission: readPermission, policy: readPolicy }));
```

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

One `RequirePermission` middleware handles every annotated endpoint. `guardApi(Api)`
reads each endpoint's declaration once, when it is built, and the middleware looks
the endpoint up. `guardApi(Api)` provides it for that
API, and by being built it registers every endpoint it enforces with
`PermissionRegistry`, so `/__permissions` lists exactly what is enforced.

It refuses what it cannot enforce: an endpoint the middleware is not attached to
(`.middleware(RequirePermission)` before `.add(group)`, no middleware, or
middleware on one group only) is a compile error where the type is precise and
`RequirePermissionNotAttached` at layer build otherwise, and the middleware
answers 500, with one error log naming it, for an endpoint that is not part of the `HttpApi` value it was built
from (another API, or a `prefix`ed copy): pass `guardApi` the same value
`HttpApiBuilder.layer` serves.

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as HttpApi from "effect/http-api/HttpApi";
import * as HttpApiBuilder from "effect/http-api/HttpApiBuilder";
import * as HttpApiEndpoint from "effect/http-api/HttpApiEndpoint";
import * as HttpApiGroup from "effect/http-api/HttpApiGroup";
import { hasPermission, permission } from "@qadi/core";
import { RequiredPermission, RequirePermission, guardApi, requiresPermission } from "@qadi/http";

const readPermission = permission("document", "read");

const Documents = HttpApiGroup.make("documents").add(
  HttpApiEndpoint.get("read", "/documents").pipe((endpoint) =>
    endpoint.annotate(
      RequiredPermission,
      requiresPermission(endpoint, { permission: readPermission, policy: hasPermission(readPermission) }),
    ),
  ),
);

// The middleware goes on after the groups are added: Effect applies it only to
// endpoints already added.
export const Api = HttpApi.make("app").add(Documents).middleware(RequirePermission);

const Handlers = HttpApiBuilder.group(Api, "documents", (handlers) =>
  handlers.handle("read", () => Effect.void),
);

// `guardApi` provides the middleware for this API and registers what it enforces.
export const Routes = HttpApiBuilder.layer(Api).pipe(
  Layer.provide(Handlers),
  Layer.provide(guardApi(Api)),
);
```

## `HttpRouter`, bare

`addGuardedRoute` enforces a plain `(request) => Effect<Response, E, R>`
handler and registers the bare route with the permission registry in the same
layer — use it in place of a bare `HttpRouter.add` for any route that should be
guarded and registered. `loadResource` is optional: leave it out and the route
evaluates against `NO_RESOURCE` and the handler receives a plain `Resource`.

```ts
const WriteRoute = addGuardedRoute(
  "POST",
  "/documents/write",
  writePermission,
  writePolicy,
  (request) => loadResourceFromRequest(request),
)((authorized, resource) => handleWrite(authorized, resource));
```

## Building your own surface

`authorizeRequest` is the one step every surface here goes through: it extracts
the subject, loads the resource (none by default), guards it and logs a denial or
an extraction failure once. A surface this package does not ship keeps only its
own answer. It registers nothing: a surface that should appear in `/__permissions`
registers with `PermissionRegistry.register` when its layer is built.

```typescript
import * as Effect from "effect/Effect";
import type * as HttpServerRequest from "effect/http/HttpServerRequest";
import * as HttpServerResponse from "effect/http/HttpServerResponse";
import { hasPermission, permission } from "@qadi/core";
import { HTTP_ENFORCEMENT_TAGS, authorizeRequest, toResponse } from "@qadi/http";

const readPermission = permission("document", "read");

export const handle = (request: HttpServerRequest.HttpServerRequest) =>
  authorizeRequest(readPermission, hasPermission(readPermission))(request).pipe(
    Effect.map(({ subject }) => HttpServerResponse.text(`hello ${subject.id}`)),
    Effect.catchTag(HTTP_ENFORCEMENT_TAGS, (error) => Effect.succeed(toResponse(error))),
  );
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
// From @qadi/core: the class of every tag, decided once.
export const ENFORCEMENT_ERROR_TAGS: ReadonlyArray<EnforcementError["_tag"]>;
export const classifyEnforcementError: (error: { readonly _tag: EnforcementError["_tag"] }) => "denied" | "outage" | "wiringMistake";

// From @qadi/http: the status each class answers with, on every route.
export const HTTP_STATUS_BY_CLASS: { denied: 403; outage: 502; wiringMistake: 500 };
export const toResponse: (error: EnforcementError) => HttpServerResponse;
```

`@qadi/core` decides which of three classes each tag is (`denied`, `outage`,
`wiringMistake`), and `HTTP_STATUS_BY_CLASS` is the single place a class becomes a
status. `toResponse`, `RequirePermission`'s declared error schemas and the OpenAPI
document all read it through `ENFORCEMENT_ERROR_WIRE`, so the two routing shapes
cannot disagree about a tag. `ENFORCEMENT_ERROR_TAGS` and `classifyEnforcementError`
are imported from `@qadi/core`, not from `@qadi/http`.

| Error | Status | Because |
| ----- | ------ | ------- |
| `AccessDenied`, `UndischargedObligation` | 403 | the policy's answer |
| `AttributeResolveError`, `RelationshipResolveError`, `DecisionHistoryUnavailable`, `CustomPredicateError`, `SignatureHistoryUnavailable` | 502 | a dependency of this service broke |
| `MissingAction`, `MissingResource`, `MissingResourceId`, `PolicyTooDeep` | 500 | a wiring mistake in this service |

Subject extraction failing outright (no credential, or a malformed one the
extractor rejects) is handled separately from this table — it isn't a member
of `EnforcementError`, since it happens before enforcement runs at all.

The 403/502 split is the library's central rule carried to the wire: a broken
attribute store must never be reported as "not permitted." The bare-route
`toResponse` answers an empty body for every enforcement error. A route guarded by
`RequirePermission` answers a redacted body that always carries `_tag` — and for a
denial, only `subjectId`, `policyTag` and `reason`. Never the trace: it names every
node and why it refused, and that detail is not for the caller.

## The permission registry

```ts
export const guardApi: <Id extends string, Groups extends HttpApiGroup.Constraint>(
  api: HttpApi.HttpApi<Id, Groups> & EveryEndpointGuarded<Groups>,
) => Layer.Layer<
  RequirePermission,
  MisplacedAccessDeclaration | RequirePermissionNotAttached,
  SubjectExtractor | StandingEvaluationServices | PermissionRegistry
>;
export const addGuardedRoute: (method, path, permission, policy, loadResource?) => (handler) => Layer<...>; // no loader: NO_RESOURCE
export const permissionRegistryRoute: (permission: Permission, policy: Policy, options?: DevtoolsRouteOptions) => Layer<...>;
export const permissionRegistryRouteUnguarded: (reason: string, options?: DevtoolsRouteOptions) => Layer<...>;
```

`PermissionRegistry` answers "which permission does which endpoint require,"
for a mix of both surfaces, and both register because they guard: an `HttpApi`
when the `guardApi(Api)` that provides its middleware is built, a bare
`HttpRouter` route when `addGuardedRoute` adds it instead of a plain
`HttpRouter.add`. A custom surface built on `authorizeRequest` registers with
`PermissionRegistry.register`. It records the **permission**, not the policy, and
does not participate in any decision — two endpoints reporting the same
permission may enforce entirely unrelated rules, and it cannot answer what is
*un*guarded at all.

`permissionRegistryRoute(permission, policy)` mounts the result at
`/__permissions`, **behind that policy** — the registry is itself a map of
what to attack and where, so it is guarded by default.
`permissionRegistryRouteUnguarded(reason)` is the explicit opt-out for local
development, and it logs a warning on every request rather than once, so a
choice that reaches production stays visible in that environment's logs. Both
take `{ prefix }` like the other devtools routes below; under a prefix the
warning names the prefixed path, the one actually served.

## The devtools routes

The decision stream (`/__decisions`), its backlog (`/__decisions/backlog`) and
the permission registry (`/__permissions`) answer at
`devtoolsPath(route, prefix)`, at the root when no prefix is given. Every
constructor takes `{ prefix }`, and `devtoolsRoutes` mounts all three behind one
guard and one prefix. It has no unguarded form: the stream publishes decisions,
so it is always guarded.

Your client builds its URL from the same function with the same prefix,
instead of writing the path again. `devtoolsPath` imports nothing, so a browser
bundle can import it from `@qadi/http` without pulling in a router.

```typescript
import * as Effect from "effect/Effect";
import { hasPermission, makeDecisionLog, permission } from "@qadi/core";
import { devtoolsPath, devtoolsRoutes } from "@qadi/http";

const readDevtools = permission("devtools", "read");

// The server: the stream, the backlog and the registry under /devtools, one guard for all three.
export const DevtoolsRoutes = Effect.map(makeDecisionLog({ environment: "Server" }), (log) =>
  devtoolsRoutes(readDevtools, hasPermission(readDevtools), log, { prefix: "/devtools" }),
);

// The client: the same rule and the same prefix. This is "/devtools/__decisions".
export const streamUrl = devtoolsPath("decisions", "/devtools");
```

Under a prefix the default paths are not served, and a subject the policy
denies still gets 403 at every prefixed path: a prefix moves a route, it never
unguards one. Mount the routes one by one (`decisionStreamRoute`,
`decisionBacklogRoute`, `permissionRegistryRoute`) when they need different
guards.

See [ADR-QD-036](https://github.com/leaderiop/qadi/blob/main/spec/decisions/036-qadi-http-package-shape.md)
and [behavior 23](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/23-http.md)
for the full rationale and normative requirements.
