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
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as HttpApiMiddleware from "effect/unstable/httpapi/HttpApiMiddleware";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import type {
  AttributeResolver,
  CustomPredicate,
  DecisionHistory,
  EvaluationId,
  Permission,
  Policy,
  RelationshipResolver,
  Resource,
  SignatureHistory,
} from "@qadi/core";
import { currentSubjectLayer, guard } from "@qadi/core";
import {
  AccessDeniedRefused,
  AttributeResolveErrorResponse,
  CustomPredicateErrorResponse,
  DecisionHistoryUnavailableResponse,
  MissingActionResponse,
  MissingResourceIdResponse,
  MissingResourceResponse,
  PolicyTooDeepResponse,
  RelationshipResolveErrorResponse,
  SignatureHistoryUnavailableResponse,
  SubjectExtractionRefused,
  UndischargedObligationRefused,
  subjectExtractionFailedResponse,
} from "./QadiHttpError.ts";
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

export class RequiredPermission extends Context.Service<RequiredPermission, PermissionRequirement>()(
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
): PermissionRequirement => {
  if (Option.isSome(Context.getOption(endpoint.annotations, RequiredPermission))) {
    throw new Error(
      `requiresPermission: endpoint "${endpoint.identifier}" already has a permission ` +
        "requirement. Compose multiple permissions into one Policy (e.g. allOf([...])) " +
        "and pass it to a single requiresPermission call, rather than calling it twice.",
    );
  }
  return requirement;
};

/**
 * `CurrentSubject` is resolved and provided per request, inside the
 * middleware body — the rest of `EvaluationServices` is a standing
 * requirement, satisfied once by whatever `QadiEvaluationLive`-shaped layer
 * the application already merges into its server (`AttributeResolver`,
 * `RelationshipResolver`, `DecisionHistory`, `EvaluationId`, `CustomPredicate`,
 * `SignatureHistory`).
 *
 * **`error` declares every response this middleware can produce that isn't
 * the wrapped handler's own** (ADR-QD-072, H4). Nine are the
 * `httpApiStatus`-annotated `EnforcementError` schemas `QadiHttpError.ts`
 * exports — `RequirePermissionLive` lets a failure of one of those nine
 * *propagate*, and `HttpApiMiddleware`'s own response encoder produces the
 * response and the OpenAPI entry from the schema, not from a hand-built
 * `Match.tagsExhaustive` table. The other three — {@link AccessDeniedRefused},
 * {@link UndischargedObligationRefused}, {@link SubjectExtractionRefused} —
 * are declared for the same OpenAPI visibility, and each is a real,
 * `_tag`-discriminating schema rather than `HttpApiSchema.Empty`
 * specifically so its presence here cannot swallow the nine real schemas
 * beside it (see {@link AccessDeniedRefused}'s own doc comment for why a
 * bare no-content schema does exactly that). None of the three is expected
 * to actually reach this union at runtime either way —
 * `RequirePermissionLive` hand-converts `AccessDenied`/
 * `UndischargedObligation`/`SubjectExtractionFailed` to a response itself,
 * before the failure ever gets this far, because those three must not carry
 * their real fields into a response body. Declaring them anyway, rather than
 * leaving them off this list, is what keeps OpenAPI honest about every
 * status this endpoint can actually return.
 */
export class RequirePermission extends HttpApiMiddleware.Service<
  RequirePermission,
  {
    requires:
      | AttributeResolver
      | RelationshipResolver
      | DecisionHistory
      | EvaluationId
      | CustomPredicate
      | SignatureHistory;
  }
>()("qadi/http/RequirePermission", {
  error: [
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
  ],
}) {}

export const RequirePermissionLive: Layer.Layer<RequirePermission, never, SubjectExtractor> = Layer.effect(
  RequirePermission,
  Effect.gen(function* () {
    const extractor = yield* SubjectExtractor;

    return (httpEffect, { endpoint }) => {
      const required = Context.getOption(endpoint.annotations, RequiredPermission);
      if (Option.isNone(required)) {
        // Absence is refusal, not permission. An endpoint reachable without
        // authorization says so with `publicEndpoint`; one that says nothing is
        // a wiring mistake, and a wiring mistake on an authorization path must
        // not resolve to "allowed" (ADR-QD-036, INV-QD-034).
        if (Option.isSome(Context.getOption(endpoint.annotations, PublicEndpoint))) {
          return httpEffect;
        }
        return Effect.logError(
          `qadi/http: endpoint "${endpoint.identifier}" declares neither a permission ` +
            "requirement nor `publicEndpoint(...)`, so it is refused. Annotate it with " +
            "RequiredPermission, or with PublicEndpoint if it is meant to be reachable " +
            "without authorization.",
        ).pipe(Effect.as(HttpServerResponse.empty({ status: 500 })));
      }

      const { permission, policy } = required.value;

      // `AccessDenied`/`UndischargedObligation`/`SubjectExtractionFailed` are
      // hand-caught and converted here rather than left to propagate:
      // `RequirePermission`'s own doc comment explains why their real fields
      // must not reach a response body. Everything else in `EnforcementError`
      // — the nine tags the other declared schemas cover — propagates typed,
      // and `HttpApiMiddleware`'s response encoder builds the actual response
      // from whichever declared schema matches, using its `httpApiStatus`
      // annotation.
      return Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const subject = yield* extractor.extract(request);
        return yield* guard(permission, policy)(NO_RESOURCE, () => httpEffect).pipe(
          Effect.provide(currentSubjectLayer(subject)),
        );
      }).pipe(
        Effect.catchTag(["AccessDenied", "UndischargedObligation"], () =>
          Effect.succeed(HttpServerResponse.empty({ status: 403 })),
        ),
        Effect.catchTag("SubjectExtractionFailed", subjectExtractionFailedResponse),
      );
    };
  }),
);
