/**
 * Maps a Qadi enforcement error to the HTTP response it should produce.
 *
 * `Match.tagsExhaustive`, not a catch-all default: a new `EnforcementError`
 * tag added to `@qadi/core` must fail this package's build until someone
 * decides its status code, the same "no silent `undefined`" property
 * `AGENTS.md` §5a documents for `resolveRef`/`mergeFields` in core.
 */
import * as Match from "effect/Match";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import type { EnforcementError } from "@qadi/core";

/**
 * Every `EnforcementError` tag, for `Effect.catchTag`'s array form (house
 * style §4 — never the object form). Shared by both framework adapters so a
 * tag can't be caught in one and forgotten in the other.
 */
export const ENFORCEMENT_ERROR_TAGS = [
  "AccessDenied",
  "UndischargedObligation",
  "AttributeResolveError",
  "RelationshipResolveError",
  "DecisionHistoryUnavailable",
  "CustomPredicateError",
  "MissingAction",
  "MissingResource",
  "MissingResourceId",
  "PolicyTooDeep",
] as const;

export const toResponse: (error: EnforcementError) => HttpServerResponse.HttpServerResponse = Match.type<
  EnforcementError
>().pipe(
  Match.tagsExhaustive({
    // A denial or an unmet obligation is the policy's answer, not a fault.
    AccessDenied: () => HttpServerResponse.empty({ status: 403 }),
    UndischargedObligation: () => HttpServerResponse.empty({ status: 403 }),
    // A resolver or the history port broke — an outage in something this
    // service depends on, not a fault in the request.
    AttributeResolveError: () => HttpServerResponse.empty({ status: 502 }),
    RelationshipResolveError: () => HttpServerResponse.empty({ status: 502 }),
    DecisionHistoryUnavailable: () => HttpServerResponse.empty({ status: 502 }),
    // Covers both causes this tag carries — an unregistered name and the
    // registered predicate's own logic failing — under the same status the
    // other resolver outages get, since the common case is the latter.
    CustomPredicateError: () => HttpServerResponse.empty({ status: 502 }),
    // The evaluation was missing something the policy needed — a wiring
    // mistake in this service, not the caller's.
    MissingAction: () => HttpServerResponse.empty({ status: 500 }),
    MissingResource: () => HttpServerResponse.empty({ status: 500 }),
    MissingResourceId: () => HttpServerResponse.empty({ status: 500 }),
    // Also a wiring mistake in this service, and 500 for that reason. No path
    // in this package lets a *request* supply a policy — the middleware reads
    // it from a compile-time endpoint annotation, and `guardRoute` takes it as
    // a layer-construction argument — so "malformed or hostile input", which is
    // what this arm's 400 asserted, cannot reach it here. A 400 is classified
    // non-retryable client error by SDKs and dashboards, so an operator whose
    // own policy tree is too deep would never have been paged for it.
    PolicyTooDeep: () => HttpServerResponse.empty({ status: 500 }),
  }),
);
