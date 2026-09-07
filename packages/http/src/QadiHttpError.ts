/**
 * Maps a Qadi enforcement error to the HTTP response it should produce.
 *
 * `Match.tagsExhaustive`, not a catch-all default: a new `EnforcementError`
 * tag added to `@qadi/core` must fail this package's build until someone
 * decides its status code, the same "no silent `undefined`" property
 * `AGENTS.md` §5a documents for `resolveRef`/`mergeFields` in core.
 */
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import type * as Types from "effect/Types";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import type { EnforcementError } from "@qadi/core";
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
 * The `SubjectExtractionFailed` arm both enforcement-error handlers below
 * share: log the actual reason, then answer 502 — an outage, not a denial,
 * the same status a broken `AttributeResolver` gets (INV-QD-006).
 */
const subjectExtractionFailedResponse = (error: SubjectExtractionFailed) =>
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
 * **Not the same function `RequirePermission.ts` uses** — see
 * {@link handleMiddlewareEnforcementErrors}'s own doc comment for why one
 * shared, generically-typed function cannot cover both shapes.
 */
export const handleEnforcementErrors = <A, R>(
  self: Effect.Effect<A, EnforcementError | SubjectExtractionFailed, R>,
): Effect.Effect<A | HttpServerResponse.HttpServerResponse, never, R> =>
  self.pipe(
    Effect.catchTag(ENFORCEMENT_ERROR_TAGS, (error) => Effect.succeed(toResponse(error))),
    Effect.catchTag("SubjectExtractionFailed", subjectExtractionFailedResponse),
  );

/**
 * {@link handleEnforcementErrors}'s counterpart for `RequirePermission.ts`'s
 * `HttpApiMiddleware`, which cannot discharge to `never`: the wrapped
 * `httpEffect` an `HttpApiMiddleware` receives is typed
 * `Effect.Effect<HttpServerResponse, unhandled, Provides>` by
 * `effect/unstable/httpapi/HttpApiMiddleware` itself, and that `unhandled`
 * (`effect/Types`) has to survive this mapping unchanged rather than be
 * absorbed — it is the framework's own placeholder for "the endpoint's error
 * schema, resolved elsewhere," not a real error this middleware is
 * positioned to answer.
 *
 * **A second, near-identical function rather than one shared one, and not
 * for lack of trying.** A single function generic over "the extra
 * pass-through error type" — even bounded to `U extends Types.unhandled`
 * specifically, rather than left fully open — still leaves `Effect.catchTag`
 * unable to prove the *generic* `U` shares no tag with
 * `EnforcementError`/`SubjectExtractionFailed`, so it refuses to narrow at
 * all and the leftover type stays an un-narrowed union no caller can use.
 * Confirmed by compiling it, not assumed: `GuardRoute.ts`'s `guardRoute` doc
 * comment already found this exact limit for a fully open caller-supplied
 * type parameter ("no cast-free way around it for a genuinely generic error
 * channel"), and it turns out to hold even for a parameter constrained to a
 * single, concrete, structurally-disjoint type — only a *literal*,
 * non-generic union in this position lets `catchTag` narrow, which is why
 * this and {@link handleEnforcementErrors} are two monomorphic functions
 * instead of one. They share everything that duplicating them anyway allowed
 * to be shared: `ENFORCEMENT_ERROR_TAGS`, `toResponse`, and
 * {@link subjectExtractionFailedResponse}'s log-then-502 arm.
 */
export const handleMiddlewareEnforcementErrors = <A, R>(
  self: Effect.Effect<A, EnforcementError | SubjectExtractionFailed | Types.unhandled, R>,
): Effect.Effect<A | HttpServerResponse.HttpServerResponse, Types.unhandled, R> =>
  self.pipe(
    Effect.catchTag(ENFORCEMENT_ERROR_TAGS, (error) => Effect.succeed(toResponse(error))),
    Effect.catchTag("SubjectExtractionFailed", subjectExtractionFailedResponse),
  );
