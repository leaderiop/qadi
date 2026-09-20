# ADR-QD-075 — `RequirePermission`'s enforcement errors are typed on the generated client, not hand-declared per endpoint

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-075                                   |
> | Revision       | 1.0                                             |
> | Effective Date | 2026-09-14                                      |
> | Status         | Accepted                                        |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                    |

---

## Context

`RequirePermission` (`packages/http/src/RequirePermission.ts`) declares an
`error:` array of twelve schemas — the full set of responses it can produce
(two denial tags, a subject-extraction failure, and the nine
`httpApiStatus`-annotated `EnforcementError` views from `QadiHttpError.ts`).
`HttpApiMiddleware`'s response encoder uses that array at **runtime**: it
merges an endpoint's own declared errors with every middleware attached to
it (`HttpApiEndpoint.getErrorSchemas`) to build the decode map a real
`HttpApiClient` call actually uses to interpret a response. Runtime decoding
of these twelve was never the gap.

The gap was **static**. `effect`'s `HttpApiEndpoint`/`HttpApiGroup` types
compute a generated client method's *declared* error type from the
endpoint's own `error:` schemas plus `HttpApiMiddleware.ClientError<A>` for
each attached middleware — and `ClientError<A>` resolves to `never` unless
that middleware sets `requiredForClient: true` and a `clientError` type
parameter (`HttpApiMiddleware.ts:224-230`). `RequirePermission` set neither.
The consequence, confirmed against `examples/http-advanced/api.ts`: a
frontend calling `client.documents.me()` saw `AccessDeniedRefused` /
`AttributeResolveErrorResponse` / etc. **only** because that one endpoint
hand-declared a 4-of-12 subset of `RequirePermission`'s schemas in its own
`error:` array — `client.documents.read()`, guarded by the exact same
middleware with no endpoint-level declaration, had none of them in its
static error type at all, despite decoding them identically at runtime. The
subset was also incomplete by construction: nothing kept it in sync with
`RequirePermission`'s own list, and a caller reading only the client's types
would miss eight of the twelve possible outcomes without ever seeing a
compile error.

This was chartered and resolved through a `wayfinder` map
(`.scratch/qadi-http-client-errors/`, now closed) — three decision tickets
(client-error shape and over-approximation; verifying the `layerClient`
wiring compiles for real; the breaking-change/semver stance) plus a
synthesized spec (`spec.md`) that this ADR and its implementation ticket
follow directly. The standing instruction carried through that whole
effort, stated by the requester twice in materially the same words: *the
most feature-rich answer, not the simplest — the idiomatic effect way,
regardless of complexity.* That preference is why this ADR rejects the two
narrower alternatives below in favor of the full, effect-native mechanism.

## Decision

**`RequirePermission` sets `requiredForClient: true`, and its `clientError`
type parameter is derived from the same array as its `error:` option — one
source, not a hand-copied second list.** Concretely
(`packages/http/src/RequirePermission.ts`):

```ts
const REQUIRE_PERMISSION_ERROR_SCHEMAS = [
  AccessDeniedRefused,
  UndischargedObligationRefused,
  SubjectExtractionRefused,
  AttributeResolveErrorResponse,
  RelationshipResolveErrorResponse,
  DecisionHistoryUnavailableResponse,
  CustomPredicateErrorResponse,
  SignatureHistoryUnavailableResponse,
  MissingActionResponse,
  MissingResourceResponse,
  MissingResourceIdResponse,
  PolicyTooDeepResponse,
] as const;

export type RequirePermissionClientError = (typeof REQUIRE_PERMISSION_ERROR_SCHEMAS)[number]["Type"];

export class RequirePermission extends HttpApiMiddleware.Service<
  RequirePermission,
  { provides: CurrentSubject; requires: never; clientError: RequirePermissionClientError }
>()("qadi/http/RequirePermission", {
  error: REQUIRE_PERMISSION_ERROR_SCHEMAS,
  requiredForClient: true,
}) {}
```

Every endpoint `RequirePermission` guards now gets the full twelve-member
union in its generated client method's static error type automatically —
`examples/http-advanced/api.ts`'s per-endpoint `error:` workaround is
removed entirely (ticket 06), because there is nothing left for it to do.

**Setting `requiredForClient: true` is a breaking change, confirmed by a
real compile before this ADR was written** (
`.scratch/qadi-http-client-errors/research-layerclient-wiring.md`): any
existing consumer building a client via `HttpApiClient.make` against an API
using `RequirePermission` now fails with `TS2379`/`TS377004` —
`HttpApiMiddleware.ForClient<RequirePermission>` is missing from the
client's context — until they provide a discharging layer.

**That layer ships as a new, fully generic helper, `passthroughClientLayer`,
not a `RequirePermission`-specific one**
(`packages/http/src/HttpApiMiddlewareClient.ts`):

```ts
export const passthroughClientLayer = <A extends HttpApiMiddleware.AnyId>(
  tag: Context.Key<
    A,
    | HttpApiMiddleware.HttpApiMiddleware<any, any, any>
    | HttpApiMiddleware.HttpApiMiddlewareSecurity<any, any, any, any>
  >,
) => HttpApiMiddleware.layerClient(tag, (opts) => opts.next(opts.request));
```

Confirmed to compile generically, with no `any`/cast beyond the two already
inherent in `HttpApiMiddleware`'s own `HttpApiMiddleware<any, any, any>` /
`HttpApiMiddlewareSecurity<any, any, any, any>` constraint shapes — tried
with `unknown` in those four positions first, which broke: `Provides`
appears in a position `RequirePermission`'s real `CurrentSubject` is not
assignable to once it is `unknown` rather than `any`, because `unknown`
does not uniquely bypass variance checking the way `any` does. `.oxlintrc.json`
carries a file-scoped `no-explicit-any` override for exactly this one file
rather than relaxing the rule workspace-wide. A consumer discharges the new
requirement with `Effect.provide(passthroughClientLayer(RequirePermission))`
somewhere in the client's layer graph; the implementation is always a
passthrough because `RequirePermission` has no real client-side behavior —
the credential is attached by decorating the underlying `HttpClient`
(`transformClient`), not by client-side middleware. Any future `@qadi/http`
middleware needing the same treatment reuses this helper directly; no
middleware-specific variant is needed.

The other half of "one source, not hand-copied" — deriving `clientError`
from the same `error:` array — is a shared helper too, not something each
future middleware re-derives by hand: `ClientErrorOf<Schemas>` (same file)
is `Schemas[number]["Type"]`, and `RequirePermissionClientError` is that
helper applied to `REQUIRE_PERMISSION_ERROR_SCHEMAS`. A future middleware
declares its own `const … as const` array and writes `ClientErrorOf<typeof
theArray>`, rather than re-deriving the indexed-access formula itself.

## Alternatives considered

**A house-style lint gate checking per-endpoint error coverage.** Would
have kept each endpoint's hand-declared `error:` subset but added a merge
gate (in the spirit of `scripts/check-house-style.mjs`'s `SWITCH_BUDGET`/
`UNTRACED_BUDGET` tables) verifying it matched `RequirePermission`'s full
list. Rejected: this treats a type-system gap as a process problem. `effect`
already has a first-class mechanism for exactly this — `requiredForClient`/
`clientError` — and building a bespoke lint rule to simulate what the type
system does natively is neither the more feature-rich answer nor the
idiomatic one; it is strictly more code, more to maintain, and only
partially closes the gap (it would catch drift between an endpoint's
`error:` array and `RequirePermission`'s own list, but every endpoint would
still need its own hand-written array in the first place, which is the
duplication this ADR removes).

**An opt-in second middleware or config flag, so `requiredForClient` never
becomes a breaking change for existing consumers.** E.g. a
`RequirePermissionTyped` variant, or a config option gating whether
`clientError` is set. Rejected on two grounds. First, it directly
contradicts the standing preference this whole effort was chartered under:
optionality here is exactly the "simpler, narrower" answer traded for
"feature-rich and idiomatic." Second, and independently, this repository
already has a real precedent for shipping a genuine breaking change as a
direct edit with a `MINOR` version bump rather than an opt-in path:
`ADR-QD-074` raised the Node floor from `>=20.19.0` to `>=22.12.0` — a hard
break for any consumer on Node 20 — and shipped it as `@qadi/http`
(alongside every other package) going `0.5.0` → `0.6.0`, with an explicit
`Breaking:`-labeled changeset note rather than a parallel non-breaking path.
This decision follows that same precedent for the same package.

## Accepted limitation

**A `PublicEndpoint`-annotated endpoint's generated client method still
over-approximates: it claims all twelve `RequirePermission` tags as
possible errors, even though a public endpoint never reaches `guard` at
all and so can produce none of them.** `clientError` is declared once, on
the middleware class itself — `effect`'s `HttpApiMiddleware` type has no
per-endpoint override point for it (confirmed against
`HttpApiMiddleware.ts:320-346`), so there is no way to narrow the type
per annotation without one.

The alternative actually weighed — detaching `RequirePermission` from a
`PublicEndpoint` so it never contributes to that endpoint's error type at
all — was considered and rejected as reopening `ADR-QD-036`'s fail-closed
design rather than as a narrower version of this fix. `ADR-QD-036`
established that the *absence* of `RequirePermission` on an endpoint must
mean refused, not unguarded; a mechanism that detaches the middleware
per-endpoint based on an annotation reintroduces exactly the shape ADR-QD-036
rejected — an endpoint's authorization posture becoming inferred from which
middleware happens to be wired to it, rather than declared. `PublicEndpoint`
is already the declared, deliberate opt-out `ADR-QD-036` chose instead
(`publicEndpoint(reason)`); it changes runtime behavior (the middleware
passes the request through, providing `anonymous`) without changing which
middleware is structurally attached to the endpoint, and this decision
preserves that.

**Not explored, and left open rather than ruled out:** a build-time
completeness check over annotations — verifying every `PublicEndpoint`/
`RequiredPermission` pairing is declared as expected — decoupled entirely
from which middleware is structurally attached, could in principle preserve
ADR-QD-036's runtime guarantee while still letting a `PublicEndpoint`'s
generated client type be precise. That is a genuinely different shape from
the "detach the middleware" alternative rejected above (it changes nothing
about wiring, only about how the client's static type is derived), was not
designed or prototyped for this decision, and is not chosen here — named so
a future map that revisits this limitation starts from it rather than
re-discovering it.

No upstream request has been filed against `effect` for a per-endpoint
`clientError` override point — unlike `ADR-QD-074`'s citation of a real,
tracked upstream issue and PR for an analogous gap. This limitation is
recorded as accepted and disclosed, not as closed-pending-upstream; nothing
here should be read as implying a fix is in progress elsewhere.

The over-approximation is therefore accepted, not fixed, and disclosed
directly on `RequirePermissionClientError`'s own doc comment
(`RequirePermission.ts`) rather than only here.

## Consequences

**Positive**:

- Every `RequirePermission`-guarded endpoint's generated client method gets
  full, automatic static coverage of every enforcement outcome — with no
  per-endpoint declaration, and no way for a new endpoint to be added
  without it.
- The per-endpoint `error:` workaround `examples/http-advanced/api.ts` used
  is deleted outright (ticket 06), removing both the duplication and the
  four-of-twelve incompleteness it shipped with.
- `passthroughClientLayer` is reusable by any future `@qadi/http`
  middleware that needs `requiredForClient`, not a one-off.

**Negative** (named honestly, not minimized):

- Real, immediate breaking change: any existing consumer building a client
  against a `RequirePermission`-guarded API must add
  `Effect.provide(passthroughClientLayer(RequirePermission))` to their
  layer graph or their build fails to compile.
- The accepted `PublicEndpoint` over-approximation (above) means a
  generated client's static type is not maximally precise for public
  endpoints — a caller may write dead `Effect.catchTag` arms for outcomes
  that endpoint can never actually produce. This is a type-precision cost,
  not a runtime-safety one: nothing decodes incorrectly, and the disclosure
  lives on `RequirePermissionClientError`'s doc comment for anyone who
  reads it before writing that handler.

**Implemented**: `packages/http/src/RequirePermission.ts`,
`packages/http/src/HttpApiMiddlewareClient.ts` (new),
`packages/http/src/index.ts`, `.oxlintrc.json`,
`scripts/check-house-style.mjs` (`ANY_BUDGET`), `AGENTS.md` §6,
`packages/http/test/RequirePermission.tst.ts`,
`packages/http/test/RequirePermissionClient.test.ts` (new),
`examples/http-advanced/api.ts`, `examples/http-advanced/client.ts`.
