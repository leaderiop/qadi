# ADR-QD-036 — `@qadi/http`: two framework adapters, one enforcement path, one registry

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-036                                   |
> | Revision       | 1.2                                             |
> | Effective Date | 2026-08-22                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architectural Decision                         |
> | Change History | 1.2 (2026-08-22): Three corrections found by the first real HTTP round-trip test — `requiresPermission` is no longer `.pipe()`-composable at all (the widened return type it shipped with in 1.1 breaks `HttpApiBuilder.group`'s handler exhaustiveness for the whole group, not just later `.pipe()` chaining); its parameter type is a minimal structural `AnnotatedEndpoint`, not `HttpApiEndpoint.Top` (a param-less endpoint isn't actually assignable to `Top`); `GuardRoute.ts`'s `guardRoute` under-excluded `CurrentSubject` from its declared return type (CCR-QD-046)<br>1.1 (2026-08-22): `requiresPermission`'s type-preservation claim corrected — it does not survive a reusable generic wrapper; the shipped signature returns the widened `HttpApiEndpoint.Top` instead (CCR-QD-045)<br>1.0 (2026-08-22): Initial release (CCR-QD-042) |

---

## Context

Every enforcing entry point Qadi already had (`assert`, `enforce`,
`enforceProjected`, `filter`, and now `guard` — [ADR-QD-035](./035-witness-guard-primitive.md))
assumes the caller already has an `Effect` to guard, hand-wired at the call
site. Nothing connected any of it to `effect/unstable/http` or
`effect/unstable/httpapi`. A developer building an HTTP service on Qadi had to
hand-roll that wiring per route, with the permission a route required visible
nowhere but the handler body, and no way to prove two hand-rolled call sites
agreed with each other. `@qadi/http` closes that gap, for both of Effect v4's
HTTP surfaces: the declarative `HttpApi`/`HttpApiEndpoint`/`HttpApiMiddleware`
layer, and bare `HttpRouter`.

This ADR is deliberately package-scoped, the same split
[ADR-QD-035](./035-witness-guard-primitive.md) already drew: the witness/`guard`
primitive lives in `@qadi/core` because nothing about it depends on HTTP;
everything here is inherently HTTP-shaped and lives in the new `@qadi/http`.

## Decision

**Endpoint permission requirements are a plain curried function, not a
`dual`-based combinator.** `HttpApiEndpoint` already implements `Pipeable`,
and its own `.annotate` method returns the reconstructed generic endpoint
type *for a concrete endpoint value* — there is no data-first/data-last
ambiguity for `dual` to resolve, because the object being threaded through
`.pipe()` already has a fluent method surface of its own. A `dual`-wrapped
generic body's type parameters collapse to their constraint when TypeScript
infers `dual`'s own `DataFirst`/`DataLast` slots; the hand-written explicit
type ascription needed to compensate for that is checked once, for
assignability, and never re-verified against the body's actual behavior — a
real risk `dual` would add with no offsetting benefit here.

That reconstruction does **not** carry through a reusable generic wrapper,
though, which revision 1.0 of this ADR claimed and which did not survive
contact with the compiler: `HttpApiEndpoint` carries no self-referential
"Rebuild" type member the way `Schema.Top` does, so a function typed
`<E extends HttpApiEndpoint.Top>(endpoint: E): E` cannot prove its own return
statement satisfies `E` — TypeScript cannot see through the widened `Top`
bound to `E`'s real type arguments from inside a generic function body,
even though the same `.annotate` call resolves perfectly precisely when
written directly against a concrete endpoint at an actual call site.

Revision 1.1 accepted a widened, honestly-typed return (`endpoint.annotate(
RequiredPermission, requirement)` inside a reusable `(endpoint:
HttpApiEndpoint.Top) => ...` wrapper, called as `.pipe(requiresPermission(
requirement))`) as a "real, understood cost" — believing the only casualty
was type precision in a `.pipe()` chain continuing *after* the call, which
nothing in this design does. **That assessment was incomplete, found only by
the first real HTTP round-trip test** ([issue 16](../../.scratch/qadi-http/issues/16-http-integration-tests.md)),
not by reviewing the 1.1 code: every `.handle()` call in an `HttpApiBuilder.group`
build callback for a group containing an endpoint that had passed through
that wrapper failed to typecheck, for *every* identifier, with no way to
satisfy it. The cause is the same "no `Rebuild`" gap, one step further down:
`HttpApiBuilder.group`'s exhaustiveness check computes `Exclude<keyof
EndpointsByIdentifier, HandledIdentifiers>`, and once an endpoint's
identifier has widened from a literal to `string`, `Exclude<string,
"read">` is still `string`, never `never` — no set of `.handle()` calls can
ever make that check pass. Revision 1.1's widened `requiresPermission`
therefore made every endpoint it touched **unimplementable** through
`HttpApiBuilder.group`, the library's own type-checked handler builder and
this package's primary intended consumption path — not merely
"less precise after the call," as originally assessed.

The fix is not a cleverer generic — none exists for the reason above — but a
different call shape. TypeScript *does* recover an endpoint's full literal
type in exactly one place: inside an **inline, unannotated** callback passed
directly to `.pipe()`, where `.pipe`'s own generic signature binds its type
parameter to the receiver's already-concrete type before the callback body
is checked. That is available only to caller-written code, not to a
function this module exports. So `requiresPermission` is no longer a
`.pipe()`-composable transformer at all — it performs only the
duplicate-requirement check described below and returns the requirement
unchanged, for the caller to splice into their own inline `.annotate()`
call:

```ts
HttpApiEndpoint.get("read", "/documents").pipe((endpoint) =>
  endpoint.annotate(
    RequiredPermission,
    requiresPermission(endpoint, { permission: readPermission, policy: readPolicy }),
  ),
)
```

This is a real ergonomic regression from the one-step `.pipe(requiresPermission(
requirement))` both prior revisions envisioned — not a cost this ADR is
willing to paper over. It is also the only shape that is both type-sound (no
cast) and actually usable with `HttpApiBuilder.group`.

**A second, independent finding from the same test**: `requiresPermission`'s
own parameter was typed `HttpApiEndpoint.Top`, and a plain, no-`params`/
`query`-options endpoint — `HttpApiEndpoint.get(id, path)`, the common case,
including the example just above — is not actually *assignable* to `Top` at
all. `Top` fixes every schema slot to `Schema.Top`; an options-less endpoint
leaves them `never`; the endpoint's `"~Request"` field is computed from those
slots through a conditional type, and the two computed shapes are not
structurally compatible. `requiresPermission`'s parameter is now a minimal,
first-order structural type, `AnnotatedEndpoint { identifier: string;
annotations: Context.Context<never> }` — the two fields the function actually
reads — which sidesteps that conditional entirely rather than working around
it. `PermissionRegistry.ts`'s `registerApi` had the identical bug one level up
(`HttpApi.Top` in its own parameter position) and is fixed the same way it
would have been fixed originally had this been caught then: staying generic
over `Id`/`Groups` and forwarding straight through to `HttpApi.reflect`
(itself already generic), rather than coercing through `Top` at all.

**A third, independent finding, in `GuardRoute.ts`'s `guardRoute`**: its
declared return type listed `R | LR | SubjectExtractor |
Exclude<EvaluationServices, CurrentSubject>` — correcting `EvaluationServices`
(which includes `CurrentSubject`) but leaving the caller-supplied `R` (the
wrapped handler's own requirement type) untouched. A handler that itself
calls `guard`/`enforce` again — the defense-in-depth shape this package's
spec names as a testing scenario — has `CurrentSubject` in its *own* `R`,
and an explicit return-type annotation only checks that the function body is
*assignable* to it; it does not correct an annotation that is wider than
what the body actually requires. The fix excludes `CurrentSubject` from the
whole `R | EvaluationServices` union together, not from `EvaluationServices`
alone — while deliberately *not* also excluding it from `LR` (`loadResource`'s
own requirement type), since only the `guard(...)(resource, handler)` call
runs inside this function's own `Effect.provide(currentSubjectLayer(subject))`;
`loadResource` runs before it, outside that scope, and a caller whose
`loadResource` genuinely depends on `CurrentSubject` must still see that as a
real, undischarged requirement. A `tstyche` type-level check
(`packages/http/`'s type-testing tool, adopted during this investigation)
confirmed `Effect.provide` *does* correctly discharge a provided service from
an open generic type parameter when the exclusion is applied to the whole
union — the earlier, narrower `Exclude` was the bug, not a limit of
`Effect.provide` itself.

**The resource-loading function stays out of the annotation payload.**
`HttpApiEndpoint.annotations` is typed `Context.Context<never>` — deliberately
outside the endpoint's own requirement-tracking machinery (`Middleware`,
`MiddlewareServices`), unlike `.middleware()`, whose service requirements *do*
flow through those type parameters into `HandlerRequirements`. An effectful
resource loader hidden in an annotation would have its `R` invisible to the
compiler: nothing would force a service it needs into the application's
`Layer` graph, and a missing one would surface as a runtime defect instead of
a type error. `PermissionRequirement` therefore carries only `permission` and
`policy` — data, matching the category of thing `HttpApiEndpoint` annotations
already carry elsewhere in the ecosystem (`Title`, `Description`, `Transform`).
Resource loading happens where the handler already has typed access to
path/query/payload — inside the handler itself, or via the `HttpRouter`
adapter's own resource-loading parameter, never smuggled through
`Context.Context<never>`.

Naming: the function that loads the request's resource is `loadResource`, not
`resolve`/`resolver` — that word already names something else in this
codebase (`AttributeResolver`, `RelationshipResolver`: "a service that answers
a question the subject cannot").

**One `RequirePermission` middleware, not one per permission**, reading the
`RequiredPermission` annotation back off `{ endpoint, group }` at request time
and calling `@qadi/core`'s `guard`. **The `HttpRouter` adapter is a second,
thin combinator over the same `guard`** — not a second enforcement
implementation — shaped for a plain `(request) => Effect<Response, E, R>`
handler rather than an `HttpApiBuilder` handler, since a bare `HttpRouter`
handler has no signature constraint stopping it from receiving the witness
directly as an argument, which an `HttpApiBuilder` handler's fixed,
schema-derived signature does not allow.

**A second `requiresPermission` call on an already-annotated endpoint fails at
construction time.** Neither silently overwriting nor silently composing via
`allOf` — a developer needing more than one permission on one endpoint writes
a single `allOf([...])` `Policy` and passes it to one call. Nowhere else in
the policy ADT does calling a combinator twice implicitly merge; making this
the exception would be a new, undocumented rule for exactly one call site.

**The permission registry is `HashMap<PermissionKey,
ReadonlyArray<EndpointDescriptor>>` from `effect/HashMap`, populated by two
mechanisms feeding one model.** The `HttpApi` side is built by walking
already-built, immutable endpoint annotations after the fact. The `HttpRouter`
side has nothing to walk — bare `HttpRouter.Route` carries no annotation slot
— so its adapter pushes a descriptor at the point each route is registered
instead. Both mechanisms record a requirement at application-definition time,
before any request is served; they differ only because the two frameworks
offer different extension points, not because they model different things.
The push side is backed by a `Ref`-holding service, aggregated through
Effect's own `Layer` composition — not a plain mutable module-level
collection, which could not prove every route had registered before the
registry is read, and would silently under-report if it hadn't.

## Alternatives considered

**A `dual`-based `requiresPermission`.** The design this ADR's own review
process started with. Rejected once `HttpApiEndpoint`'s real `.annotate`
signature was checked: it already reconstructs the caller's generic type, so
`dual` would add an unverified type ascription without adding any capability
`.annotate` didn't already have.

**One `HttpApiMiddleware.Service` per permission.** An earlier sketch, spawned
naturally from treating each permission as its own declared requirement.
Rejected as soon as a second permission was needed: it does not scale past one
kind of check per middleware class, and duplicates the same enforcement logic
once per permission for no benefit over reading a per-endpoint annotation.

**"Annotate-and-forget," where an unannotated route silently passes through
enforcement.** The earliest version of the declarative design. Rejected: it
inverts this library's fail-closed posture (`CurrentSubjectAnonymous`,
`RelationshipResolverNever`, `AttributeResolverNone` all deny by default) by
making the *absence* of a permission requirement mean "unguarded" rather than
"guarded by whatever policy the endpoint's other layers already impose."

**Silent overwrite or automatic `allOf` composition on a duplicate
`requiresPermission` call.** Overwrite risks a silent security narrowing — a
second call meant to tighten an endpoint could instead replace its
requirement with a weaker one. Automatic composition would make this the only
combinator in the ADT whose meaning changes based on how many times it's
called rather than on what's explicitly passed to it.

**`HttpApi`-only, no `HttpRouter` support.** Narrower and simpler. Rejected on
direct instruction: v1 was required to support both surfaces, not gate
authorization behind adopting the declarative contract layer.

**A plain mutable array or module-level `Map` for the `HttpRouter`-side
registry accumulation.** Simplest to write. Rejected: nothing about a plain
JavaScript collection proves every route has registered before the registry
is read — an ordering hazard the `HttpApi` side never has, because its walk
runs over an already-fully-built, immutable value.

## Consequences

**Positive**:

- One enforcement code path (`guard`) underneath both framework adapters —
  a correctness fix applies to both surfaces by construction, not by
  discipline.
- A permission requirement is visible in the generated OpenAPI document and
  the derived `HttpApi` client, not just in handler source.
- The registry gives a real answer to "which permission does which endpoint
  require," covering an application regardless of which HTTP surface a given
  route happens to use.
- `@qadi/http` depends on nothing beyond `effect` and `@qadi/core` — no
  platform adapter, matching `@qadi/promise`/`@qadi/react`'s existing
  dependency shape.

**Negative**:

- Two adapters to maintain in lockstep even though they share `guard` — a
  behavior change to how the witness/errors are surfaced still touches two
  call sites, not one.
- The `HttpRouter`-side registry's `Layer`-ordering requirement is a
  correctness property that has to be maintained deliberately; nothing in
  the type system currently proves an application's `Layer` graph actually
  orders every route registration before the registry is read.
- Construction-time failure on a duplicate `requiresPermission` call is a
  hard stop rather than a warning — a defensible default, but one that
  surfaces as a startup crash rather than a lint if a developer trips it.

**Trade-off accepted**: two thin adapters over one enforcement path costs more
to build than one adapter, but a single supported surface would either force
every consumer onto `HttpApi` or leave bare `HttpRouter` consumers with no
enforcement mechanism at all — both worse than the maintenance cost of
keeping two thin wrappers honest against one shared primitive.

---

_Related: [ADR-QD-002](./002-schema-derived-policy-adt.md) · [ADR-QD-011](./011-enforce-as-aspect.md) · [ADR-QD-014](./014-react-via-atoms.md) · [ADR-QD-032](./032-promise-facade.md) · [ADR-QD-035](./035-witness-guard-primitive.md) · [INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed) · [Glossary](../glossary.md) · [Roadmap](../roadmap.md)_
