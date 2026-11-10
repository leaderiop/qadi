# 23 — HTTP Enforcement

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-23                                    |
> | Revision       | 1.15                                            |
> | Effective Date | 2026-11-08                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.15 (2026-11-10): addGuardedRoute's loadResource is optional; the declared-unguarded routes share one constructor with a closed cadence (ARCH-61, lost ARCH-57 L1a/L1b, CCR-QD-402)<br>1.14 (2026-11-10): BEH-QD-321 and BEH-QD-335 name the public mode; BEH-QD-359 added — a public endpoint logs a denial its own handler raises (ARCH-61, ADR-QD-108 addendum, CCR-QD-399)<br>1.13 (2026-11-10): BEH-QD-174, 180, 320, 328 and 335 — `guardApi` reads each endpoint's access once into an access plan the middleware only looks up by endpoint value (`AccessPlan.ts`, package-private); an undeclared endpoint fails the build (`AccessNotDeclared`); `ApiGuardRefusal` has three members; the readers and the endpoint member key are gone; BEH-QD-180 states the ARCH-36 residual (ARCH-59, ADR-QD-118, CCR-QD-396)<br>1.12 (2026-11-08): BEH-QD-338: the port routes and their client share one address, and the client reads the reply from the body whatever the status (ARCH-52, CCR-QD-391)<br>1.11 (2026-11-08): BEH-QD-335 and BEH-QD-336 added — every request path enforces and logs through one module, and an unguarded port route logs a subject-extraction failure; BEH-QD-321 amended — the surfaces authorize through the request-enforcement module (`portRoutes` and `portRoutesUnguarded` named), whose handler step logs a handler-raised denial (ARCH-46, ADR-QD-108, CCR-QD-385)<br>1.10 (2026-10-08): BEH-QD-328 — a guarded `HttpApi` is registered by the layer that guards it (`guardApi`); BEH-QD-180 and BEH-QD-320 name `guardApi` in place of `registerApi`; `RequirePermissionLive`, `registerApi` and `guardRoute` leave the surface; `authorizeRequest` registers nothing (ARCH-36, CCR-QD-311)<br>1.9 (2026-10-08): states that an HTTP-guarded route passes no obligation handler (ARCH-30, CCR-QD-220)<br>1.8 (2026-10-08): BEH-QD-321 — a denial is logged once by the step that turned it into a response (the edge, or the surface for a handler's own `guard`), annotated `qadi.denial_site`; `guardRoute`'s handler error channel is `HttpEnforcementFailure` (ARCH-45, CCR-QD-265)<br>1.7 (2026-10-07): BEH-QD-321 — every `@qadi/http` surface authorizes through `authorizeRequest`; `toResponse` answers all twelve tags and `handleEnforcementErrors`/`subjectExtractionFailedResponse` are removed; BEH-QD-177's prose follows (ADR-QD-036 Rev 1.5, CCR-QD-197)<br>1.6 (2026-10-07): BEH-QD-320 — an endpoint's access is read once, from the endpoint, by `RequirePermission` and `registerApi` through `endpointAccess`; a `RequiredPermission` or `PublicEndpoint` on a group or API is refused by both (`MisplacedAccessDeclaration`); BEH-QD-180's `registerApi` signature corrected and it lists an endpoint only if the middleware enforces it (CCR-QD-196)<br>1.5 (2026-10-04): BEH-QD-177 gains a derived-status requirement and `ENFORCEMENT_ERROR_WIRE`, the one table every status, wire schema and `RequirePermission` error list derives from; BEH-QD-260 corrected — the two tag-only bodies were never empty, and the hand-converted arms are one in-channel projection; BEH-QD-263's list is derived (ADR-QD-081, CCR-QD-155)<br>1.4 (2026-09-14): BEH-QD-263 — a generated client's static error type for a `RequirePermission`-guarded endpoint now includes every enforcement outcome automatically, via `requiredForClient`/`clientError` and the new generic `passthroughClientLayer` helper, rather than a per-endpoint hand-declared `error:` subset; the disclosed `PublicEndpoint` over-approximation limitation is recorded alongside it (ADR-QD-075, CCR-QD-151)<br>1.3 (2026-09-08): BEH-QD-260 — the `HttpApiMiddleware` adapter's response body now carries real fields for the nine `EnforcementError` tags that are not a denial, declared through `httpApiStatus`-annotated schemas rather than produced by `toResponse`'s hand table; the bare-`HttpRouter` adapter is unchanged (ADR-QD-072, CCR-QD-141)<br>1.2 (2026-09-07): BEH-QD-177's status table was missing two of the eleven mappings `enforcementErrorTags` actually covers — `CustomPredicateError` and `SignatureHistoryUnavailable`, both 502, added to the row (CCR-QD-110)<br>1.1 (2026-08-24): BEH-QD-180 — `/__permissions` is guarded by default; the open question closed (CCR-QD-062)<br>1.0 (2026-08-23): Initial release (CCR-QD-059) |

_Previous: [22 — The Promise Facade](./22-promise-facade.md)_

---

`@qadi/http` shipped under [ADR-QD-036](../decisions/036-qadi-http-package-shape.md)
with **no behaviour document**, so it entered the traceability chain at the
Decision link and nothing beneath it was normative. That is how the package came
to contradict its own ADR in the one place the ADR was most explicit — see
[BEH-QD-174](#beh-qd-174-authorization-is-declared-never-inferred). This document
is the missing layer, written after the audit that found it.

Both adapters run `@qadi/core`'s `guard` ([BEH-QD-055](./07-enforcement.md)); none
of the requirements here re-specify evaluation.

## BEH-QD-174: Authorization is declared, never inferred

> **Invariant:** [INV-QD-034](../invariants.md#inv-qd-034-an-endpoints-authorization-is-declared-not-inferred)

```ts
export const publicEndpoint: (reason: string) => PublicDeclaration;
export class PublicEndpoint extends Context.Service<PublicEndpoint, PublicDeclaration>()(…) {}
```

```
REQUIREMENT: An endpoint of an API passed to `guardApi` that itself carries
             neither `RequiredPermission` nor `PublicEndpoint` MUST be refused:
             `guardApi` MUST fail layer construction with `AccessNotDeclared`,
             naming its group and identifier, before it registers anything.
```

The endpoint's own annotations are the only scope read
([BEH-QD-320](#beh-qd-320-an-endpoints-access-is-read-once-from-the-endpoint)).

```
REQUIREMENT: `publicEndpoint` MUST require a reason.
```

The absence of a requirement used to mean "unguarded", and
[ADR-QD-036](../decisions/036-qadi-http-package-shape.md) had rejected exactly
that in its Alternatives section — *"it inverts this library's fail-closed
posture … by making the **absence** of a permission requirement mean
'unguarded'"*. The rejected alternative shipped anyway, and a test asserted it
was correct. Forgetting one annotation published an endpoint.

Before CCR-QD-396 the refusal was a **500 on every request**, logged once per
request, rather than a 403, and the distinction was the point: this is a wiring
mistake in the service, not a decision about the caller, and a 403 would send an
operator to audit permissions for a problem that is in their endpoint
definition. The walk sees the mistake when `guardApi` is built, so it now fails
the build for the reason misplacement and attachment do: nothing is served, so
neither status arises, and an application that ships one undeclared endpoint
stops starting instead of logging noise in production. The error names the
group and the endpoint, because a refusal nobody can diagnose is only half a
fix.

The `reason` is never read by the middleware. It exists so that being public is
something a reviewer can see someone chose.

## BEH-QD-175: A credential store that breaks is an outage

> **Invariant:** [INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial)

```ts
export class SubjectExtractionFailed extends Data.TaggedError("SubjectExtractionFailed")<{
  readonly reason: string;
}> {}
```

```
REQUIREMENT: `SubjectExtractorShape.extract` MUST be able to fail.
             A failure MUST map to 502, never 403.
```

`extract` returned `Effect<AuthSubject>` — a `never` error channel — so an
implementor had two options and both broke INV-QD-006. `Effect.die` escapes the
adapters' `catchTag` entirely and turns an authorization path into a defect,
which [AGENTS.md §4](../../AGENTS.md) forbids outright. Falling back to
`anonymous` renders an outage as a denial, and sends an operator to audit
permissions during an incident.

```
REQUIREMENT: A request carrying no credential MUST remain a success resolving to
             `anonymous`.
```

"No credential" and "the store is broken" are different answers, and keeping
them apart is the whole of this requirement. An anonymous subject holds no roles
or permissions, so a policy denies it — the same fail-closed default
`CurrentSubjectAnonymous` establishes.

## BEH-QD-176: The Bearer scheme is matched case-insensitively

```
REQUIREMENT: `subjectExtractorBearer` MUST match the auth-scheme
             case-insensitively, per RFC 7235 §2.1.
```

It compared `startsWith("Bearer ")`, so a legal `bearer …` — which real clients
emit — had its credential silently discarded and was served as anonymous. That
denied, so a parsing bug presented as a permissions problem.

**Known gap, recorded rather than accepted silently.** A present-but-non-Bearer
credential (`Basic …`) is still treated as absent. The correct answer is `401`
with a `WWW-Authenticate` challenge, and this package cannot yet produce one:
`AccessDenied` carries no authentication state, so `toResponse` cannot tell an
unauthenticated caller from an unauthorised one. Both currently receive `403`.

## BEH-QD-177: One status mapping, shared by both adapters

```ts
export const toResponse: (error: HttpEnforcementFailure) => HttpServerResponse;
export const classifyHttpEnforcementFailure: (error: { readonly _tag: HttpEnforcementTag }) => EnforcementErrorClass;
export const HTTP_STATUS_BY_CLASS: { denied: 403; outage: 502; wiringMistake: 500 };
export const ENFORCEMENT_ERROR_WIRE: EnforcementErrorWireTable; // one entry per tag
// ENFORCEMENT_ERROR_TAGS and classifyEnforcementError come from @qadi/core (BEH-QD-270).
```

```
REQUIREMENT: `toResponse` MUST be exhaustive over `HttpEnforcementFailure`,
             MUST return an EMPTY body for every `EnforcementError` tag, and
             MUST answer `SubjectExtractionFailed` with its tag-only JSON 502.
```

```
REQUIREMENT: Both adapters MUST derive a tag's status as
             `HTTP_STATUS_BY_CLASS[classifyEnforcementError(error)]`; an
             HttpApi schema's `httpApiStatus` MUST equal `toResponse`'s status
             for the same tag. `ENFORCEMENT_ERROR_WIRE` is the one table that
             says so, keyed by the eleven `EnforcementError` tags plus
             `SubjectExtractionFailed`, and an omitted tag MUST fail to
             compile.
```

| Error | Status | Because |
| ----- | ------ | ------- |
| `AccessDenied`, `UndischargedObligation` | 403 | the policy's answer |
| `AttributeResolveError`, `RelationshipResolveError`, `DecisionHistoryUnavailable`, `CustomPredicateError`, `SignatureHistoryUnavailable` | 502 | a dependency of this service broke |
| `MissingAction`, `MissingResource`, `MissingResourceId`, `PolicyTooDeep` | 500 | a wiring mistake in this service |

An HTTP-guarded route passes no obligation handler, so a binding obligation on its policy always answers 403 `UndischargedObligation`; discharging one at the route boundary is not offered (the handler a route would need is told its question, `ObligationDischarge`, which is what a per-API handler would key on).

`CustomPredicateError` covers both causes it carries — an unregistered name and
the registered predicate's own logic failing — under the same status the other
resolver outages get, since the common case is the latter. `SignatureHistoryUnavailable`
is a wired signature-history store that could not be reached, the same outage
shape as the rest of the row.

The 403/502 split is [INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial)
at the wire: a broken attribute store must never be reported as "not permitted".

`PolicyTooDeep` was 400 until CCR-QD-059. No path in this package lets a
*request* supply a policy — the middleware reads it from a compile-time
annotation, `addGuardedRoute` takes it at layer construction — so the "malformed or
hostile input" a 400 asserts cannot reach it, and a 400 is classified
non-retryable client error by SDKs and dashboards, so the operator whose policy
tree is too deep would never have been paged.

**Why the requirement above exists (ARCH-04).** The title of this behaviour was
true only because nobody had edited it. Before `ENFORCEMENT_ERROR_WIRE` each
HttpApi schema's status was a hand-picked `.pipe(outage)` / `.pipe(wiringMistake)`,
independent of `toResponse`'s classification: flipping `PolicyTooDeepResponse` to
`outage` made the HttpApi path answer 502 while the bare route answered 500, the
build stayed green and every test passed, because the OpenAPI test compared only
the *set* of statuses, which a swap leaves unchanged. The differential test in
`QadiHttpError.test.ts` now checks every tag, and the status is derived rather
than chosen.

The empty body is a disclosure boundary, not a convenience: a `Trace` names every
node's tag, its label and why it refused ([BEH-QD-054](./07-enforcement.md)).

## BEH-QD-260: The `HttpApiMiddleware` adapter's response body is no longer always empty

> **ADR:** [ADR-QD-072](../decisions/072-schema-taggederror-for-accessdenied-and-undischargedobligation.md)

```ts
export const RequirePermission: HttpApiMiddleware.Service<…>;
// declares `error: HTTP_ENFORCEMENT_ERROR_SCHEMAS` — the schema of every entry
// of ENFORCEMENT_ERROR_WIRE, each httpApiStatus-annotated: nine for the
// EnforcementError tags that are not a denial, a no-trace projection for
// `AccessDenied`, and two tag-only schemas for the two that must stay
// disclosure-safe. `projectHttpEnforcementFailure` reduces each real failure to
// its schema's `Type` before the encoder runs.
```

```
REQUIREMENT: For the nine `EnforcementError` tags that are not `AccessDenied`
             or `UndischargedObligation`, a failure reaching
             `RequirePermission`'s middleware MUST produce a response body
             carrying that error's real fields, encoded via its declared,
             `httpApiStatus`-annotated schema — not the empty body BEH-QD-177
             requires of the bare-`HttpRouter` adapter.
```

```
REQUIREMENT: For `UndischargedObligation` and `SubjectExtractionFailed`, the
             `HttpApiMiddleware` adapter's response body MUST carry only
             `_tag` — no other field, matching `toResponse`'s disclosure
             boundary. The `RequirePermission` middleware projects each through
             `ENFORCEMENT_ERROR_WIRE[tag].project`, and
             `HttpApiMiddleware`'s encoder answers from the tag-only schema.
```

```
REQUIREMENT: For `AccessDenied`, the `HttpApiMiddleware` adapter's response
             body MUST carry `AccessDeniedPublic`'s fields — `subjectId`,
             `policyTag`, `reason` — and MUST NOT carry `trace`.
             The `RequirePermission` middleware projects the real `AccessDenied` to an
             `AccessDeniedPublic` (`toAccessDeniedPublic`, the `project` of its
             table entry), and `HttpApiMiddleware`'s encoder answers from the
             same `AccessDeniedRefused` schema declared here.
```

**Corrected — `AccessDenied`'s body is no longer empty.** This section
originally required all three of `AccessDenied`/`UndischargedObligation`/
`SubjectExtractionFailed` to answer an empty body, on the grounds that
`AccessDenied`'s real fields include `trace`, which must never reach a
response. `AccessDeniedPublic` (`@qadi/core`'s `Errors.ts`) resolves that more
precisely: `subjectId`, `policyTag` and `reason` carry no disclosure concern of
their own — only `trace` does — so `AccessDenied` now gets the same treatment
as the nine outage/wiring tags (a real, `httpApiStatus`-annotated body), while
`UndischargedObligation` and `SubjectExtractionFailed` answer a tag-only body,
since neither has a `trace`-shaped field to redact and no reviewed public
projection of either exists (see BEH-QD-054 in
[07-enforcement.md](./07-enforcement.md)).

> **Corrected (ARCH-04, ADR-QD-081).** This section and ADR-QD-072 said those
> two "MUST stay empty" and that `RequirePermission` "hand-converts" them to
> an empty-body response. Neither has been true since the BL-01 fix: the body is
> the tag, because an empty body decodes to `undefined` through a generated
> `HttpApiClient`, which satisfies no `Schema.TaggedStruct`
> (`RequirePermissionClient.test.ts` depends on that). The hand-conversion is
> replaced by one in-channel projection for all twelve tags.

BEH-QD-177's status table is unchanged and still shared by both adapters — this
requirement is about the *body*, not the status, and only for the
`HttpApiMiddleware` adapter. `toResponse` (the bare
`HttpRouter` adapter `GuardRoute.ts`/`addGuardedRoute` use) is unchanged for the eleven `EnforcementError` tags: every
one still gets an empty body there, because a bare route has no `HttpApi`/OpenAPI
surface for a real body to serve, and no `AccessDeniedPublic`-shaped alternative
has been built for it.

The nine outage/wiring tags' real bodies exist because the audit's H4 finding was
specifically that OpenAPI and typed `HttpApi` clients saw nothing but an empty
403/502 for every possible failure — `RequirePermission.error` now declares each
schema, and `HttpApiMiddleware`'s own response encoder produces the body from it,
rather than a hand-built table converting every tag to
`HttpServerResponse.empty(...)` regardless of what it carried.

The two tag-only exceptions are declared as tag-only
`Schema.TaggedStruct`s (`UndischargedObligationRefused`, `SubjectExtractionRefused`);
`AccessDeniedRefused` is `AccessDeniedPublic` itself, annotated. None of the three
is `HttpApiSchema.Empty` (a bare `Schema.Void`). `HttpApiBuilder`'s response
encoder answers `Response.empty({ status })` for a no-content schema **without
inspecting the value being encoded at all**, so a `Schema.Void` member sitting in
the same declared union as the nine real schemas would "encode" any of them
successfully before its own, more specific schema is ever tried — silently
reverting every one of those nine bodies back to empty. Found by writing the test
this behavior requires (`http.test.ts`'s "an outage propagates typed through the
middleware, and the body carries real fields"), which failed against the first,
`HttpApiSchema.Empty`-based version of this change with every response coming
back an empty 403, not by inspection.

## BEH-QD-263: A generated client's static error type includes every enforcement outcome automatically

> **ADR:** [ADR-QD-075](../decisions/075-clienterror-typing-for-requirepermission.md)

```ts
export class RequirePermission extends HttpApiMiddleware.Service<
  RequirePermission,
  { provides: CurrentSubject; requires: never; clientError: RequirePermissionClientError }
>()("qadi/http/RequirePermission", {
  error: REQUIRE_PERMISSION_ERROR_SCHEMAS, // derived from ENFORCEMENT_ERROR_WIRE: the same 12 schemas BEH-QD-260/BEH-QD-177 describe
  requiredForClient: true,
});

export const passthroughClientLayer: <A extends HttpApiMiddleware.AnyId>(
  tag: Context.Key<A, …>,
) => Layer.Layer<HttpApiMiddleware.ForClient<A>>;
```

```
REQUIREMENT: For any endpoint `RequirePermission` guards, a client built via
             `HttpApiClient.make` MUST include the full set of twelve
             enforcement-outcome schemas in that call's *static* error type —
             not only the ones an endpoint's own `error:` array happens to
             declare.
```

```
REQUIREMENT: Building such a client MUST require a service discharging
             `HttpApiMiddleware.ForClient<RequirePermission>` from its
             context — a real, compile-time-enforced obligation, not an
             optional convenience. `passthroughClientLayer` MUST satisfy it
             generically, for `RequirePermission` or any future middleware
             sharing the same shape, without a middleware-specific variant.
```

BEH-QD-260 (and BEH-QD-177 before it) describe what a response *carries on the
wire* and how the bare-`HttpRouter`/`HttpApiMiddleware` adapters map it to a
status — settled, and unchanged by this behavior. This behavior is about a
different layer entirely: whether a generated client's **static type** — what
`Effect.catchTag` can name before a request is ever sent — includes those
outcomes at all. It did not, unless an endpoint hand-declared a subset of
`RequirePermission`'s own schemas in its own `error:` array (the shape
`examples/http-advanced/api.ts`'s `documents.me()` endpoint used before this
behavior, covering four of the twelve tags and never all twelve). Every other
endpoint `RequirePermission` guarded had **none** of them in its static type,
despite decoding all twelve identically at runtime — `HttpApiEndpoint`'s
runtime decode map already merged an endpoint's own errors with every attached
middleware's; only the *static* type left the middleware's contribution out,
because `HttpApiMiddleware.ClientError<A>` (what a generated client's type
draws from) resolves to `never` unless that middleware sets
`requiredForClient: true` and a `clientError` type parameter.

**Accepted limitation, disclosed rather than fixed:** `clientError` is
declared once, on the middleware class — there is no per-endpoint override
point for it. A `PublicEndpoint`-annotated endpoint's generated client method
therefore still claims all twelve tags as possible, even though it never
reaches `guard` and so can produce none of them. Detaching the middleware
per-endpoint to fix this precisely was considered and rejected: it would
reopen [ADR-QD-036](../decisions/036-qadi-http-package-shape.md)'s fail-closed
design, under which an endpoint's guardedness must be *declared*
(`RequiredPermission` or `publicEndpoint`), never inferred from which
middleware happens to be structurally attached to it.

## BEH-QD-178: The endpoint-level check runs before any resource exists

```
REQUIREMENT: `RequirePermission` MUST evaluate against an EMPTY resource, not an
             absent one.
```

The middleware enforces the contract-level requirement an endpoint declares,
before a resource has been loaded. An empty resource **denies** a policy reading
a resource attribute (403); an absent one *fails* with `MissingResource` (500),
reporting a caller's request as a server fault. Which of those happens is
[BEH-QD-055](./07-enforcement.md)'s requirement on `guard`, and it did the latter
while this package's comment described the former.

A resource-scoped check belongs in the handler, through `addGuardedRoute`'s `loadResource` or `guard`
directly, as defense in depth. `loadResource` is optional: the four-argument form evaluates against
`NO_RESOURCE` and hands the handler a plain `Resource`, as `authorizeRequest` does.

## BEH-QD-179: A duplicate requirement fails at construction

```
REQUIREMENT: `requiresPermission` MUST throw when the endpoint already carries a
             `RequiredPermission`.
```

Neither overwrite nor automatic `allOf` composition: overwrite risks replacing a
requirement with a weaker one, and composition would make the combinator's
meaning depend on how many times it was called
([ADR-QD-036](../decisions/036-qadi-http-package-shape.md)). Two permissions on
one endpoint are written as one `allOf([...])` policy.

**That check runs only when a caller actually calls `requiresPermission` —**
`Context` annotation is last-write-wins, so a second, bare
`.annotate(RequiredPermission, { permission, policy })` call, built by hand
rather than through `requiresPermission`, silently overwrote or narrowed
whatever requirement was already attached, with no throw and no log. `
RequiredPermission`'s own Shape (`RequiredPermissionShape`) is `
PermissionRequirement` branded (`Brand.nominal`, matching `@qadi/core`'s
`Authorized<P>`), so a raw `{ permission, policy }` object literal is no
longer assignable to it — only the value `requiresPermission` itself returns
satisfies `.annotate`'s second argument. This closes the gap at the type
level rather than by remembering not to write the bypass:
`packages/http/test/RequirePermission.tst.ts`'s "a raw `{ permission, policy }`
literal cannot bypass `requiresPermission`'s duplicate check" pins it.

## BEH-QD-180: The registry answers which permission, not which policy

```ts
export function addGuardedRoute<P extends Permission>(
  method: RouteMethod, path: PathInput, permission: P, policy: Policy, // evaluates against NO_RESOURCE
): <R>(handler: (authorized: Authorized<P>, resource: Resource) => Effect<HttpServerResponse, HttpEnforcementFailure, R>) => Layer<…>;
export function addGuardedRoute<P extends Permission, A extends Resource, LR = never>(
  method: RouteMethod, path: PathInput, permission: P, policy: Policy,
  loadResource: (request: HttpServerRequest) => Effect<A, never, LR>,
): <R>(handler: (authorized: Authorized<P>, resource: A) => Effect<HttpServerResponse, HttpEnforcementFailure, R>) => Layer<…>;
export const permissionRegistryRoute: (permission: Permission, policy: Policy) => Layer<…>;
export const permissionRegistryRouteUnguarded: (reason: string) => Layer<…>;
```

```
REQUIREMENT: The registry MUST record every route registered through
             `addGuardedRoute`, and every annotated endpoint of an API passed to
             `guardApi`, when the layer that guards it is built.
```

Both surfaces register as a consequence of guarding
([BEH-QD-328](#beh-qd-328-a-guarded-httpapi-is-registered-by-the-layer-that-guards-it)).
`addGuardedRoute` puts `PermissionRegistry` in its route layer's requirements, so a
guarded bare route cannot be added without the registry present, and `guardApi`'s
layer requires it the same way. The standalone `registerApi` this requirement used to
name was opt-in, and an `HttpApi` application that omitted it enforced endpoints the
snapshot did not list (CCR-QD-311); it is no longer exported.

```
REQUIREMENT: The registry MUST list an endpoint under a permission P only if
             `RequirePermission` enforces P on it.
```

`guardApi` registers from the access plan the middleware enforces, so the two
cannot read different things
([BEH-QD-320](#beh-qd-320-an-endpoints-access-is-read-once-from-the-endpoint),
[BEH-QD-328](#beh-qd-328-a-guarded-httpapi-is-registered-by-the-layer-that-guards-it)).
It used to read `HttpApi.reflect`'s merge of API-, group- and endpoint-level
annotations, so a group requirement over an endpoint-level `publicEndpoint` was
listed as guarded while the middleware served the endpoint to anyone.

```
REQUIREMENT: Every path `guardApi`'s middleware serves MUST be listed, under the
             permission it enforces; an endpoint value outside the plan is not
             served (BEH-QD-328).
```

The converse has one accepted limit, ARCH-36's residual, which ARCH-59 leaves as it
was: a vetted path that is never mounted stays listed. `guardApi(A)` provided to
`HttpApiBuilder.layer(A.prefix("/v1"))` refuses `/v1/a` with a 500, but the registry
still lists `GET /a`, which that wiring does not mount. Registration happens when
`guardApi`'s layer is built, from the value it was given, and `HttpApiBuilder` never
tells the middleware which API value it serves
([ADR-QD-118](../decisions/118-guardapi-plans-access-from-the-api-value.md)). Given
the value it serves, `guardApi(P)` on `layer(P)` lists exactly `GET /v1/a`.

```
REQUIREMENT: The registry MUST NOT participate in any authorization decision.
```

It is an audit surface. Note what it therefore does **not** answer, since a
reader will assume otherwise: it records the **permission**, and the permission
does not decide anything — `guard` stamps it into the witness and evaluates the
**policy**. Two endpoints reporting the same permission may enforce unrelated
rules, and the registry cannot list what is *un*guarded at all.

```
REQUIREMENT: The `/__permissions` route MUST be guarded by a policy, and an
             unguarded one MUST be chosen explicitly and named.
```

**Resolved as of CCR-QD-062**, having been recorded here as open. The route
publishes every guarded path and the permission each requires — a map of what to
attack and where — and it shipped as a bare `PermissionRegistryRoute` constant
with no guard, while the overview presented mounting it as ordinary wiring.

A route describing authorization that is not itself authorized inverts this
package's posture, so `permissionRegistryRoute(permission, policy)` is the only
way to get it guarded and `permissionRegistryRouteUnguarded(reason)` is the only
way to get it open. That is the same declare-do-not-infer rule
[BEH-QD-174](#beh-qd-174-authorization-is-declared-never-inferred) applies to
endpoints, and the `reason` plays the same role as `publicEndpoint`'s.

The unguarded form logs a warning on **every request**, not once at
construction: a local development choice that reaches production should be
visible in the logs of the environment it is wrong in. It shares one
package-private constructor with `portRoutesUnguarded`, which writes the
warning text once and takes the cadence as a closed, required argument
(`"every-request"` here, `"once"` for the port routes, ADR-QD-107), so the two
cadences are named at their calls rather than implied by how each body is
written.

Enforcement runs through `addGuardedRoute`, so a denial is 403 and a broken subject
store is 502 — the introspection route obeys the same mapping as every other
guarded route rather than inventing one.

The other caveat stands: the registry records the **permission**, and the
permission does not decide anything.

## BEH-QD-320: An endpoint's access is read once, from the endpoint

> **Invariant:** [INV-QD-034](../invariants.md#inv-qd-034-an-endpoints-authorization-is-declared-not-inferred)

```ts
export type AccessDeclarationKey = "RequiredPermission" | "PublicEndpoint";
// declared in AccessPlan.ts (package-private), re-exported by GuardApi.ts
export class MisplacedAccessDeclaration extends Data.TaggedError("MisplacedAccessDeclaration")<{
  readonly scope: "group" | "api";
  readonly identifier: string;
  readonly key: AccessDeclarationKey;
}> {}
export class AccessNotDeclared extends Data.TaggedError("AccessNotDeclared")<{
  readonly group: string;
  readonly endpoint: string;
}> {}
export type ApiGuardRefusal = MisplacedAccessDeclaration | RequirePermissionNotAttached | AccessNotDeclared;
// The readers of an endpoint's declaration are private to AccessPlan.ts: `planApi` is the one reader.
```

```
REQUIREMENT: `guardApi` MUST read each endpoint's access once, over that
             endpoint's own annotations and no other scope, into the access plan
             its middleware enforces; the middleware MUST NOT read annotations.
             When both keys are present, `RequiredPermission` MUST win.
```

```
REQUIREMENT: A `RequiredPermission` or `PublicEndpoint` on a group or an API MUST
             be refused: `guardApi` fails layer construction with
             `MisplacedAccessDeclaration` before it registers anything.
```

```
REQUIREMENT: `requiresPermission` MUST NOT accept a group or an API.
```

Two readers over two scopes was the defect (ARCH-18): the middleware read the
endpoint, and the registry read the merge of API, group and endpoint annotations. A group
requirement over an endpoint-level `publicEndpoint` was listed under its
permission while the middleware served the endpoint as public. The middleware
cannot read an API-level annotation at all (Effect hands it `{ endpoint, group }`
and never the API's annotations), and a group-level one reopens the cross-level
override [BEH-QD-179](#beh-qd-179-a-duplicate-requirement-fails-at-construction)
exists to forbid. So the endpoint is the one scope, and a declaration anywhere
else is refused loudly rather than ignored: ignoring it is the
annotate-and-forget failure [BEH-QD-174](#beh-qd-174-authorization-is-declared-never-inferred)
rejects.

A declaration for a whole group is written with
`HttpApiGroup.annotateEndpoints(RequiredPermission, requiresPermission(endpoint, …))`,
which Effect writes into each endpoint's own annotations, where the plan sees it.
The refusal is a typed layer-build failure, outside `ENFORCEMENT_ERROR_WIRE`,
like an endpoint that declares neither: it is a wiring mistake, not an
enforcement outcome.

Until CCR-QD-396 there were still two readers: `guardApi`'s walk and the
middleware, which re-read the endpoint's annotations (and its group's) when
Effect built each route. They agreed, but only because a name string
(`"<group>/<endpoint>"`, built in one place after ARCH-46) joined them, and that
join was wrong (BEH-QD-328). The plan (`planApi`) is now the only reader; the three
readers `endpointAccess`, `EndpointAccess` and `misplacedDeclarations` are its
private implementation, and none was ever released.

## BEH-QD-321: One authorization step at the HTTP edge

> **Invariant:** [INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial), [INV-QD-032](../invariants.md#inv-qd-032-a-guarded-resource-is-the-evaluated-resource)

```ts
export interface AuthorizedRequest<P extends Permission, A extends Resource> {
  readonly authorized: Authorized<P>;
  readonly resource: A; // the evaluated one
  readonly subject: AuthSubject;
}
export const authorizeRequest: <P extends Permission, A extends Resource, LR = never>(
  permission: P,
  policy: Policy,
  loadResource?: (request: HttpServerRequest) => Effect<A, never, LR>, // default: NO_RESOURCE
) => (
  request: HttpServerRequest,
) => Effect<
  AuthorizedRequest<P, A>,
  HttpEnforcementFailure,
  StandingEvaluationServices | SubjectExtractor | LR
>;
```

```
REQUIREMENT: Every `@qadi/http` surface (`RequirePermission`, `addGuardedRoute`,
             `portRoutes`, `portRoutesUnguarded` and the decision stream's
             recheck) MUST authorize through the request-enforcement module
             ([BEH-QD-335](#beh-qd-335-a-request-is-enforced-through-one-module)),
             whose edge step is `authorizeRequest`; none MAY extract a subject,
             load a resource or call `guard` for the edge check itself.
```

```
REQUIREMENT: The subject MUST be extracted before the resource is loaded, so a
             failing credential store never runs `loadResource`.
```

```
REQUIREMENT: A denial (`AccessDenied`, `UndischargedObligation`) and a
             `SubjectExtractionFailed` MUST each be logged exactly once, by the
             step that turned it into a response: `authorizeRequest` for the
             edge check, through `logDenial` and `logSubjectExtractionFailed`,
             and the module's handler step (for `RequirePermission`, both
             its guarded and its public endpoints, `addGuardedRoute` and the
             port routes) for a denial a handler's own `guard` raises,
             through `logDenial`. Each denial line MUST carry the log annotation
             `qadi.denial_site`: `"edge"` or `"handler"`. A denial MUST NOT be
             logged twice. A resolver outage MUST NOT be logged by the edge.
```

```
REQUIREMENT: The handler MUST NOT be invoked unless `authorizeRequest`
             allowed. The module runs it with the returned `subject` as
             `CurrentSubject` and MUST use the returned `resource`, never load
             it again.
```

```
REQUIREMENT: A recheck's failure MUST be labelled by
             `classifyHttpEnforcementFailure`, the table the connect-time status
             comes from: a broken credential store is an `outage` on both.
```

The edge job (who is asking, against what, and may they) was written three times
and the third copy drifted: the decision stream's recheck invented a fifth label
for a broken credential store and logged at other levels in other words
([BEH-QD-201](./26-decision-stream.md)). The step returns a value over a closed
error union and does not take a continuation, because a tap over a caller's open
error type does not typecheck (the limit `GuardRoute.ts` documents for
`catchTag`), and the middleware's handler error is `unhandled` anyway. It takes a
resource *loader*, not a value, so extraction can run first.

`authorizeRequest` registers nothing, because it is not a route. A surface this
package does not ship (a WebSocket upgrade, an RPC handler) that should appear in
`/__permissions` registers itself with `PermissionRegistry.register` when its layer is
built; the two surfaces this package ships register as a consequence of guarding
([BEH-QD-328](#beh-qd-328-a-guarded-httpapi-is-registered-by-the-layer-that-guards-it)).

Under `RequirePermission` the projection and the captured standing services still
wrap the handler: a defense-in-depth `guard` inside a handler finds the services,
and an enforcement failure it raises is projected to its redacted wire value. A
denial it raises is logged by the module's handler step, on the handler's effect alone and
annotated `"handler"`, so the edge's own denial (already logged, annotated
`"edge"`) is never logged twice. A bare route's handler may let that failure
through: its error channel is the closed `HttpEnforcementFailure`, and the route
answers it with `toResponse` and logs a denial the same way, because both go through the one handler step. (ARCH-19 D-19-d had
left a handler-raised denial unlogged, which contradicted the `logDenial` row in
`spec/overview.md`; ARCH-45 reverses it.)
`guard` builds its handler eagerly ([ADR-QD-035](../decisions/035-witness-guard-primitive.md));
the step returns the witness and the surface builds the handler only on an allow.

## BEH-QD-328: A guarded HttpApi is registered by the layer that guards it

> **Invariant:** [INV-QD-180](../invariants.md#inv-qd-180-permissions-lists-what-qadihttp-enforces-and-only-that), [INV-QD-034](../invariants.md#inv-qd-034-an-endpoints-authorization-is-declared-not-inferred)

```ts
export const guardApi: <Id extends string, Groups extends HttpApiGroup.Constraint>(
  api: HttpApi.HttpApi<Id, Groups> & EveryEndpointGuarded<Groups>,
) => Layer.Layer<
  RequirePermission,
  ApiGuardRefusal,
  SubjectExtractor | StandingEvaluationServices | PermissionRegistry
>;
export type ApiGuardRefusal = MisplacedAccessDeclaration | RequirePermissionNotAttached | AccessNotDeclared;
export class AccessNotDeclared extends Data.TaggedError("AccessNotDeclared")<{
  readonly group: string;
  readonly endpoint: string;
}> {}
export class RequirePermissionNotAttached extends Data.TaggedError("RequirePermissionNotAttached")<{
  readonly group: string;
  readonly endpoint: string;
}> {}
export type UnguardedEndpoints<Groups> = /* the identifiers of endpoints without RequirePermission, or never */;
export type EveryEndpointGuarded<Groups> = /* unknown when UnguardedEndpoints<Groups> is never */;
```

```
REQUIREMENT: `guardApi(api)` MUST register every `Required` endpoint of `api` with
             `PermissionRegistry` when it is built, and MUST register nothing if
             it refuses to build.
```

```
REQUIREMENT: Every endpoint of `api`, declared or not, MUST have the
             `RequirePermission` middleware attached. `guardApi` MUST fail with
             `RequirePermissionNotAttached`, naming the group and the endpoint,
             for one that does not, and MUST NOT type-check the call at all where
             the type is precise enough to see it.
```

```
REQUIREMENT: The middleware `guardApi` provides MUST answer 500 with one error log
             line, and MUST NOT serve the request, for an endpoint value that is
             not one `guardApi` walked: an endpoint of another API, including one
             that reuses the same group and endpoint identifiers, or of a
             `prefix`ed copy of the API.
```

```
REQUIREMENT: Precedence: `guardApi` MUST fail with the first misplaced
             declaration (the API, then groups), else the first unattached
             endpoint, else the first undeclared one.
```

`RequirePermissionLive` enforced and `registerApi` described, composed independently,
so the audit surface could omit what was enforced (an application that forgot the
second) and, worse, list what was not. Effect documents the trap: "Endpoints added
after this method is called do not receive the middleware"
(`HttpApi.middleware`). `.middleware(RequirePermission).add(group)`, an API with no
middleware, or middleware on one group only all compile and all serve the annotated
endpoint with no authorization, while a registry that listed every `Required`
endpoint reported it as requiring its permission. That is
[INV-QD-034](../invariants.md#inv-qd-034-an-endpoints-authorization-is-declared-not-inferred)'s
annotate-and-forget failure one level up: the endpoint is annotated and the middleware
forgotten. Nothing in this repository hit it; it was found by serving five real
compositions and comparing the listing with the answers.

`guardApi` is the one layer for an `HttpApi`: it provides `RequirePermission` and, by
being built, registers what it will enforce, so "listed iff enforced" holds by
construction. It requires `PermissionRegistry`, which `addGuardedRoute` always has.
The membership refusal closes the one remaining gap: `guardApi(A)` provided to
`HttpApiBuilder.layer(B)` would otherwise enforce B's endpoints without registering
them. Membership is by the endpoint *value* (ARCH-59, [ADR-QD-118](../decisions/118-guardapi-plans-access-from-the-api-value.md)): Effect hands the middleware
the very group and endpoint objects `HttpApi.reflect` yields for the API it serves,
so a hit means "this exact endpoint was vetted". It was keyed by identifier strings
until ARCH-59's probe found that an API reusing a group and endpoint name passed the
check and was served under another API's vetting (enforcing, say, `document:write`
on a path the registry listed nothing for, or serving a public endpoint while the
API-level declaration `guardApi` itself refuses sat ignored). Pass `guardApi` the same
`HttpApi` value `HttpApiBuilder.layer` serves. One `guardApi` serves one API; compose APIs with `HttpApi.addHttpApi`, or give
each `HttpApiBuilder.layer` its own `guardApi` with `Layer.provide`, which is local.

All three refusals are wiring mistakes answered outside `ENFORCEMENT_ERROR_WIRE`
([ADR-QD-081](../decisions/081-enforcement-error-classes-live-in-core.md)): a typed layer-build
failure (or, for an endpoint outside the plan, a logged 500), like a declaration on
a group ([BEH-QD-320](#beh-qd-320-an-endpoints-access-is-read-once-from-the-endpoint)).
`RequirePermissionLive`, `registerApi` and `guardRoute` are not exported
([ADR-QD-099](../decisions/099-entry-points-are-a-closed-list.md)):
`guardRoute`'s only distinct capability was enforcing without registering, and
`authorizeRequest` stays public for surfaces this package does not ship.

## BEH-QD-335: A request is enforced through one module

> **Invariant:** [INV-QD-243](../invariants.md#inv-qd-243-every-qadihttp-request-path-enforces-and-logs-through-one-module), [INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial), [INV-QD-032](../invariants.md#inv-qd-032-a-guarded-resource-is-the-evaluated-resource)

```ts
// Package-private: `packages/http/src/AuthorizeRequest.ts` is not in the barrel.
// Only `authorizeRequest` and `AuthorizedRequest` are public, through `GuardApi.ts`.
export type EnforcementProjection<B, E, R> = (error: HttpEnforcementFailure) => Effect<B, E, R>;
export const answerWithResponse: EnforcementProjection<HttpServerResponse, never, never>;
export const answerInChannel: EnforcementProjection<never, ProjectedHttpEnforcementFailure, never>;
export function enforceRequest(access, project, handler): (request: HttpServerRequest) => Effect</* … */>;
export function enforceSubject(project, handler): (request: HttpServerRequest) => Effect</* … */>;
export function enforcePublic(project, handler): Effect</* … */>;
```

```
REQUIREMENT: Every `@qadi/http` surface that extracts a subject (`addGuardedRoute`,
             `RequirePermission`, `portRoutes`, `portRoutesUnguarded` and the
             decision stream's recheck), and `RequirePermission`'s public
             endpoints, MUST enforce through the request-enforcement module, and MUST NOT extract the subject, tap a
             denial into the log or catch an enforcement failure itself.
```

```
REQUIREMENT: The module's handler step MUST log a handler-raised denial exactly
             once, annotated `"handler"`, and MUST answer every
             `HTTP_ENFORCEMENT_TAGS` failure through the projection the caller
             supplied. A caller supplies a projection and a handler and nothing
             else; the denial tap and the failure catch exist once.
```

```
REQUIREMENT: The subject-only mode MUST extract the subject, MUST log an
             extraction failure through `logSubjectExtractionFailed`, MUST provide
             `CurrentSubject` and MUST run the handler. It MUST apply no policy,
             and MUST NOT run the handler when extraction fails.
```

```
REQUIREMENT: The public mode MUST run the handler as `anonymous` through the
             module's handler step, MUST NOT extract a subject or apply a
             policy, and MUST project every failure through the caller's
             projection.
```

```
REQUIREMENT: Whether an endpoint belongs to the API `guardApi` vetted MUST be
             decided by the access plan `guardApi` built, by endpoint value
             (BEH-QD-328, ADR-QD-118), not by this module or by a name string.
```

Subject extraction, the edge decision, `CurrentSubject` and the handler-denial step
were written once per surface, and the copies drifted: `portRoutesUnguarded`
extracted by hand and logged nothing
([BEH-QD-336](#beh-qd-336-an-unguarded-port-route-logs-a-subject-extraction-failure)).
`AuthorizeRequest.ts` is now the request-enforcement module, with three modes: the
guarded mode runs `authorizeRequest` (the edge step of
[BEH-QD-321](#beh-qd-321-one-authorization-step-at-the-http-edge)) and then the
handler step, the subject-only mode extracts and runs the handler step with no
policy, and the public mode (`enforcePublic`, ARCH-61) runs the handler step as
`anonymous`, extracting nothing
([BEH-QD-359](#beh-qd-359-a-public-endpoint-logs-a-denial-its-own-handler-raises)). The decision stream's recheck runs the guarded mode and answers with its
own projection, which ends the stream; the module knows nothing about streams.
Which projections exist is the caller's business: `answerWithResponse` is
`toResponse`, for a bare route and the port routes, and `answerInChannel` is
`projectHttpEnforcementFailure`, the in-channel wire value the middleware returns.

The module is package-private (ADR-QD-099); `authorizeRequest` is still the public
edge step, so no export is added or removed. Which table answers each failure
(`ENFORCEMENT_ERROR_WIRE`) is unchanged; only who applies it moved (ARCH-46,
[ADR-QD-108](../decisions/108-a-request-is-enforced-once-through-one-module.md)).
The module once also held the endpoint member key (`"<group>/<endpoint>"`), which
`guardApi` and the middleware's membership check shared; ARCH-59 deleted it, because an API reusing the names passed it, and
membership is now the access plan's
([ADR-QD-118](../decisions/118-guardapi-plans-access-from-the-api-value.md)).

## BEH-QD-336: An unguarded port route logs a subject-extraction failure

> **Invariant:** [INV-QD-243](../invariants.md#inv-qd-243-every-qadihttp-request-path-enforces-and-logs-through-one-module), [INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial)

```
REQUIREMENT: `portRoutesUnguarded` MUST log a `SubjectExtractionFailed` exactly
             once, through `logSubjectExtractionFailed`, as every guarded path
             does. It MUST answer it 502 with the tag-only body `toResponse`
             writes, and MUST NOT read the port.
```

`portRoutesUnguarded` extracted the subject with `SubjectExtractor.extract(request)`
and answered `toResponse(extracted.failure)`, so a credential-store outage behind it
produced a 502 and no log line, where `addGuardedRoute`, `RequirePermission`, the
guarded `portRoutes` and the decision stream all log it. An operator looking for the
cause of a run of 502s found nothing. The 2026-11-08 architecture review found it
(ARCH-46); the route now enforces through the subject-only mode of
[BEH-QD-335](#beh-qd-335-a-request-is-enforced-through-one-module). The regression
test is in `packages/http/test/PortRoutes.test.ts` (written red first), and the
caller × failure table in `packages/http/test/RequestEnforcement.test.ts` holds the
same cell.

## BEH-QD-338: The port routes and their client share one address

> **Invariant:** [INV-QD-241](../invariants.md#inv-qd-241-a-remote-port-fails-where-its-store-fails), [INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial)

```
REQUIREMENT: `portRoutes`, `portRoutesUnguarded` and `remotePortsLayer` MUST
             build a port's path from one definition, `<prefix>/<PortName>`,
             whose prefix defaults to `/__ports` on both sides. A host that
             gives the routes and the client the same `prefix`, or neither,
             MUST be answered for every port it serves.
```

```
REQUIREMENT: `remotePortsLayer` MUST read the reply from the response body
             whatever the HTTP status. An `Answered`, `Unavailable` or
             `Refused` body is that reply under any status. A body that is not
             a reply (a proxy's HTML error page) MUST be the port's own error,
             never an answer. The status, from `PORT_REPLY_STATUS`, is for the
             layers in between.
```

The definition is `packages/http/src/PortRouteAddress.ts` (`PORT_ROUTE_PREFIX`,
`portPath`). It is package-private ([ADR-QD-099](../decisions/099-entry-points-are-a-closed-list.md)),
so a host names a prefix only through `PortRoutesOptions.prefix` and
`RemotePortsOptions.prefix`; no export is added or removed. `portPath` drops trailing
slashes from a prefix, so `"/x/"` and `"/"` never produce a `//` in the route. The reply-body
contract is stated beside the address, and `PORT_REPLY_STATUS` in `PortRoutes.ts`
points to it.

Each adapter used to declare its own default prefix and build the path inline.
A change to one would have made every remote read a 404 with no reply body: fail
closed, because the client reports it as the port's own error, but every
re-check broken. The 2026-11-08 architecture review found it (ARCH-52).

`packages/http/test/PortRoutes.test.ts` pins it: a round trip under `/x/ports` for
both route forms and every port, the default path absent and a default-prefix
client failing, and three canned responses for the status contract. The route
design itself is [ADR-QD-107](../decisions/107-a-port-is-answered-remotely-through-its-description.md)'s,
and [BEH-QD-333](./34-remote-ports.md#beh-qd-333-an-answer-with-no-json-form-must-be-refused-never-thrown)
states the same status rule from the remote-port side.

## BEH-QD-359: A public endpoint logs a denial its own handler raises

> **Invariant:** [INV-QD-243](../invariants.md#inv-qd-243-every-qadihttp-request-path-enforces-and-logs-through-one-module), [INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial)

```
REQUIREMENT: A denial a `publicEndpoint`'s handler `guard` raises MUST be
             answered 403 and logged exactly once, through `logDenial`,
             annotated `qadi.denial_site: "handler"`, as on an endpoint with a
             requirement. Its outage MUST be answered by `answerInChannel`'s
             projection, so neither `trace` nor a resolver `cause` reaches the
             body.
```

A public endpoint has no edge check, so the only denial it can produce is its
handler's own `guard`'s. `RequirePermission`'s public arm provided `anonymous` to
the handler itself and did nothing else, so that denial was answered 403 and logged
nowhere: lost ARCH-47's probe (`b0b9363`) saw `/pub 403 … logs: []`. Its body was
redacted too, but only because `HttpApiMiddleware`'s encoder drops the properties
its declared schema does not name, not by the projection
[ADR-QD-072](../decisions/072-schema-taggederror-for-accessdenied-and-undischargedobligation.md) and
[ADR-QD-081](../decisions/081-enforcement-error-classes-live-in-core.md) say
redaction is. ARCH-61 ported the fix through the public mode of
[BEH-QD-335](#beh-qd-335-a-request-is-enforced-through-one-module), so the arm
runs the same handler step as `Required`. The regression tests are in
`packages/http/test/http.test.ts` (written red first), and the caller × failure
table in `packages/http/test/RequestEnforcement.test.ts` has a `publicEndpoint` row.

---

_Previous: [22 — The Promise Facade](./22-promise-facade.md)_
