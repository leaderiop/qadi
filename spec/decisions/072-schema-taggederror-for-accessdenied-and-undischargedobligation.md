# ADR-QD-072 — `Schema.TaggedError` for `AccessDenied` and `UndischargedObligation`, narrowing ADR-QD-060

> **Document Control**
>
> | Property       | Value                                           |
> | -------------- | ------------------------------------------------ |
> | Document ID    | QADI-ADR-072                                      |
> | Revision       | 1.0                                               |
> | Effective Date | 2026-09-08                                        |
> | Status         | Accepted — narrows ADR-QD-060                     |
> | Author         | Qadi Engineering                                  |
> | Classification | Architecture Decision Record                      |
> | Change History | 1.0 (2026-09-08): Initial release (CCR-QD-141)    |

---

## Context

Wayfinder ticket ["How far does packages/http commit to the HttpApi
framework (error channel + SSE)?"](https://github.com/leaderiop/qadi/issues/98),
child of map ["Resolve the September 8, 2026 Effect-Idiom Conformance
audit"](https://github.com/leaderiop/qadi/issues/96), asked how `@qadi/http`'s
hand-built error-to-status table (`QadiHttpError.ts`'s `ENFORCEMENT_ERROR_TAGS`,
`toResponse`, `handleMiddlewareEnforcementErrors`, ~150 lines) should adopt
`HttpApiMiddleware`/`HttpApiSchema` so OpenAPI and typed `HttpApi` clients see
real status codes and bodies instead of an empty 403/502 for every failure.

ADR-QD-060 (ticket #97, merged the same day) made the nine wire-crossing
`EvaluationError` tags `Schema.TaggedError` for `SinkCodec.ts`'s wire, and its
own Positive Consequences section named this ticket directly: those nine
classes are "exactly what wayfinder ticket #98 needs for `httpApiStatus`
annotations on the HTTP error channel — no further wire-shape work required
there, only the annotation." It deliberately left `AccessDenied` and
`UndischargedObligation` as `Data.TaggedError`, scoped to "the nine
wire-crossing tags" specifically, because neither crosses `SinkCodec.ts`'s
wire — an `AccessDenied`/`UndischargedObligation` is raised by `Qadi.ts`'s
`assert`/`enforce`/`guard`, not carried inside a `SinkRecord`.

This ticket's own research (not the audit's H4 sketch, which the ticket
explicitly warned might be stale) established that `httpApiStatus` is a
generic `Schema.Annotations.Augment` field, attachable to any `Schema.Top` via
`.annotate({ httpApiStatus })` or `HttpApiSchema.status(code)` — **not**
exclusive to `Schema.TaggedError`, confirmed by reading
`effect@4.0.0-rc.112`'s `HttpApiSchema.ts` source directly. ADR-QD-060's own
Alternatives section says the same thing about the nine it did convert:
`httpApiStatus` "could still be annotated on the derived per-tag struct
directly (an annotation, not a `Schema.TaggedError`-exclusive feature)." So
nothing about the API *forced* widening ADR-QD-060's scope to
`AccessDenied`/`UndischargedObligation` — this was flagged back to the
ticket's human driver as a genuine fork (convert the two classes too, versus a
wrapping/derived schema that leaves them `Data.TaggedError`), rather than
decided unilaterally, because the wrapper alternative was a real option with a
real disclosure-shaped argument in its favor (below). The driver decided, via
grilling, to convert both — matching the audit's H4 sketch — while directing
that the disclosure concern be addressed in how the HTTP response is actually
built, not by leaving the fields out of the schema.

## Decision

`AccessDenied` and `UndischargedObligation` (`packages/core/src/Errors.ts`) are
now `Schema.TaggedError<Self>()(tag, fields)` classes, matching the nine
ADR-QD-060 already converted. This narrows ADR-QD-060's scope from nine
`EnforcementError` tags to all eleven — the exception AGENTS.md §4 carries for
this file grows from "the nine wire-crossing errors" to "the eleven
`EnforcementError` tags", and the criterion changes from *crosses
`SinkCodec.ts`'s wire* to *crosses a trust boundary this class needs to be a
real schema at* — the HTTP response body is a second, independent boundary
from the audit sink wire, and both now qualify.

`AccessDenied.trace: Trace` reuses `Decision.ts`'s `TraceSchema` (moved there
from `SinkCodec.ts` in the same change, to avoid an `Errors.ts` →
`SinkCodec.ts` → `Errors.ts` import cycle — `SinkCodec.ts` already imports
several of `Errors.ts`'s classes, so `Errors.ts` cannot import back from it).
`TraceSchema` already existed for `SinkCodec.ts`'s `Decision` wire form and
`@qadi/react`'s `Hydration.ts`; this is a third consumer of the same
definition, not a fourth independently-typed description of `Trace`.
`UndischargedObligation.obligationIds` is `Schema.Array(Schema.String)`, and
both classes' `subjectId` fields reuse `Identity.ts`'s existing
`SubjectIdSchema` — the same pattern the nine already established, no new
schema machinery invented for these two specifically.

**`httpApiStatus` annotations for all eleven tags live in `@qadi/http`, not on
the classes in `@qadi/core`.** An HTTP status code is a transport concern, and
`@qadi/core` has no dependency on `effect/unstable/httpapi` — this repo's
transport-agnostic design keeps it that way (the same principle the audit's H5
finding applied to `@qadi/http-client` usage in the example forwarding seam).
`QadiHttpError.ts` builds `AttributeResolveErrorResponse = AttributeResolveError
.pipe(HttpApiSchema.status(502))` and its eight siblings this way — `.annotate`
rebuilds the *schema*, not the class, so the real class stays exactly the wire
schema `SinkCodec.ts` needs, unannotated.

**The driver's disclosure direction is honored by *not* declaring the real
`AccessDenied`/`UndischargedObligation`/`SubjectExtractionFailed` classes in
`RequirePermission`'s `error:` union at all.** `RequirePermissionLive` still
hand-converts these three to an empty-body response — identical to
`toResponse`'s existing behavior, byte for byte — before the failure ever
reaches the schemas declared for OpenAPI visibility
(`AccessDeniedRefused`, `UndischargedObligationRefused`,
`SubjectExtractionRefused`). Those three are `Schema.TaggedStruct(tag, {})`,
not `HttpApiSchema.Empty` (`Schema.Void`): a real, `_tag`-discriminating,
zero-field schema. This is not a stylistic choice — it is required by a
runtime property of `effect@4.0.0-rc.112` found empirically, not assumed, by
writing the TDD test this ticket required
(`packages/http/test/http.test.ts`'s "an outage propagates typed through the
middleware, and the body carries real fields"): `HttpApiBuilder`'s response
encoder answers `Response.empty({ status })` for a no-content schema
**without inspecting the value being encoded at all**
(`HttpApiBuilder.ts:1224`), so a bare `Schema.Void` member in the same
declared error union as the nine real schemas "encodes" *any* of them
successfully — the first draft of this change, using `HttpApiSchema.Empty(403)`
for `AccessRefused`, made every one of the nine real bodies silently revert to
an empty 403, discovered because the test failed for exactly that reason
before this fix, not by code review.

## Alternatives considered

- **Wrapping/derived schema, leave `AccessDenied`/`UndischargedObligation`
  as `Data.TaggedError`.** This ticket's own initial recommendation, made
  before the driver's decision: build the `httpApiStatus`-annotated schema as
  a structurally separate declaration from the domain error class, matching
  the `Schema.TaggedStruct(tag, {})` shape this ADR ended up using for the
  three empty-bodied schemas anyway — but pointed at a *parallel* description
  of `AccessDenied`/`UndischargedObligation` rather than the class itself.
  This would have kept ADR-QD-060's "nine wire-crossing tags" criterion
  intact and avoided writing a `TraceSchema` field onto a class that never
  crosses a wire in the sense ADR-QD-060 named. Rejected by the driver, via
  grilling, in favor of matching the audit's H4 sketch and widening scope
  deliberately rather than defaulting to the narrower option. Recorded as the
  road not taken, not as wrong — the driver's stated reasoning was
  uniformity across all eleven `EnforcementError` tags, which this decision
  delivers, with the disclosure concern addressed at the response-construction
  layer instead of the schema-conversion layer.
- **`HttpApiSchema.Empty` (bare `Schema.Void`) for the three empty-bodied
  schemas.** The first implementation of this ADR's own decision, and wrong:
  see Decision above and BEH-QD-260. Kept here as the negative finding this
  ADR's Consequences also name, not silently corrected.

## Consequences

**Positive**:

- All eleven `EnforcementError` tags are now real schemas, giving
  `RequirePermission`'s middleware a single, uniform mechanism —
  `httpApiStatus`-annotated schemas plus a three-tag hand-catch for
  disclosure — instead of the nine-tag/two-tag split a wrapper-schema
  alternative would have produced.
- `RequirePermissionLive` no longer needs `handleMiddlewareEnforcementErrors`
  (deleted, ~45 lines) — nine of eleven tags now propagate typed and are
  encoded by `HttpApiMiddleware`'s own response machinery, declaratively, per
  the audit's original H4 ask.
- `TraceSchema` moving from `SinkCodec.ts` to `Decision.ts` puts it beside the
  type it describes, and gives it a third real consumer
  (`Errors.ts`'s `AccessDenied`) without a fourth independently-typed
  description of `Trace` anywhere in the codebase.
- The `Schema.Void`-swallows-siblings finding (BEH-QD-260) is now pinned by a
  test and documented for whoever next builds a mixed no-content/real-field
  `HttpApiMiddleware` error union in this codebase — a genuine, reusable
  finding this ticket's TDD requirement is what actually surfaced.

**Negative** (named honestly, not minimized):

- AGENTS.md §4's exception for `Errors.ts` grows again, from nine tags to
  eleven — a reviewer checking "is this a `Data.TaggedError` violation" now
  has to know all eleven qualify, not nine.
- `AccessDenied`'s `trace` field is now schema-encodable (via `TraceSchema`)
  even though nothing in this codebase currently encodes it anywhere but
  `AccessDeniedRefused`'s tag-only projection deliberately avoids doing so.
  A future caller reaching for `Schema.encodeEffect(AccessDenied)` directly
  — bypassing `RequirePermission`'s hand-catch — would get the full trace,
  subject id, and reason on the wire; nothing in the type system prevents
  that misuse the way "the class has no schema at all" would have. This is
  the concrete cost of the driver's uniformity choice over the narrower
  wrapper-schema alternative, and it is why `RequirePermissionLive`'s
  hand-catch and `AccessDeniedRefused`'s doc comment both say so explicitly
  rather than relying on the schema's shape alone to keep the boundary.
- `QadiHttpError.ts`'s own doc comment, and `RequirePermission`'s, now carry
  the `Schema.Void`-swallows-siblings explanation at some length — necessary
  given how easy the same mistake would be to reintroduce, but it is real
  additional weight in files already carrying a lot of rationale.

**Implemented**: `packages/core/src/Errors.ts`, `packages/core/src/Decision.ts`,
`packages/core/src/SinkCodec.ts`, `packages/http/src/QadiHttpError.ts`,
`packages/http/src/RequirePermission.ts`, `packages/http/test/http.test.ts`,
`spec/behaviors/23-http.md` (BEH-QD-260).
