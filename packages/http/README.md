# @qadi/http

`effect/unstable/http` and `httpapi` bindings for
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

## Status mapping

| Error | Status | Because |
| ----- | ------ | ------- |
| `AccessDenied`, `UndischargedObligation` | 403 | the policy's answer |
| `AttributeResolveError`, `RelationshipResolveError`, `DecisionHistoryUnavailable`, `SubjectExtractionFailed`, `CustomPredicateError`, `SignatureHistoryUnavailable` | 502 | a dependency of this service broke |
| `MissingAction`, `MissingResource`, `MissingResourceId`, `PolicyTooDeep` | 500 | a wiring mistake in this service |

The 403/502 split is the library's central rule at the wire: a broken attribute
store must never be reported as "not permitted". Bodies are empty — a trace
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

`/__permissions` publishes every guarded path and the permission it requires,
which is a map of what to attack and where. It is therefore served **behind a
policy**:

```ts
permissionRegistryRoute(adminPermission, isAdmin)
```

`permissionRegistryRouteUnguarded(reason)` exists for local development and says
so in the logs on every request.

## License

MIT
