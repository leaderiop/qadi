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
    // The evaluation was missing something the policy needed — a wiring
    // mistake in this service, not the caller's.
    MissingAction: () => HttpServerResponse.empty({ status: 500 }),
    MissingResource: () => HttpServerResponse.empty({ status: 500 }),
    MissingResourceId: () => HttpServerResponse.empty({ status: 500 }),
    // The policy tree itself was malformed or hostile.
    PolicyTooDeep: () => HttpServerResponse.empty({ status: 400 }),
  }),
);
