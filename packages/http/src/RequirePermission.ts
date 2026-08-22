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
import type {
  AttributeResolver,
  DecisionHistory,
  EvaluationId,
  Permission,
  Policy,
  RelationshipResolver,
  Resource,
} from "@qadi/core";
import { currentSubjectLayer, guard } from "@qadi/core";
import { ENFORCEMENT_ERROR_TAGS, toResponse } from "./QadiHttpError.ts";
import { SubjectExtractor } from "./SubjectExtractor.ts";

export interface PermissionRequirement {
  readonly permission: Permission;
  readonly policy: Policy;
}

export class RequiredPermission extends Context.Service<RequiredPermission, PermissionRequirement>()(
  "qadi/http/RequiredPermission",
) {}

/**
 * The resource `RequirePermission` checks against: none. This middleware
 * enforces the contract-level requirement an endpoint declares, before any
 * resource has been loaded — a resource-scoped re-check belongs in the
 * handler, via `@qadi/core`'s `guard` directly, as defense in depth.
 */
const NO_RESOURCE: Resource = {};

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
 * `RelationshipResolver`, `DecisionHistory`, `EvaluationId`).
 */
export class RequirePermission extends HttpApiMiddleware.Service<
  RequirePermission,
  { requires: AttributeResolver | RelationshipResolver | DecisionHistory | EvaluationId }
>()("qadi/http/RequirePermission") {}

export const RequirePermissionLive: Layer.Layer<RequirePermission, never, SubjectExtractor> = Layer.effect(
  RequirePermission,
  Effect.gen(function* () {
    const extractor = yield* SubjectExtractor;

    return (httpEffect, { endpoint }) => {
      const required = Context.getOption(endpoint.annotations, RequiredPermission);
      if (Option.isNone(required)) return httpEffect;

      const { permission, policy } = required.value;

      return Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const subject = yield* extractor.extract(request);
        return yield* guard(permission, policy)(NO_RESOURCE, () => httpEffect).pipe(
          Effect.provide(currentSubjectLayer(subject)),
        );
      }).pipe(Effect.catchTag(ENFORCEMENT_ERROR_TAGS, (error) => Effect.succeed(toResponse(error))));
    };
  }),
);
