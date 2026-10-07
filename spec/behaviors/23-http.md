# 23 — HTTP Enforcement

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-23                                    |
> | Revision       | 1.6                                            |
> | Effective Date | 2026-10-07                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.6 (2026-10-07): BEH-QD-320 — an endpoint's access is read once, from the endpoint, by `RequirePermission` and `registerApi` through `endpointAccess`; a `RequiredPermission` or `PublicEndpoint` on a group or API is refused by both (`MisplacedAccessDeclaration`); BEH-QD-180's `registerApi` signature corrected and it lists an endpoint only if the middleware enforces it (CCR-QD-196)<br>1.5 (2026-10-04): BEH-QD-177 gains a derived-status requirement and `ENFORCEMENT_ERROR_WIRE`, the one table every status, wire schema and `RequirePermission` error list derives from; BEH-QD-260 corrected — the two tag-only bodies were never empty, and the hand-converted arms are one in-channel projection; BEH-QD-263's list is derived (ADR-QD-081, CCR-QD-155)<br>1.4 (2026-09-14): BEH-QD-263 — a generated client's static error type for a `RequirePermission`-guarded endpoint now includes every enforcement outcome automatically, via `requiredForClient`/`clientError` and the new generic `passthroughClientLayer` helper, rather than a per-endpoint hand-declared `error:` subset; the disclosed `PublicEndpoint` over-approximation limitation is recorded alongside it (ADR-QD-075, CCR-QD-151)<br>1.3 (2026-09-08): BEH-QD-260 — the `HttpApiMiddleware` adapter's response body now carries real fields for the nine `EnforcementError` tags that are not a denial, declared through `httpApiStatus`-annotated schemas rather than produced by `toResponse`'s hand table; the bare-`HttpRouter` adapter is unchanged (ADR-QD-072, CCR-QD-141)<br>1.2 (2026-09-07): BEH-QD-177's status table was missing two of the eleven mappings `enforcementErrorTags` actually covers — `CustomPredicateError` and `SignatureHistoryUnavailable`, both 502, added to the row (CCR-QD-110)<br>1.1 (2026-08-24): BEH-QD-180 — `/__permissions` is guarded by default; the open question closed (CCR-QD-062)<br>1.0 (2026-08-23): Initial release (CCR-QD-059) |

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
REQUIREMENT: An endpoint that itself carries neither `RequiredPermission` nor
             `PublicEndpoint` MUST be refused, with status 500.
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

**500 rather than 403**, and the distinction is the point: this is a wiring
mistake in the service, not a decision about the caller. A 403 would send an
operator to audit permissions for a problem that is in their endpoint
definition. The middleware also logs the endpoint's identifier at error level,
because a refusal nobody can diagnose is only half a fix.

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
export const toResponse: (error: EnforcementError) => HttpServerResponse;
export const HTTP_STATUS_BY_CLASS: { denied: 403; outage: 502; wiringMistake: 500 };
export const ENFORCEMENT_ERROR_WIRE: EnforcementErrorWireTable; // one entry per tag
// ENFORCEMENT_ERROR_TAGS and classifyEnforcementError come from @qadi/core (BEH-QD-270).
```

```
REQUIREMENT: `toResponse` MUST be exhaustive over `EnforcementError`, and MUST
             return an EMPTY body for every tag.
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

`CustomPredicateError` covers both causes it carries — an unregistered name and
the registered predicate's own logic failing — under the same status the other
resolver outages get, since the common case is the latter. `SignatureHistoryUnavailable`
is a wired signature-history store that could not be reached, the same outage
shape as the rest of the row.

The 403/502 split is [INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial)
at the wire: a broken attribute store must never be reported as "not permitted".

`PolicyTooDeep` was 400 until CCR-QD-059. No path in this package lets a
*request* supply a policy — the middleware reads it from a compile-time
annotation, `guardRoute` takes it at layer construction — so the "malformed or
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
             boundary. `RequirePermissionLive` projects each through
             `ENFORCEMENT_ERROR_WIRE[tag].project`, and
             `HttpApiMiddleware`'s encoder answers from the tag-only schema.
```

```
REQUIREMENT: For `AccessDenied`, the `HttpApiMiddleware` adapter's response
             body MUST carry `AccessDeniedPublic`'s fields — `subjectId`,
             `policyTag`, `reason` — and MUST NOT carry `trace`.
             `RequirePermissionLive` projects the real `AccessDenied` to an
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
> two "MUST stay empty" and that `RequirePermissionLive` "hand-converts" them to
> an empty-body response. Neither has been true since the BL-01 fix: the body is
> the tag, because an empty body decodes to `undefined` through a generated
> `HttpApiClient`, which satisfies no `Schema.TaggedStruct`
> (`RequirePermissionClient.test.ts` depends on that). The hand-conversion is
> replaced by one in-channel projection for all twelve tags.

BEH-QD-177's status table is unchanged and still shared by both adapters — this
requirement is about the *body*, not the status, and only for the
`HttpApiMiddleware` adapter. `toResponse`/`handleEnforcementErrors` (the bare
`HttpRouter` adapter `GuardRoute.ts`/`addGuardedRoute` use) are unchanged: every
tag still gets an empty body there, because a bare route has no `HttpApi`/OpenAPI
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

A resource-scoped check belongs in the handler, through `guardRoute` or `guard`
directly, as defense in depth.

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
export const registerApi: <Id extends string, Groups extends HttpApiGroup.Constraint>(
  api: HttpApi.HttpApi<Id, Groups>,
) => Layer.Layer<never, MisplacedAccessDeclaration, PermissionRegistry>;
export const permissionRegistryRoute: (permission: Permission, policy: Policy) => Layer<…>;
export const permissionRegistryRouteUnguarded: (reason: string) => Layer<…>;
```

```
REQUIREMENT: The registry MUST record every route registered through
             `addGuardedRoute`, and every annotated endpoint of an API passed to
             `registerApi`.
```

`addGuardedRoute` puts `PermissionRegistry` in its route layer's requirements, so
a guarded bare route cannot be added without the registry present. `registerApi`
is opt-in by contrast, and an `HttpApi` application that omits it gets an empty
snapshot.

```
REQUIREMENT: The registry MUST list an endpoint under a permission P only if
             `RequirePermission` enforces P on it.
```

The registry reads an endpoint through `endpointAccess`, over the endpoint's own
annotations, which is what the middleware reads
([BEH-QD-320](#beh-qd-320-an-endpoints-access-is-read-once-from-the-endpoint)).
It used to read `HttpApi.reflect`'s merge of API-, group- and endpoint-level
annotations, so a group requirement over an endpoint-level `publicEndpoint` was
listed as guarded while the middleware served the endpoint to anyone.

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
visible in the logs of the environment it is wrong in.

Enforcement runs through `guardRoute`, so a denial is 403 and a broken subject
store is 502 — the introspection route obeys the same mapping as every other
guarded route rather than inventing one.

The other caveat stands: the registry records the **permission**, and the
permission does not decide anything.

## BEH-QD-320: An endpoint's access is read once, from the endpoint

> **Invariant:** [INV-QD-034](../invariants.md#inv-qd-034-an-endpoints-authorization-is-declared-not-inferred)

```ts
export type EndpointAccess = Data.TaggedEnum<{
  Required: { readonly requirement: RequiredPermissionShape };
  Public: { readonly declaration: PublicDeclaration };
  Undeclared: {};
}>;
export const endpointAccess: (annotations: Context.Context<never>) => EndpointAccess;
export const misplacedDeclarations: (
  annotations: Context.Context<never>,
) => ReadonlyArray<"RequiredPermission" | "PublicEndpoint">;
export class MisplacedAccessDeclaration extends Data.TaggedError("MisplacedAccessDeclaration")<{
  readonly scope: "group" | "api";
  readonly identifier: string;
  readonly key: "RequiredPermission" | "PublicEndpoint";
}> {}
```

```
REQUIREMENT: `RequirePermission` and `registerApi` MUST each read an endpoint's
             access through `endpointAccess`, over that endpoint's own
             annotations and no other scope. When both keys are present,
             `RequiredPermission` MUST win.
```

```
REQUIREMENT: A `RequiredPermission` or `PublicEndpoint` on a group or an API MUST
             be refused by both readers: `RequirePermission` answers 500 for
             every endpoint of that group and logs the group's identifier and the
             key; `registerApi` fails layer construction with
             `MisplacedAccessDeclaration` before it registers anything.
```

```
REQUIREMENT: `requiresPermission` MUST NOT accept a group or an API.
```

Two readers over two scopes was the defect: the middleware read the endpoint,
and the registry read the merge of API, group and endpoint annotations. A group
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
which Effect writes into each endpoint's own annotations, where both readers see
it. The refusal reaches the caller as a 500 and a log line, outside
`ENFORCEMENT_ERROR_WIRE`, like an endpoint that declares neither: it is a wiring
mistake, not an enforcement outcome.

---

_Previous: [22 — The Promise Facade](./22-promise-facade.md)_
