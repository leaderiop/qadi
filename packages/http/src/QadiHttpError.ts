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
 *
 * **The two routing shapes still disclose asymmetrically, and that asymmetry
 * is deliberate, not an oversight** (WZ-05). `toResponse` answers every one of
 * the eleven `EnforcementError` tags with `HttpServerResponse.empty()` — no
 * `_tag`, no fields, nothing a bare-`HttpRouter` caller can key off beyond the
 * status code — while `RequirePermission`'s `HttpApiMiddleware` path now
 * answers with a real, `_tag`-carrying body for every one of them (redacted
 * where a field would leak, per the split below, but never bodyless). A bare
 * route has no `HttpApi`/OpenAPI surface and no generated client whose static
 * type this package could keep honest the way it keeps `RequirePermission`'s
 * `clientError` union honest, so there is no `*Refused`-shaped schema this
 * function could encode against without inventing one nobody consumes
 * type-safely — `guardRoute`'s only contract with its caller is the numeric
 * status this file's `Match.tagsExhaustive` table already provides. Giving the
 * bare-router surface a body remains open (see this file's own recommendation
 * history), but it is a separate, not-yet-decided change, not a gap this
 * comment was silent about.
 */
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as Schema from "effect/Schema";
import * as HttpApiSchema from "effect/unstable/httpapi/HttpApiSchema";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import type { AccessDenied, EnforcementError } from "@qadi/core";
import {
  AccessDeniedPublic,
  MissingAction,
  MissingResource,
  MissingResourceId,
  PolicyTooDeep,
  ResourceIdSchema,
  SubjectIdSchema,
  UndischargedObligation,
  errorCode,
} from "@qadi/core";
import { SubjectExtractionFailed } from "./SubjectExtractor.ts";

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

/**
 * The three status codes `toResponse` below and the `httpApiStatus`-annotated
 * schemas further down both answer with, declared once so the two routing
 * shapes ADR-QD-072 gives this package cannot silently disagree about which
 * number a given tag gets. Before this, each side spelled out its own literal
 * (`403`, `502`, `500`) at every call site — `Match.tagsExhaustive` and
 * `AllTagsCovered` both fail the build on a **missing** tag, but neither
 * checks that two present copies of the same tag still agree on the status
 * *value*, so editing one side's number without the other compiled cleanly
 * (EC-02). A future fourth status still needs a matching literal added in
 * both places — this closes the drift between the two that already exist for
 * the same three numbers, not the risk of a genuinely new one.
 */
/**
 * The status code every denial/obligation response answers with.
 *
 * Exported so `RequirePermission.ts`'s `RequirePermissionLive` — the third
 * call site that answers a denial, alongside `AccessDeniedRefused` and
 * `UndischargedObligationRefused`'s own `httpApiStatus` annotations — reads
 * this constant instead of hardcoding `403` a third time. A hardcoded
 * literal there would drift silently from this one if it ever changed: the
 * schema's advertised status and the actual response would disagree with no
 * compile-time or test signal (EC-02).
 */
export const DENIAL_STATUS = 403;
const OUTAGE_STATUS = 502;
const WIRING_MISTAKE_STATUS = 500;

/**
 * The three buckets every `EnforcementError` tag falls into, and the one
 * place that partition is decided.
 *
 * `toResponse` below and `DecisionStreamRoute.ts`'s `reauthCheck` both need
 * this same partition — the former to pick a status code, the latter to
 * label a stream failure as a denial vs. an outage vs. a wiring mistake
 * (GR-01/TS-01) — and used to each carry their own independent
 * `Match.tagsExhaustive` doing it. Two copies of the same classification
 * compile cleanly on their own (each is exhaustive *within its own file*)
 * while silently disagreeing with each other on a moved or added tag, with
 * no compile-time or test signal either way. `toResponse` now derives its
 * status from this single classification instead of re-partitioning the
 * eleven tags itself, and `DecisionStreamRoute.ts` imports this directly.
 */
export type EnforcementErrorClass = "denied" | "outage" | "wiringMistake";

export const classifyEnforcementError: (error: EnforcementError) => EnforcementErrorClass = Match.type<
  EnforcementError
>().pipe(
  Match.tagsExhaustive({
    // A denial or an unmet obligation is the policy's answer, not a fault.
    AccessDenied: () => "denied" as const,
    UndischargedObligation: () => "denied" as const,
    // A resolver or the history port broke — an outage in something this
    // service depends on, not a fault in the request.
    AttributeResolveError: () => "outage" as const,
    RelationshipResolveError: () => "outage" as const,
    DecisionHistoryUnavailable: () => "outage" as const,
    // Covers both causes this tag carries — an unregistered name and the
    // registered predicate's own logic failing — under the same status the
    // other resolver outages get, since the common case is the latter.
    CustomPredicateError: () => "outage" as const,
    // A wired signature history store could not be reached — the same outage
    // shape as the other resolver errors above, same status.
    SignatureHistoryUnavailable: () => "outage" as const,
    // The evaluation was missing something the policy needed — a wiring
    // mistake in this service, not the caller's.
    MissingAction: () => "wiringMistake" as const,
    MissingResource: () => "wiringMistake" as const,
    MissingResourceId: () => "wiringMistake" as const,
    // Also a wiring mistake in this service, and 500 for that reason. No path
    // in this package lets a *request* supply a policy — the middleware reads
    // it from a compile-time endpoint annotation, and `guardRoute` takes it as
    // a layer-construction argument — so "malformed or hostile input", which is
    // what this arm's 400 asserted, cannot reach it here. A 400 is classified
    // non-retryable client error by SDKs and dashboards, so an operator whose
    // own policy tree is too deep would never have been paged for it.
    PolicyTooDeep: () => "wiringMistake" as const,
  }),
);

const STATUS_BY_CLASS: Record<EnforcementErrorClass, number> = {
  denied: DENIAL_STATUS,
  outage: OUTAGE_STATUS,
  wiringMistake: WIRING_MISTAKE_STATUS,
};

export const toResponse = (error: EnforcementError): HttpServerResponse.HttpServerResponse =>
  HttpServerResponse.empty({ status: STATUS_BY_CLASS[classifyEnforcementError(error)] });

/**
 * The `SubjectExtractionFailed` arm both `handleEnforcementErrors` below and
 * `RequirePermission.ts`'s `RequirePermissionLive` share: log the actual
 * reason, then answer 502 — an outage, not a denial, the same status a
 * broken `AttributeResolver` gets (INV-QD-006).
 *
 * The 502 body is {@link SubjectExtractionRefused}'s encoded tag, not an
 * empty response — an empty body decodes to `undefined` through a generated
 * `HttpApiClient`, which satisfies no `Schema.TaggedStruct`, so a client
 * built against `RequirePermission.ts`'s declared `clientError` union could
 * never actually decode this outage as the typed `SubjectExtractionFailed`
 * it promises (BL-01/MH-01/RM-01/GR-02). The real `reason` stays server-side,
 * in the log line above — `SubjectExtractionRefused` carries no fields beyond
 * the tag.
 */
export const subjectExtractionFailedResponse = (error: SubjectExtractionFailed) =>
  Effect.logError(`qadi/http: subject extraction failed — ${error.reason}`).pipe(
    Effect.as(
      HttpServerResponse.jsonUnsafe(
        Schema.encodeSync(SubjectExtractionRefused)({ _tag: "SubjectExtractionFailed" }),
        { status: OUTAGE_STATUS },
      ),
    ),
  );

/**
 * Logs a denial's stable code, subject and root reason before the response
 * arm reduces it to a bodyless — or, at `RequirePermission.ts`'s edge,
 * tag-only — 403. `AccessDenied` and `UndischargedObligation` are the only
 * two `EnforcementError` tags whose originating error never reaches a
 * response body (their real fields are the disclosure concern
 * {@link AccessDeniedRefused}'s and {@link UndischargedObligationRefused}'s
 * own doc comments explain), so without this an operator facing a 403 storm
 * has no server-side answer to "why" short of a separately wired
 * `DecisionSink` (JD-03, JM-05). `subjectExtractionFailedResponse` above
 * already logs its own reason — this closes the same gap for the two tags
 * that didn't.
 *
 * Deliberately not the full evaluation `trace` — `errorCode`, `subjectId`,
 * and either the root denial's `reason` sentence or the unmet obligation ids
 * are enough to diagnose from an operator's log, without repeating what
 * `Evaluate.ts`'s own `Effect.logDebug` already records in full.
 */
export const logDenial = (error: AccessDenied | UndischargedObligation): Effect.Effect<void> =>
  Effect.logWarning(
    error._tag === "AccessDenied"
      ? `qadi/http: request denied (${errorCode(error)}) — subject "${error.subjectId}": ${error.reason}`
      : `qadi/http: request denied (${errorCode(error)}) — subject "${error.subjectId}": ` +
          `undischarged obligation(s) ${error.obligationIds.join(", ")}`,
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
    Effect.tapErrorTag(["AccessDenied", "UndischargedObligation"], logDenial),
    Effect.catchTag(ENFORCEMENT_ERROR_TAGS, (error) => Effect.succeed(toResponse(error))),
    Effect.catchTag("SubjectExtractionFailed", subjectExtractionFailedResponse),
  );

/**
 * `httpApiStatus`-annotated views of the nine `EnforcementError` tags this
 * middleware lets propagate. Split into two groups, not one, since BS-01's
 * audit finding: reusing the real class schema unmodified — "the class is
 * the schema" move ADR-QD-060 made for `SinkCodec.ts`'s wire — is only safe
 * for the four `*Response` schemas below that genuinely carry no disclosure
 * concern (`MissingAction`/`MissingResource`/`MissingResourceId`/
 * `PolicyTooDeep`: an attribute or action *name*, never a value or a defect).
 *
 * The other five — `AttributeResolveError`, `RelationshipResolveError`,
 * `DecisionHistoryUnavailable`, `SignatureHistoryUnavailable` (each with a
 * `cause: Schema.Defect()`) and `CustomPredicateError` (whose `reason` can
 * embed `Cause.pretty` output, `Evaluate.ts`'s `evaluateHasCustom`) do carry
 * one: `.pipe(outage)` on the real class schema would encode the wrapped
 * defect straight into a client-visible 502 body — a resolver's connection
 * string, a stack-shaped object, whatever the backing store actually threw.
 * `RequirePermissionLive` still *fails* with the real class instance carrying
 * the real `cause`/`reason` (for logs, and for `SinkCodec.ts`'s wire, per
 * ADR-QD-060); the five `*Response` schemas below are independently-declared
 * `Schema.TaggedStruct`s covering only the safe fields, so `Schema`'s own
 * field-driven encoder reads just those off the real value and the sensitive
 * one is never visited, confirmed directly (`Schema.encodeUnknownSync` given
 * a real class instance with an extra undeclared field encodes only the
 * struct's own declared fields — the excess property is never read, let
 * alone serialized). `CustomPredicateError`'s wire view drops `reason`
 * entirely rather than half of it: the field conflates an unregistered-name
 * message with `Cause.pretty` output under one untyped string (tracked
 * separately, JD-02) and nothing at this boundary can tell which one a given
 * value holds.
 *
 * `.annotate` (reached here through {@link HttpApiSchema.status}) only
 * changes what `HttpApiMiddleware`'s own response encoder reads off a schema
 * (`httpApiStatus`) when it builds the actual response and the OpenAPI
 * document; it says nothing about which fields that schema declares, which is
 * exactly the axis the split above turns on.
 *
 * Annotated here, in `@qadi/http`, rather than on the classes themselves in
 * `@qadi/core` — an HTTP status code is a transport concern, and `@qadi/core`
 * has no dependency on `effect/unstable/httpapi` at all. The four real class
 * schemas stay exactly the wire schema `SinkCodec.ts` needs, unannotated;
 * this package layers its own transport-specific metadata, and for the five
 * cause-bearing tags its own redacted view, on top rather than reaching into
 * core to add either there.
 */
const outage = HttpApiSchema.status(OUTAGE_STATUS);
const wiringMistake = HttpApiSchema.status(WIRING_MISTAKE_STATUS);

export const AttributeResolveErrorResponse = Schema.TaggedStruct("AttributeResolveError", {
  attribute: Schema.String,
}).pipe(outage);
export const RelationshipResolveErrorResponse = Schema.TaggedStruct("RelationshipResolveError", {
  relation: Schema.String,
  resourceId: ResourceIdSchema,
}).pipe(outage);
export const DecisionHistoryUnavailableResponse = Schema.TaggedStruct("DecisionHistoryUnavailable", {
  event: Schema.String,
}).pipe(outage);
export const CustomPredicateErrorResponse = Schema.TaggedStruct("CustomPredicateError", {
  name: Schema.String,
}).pipe(outage);
export const SignatureHistoryUnavailableResponse = Schema.TaggedStruct("SignatureHistoryUnavailable", {
  subjectId: SubjectIdSchema,
  resourceId: Schema.optional(ResourceIdSchema),
}).pipe(outage);
export const MissingActionResponse = MissingAction.pipe(wiringMistake);
export const MissingResourceResponse = MissingResource.pipe(wiringMistake);
export const MissingResourceIdResponse = MissingResourceId.pipe(wiringMistake);
export const PolicyTooDeepResponse = PolicyTooDeep.pipe(wiringMistake);

/**
 * The wire-facing shape of a denial reaching `RequirePermission`'s
 * middleware — `@qadi/core`'s `AccessDeniedPublic`, annotated with this
 * package's own `HttpApiSchema.status(403)` the same way the nine
 * `*Response` schemas above are (`AccessDeniedPublic` stays unannotated in
 * `@qadi/core`, which has no dependency on `effect/unstable/httpapi` at all —
 * see this file's earlier comment on the `outage`/`wiringMistake` schemas for
 * why that annotation lives here rather than on the class).
 *
 * This formalizes what used to be an ad hoc, tag-only `Schema.TaggedStruct(
 * "AccessDenied", {})` invented independently in this file — **not**
 * `HttpApiSchema.Empty` (`Schema.Void`), and that distinction is load-bearing,
 * confirmed by compiling it rather than assumed. `HttpApiBuilder`'s response
 * encoder (`getResponseEncode`, `HttpApiBuilder.ts:1224`) special-cases an
 * `isNoContent` schema to answer `Response.empty({ status })`
 * **unconditionally, without inspecting the value being encoded at all** — so
 * a bare `Schema.Void` member sitting in the same declared error union as the
 * nine real `EnforcementError` schemas below "encodes" *any* of them
 * successfully, before their own, more specific schema is ever tried, and
 * every one of those nine's real fields silently stops reaching a response.
 * `AccessDeniedPublic`'s `_tag`, `subjectId`, `policyTag` and `reason` fields
 * do not have this problem: encoding validates the `_tag` first and only a
 * matching value passes, so the other nine schemas stay reachable. What
 * changed from the tag-only predecessor is that the body now actually carries
 * `subjectId`/`policyTag`/`reason` — `AccessDenied`'s full evaluation `trace`
 * is still never declared here and never reaches a response, which is the one
 * property this schema and its predecessor both keep: "a trace ... belongs in
 * a log or a test failure, not in a response body." `RequirePermissionLive`'s
 * own `Effect.catchTag` arm constructs an `AccessDeniedPublic` from the real
 * `AccessDenied` (via `toAccessDeniedPublic`) and encodes it with this exact
 * schema before the response is sent, so what OpenAPI advertises here is what
 * a caller actually receives, not merely what the schema permits.
 */
export const AccessDeniedRefused = AccessDeniedPublic.pipe(HttpApiSchema.status(DENIAL_STATUS));

/**
 * The wire-facing shape of an unmet obligation reaching the middleware: the
 * tag only, no other fields — the same "not `HttpApiSchema.Empty`" reasoning
 * as {@link AccessDeniedRefused} applies, but `UndischargedObligation` carries
 * no `trace`-equivalent disclosure concern, so unlike `AccessDenied` it has no
 * public projection type of its own; this stays a tag-only
 * `Schema.TaggedStruct` rather than exposing `subjectId`/`obligationIds`
 * un-reviewed. `RequirePermissionLive` encodes just the tag through this
 * schema (`Schema.encodeSync(UndischargedObligationRefused)({ _tag:
 * "UndischargedObligation" })`) rather than answering a truly empty 403 body
 * — an empty body decodes to `undefined` through a generated `HttpApiClient`,
 * which satisfies no `Schema.TaggedStruct`, so the declared `clientError`
 * union could never actually decode this outcome before this fix
 * (BL-01/MH-01/RM-01/GR-02).
 *
 * **Not `UndischargedObligation.prototype._tag`, despite GC-02's stated
 * intent to read the tag off the class instead of hand-copying it.** Tried
 * and confirmed broken by running it, not assumed: a `Schema.TaggedError`
 * class in this `effect` version sets `_tag` as an **own property on each
 * instance** (inside the generated constructor), not on the prototype and
 * not as a static — `UndischargedObligation.prototype._tag` and
 * `UndischargedObligation._tag` are both `undefined`. `Schema.TaggedStruct(
 * undefined, {})` still builds without error, but then requires the wire
 * `_tag` to literally be `undefined` too, so every encode of the real tag
 * string failed with `SchemaError: Expected undefined at ["_tag"]` — caught
 * by `RequirePermissionClient.test.ts`'s decode round-trip, which is
 * exactly the test this class exists to keep honest. The literal string
 * below is hand-copied, same as before GC-02; the drift risk GC-02 named is
 * real, but there is no compile-time reference to a `Schema.TaggedError`
 * class's tag available here, only a runtime one on an actual instance.
 */
export const UndischargedObligationRefused = Schema.TaggedStruct("UndischargedObligation", {}).pipe(
  HttpApiSchema.status(DENIAL_STATUS),
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
 *
 * Also a hand-copied literal, not `SubjectExtractionFailed.prototype._tag`
 * — see {@link UndischargedObligationRefused}'s doc comment for why
 * (GC-02): `Data.TaggedError` classes carry the same own-instance-property
 * `_tag` a `Schema.TaggedError` one does, `undefined` on both the prototype
 * and the class itself.
 */
export const SubjectExtractionRefused = Schema.TaggedStruct("SubjectExtractionFailed", {}).pipe(
  HttpApiSchema.status(OUTAGE_STATUS),
);
