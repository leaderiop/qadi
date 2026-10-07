/**
 * Attaches a permission requirement to an `HttpApiEndpoint`, and the single
 * middleware that enforces every requirement so attached.
 *
 * The permission requirement lives in the endpoint's own annotations
 * (`Context.Context<never>`) rather than being tracked in `Requires`/`Error`
 * type parameters the way `.middleware()` tracks a real service dependency —
 * `RequiredPermission` here is a key used purely as a typed annotation
 * carrier, never injected as a dependency. See ADR-QD-036.
 */
import * as Brand from "effect/Brand";
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import * as Option from "effect/Option";
import * as HttpApiMiddleware from "effect/http-api/HttpApiMiddleware";
import * as HttpServerRequest from "effect/http/HttpServerRequest";
import * as HttpServerResponse from "effect/http/HttpServerResponse";
import type { unhandled } from "effect/Types";
import type { Permission, Policy, Resource, StandingEvaluationServices } from "@qadi/core";
import { anonymous, CurrentSubject, ENFORCEMENT_DENIAL_TAGS, guard } from "@qadi/core";
import {
  HTTP_ENFORCEMENT_ERROR_SCHEMAS,
  HTTP_ENFORCEMENT_TAGS,
  logDenial,
  logSubjectExtractionFailed,
  projectHttpEnforcementFailure,
} from "./QadiHttpError.ts";
import type { ClientErrorOf } from "./HttpApiMiddlewareClient.ts";
import { SubjectExtractor } from "./SubjectExtractor.ts";

// Named `PermissionRequirement`/`PublicDeclaration`, not the usual
// `RequiredPermissionShape`/`PublicEndpointShape` — a deliberate exception to
// AGENTS.md §2's naming convention, matching `CurrentSubject.ts`'s. Both are
// public, documented domain values in their own right (ADR-QD-036,
// behaviors/23-http.md) referenced by name across spec/, not internal payload
// plumbing invented for the service — renaming would be a public API and
// normative-doc change, not a local style fix. The substantive half of §2
// still holds: each is a separately exported type, not an inline literal.
export interface PermissionRequirement {
  readonly permission: Permission;
  readonly policy: Policy;
}

/**
 * `PermissionRequirement`, branded to prove it was produced by
 * {@link requiresPermission} rather than assembled by hand at a
 * `.annotate(RequiredPermission, {...})` call site.
 *
 * `Context` annotation is last-write-wins: a second, bare `.annotate` call on
 * the same endpoint silently overwrites or narrows whatever `requiresPermission`
 * already attached, with no throw and no log — `requiresPermission`'s own
 * duplicate check only runs when a caller actually calls it, so a raw object
 * literal passed straight to `.annotate` skipped it entirely. Branding
 * `RequiredPermission`'s own Shape closes that gap at the type level: a plain
 * `{ permission, policy }` literal is not assignable to it, so only a value
 * `requiresPermission` itself returned can satisfy `.annotate`'s second
 * argument.
 *
 * `Brand.nominal`, matching `Authorized<P>` (`@qadi/core`'s `Authorized.ts`)
 * and the `SubjectId`/`RoleName`-style brands in `Identity.ts`/`Policy.ts`:
 * this performs no validation, it only tags a value that must have come from
 * the one function allowed to produce it. This is what finally uses the name
 * the comment above explains `PermissionRequirement` deliberately isn't —
 * `RequiredPermissionShape` is exactly `RequiredPermission`'s own Shape, per
 * AGENTS.md §2, once `PermissionRequirement` is free to keep meaning the
 * public, unbranded `{ permission, policy }` pair callers build.
 */
export type RequiredPermissionShape = Brand.Branded<PermissionRequirement, "RequiredPermission">;

export class RequiredPermission extends Context.Service<RequiredPermission, RequiredPermissionShape>()(
  "qadi/http/RequiredPermission",
) {}

/** Why an endpoint is reachable without authorization. */
export interface PublicDeclaration {
  readonly reason: string;
}

export class PublicEndpoint extends Context.Service<PublicEndpoint, PublicDeclaration>()(
  "qadi/http/PublicEndpoint",
) {}

/**
 * What an endpoint's own annotations declare about who may call it: a
 * requirement, a public marker, or nothing.
 *
 * Closed on purpose: `Undeclared` is a case, not an absence, so a reader that
 * must refuse it has a branch to refuse in (ADR-QD-036, INV-QD-034).
 */
export type EndpointAccess = Data.TaggedEnum<{
  Required: { readonly requirement: RequiredPermissionShape };
  Public: { readonly declaration: PublicDeclaration };
  Undeclared: {};
}>;

export const EndpointAccess = Data.taggedEnum<EndpointAccess>();

/**
 * Reads an endpoint's access declaration from its own annotations.
 *
 * `RequirePermission` enforces it and `registerApi` lists it, and both go
 * through this one function so they cannot read different things. They used to:
 * the middleware read the endpoint's annotations while the registry read
 * `HttpApi.reflect`'s merge of API, group and endpoint annotations, so a group
 * requirement over an endpoint-level `publicEndpoint` was listed as guarded
 * while the middleware served it to anyone (ARCH-18, CCR-QD-196).
 *
 * Pass an endpoint's `annotations`, never a merge. When both keys are present
 * `RequiredPermission` wins: the stricter declaration is the one enforced.
 */
export const endpointAccess = (annotations: Context.Context<never>): EndpointAccess => {
  const required = Context.getOption(annotations, RequiredPermission);
  if (Option.isSome(required)) return EndpointAccess.Required({ requirement: required.value });
  const declared = Context.getOption(annotations, PublicEndpoint);
  if (Option.isSome(declared)) return EndpointAccess.Public({ declaration: declared.value });
  return EndpointAccess.Undeclared();
};

/** The declaration keys {@link misplacedDeclarations} reports. */
export type AccessDeclarationKey = "RequiredPermission" | "PublicEndpoint";

/**
 * The access-declaration keys present on `annotations`, for a scope that may not
 * carry one.
 *
 * Only an endpoint declares access. A group or API carrying a key is a
 * declaration that does nothing the author expected, so both readers refuse it
 * instead of ignoring it: the middleware by answering 500 and `registerApi` by
 * failing layer construction. The way to declare for a whole group is
 * `HttpApiGroup.annotateEndpoints`, which writes into each endpoint's own scope.
 */
export const misplacedDeclarations = (
  annotations: Context.Context<never>,
): ReadonlyArray<AccessDeclarationKey> => {
  const keys: Array<AccessDeclarationKey> = [];
  if (Option.isSome(Context.getOption(annotations, RequiredPermission))) keys.push("RequiredPermission");
  if (Option.isSome(Context.getOption(annotations, PublicEndpoint))) keys.push("PublicEndpoint");
  return keys;
};

/**
 * Declares an endpoint deliberately reachable without authorization.
 *
 * ```ts
 * HttpApiEndpoint.get("health", "/health").pipe((e) =>
 *   e.annotate(PublicEndpoint, publicEndpoint("liveness probe, no subject exists yet")),
 * )
 * ```
 *
 * The `reason` is required and unused by the middleware, which is the point: it
 * is read by whoever reviews the endpoint later, and a field that must be filled
 * in is a decision someone made rather than one they defaulted into.
 *
 * This exists because the absence of a requirement used to mean "unguarded".
 * ADR-QD-036 rejected precisely that — "it inverts this library's fail-closed
 * posture ... by making the *absence* of a permission requirement mean
 * 'unguarded'" — and the code shipped the rejected alternative anyway, with a
 * test pinning it as correct. An unannotated endpoint now refuses; being public
 * has to be said out loud.
 */
export const publicEndpoint = (reason: string): PublicDeclaration => ({ reason });

/**
 * The resource `RequirePermission` checks against: an empty one. This
 * middleware enforces the contract-level requirement an endpoint declares,
 * before any resource has been loaded — a resource-scoped re-check belongs in
 * the handler, via `@qadi/core`'s `guard` directly, as defense in depth.
 *
 * Empty, deliberately, rather than absent. A policy reading a resource
 * attribute here finds nothing and, for a positive matcher, **denies** (403);
 * the same policy evaluated with no resource at all *fails* with
 * `MissingResource` (500), reporting a caller's request as a server fault.
 * This comment described the former while `guard` did the latter, because the
 * resource never reached evaluation — see `guard` in `@qadi/core`.
 *
 * **That "denies" claim used not to hold for a negative matcher, and now
 * does.** `Neq` (or any matcher built on it) compared against an attribute
 * this empty resource does not have used to resolve the comparison against
 * `undefined` and read `undefined` as unequal to anything — so the matcher
 * was *true* and the policy **allowed**, the exact
 * [INV-QD-032](../../../spec/invariants.md#inv-qd-032-a-guarded-resource-is-the-evaluated-resource)
 * hazard: a resource-scoped policy meant to refuse a mismatch, evaluated
 * against no resource at all, quietly permitted instead. `Neq` now denies on
 * an absent operand the same way every other matcher already did (H2,
 * CCR-QD-112), so this middleware's `NO_RESOURCE` placeholder now denies a
 * resource-attribute-referencing policy of either polarity, not just a
 * positive one. This middleware still runs before any resource is loaded,
 * though, so a policy meant to *allow* based on the real resource's
 * attributes cannot be satisfied here regardless — a resource-scoped
 * re-check in the handler, via `@qadi/core`'s `guard` directly against the
 * real resource, remains the correct way to evaluate such a policy for
 * real, not merely defense in depth against a hazard that no longer exists.
 *
 * Exported so `DecisionStreamRoute.ts` and `PermissionRegistry.ts`'s
 * `permissionRegistryRoute` share this exact placeholder rather than each
 * reimplementing `() => Effect.succeed({})` as their own `loadResource` — all
 * three routes evaluate before any real resource exists, for the same
 * `Neq`-denies-on-absence reasoning this comment gives.
 */
export const NO_RESOURCE: Resource = {};

/**
 * The minimal shape `requiresPermission` needs from an endpoint. See the
 * doc comment on `requiresPermission` itself for why this is not
 * `HttpApiEndpoint.Top`.
 */
export interface AnnotatedEndpoint {
  readonly identifier: string;
  readonly annotations: Context.Context<never>;
  // `method` and `path` are what separate an endpoint from a group or an API,
  // which also carry `identifier` and `annotations`: asking for them is what
  // makes `requiresPermission(group, …)` a compile error (ARCH-18).
  readonly method: string;
  readonly path: string;
}

/**
 * Checks `endpoint` doesn't already carry a permission requirement and
 * returns `requirement` unchanged, for use inline in `endpoint.annotate(
 * RequiredPermission, requiresPermission(endpoint, { permission, policy }))`.
 * Fails at construction time — not by overwriting or silently composing —
 * on a duplicate: a developer needing more than one permission on one
 * endpoint writes a single `allOf([...])` `Policy` and passes it to one
 * call, the same way every other composition in this ADT is always explicit
 * rather than incremental.
 *
 * **Not a `.pipe()`-composable combinator, deliberately — a real correction,
 * not the original design.** A version shaped `requiresPermission(req)`
 * returning `(endpoint) => endpoint.annotate(...)`, meant to be used as
 * `endpoint.pipe(requiresPermission(req))`, shipped first and type-checked
 * in isolation. It broke the moment it met `HttpApiBuilder.group`: every
 * `.handle()` call in a group containing an endpoint that passed through
 * that function failed with a synthetic `` `Endpoint not handled: ${string}` ``
 * type, for every identifier, with no way to satisfy it. The cause is the
 * same "no `Rebuild` self-type" gap ADR-QD-036 already documented for the
 * endpoint's own return type — `HttpApiBuilder.group`'s exhaustiveness check
 * computes `Exclude<keyof EndpointsByIdentifier, HandledIdentifiers>`, and
 * once an endpoint's identifier widens from a literal to `string`,
 * `Exclude<string, "read">` is still `string`, never `never`, so no set of
 * `.handle()` calls can ever satisfy it. This is not fixable by making the
 * wrapper generic (tried, and rejected for the same reason ADR-QD-036
 * already rejected it): a function's body type-checks once, against its type
 * parameter's constraint, never against what a future call site will
 * instantiate it to — accessing `.annotate` on `endpoint: E extends
 * HttpApiEndpoint.Top` always resolves through `Top`, regardless of whether
 * `E` is a fresh parameter or how the function is invoked. The one place
 * TypeScript *does* recover the concrete type is inside an **inline,
 * unannotated** callback passed directly to `.pipe()` — there, `.pipe`'s own
 * generic signature binds its type parameter to the receiver's already-known
 * concrete type before the callback body is checked, so `endpoint.annotate(
 * ...)` written literally at the call site keeps every literal. That is only
 * available to caller-written code, not to a function this module exports —
 * hence this shape: the safety-relevant check lives here, reusably, but the
 * type-preserving `.annotate()` call itself must appear inline in caller
 * code. See ADR-QD-036 (revision 1.2) for the full correction.
 *
 * `endpoint`'s parameter type is deliberately {@link AnnotatedEndpoint}, not
 * `HttpApiEndpoint.Top` — a second, independent finding from the same
 * round-trip test. `HttpApiEndpoint.get(id, path)` called with no `params`/
 * `query` options (the common case, including the worked example above)
 * leaves those slots `never`; `Top` fixes every slot to `Schema.Top`. The
 * endpoint's `"~Request"` field is computed from those slots through a
 * conditional type, and the two computed shapes are not structurally
 * compatible — a plain, options-less endpoint is not actually assignable to
 * `HttpApiEndpoint.Top`. `AnnotatedEndpoint` sidesteps that conditional
 * entirely by asking for only the two fields this function actually reads.
 */
export const requiresPermission = (
  endpoint: AnnotatedEndpoint,
  requirement: PermissionRequirement,
): RequiredPermissionShape => {
  // A bare `throw`, not the typed error channel AGENTS.md §4/§6 otherwise
  // requires — deliberately, and only because this runs at endpoint
  // construction (module init), never per-request: no request is in flight
  // for a typed failure to reach, and fail-fast-at-boot is exactly the
  // right severity for a wiring mistake (GC-06/TS-05). The same reasoning
  // applies to `DecisionStreamRoute.ts`'s own construction-time throw. A
  // caller composing endpoints outside module top level — dynamically,
  // where this is no longer effectively "at boot" — would see an uncaught
  // throw rather than a typed failure; that is unaddressed today.
  if (Option.isSome(Context.getOption(endpoint.annotations, RequiredPermission))) {
    throw new Error(
      `requiresPermission: endpoint "${endpoint.identifier}" already has a permission ` +
        "requirement. Compose multiple permissions into one Policy (e.g. allOf([...])) " +
        "and pass it to a single requiresPermission call, rather than calling it twice.",
    );
  }
  return Brand.nominal<RequiredPermissionShape>()(requirement);
};

/**
 * Declared once and reused for both the `error` option below and
 * {@link RequirePermissionClientError} — a single source rather than a
 * hand-copied second list that could drift from it (ADR-QD-075).
 *
 * Derived from `QadiHttpError.ts`'s `ENFORCEMENT_ERROR_WIRE`, so a tag added
 * to `EnforcementError` reaches this list through that table's one `satisfies`
 * rather than a hand-maintained array (ARCH-04).
 */
const REQUIRE_PERMISSION_ERROR_SCHEMAS = HTTP_ENFORCEMENT_ERROR_SCHEMAS;

/**
 * Every response {@link RequirePermission} can produce, decoded — the full
 * 12-member union {@link REQUIRE_PERMISSION_ERROR_SCHEMAS} declares, read off
 * that same array via {@link ClientErrorOf} rather than hand-copied. Any
 * future `@qadi/http` middleware adopting `requiredForClient` derives its own
 * `clientError` the same way, through the same shared helper.
 *
 * A generated `HttpApiClient` cannot know, per endpoint, which of these a
 * given call can actually reach — a `PublicEndpoint`-annotated endpoint never
 * reaches `guard` at all, so none of those tags can occur there, yet this
 * union is what every guarded endpoint's static error type includes
 * regardless. That over-approximation is accepted, not fixed: narrowing per
 * endpoint would need a per-endpoint `clientError` attachment point
 * `HttpApiMiddleware`'s type has none of, and ADR-QD-036's fail-closed design
 * is exactly why per-endpoint middleware detachment isn't the fix either —
 * see ADR-QD-075.
 */
export type RequirePermissionClientError = ClientErrorOf<typeof REQUIRE_PERMISSION_ERROR_SCHEMAS>;

/**
 * `CurrentSubject` is resolved and provided per request, inside the
 * middleware body — the rest of `EvaluationServices` is a standing
 * requirement, satisfied once by whatever `QadiEvaluationLive`-shaped layer
 * the application already merges into its server (`AttributeResolver`,
 * `RelationshipResolver`, `DecisionHistory`, `EvaluationId`, `CustomPredicate`,
 * `SignatureHistory`).
 *
 * **`provides: CurrentSubject`** tells `HttpApiBuilder.group`'s own
 * `ExcludeProvided` type-level bookkeeping that every endpoint guarded by
 * this middleware already has `CurrentSubject` supplied by the time its
 * handler runs — matching what this middleware actually does at runtime
 * (`Effect.provideService(CurrentSubject, subject)` below). Without this
 * declaration, a handler that reads `CurrentSubject` (directly, or
 * transitively through `@qadi/core`'s `guard`/`Qadi.assert`) keeps that
 * requirement as an unresolved `HttpRouter.Request<"Requires",
 * CurrentSubject>` marker forever — that marker can only be discharged by a
 * middleware's declared `provides`, never by an ordinary `Layer.provide`
 * applied downstream, so leaving it off forces every consumer into exactly
 * the kind of cast this design exists to avoid. This mirrors `effect`'s own
 * `Authorization`/`CurrentUser` worked example (its `20_testing.ts` and
 * `Users.ts` fixtures), the first-class way `HttpApiMiddleware` expects a
 * subject-injecting middleware to declare itself.
 *
 * **`requires: never`, deliberately — that standing requirement is captured
 * as an ordinary `RequirePermissionLive` build-time dependency instead of
 * being declared here.** `effect`'s own `HttpApiMiddleware.ApplyServices<A,
 * R> = Exclude<R, Provides<A>> | Requires<A>` computes `Requires<A>` via a
 * conditional type keyed on `A`'s own shape (`A extends {[TypeId]:
 * {requires: infer R}} ? R : never`); for `A` bound to a self-referential
 * middleware class (`class X extends HttpApiMiddleware.Service<X,
 * {requires: ...}>()(...)`, the only way to define one), TypeScript never
 * expands that conditional — confirmed with a minimal reproduction using a
 * throwaway middleware class with no `@qadi` code at all, so this is an
 * `effect` core limitation, not something fixable by changing how this
 * class is declared. A non-trivial `requires` value here left it
 * permanently opaque downstream (`HttpApiBuilder.group`,
 * `HttpApiTest.groups`), forcing every consumer into a type-widening cast
 * to use this middleware at all — precisely what `RequirePermissionLive`
 * below now avoids by resolving the standing services itself, once, the same
 * way any other `Layer.effect` acquires a build-time dependency.
 *
 * **`error` declares every response this middleware can produce that isn't
 * the wrapped handler's own** (ADR-QD-072, H4). Every tag in `ENFORCEMENT_ERROR_WIRE` reaches the declared
 * union as their *projection*: `RequirePermissionLive` fails with
 * `projectHttpEnforcementFailure`'s redacted wire value, and
 * `HttpApiMiddleware`'s own response encoder produces the response and the
 * OpenAPI entry from the matching schema's `httpApiStatus` annotation, not
 * from a hand-built table. The list is `QadiHttpError.ts`'s
 * `HTTP_ENFORCEMENT_ERROR_SCHEMAS`, derived from `ENFORCEMENT_ERROR_WIRE`, so
 * a schema omitted for any of those tags is a compile error — before
 * ADR-QD-081 the three hand-caught tags (`AccessDenied`,
 * `UndischargedObligation`, `SubjectExtractionFailed`) never reached this
 * union and could be dropped from the list with only a runtime failure to
 * show for it. Each schema is a real, `_tag`-discriminating schema rather than
 * `HttpApiSchema.Empty` specifically so its presence here cannot swallow the
 * others beside it (see `ENFORCEMENT_ERROR_WIRE`'s doc comment for why a bare
 * no-content schema does exactly that).
 *
 * **`requiredForClient: true` plus `clientError: RequirePermissionClientError`**
 * (ADR-QD-075) put the same schemas into a generated `HttpApiClient`
 * call's *static* error type, automatically, for every endpoint this
 * middleware guards — see {@link RequirePermissionClientError}'s own doc
 * comment for what that does and does not fix. Building such a client
 * requires providing `passthroughClientLayer(RequirePermission)`
 * (`HttpApiMiddlewareClient.ts`) somewhere in its layer graph; this
 * middleware has no real client-side behavior, so that layer is always a
 * passthrough — a credential is attached by decorating the underlying
 * `HttpClient` instead, per `examples/http-advanced/client.ts`.
 */
export class RequirePermission extends HttpApiMiddleware.Service<
  RequirePermission,
  {
    provides: CurrentSubject;
    requires: never;
    clientError: RequirePermissionClientError;
  }
>()("qadi/http/RequirePermission", {
  error: REQUIRE_PERMISSION_ERROR_SCHEMAS,
  // See this class's own doc comment above (ADR-QD-075).
  requiredForClient: true,
}) {}

export const RequirePermissionLive: Layer.Layer<
  RequirePermission,
  never,
  SubjectExtractor | StandingEvaluationServices
> = Layer.effect(
  RequirePermission,
  Effect.gen(function* () {
    const extractor = yield* SubjectExtractor;
    // Resolved once, here, at layer-build time — see `RequirePermission`'s
    // own doc comment for why this replaces a `requires` declaration on the
    // middleware class itself. Re-provided per request below, inside the
    // returned closure, so `guard`'s own `evaluate` call finds them exactly
    // as it would have found them via an ambient per-request `requires`.
    const evaluationServices = yield* Effect.context<StandingEvaluationServices>();

    // The enforcement half: extract, guard, log, project. Kept apart from the
    // dispatch above so it can be replaced without touching how access is read.
    const enforce = (
      requirement: RequiredPermissionShape,
      httpEffect: Effect.Effect<HttpServerResponse.HttpServerResponse, unhandled, CurrentSubject>,
    ) => {
      const { permission, policy } = requirement;

      // Every failure `guard` or the extractor can produce is projected
      // in-channel to the redacted wire value its declared schema describes
      // (`projectHttpEnforcementFailure`, `QadiHttpError.ts`), and
      // `HttpApiMiddleware`'s response encoder then builds the response from
      // the matching schema's `httpApiStatus`. `RequirePermission`'s own doc
      // comment explains why `AccessDenied`'s `trace` and the resolver
      // `cause`s must not reach a body: redaction is the per-tag `project`,
      // typed to return exactly the schema's `Type`.
      return Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const subject = yield* extractor.extract(request);
        return yield* guard(permission, policy)(NO_RESOURCE, () => httpEffect).pipe(
          Effect.provideService(CurrentSubject, subject),
          Effect.provide(evaluationServices),
        );
      }).pipe(
        // Logged before the projection below reduces the error to its wire
        // body — `AccessDenied`'s `reason` and `UndischargedObligation`'s
        // `obligationIds` never reach a response, and neither does
        // `SubjectExtractionFailed`'s `reason`, so these are an operator's only
        // server-side answer to "why was this denied" short of a wired
        // `DecisionSink` (JD-03, JM-05). See `logDenial`'s own doc comment for
        // what it does and does not log (never the full `trace`).
        Effect.tapErrorTag(ENFORCEMENT_DENIAL_TAGS, logDenial),
        Effect.tapErrorTag("SubjectExtractionFailed", logSubjectExtractionFailed),
        // One projection for every tag (ARCH-04, ADR-QD-081). The tag
        // list is `QadiHttpError.ts`'s, so a tag added to `EnforcementError`
        // cannot reach `HttpApiMiddleware`'s encoder as an undeclared failure.
        Effect.catchTag(HTTP_ENFORCEMENT_TAGS, (error) =>
          Effect.fail(projectHttpEnforcementFailure(error)),
        ),
      );
    };

    // The refusal and the public pass-through both provide `CurrentSubject`
    // explicitly (as `anonymous`) even though neither ever extracted a real
    // one — this middleware declares `provides: CurrentSubject`, so every
    // endpoint it guards, public or not, must actually receive one for that
    // declaration to stay honest. `anonymous` is exactly the right value for
    // "no subject was authenticated": every policy denies against it.
    const refuse = (message: string) =>
      Effect.logError(message).pipe(
        Effect.as(HttpServerResponse.empty({ status: 500 })),
        Effect.provideService(CurrentSubject, anonymous),
      );

    return (httpEffect, { endpoint, group }) => {
      // Only an endpoint declares access (`endpointAccess`'s doc comment). A
      // group carrying a declaration is a wiring mistake the middleware can
      // see, so it refuses every endpoint under it rather than ignore it.
      const misplaced = misplacedDeclarations(group.annotations);
      if (misplaced.length > 0) {
        return refuse(
          `qadi/http: group "${group.identifier}" carries ${misplaced.join(" and ")}, which only an ` +
            `endpoint may declare, so endpoint "${endpoint.identifier}" is refused. Declare it on each ` +
            "endpoint, or use HttpApiGroup.annotateEndpoints.",
        );
      }

      // Absence is refusal, not permission. An endpoint reachable without
      // authorization says so with `publicEndpoint`; one that says nothing is
      // a wiring mistake, and a wiring mistake on an authorization path must
      // not resolve to "allowed" (ADR-QD-036, INV-QD-034).
      return Match.valueTags(endpointAccess(endpoint.annotations), {
        Undeclared: () =>
          refuse(
            `qadi/http: endpoint "${endpoint.identifier}" declares neither a permission ` +
              "requirement nor `publicEndpoint(...)`, so it is refused. Annotate it with " +
              "RequiredPermission, or with PublicEndpoint if it is meant to be reachable " +
              "without authorization.",
          ),
        Public: () => Effect.provideService(httpEffect, CurrentSubject, anonymous),
        Required: ({ requirement }) => enforce(requirement, httpEffect),
      });
    };
  }),
);
