/**
 * Maps a Qadi enforcement error to the HTTP response it should produce.
 *
 * `Match.tagsExhaustive`, not a catch-all default: a new `EnforcementError`
 * tag added to `@qadi/core` must fail this package's build until someone
 * decides its status code, the same "no silent `undefined`" property
 * `AGENTS.md` §5a documents for `resolveRef`/`mergeFields` in core.
 *
 * **Two mechanisms now produce that mapping, for the two routing shapes this
 * package supports** (ADR-QD-072). `toResponse`/`handleEnforcementErrors`
 * below are the hand-built table `GuardRoute.ts`'s bare `HttpRouter` routes
 * still need — a bare route has no schema-fixed error channel, so nothing
 * else can answer it. `RequirePermission.ts`'s `HttpApiMiddleware` path
 * needs no hand-built table of its own any more: this file's second half
 * exports `httpApiStatus`-annotated schemas instead, and
 * `HttpApiMiddleware`'s own response encoder produces the response from
 * whichever one matches the failure that actually reached it — declaratively,
 * the way `HttpApi` is meant to be used, and visibly to OpenAPI and typed
 * clients in a way the hand-built table underneath never was.
 */
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as Schema from "effect/Schema";
import * as HttpApiSchema from "effect/unstable/httpapi/HttpApiSchema";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import type { EnforcementError } from "@qadi/core";
import {
  AttributeResolveError,
  CustomPredicateError,
  DecisionHistoryUnavailable,
  MissingAction,
  MissingResource,
  MissingResourceId,
  PolicyTooDeep,
  RelationshipResolveError,
  SignatureHistoryUnavailable,
} from "@qadi/core";
import type { SubjectExtractionFailed } from "./SubjectExtractor.ts";

const enforcementErrorTags = [
  "AccessDenied",
  "UndischargedObligation",
  "AttributeResolveError",
  "RelationshipResolveError",
  "DecisionHistoryUnavailable",
  "CustomPredicateError",
  "SignatureHistoryUnavailable",
  "MissingAction",
  "MissingResource",
  "MissingResourceId",
  "PolicyTooDeep",
] as const;

/**
 * Exhaustiveness check for {@link enforcementErrorTags}, resolved at the type
 * level so the exported tuple keeps the literal, non-empty-tuple shape
 * `Effect.catchTag`'s array form itself requires — a plain
 * `ReadonlyArray<EnforcementError["_tag"]>` (e.g. from `Object.values` on a
 * `satisfies` object, the shape core's `ERROR_CODES` uses for a lookup) does
 * not typecheck there.
 *
 * `T`'s constraint already rejects a stray or misspelled tag in `T` (it would
 * not extend `ReadonlyArray<EnforcementError["_tag"]>`); the conditional
 * catches the other direction, a **missing** one — `EnforcementError["_tag"]`
 * extends `T[number]` only when every tag is actually present in `T`, and
 * this alias resolves to `never` otherwise. The export below assigns
 * `enforcementErrorTags` (never `never` itself) to this type, so a tag added
 * to `EnforcementError` with no matching entry above fails to compile
 * (TS2322) instead of only being a possible silent miss at whichever call
 * site forgot it — the same "no silent gap" property `ERROR_CODES`'s
 * `satisfies` gives core's `Errors.ts`, reached here via a type-level check
 * because the value itself must stay a tuple.
 */
type AllTagsCovered<T extends ReadonlyArray<EnforcementError["_tag"]>> =
  [EnforcementError["_tag"]] extends [T[number]] ? T : never;

/**
 * Every `EnforcementError` tag, for `Effect.catchTag`'s array form (house
 * style §4 — never the object form). Shared by both framework adapters so a
 * tag can't be caught in one and forgotten in the other.
 */
export const ENFORCEMENT_ERROR_TAGS: AllTagsCovered<typeof enforcementErrorTags> = enforcementErrorTags;

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
    // A wired signature history store could not be reached — the same outage
    // shape as the other resolver errors above, same status.
    SignatureHistoryUnavailable: () => HttpServerResponse.empty({ status: 502 }),
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

/**
 * The `SubjectExtractionFailed` arm both `handleEnforcementErrors` below and
 * `RequirePermission.ts`'s `RequirePermissionLive` share: log the actual
 * reason, then answer 502 — an outage, not a denial, the same status a
 * broken `AttributeResolver` gets (INV-QD-006).
 */
export const subjectExtractionFailedResponse = (error: SubjectExtractionFailed) =>
  Effect.logError(`qadi/http: subject extraction failed — ${error.reason}`).pipe(
    Effect.as(HttpServerResponse.empty({ status: 502 })),
  );

/**
 * Maps every enforcement failure a guarded bare `HttpRouter` request can
 * produce — an `EnforcementError` from `@qadi/core`'s `guard`, or a
 * {@link SubjectExtractionFailed} from `SubjectExtractor` — down to an HTTP
 * response, discharging both error tags to `never`.
 *
 * Was duplicated verbatim in `GuardRoute.ts`: the same
 * `Effect.catchTag(ENFORCEMENT_ERROR_TAGS, …)` then
 * `Effect.catchTag("SubjectExtractionFailed", …)` pipe, copy-pasted rather
 * than shared, which is exactly the drift risk this module's other exports
 * (`ENFORCEMENT_ERROR_TAGS`, `toResponse`) already guard against for a single
 * tag going unhandled — two independent copies can drift from each other the
 * same way one copy can drift from the union. `never` in the error channel is
 * load-bearing here specifically: a bare `HttpRouter` handler has no
 * schema-fixed error channel to escape into, so an enforcement failure that
 * isn't converted to a response here has nowhere else to go — see
 * `GuardRoute.ts`'s `guardRoute` doc comment.
 *
 * **`RequirePermission.ts`'s `HttpApiMiddleware` no longer has a
 * counterpart function here** (ADR-QD-072). Its `httpEffect` has a
 * schema-fixed error channel — the endpoint's declared `error:` union — so
 * an `EnforcementError` it doesn't hand-catch has somewhere real to go:
 * `HttpApiMiddleware`'s own response encoder, driven by the
 * `httpApiStatus`-annotated schemas below. A bare `HttpRouter` handler has
 * no such channel to escape into, which is what still makes this function's
 * `never` discharge load-bearing here specifically.
 */
export const handleEnforcementErrors = <A, R>(
  self: Effect.Effect<A, EnforcementError | SubjectExtractionFailed, R>,
): Effect.Effect<A | HttpServerResponse.HttpServerResponse, never, R> =>
  self.pipe(
    Effect.catchTag(ENFORCEMENT_ERROR_TAGS, (error) => Effect.succeed(toResponse(error))),
    Effect.catchTag("SubjectExtractionFailed", subjectExtractionFailedResponse),
  );

/**
 * `httpApiStatus`-annotated views of the nine `EnforcementError` tags that
 * carry no disclosure concern at this boundary — reusing the same
 * "the class is the schema" move ADR-QD-060 made for `SinkCodec.ts`'s wire,
 * now extended by ADR-QD-072 to the HTTP response. `.annotate` (reached here
 * through {@link HttpApiSchema.status}) rebuilds the *schema*, not the
 * class, so `RequirePermissionLive` still fails with a real
 * `AttributeResolveError` etc. instance; the annotated view below only
 * changes what `HttpApiMiddleware`'s own response encoder reads off it
 * (`httpApiStatus`) when it builds the actual response and the OpenAPI
 * document.
 *
 * Annotated here, in `@qadi/http`, rather than on the classes themselves in
 * `@qadi/core` — an HTTP status code is a transport concern, and `@qadi/core`
 * has no dependency on `effect/unstable/httpapi` at all. The class stays
 * exactly the wire schema `SinkCodec.ts` needs, unannotated; this package
 * layers its own transport-specific metadata on top rather than reaching
 * into core to add it there.
 */
const outage = HttpApiSchema.status(502);
const wiringMistake = HttpApiSchema.status(500);

export const AttributeResolveErrorResponse = AttributeResolveError.pipe(outage);
export const RelationshipResolveErrorResponse = RelationshipResolveError.pipe(outage);
export const DecisionHistoryUnavailableResponse = DecisionHistoryUnavailable.pipe(outage);
export const CustomPredicateErrorResponse = CustomPredicateError.pipe(outage);
export const SignatureHistoryUnavailableResponse = SignatureHistoryUnavailable.pipe(outage);
export const MissingActionResponse = MissingAction.pipe(wiringMistake);
export const MissingResourceResponse = MissingResource.pipe(wiringMistake);
export const MissingResourceIdResponse = MissingResourceId.pipe(wiringMistake);
export const PolicyTooDeepResponse = PolicyTooDeep.pipe(wiringMistake);

/**
 * The wire-facing shape of a denial reaching `RequirePermission`'s
 * middleware: the tag only, no other fields — **not** `HttpApiSchema.Empty`
 * (`Schema.Void`), and that distinction is load-bearing, confirmed by
 * compiling it rather than assumed. `HttpApiBuilder`'s response encoder
 * (`getResponseEncode`, `HttpApiBuilder.ts:1224`) special-cases a
 * `isNoContent` schema to answer `Response.empty({ status })`
 * **unconditionally, without inspecting the value being encoded at all** —
 * so a bare `Schema.Void` member sitting in the same declared error union as
 * the nine real `EnforcementError` schemas below "encodes" *any* of them
 * successfully, before their own, more specific schema is ever tried, and
 * every one of those nine's real fields silently stops reaching a response.
 * A `Schema.TaggedStruct` with a literal `_tag` and no other fields does not
 * have this problem: encoding validates the `_tag` first and only a real
 * `AccessDenied`/`UndischargedObligation` value matches, so the other nine
 * schemas stay reachable. The body this actually produces is `{"_tag":
 * "AccessDenied"}` (or `"UndischargedObligation"`) — not literally empty,
 * but `subjectId`, `policyTag`, `reason`, and `AccessDenied`'s full
 * evaluation `trace` are excess properties this schema never declares, so
 * they are stripped rather than encoded. That is exactly the boundary this
 * file's own `toResponse` has always kept: "a trace names every node's tag,
 * its label and the sentence explaining why it refused, so it belongs in a
 * log or a test failure, not in a response body." Declaring the real
 * `AccessDenied`/`UndischargedObligation` classes here, unprojected, would
 * make OpenAPI advertise a body neither ever actually sends — a contract
 * lie, worse than a small, honest one. Not that either instance actually
 * reaches this encoder in practice: `RequirePermissionLive`'s own
 * `Effect.catchTag` arm converts both to a response by hand first, matching
 * `toResponse`'s always-empty behavior byte for byte; these are declared for
 * OpenAPI visibility and to keep the union safe for the schemas after them,
 * not because either is expected to be exercised at runtime.
 */
export const AccessDeniedRefused = Schema.TaggedStruct("AccessDenied", {}).pipe(HttpApiSchema.status(403));
export const UndischargedObligationRefused = Schema.TaggedStruct("UndischargedObligation", {}).pipe(
  HttpApiSchema.status(403),
);

/**
 * The wire-facing shape of a {@link SubjectExtractionFailed} reaching the
 * middleware — the same tag-only shape as {@link AccessDeniedRefused}, and
 * for the same reason: a bare `Schema.Void` member here would swallow the
 * nine real `EnforcementError` schemas beside it in
 * `RequirePermission.error`, matching any of them before their own schema is
 * tried. `SubjectExtractionFailed` is package-local (`SubjectExtractor.ts`),
 * never crosses `SinkCodec.ts`'s wire, and ADR-QD-072's scope widening is
 * named as exactly the eleven `EnforcementError` tags — this one stays
 * `Data.TaggedError`, unconverted, and represented at this boundary the same
 * way the two denial tags are.
 */
export const SubjectExtractionRefused = Schema.TaggedStruct("SubjectExtractionFailed", {}).pipe(
  HttpApiSchema.status(502),
);
