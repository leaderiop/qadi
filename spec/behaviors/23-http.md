# 23 — HTTP Enforcement

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-23                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-08-23                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.0 (2026-08-23): Initial release (CCR-QD-059) |

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
REQUIREMENT: An endpoint annotated with neither `RequiredPermission` nor
             `PublicEndpoint` MUST be refused, with status 500.
```

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
export const ENFORCEMENT_ERROR_TAGS: ReadonlyArray<EnforcementError["_tag"]>;
export const toResponse: (error: EnforcementError) => HttpServerResponse;
```

```
REQUIREMENT: `toResponse` MUST be exhaustive over `EnforcementError`, and MUST
             return an EMPTY body for every tag.
```

| Error | Status | Because |
| ----- | ------ | ------- |
| `AccessDenied`, `UndischargedObligation` | 403 | the policy's answer |
| `AttributeResolveError`, `RelationshipResolveError`, `DecisionHistoryUnavailable` | 502 | a dependency of this service broke |
| `MissingAction`, `MissingResource`, `MissingResourceId`, `PolicyTooDeep` | 500 | a wiring mistake in this service |

The 403/502 split is [INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial)
at the wire: a broken attribute store must never be reported as "not permitted".

`PolicyTooDeep` was 400 until CCR-QD-059. No path in this package lets a
*request* supply a policy — the middleware reads it from a compile-time
annotation, `guardRoute` takes it at layer construction — so the "malformed or
hostile input" a 400 asserts cannot reach it, and a 400 is classified
non-retryable client error by SDKs and dashboards, so the operator whose policy
tree is too deep would never have been paged.

The empty body is a disclosure boundary, not a convenience: a `Trace` names every
node's tag, its label and why it refused ([BEH-QD-054](./07-enforcement.md)).

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

## BEH-QD-180: The registry answers which permission, not which policy

```ts
export const registerApi: (api: HttpApi.Any) => Layer.Layer<never, never, PermissionRegistry>;
export const PermissionRegistryRoute: Layer.Layer<HttpRouter.HttpRouter>;
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
REQUIREMENT: The registry MUST NOT participate in any authorization decision.
```

It is an audit surface. Note what it therefore does **not** answer, since a
reader will assume otherwise: it records the **permission**, and the permission
does not decide anything — `guard` stamps it into the witness and evaluates the
**policy**. Two endpoints reporting the same permission may enforce unrelated
rules, and the registry cannot list what is *un*guarded at all.

> **Open, and deliberately not resolved here.** `PermissionRegistryRoute` mounts
> `/__permissions` with no guard of its own, so an anonymous caller receives every
> guarded path and permission name. Whether it should require a permission,
> ship behind a flag, or be removed is a decision the ADR never made and this
> document does not invent. Until then, do not mount it on a public surface.

---

_Previous: [22 — The Promise Facade](./22-promise-facade.md)_
