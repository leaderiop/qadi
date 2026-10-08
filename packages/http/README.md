# @qadi/http

`effect/http` and `httpapi` bindings for
[`@qadi/core`](https://www.npmjs.com/package/@qadi/core): enforcement
middleware, subject extraction, and a permission registry.

```sh
pnpm add @qadi/http @qadi/core effect
```

## Authorization is declared, never inferred

An endpoint annotated with neither a permission requirement nor an explicit
public marker is **refused**, with a 500 and a log naming it. Absence of a
requirement never means "unguarded": forgetting one annotation would otherwise
publish an endpoint with no signal at build time, layer-build time or request
time.

```ts
HttpApiEndpoint.get("health", "/health").pipe((e) =>
  e.annotate(PublicEndpoint, publicEndpoint("liveness probe, no subject exists yet")),
);
```

The `reason` is required and never read by the middleware. It exists so a
reviewer can see that someone chose this.

Only an endpoint declares access. A `RequiredPermission` or `PublicEndpoint` on
a group or on the API is **refused** too, never ignored: the middleware answers
500 for every endpoint under that group and names the group in its log, and
`guardApi` fails with `MisplacedAccessDeclaration`. To declare for a whole
group, write it into each endpoint's own annotations:

```ts
HttpApiGroup.make("documents")
  .add(HttpApiEndpoint.get("read", "/documents"), HttpApiEndpoint.get("list", "/documents/all"))
  .annotateEndpoints(RequiredPermission, requiresPermission(anEndpoint, { permission: readPermission, policy: readPolicy }));
```

## Guarding an `HttpApi`

`guardApi(Api)` is the one layer that guards an `HttpApi`: it provides the
`RequirePermission` middleware for that API and, by being built, registers every
endpoint it enforces with `PermissionRegistry`. It requires `PermissionRegistry`,
the subject extractor and the standing evaluation services.

An endpoint the middleware is not attached to (`.middleware(RequirePermission)`
before `.add(group)`, no middleware, or middleware on one group only) is refused
rather than served to anyone: a compile error where the type is precise, and
`RequirePermissionNotAttached` at layer build otherwise. The middleware also answers
500 for an endpoint outside the API it was built for. Bare routes register the same
way, because `addGuardedRoute` registers in the layer that adds the route.

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

## Status mapping

| Error | Status | Because |
| ----- | ------ | ------- |
| `AccessDenied`, `UndischargedObligation` | 403 | the policy's answer |
| `AttributeResolveError`, `RelationshipResolveError`, `DecisionHistoryUnavailable`, `SubjectExtractionFailed`, `CustomPredicateError`, `SignatureHistoryUnavailable` | 502 | a dependency of this service broke |
| `MissingAction`, `MissingResource`, `MissingResourceId`, `PolicyTooDeep` | 500 | a wiring mistake in this service |

A guarded route passes no obligation handler, so a binding obligation on its policy always answers 403 `UndischargedObligation`.

The 403/502 split is the library's central rule at the wire: a broken attribute
store must never be reported as "not permitted". The bare-route `toResponse` answers
an empty body; `RequirePermission` answers a redacted body that always carries
`_tag` (a denial adds `subjectId`, `policyTag` and `reason`). Never the trace — it
names every node and why it refused, which is not for the caller.

## Generated clients over-approximate errors

A guarded endpoint's generated client method claims all twelve
`RequirePermission` enforcement tags in its error type — including a
`PublicEndpoint`-annotated endpoint, which can produce none of them. This is a
known, accepted limitation, not a bug: the upstream `HttpApiMiddleware` type
has no per-endpoint override point for `clientError`, and giving one up would
mean detaching middleware per endpoint, reopening the fail-closed attachment
[ADR-QD-036](../../spec/decisions/036-qadi-http-package-shape.md)'s
one-enforcement-path, fail-closed design. A client author handling the full
error union on a public route
is writing dead `catchTag` arms for tags that route cannot produce.

See
[ADR-QD-075](../../spec/decisions/075-clienterror-typing-for-requirepermission.md)
for the full reasoning, including the build-time annotation-completeness
check left open as future work rather than built here.

## The permission registry

`/__permissions` publishes every guarded path and the permission it requires
(every route registered through `guardApi` or `addGuardedRoute`), which is a map of
what to attack and where. It is therefore served **behind a
policy**:

```ts
permissionRegistryRoute(adminPermission, isAdmin)
```

`permissionRegistryRouteUnguarded(reason)` exists for local development and says
so in the logs on every request.

## Answering ports for a remote client

A browser that re-checks a seeded decision asks a server for each port's answer.
`portRoutes(permission, policy, serving, options?)` serves `POST <prefix>/<PortName>` behind a
policy (and lists the paths in `/__permissions`); `portRoutesUnguarded(reason, serving,
options?)` serves the extracted subject's own questions with no policy and says so once in
the logs. Both answer **only about the request's subject** (a question naming anyone else is a
403), serve only the ports and names `serving` declares (`servingFor(policies)` derives it),
and reply with a closed JSON union and `Cache-Control: no-store`. The default prefix is
`/__ports`.

```ts
portRoutesUnguarded("answers only about the session's own subject", servingFor(policies), {
  prefix: "/ports",
});

remotePortsLayer({ baseUrl: "/api", prefix: "/ports", ports: ["AttributeResolver"] }).pipe(
  Layer.provide(FetchHttpClient.layer),
);
```

`remotePortsLayer` is the client half: a store outage, a refusal and an unreadable reply are
each the port's own typed error (never `"Unknown"`), so an outage fails the evaluation
instead of denying or granting. For cookies, provide
`Layer.succeed(FetchHttpClient.RequestInit, { credentials: "same-origin" })`. See
[ADR-QD-107](../../spec/decisions/107-a-port-is-answered-remotely-through-its-description.md).

## License

MIT
