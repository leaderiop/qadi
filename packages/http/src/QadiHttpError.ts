/**
 * Describes, once per enforcement-error tag, how `@qadi/http` answers it — and
 * derives every response, status and declared error list from that one table.
 *
 * `ENFORCEMENT_ERROR_WIRE` is keyed by every tag this package can
 * answer: each `EnforcementError` tag from `@qadi/core`, plus the
 * package-local `SubjectExtractionFailed`. Each entry carries the tag's class
 * (read from `@qadi/core`'s `ENFORCEMENT_ERROR_CLASSES`, never chosen here), its
 * status (derived from that class through `HTTP_STATUS_BY_CLASS`, never chosen
 * by hand), its `httpApiStatus`-annotated wire schema, and a typed projection
 * from the real error to that schema's `Type`. A tag added to
 * `EnforcementError` without an entry fails this package's build at exactly
 * one site — the `satisfies` on the table (ARCH-04, ADR-QD-081).
 *
 * **Two routing shapes read that table** (ADR-QD-072).
 * `toResponse`/`handleEnforcementErrors` are what `GuardRoute.ts`'s bare
 * `HttpRouter` routes need — a bare route has no schema-fixed error channel,
 * so nothing else can answer it. `RequirePermission.ts`'s `HttpApiMiddleware`
 * path projects each failure in-channel through the table's `project` and lets
 * `HttpApiMiddleware`'s own response encoder answer from the matching
 * schema's `httpApiStatus` — declaratively, and visibly to OpenAPI and typed
 * clients. Both read the same `HTTP_STATUS_BY_CLASS[class]`, so the two shapes
 * cannot disagree on a status; before this table each picked its own by hand
 * and a swapped choice compiled cleanly and passed every test (ARCH-04, E6).
 *
 * **The two routing shapes still disclose asymmetrically, and that asymmetry
 * is deliberate, not an oversight** (WZ-05). `toResponse` answers every one of
 * the `EnforcementError` tags with `HttpServerResponse.empty()` — no
 * `_tag`, no fields, nothing a bare-`HttpRouter` caller can key off beyond the
 * status code — while `RequirePermission`'s `HttpApiMiddleware` path answers
 * with a real, `_tag`-carrying body for every one of them (redacted where a
 * field would leak, never bodyless). A bare route has no `HttpApi`/OpenAPI
 * surface and no generated client whose static type this package could keep
 * honest, so there is no schema `toResponse` could encode against without
 * inventing one nobody consumes type-safely. `SubjectExtractionFailed` is the
 * one exception on the bare route: it answers its tag-only JSON 502 there too
 * (see {@link subjectExtractionFailedResponse}). Giving the bare-router
 * surface a body for the other tags remains a separate, not-yet-decided
 * change.
 */
import * as Effect from "effect/Effect";
import * as Record from "effect/Record";
import * as Schema from "effect/Schema";
import * as HttpApiSchema from "effect/http-api/HttpApiSchema";
import * as HttpServerResponse from "effect/http/HttpServerResponse";
import type {
  EnforcementDenial,
  EnforcementError,
  EnforcementErrorClass,
  EnforcementErrorClassTable,
} from "@qadi/core";
import {
  AccessDeniedPublic,
  ENFORCEMENT_DENIAL_TAGS,
  ENFORCEMENT_ERROR_CLASSES,
  ENFORCEMENT_ERROR_TAGS,
  MissingAction,
  MissingResource,
  MissingResourceId,
  PolicyTooDeep,
  ResourceIdSchema,
  SubjectIdSchema,
  classifyEnforcementError,
  errorCode,
  toAccessDeniedPublic,
} from "@qadi/core";
import type { SubjectExtractionFailed } from "./SubjectExtractor.ts";

/**
 * Every failure a guarded `@qadi/http` request can produce: an
 * `EnforcementError` from `@qadi/core`'s `guard`, or a
 * {@link SubjectExtractionFailed} from `SubjectExtractor`.
 */
export type HttpEnforcementFailure = EnforcementError | SubjectExtractionFailed;

/** Every tag of {@link HttpEnforcementFailure}. */
export type HttpEnforcementTag = HttpEnforcementFailure["_tag"];

/**
 * `@qadi/core`'s class table extended by the one package-local failure.
 *
 * `SubjectExtractionFailed` is an outage, not a denial: the extractor could
 * not reach whatever resolves a token, the same status class a broken
 * `AttributeResolver` gets (INV-QD-006). It stays out of `@qadi/core`'s table
 * because `SubjectExtractor` is this package's port, and `EnforcementError` is
 * what `@qadi/core`'s `guard` raises.
 */
const HTTP_ENFORCEMENT_CLASSES = {
  ...ENFORCEMENT_ERROR_CLASSES,
  SubjectExtractionFailed: "outage",
} as const satisfies EnforcementErrorClassTable<HttpEnforcementFailure>;

/**
 * The status each {@link EnforcementErrorClass} answers with, on both routing
 * shapes.
 *
 * Declared once so `toResponse` and the `httpApiStatus`-annotated schemas
 * cannot silently disagree about which number a given tag gets. Before this,
 * each side spelled out its own literal (`403`, `502`, `500`) at every call
 * site — an exhaustive match and the tag tuple both failed the build on a
 * **missing** tag, but neither checked that two present copies of the same tag
 * still agreed on the status *value*, so editing one side's number without the
 * other compiled cleanly (EC-02). `wire` below now derives every status from
 * this table and is the package's only `httpApiStatus` writer.
 *
 * A future fourth class still needs a number added here, and a fourth class is
 * a compile error in `@qadi/core` first.
 */
export const HTTP_STATUS_BY_CLASS = {
  denied: 403,
  outage: 502,
  wiringMistake: 500,
} as const satisfies { readonly [C in EnforcementErrorClass]: number };

/**
 * How `@qadi/http` answers one tag: its class, its status, the wire schema the
 * response encoder uses, and the projection from the real error to that
 * schema's `Type`.
 *
 * `project` is typed to return exactly `S["Type"]`, so redaction is explicit
 * and checked: a field that is not declared on the schema cannot be returned
 * from it, and a real error carrying a sensitive field (`AccessDenied`'s
 * `trace`, a resolver's `cause`) is reduced to the declared fields before the
 * encoder ever sees it.
 */
export interface EnforcementErrorWire<K extends HttpEnforcementTag, S extends Schema.Top> {
  readonly class: EnforcementErrorClass;
  readonly status: number;
  readonly schema: S;
  readonly project: (error: Extract<HttpEnforcementFailure, { readonly _tag: K }>) => S["Type"];
}

/**
 * A tag-keyed table of {@link EnforcementErrorWire}, total over `E`.
 *
 * The `Type: { _tag: K }` constraint on each entry's schema makes a schema
 * filed under the wrong key a compile error. Generic over the failure union so
 * a type-level test can model a tag added to it (`QadiHttpError.tst.ts`).
 */
export type EnforcementErrorWireTable<E extends { readonly _tag: string } = HttpEnforcementFailure> =
  {
    readonly [K in E["_tag"]]: EnforcementErrorWire<
      K & HttpEnforcementTag,
      Schema.Top & { readonly Type: { readonly _tag: K } }
    >;
  };

/**
 * Builds one table entry, deriving `class` and `status` from the tag so neither
 * can be chosen by hand.
 *
 * `.annotate` (reached here through `HttpApiSchema.status`) only changes what
 * `HttpApiMiddleware`'s own response encoder reads off a schema
 * (`httpApiStatus`) when it builds the actual response and the OpenAPI
 * document; it says nothing about which fields that schema declares.
 *
 * Annotated here, in `@qadi/http`, rather than on the classes in `@qadi/core`:
 * an HTTP status code is a transport concern, and `@qadi/core` has no
 * dependency on `effect/http-api` at all (ADR-QD-072).
 */
const wire = <K extends HttpEnforcementTag, S extends Schema.Top & { readonly Type: { readonly _tag: K } }>(
  tag: K,
  schema: S,
  project: (error: Extract<HttpEnforcementFailure, { readonly _tag: K }>) => S["Type"],
): EnforcementErrorWire<K, S["Rebuild"]> => {
  const errorClass = HTTP_ENFORCEMENT_CLASSES[tag];
  const status = HTTP_STATUS_BY_CLASS[errorClass];
  return {
    class: errorClass,
    status,
    schema: schema.pipe(HttpApiSchema.status(status)),
    project,
  };
};

/**
 * The one description of how `@qadi/http` answers each tag in `HTTP_ENFORCEMENT_TAGS`.
 *
 * Split by whether the real class schema is safe to put on the wire, since
 * BS-01's audit finding: reusing the real class schema unmodified — the "class
 * is the schema" move ADR-QD-060 made for `SinkCodec.ts`'s wire — is only safe
 * for `MissingAction`/`MissingResource`/`MissingResourceId`/`PolicyTooDeep`
 * (an attribute or action *name*, never a value or a defect), and for
 * `AccessDeniedPublic`, `AccessDenied`'s own no-trace projection.
 *
 * `AttributeResolveError`, `RelationshipResolveError`,
 * `DecisionHistoryUnavailable`, `SignatureHistoryUnavailable` (each with a
 * `cause: Schema.Defect()`) and `CustomPredicateError` (whose `reason` can
 * embed `Cause.pretty` output, `PortAccess.ts`'s `askCustom`) do carry a
 * disclosure concern: the real class schema would encode the wrapped defect
 * straight into a client-visible 502 body — a resolver's connection string, a
 * stack-shaped object, whatever the backing store actually threw. Those five
 * are independently declared `Schema.TaggedStruct`s covering only the safe
 * fields, and their `project` picks exactly those fields. The middleware still
 * *fails* with the real class instance up to the projection (for logs, and for
 * `SinkCodec.ts`'s wire, per ADR-QD-060). `CustomPredicateError`'s wire view
 * drops `reason` entirely rather than half of it: the field conflates an
 * unregistered-name message with `Cause.pretty` output under one untyped
 * string (JD-02) and nothing at this boundary can tell which one a given value
 * holds.
 *
 * `AccessDenied` and `SubjectExtractionFailed` are tag-bearing, not
 * `HttpApiSchema.Empty` (`Schema.Void`), and that distinction is load-bearing,
 * confirmed by compiling it rather than assumed. `HttpApiBuilder`'s response
 * encoder special-cases an `isNoContent` schema to answer
 * `HttpServerResponse.empty` **unconditionally, without inspecting the value
 * being encoded at all** (`HttpApiBuilder.ts:1268`, `:1296`, `:1332` in
 * `effect` 4.0.0) — so a bare `Schema.Void` member sitting in the same
 * declared error union as the other schemas "encodes" *any* of them
 * successfully, before their own, more specific schema is ever tried, and
 * every one of their real fields silently stops reaching a response. A
 * `Schema.TaggedStruct`'s `_tag` is validated first, so only a matching value
 * passes and the other schemas stay reachable.
 *
 * `UndischargedObligation` and `SubjectExtractionFailed` carry no
 * disclosure-reviewed projection of their own, so they are tag-only
 * `Schema.TaggedStruct`s rather than exposing `subjectId`/`obligationIds`/
 * `reason` un-reviewed. The body is the tag, not empty: an empty body decodes
 * to `undefined` through a generated `HttpApiClient`, which satisfies no
 * `Schema.TaggedStruct`, so the declared `clientError` union could never
 * actually decode that outcome (BL-01/MH-01/RM-01/GR-02/PH-04).
 *
 * **The tag literals in the tag-only structs are hand-copied, not read off the
 * class** (GC-02). A `Schema.TaggedError` or `Data.TaggedError` class in this
 * `effect` version sets `_tag` as an own property on each instance, not on the
 * prototype and not as a static — `UndischargedObligation.prototype._tag` and
 * `UndischargedObligation._tag` are both `undefined`, and
 * `Schema.TaggedStruct(undefined, {})` then requires the wire `_tag` to
 * literally be `undefined` (tried and confirmed broken by
 * `RequirePermissionClient.test.ts`'s decode round-trip). The table's
 * `satisfies` is what keeps each literal honest: a struct filed under the
 * wrong key does not compile.
 *
 * Key order is the OpenAPI declaration order the hand-written list had, so a
 * generated document does not reorder.
 */
export const ENFORCEMENT_ERROR_WIRE = {
  AccessDenied: wire("AccessDenied", AccessDeniedPublic, toAccessDeniedPublic),
  UndischargedObligation: wire(
    "UndischargedObligation",
    Schema.TaggedStruct("UndischargedObligation", {}),
    () => ({ _tag: "UndischargedObligation" as const }),
  ),
  SubjectExtractionFailed: wire(
    "SubjectExtractionFailed",
    Schema.TaggedStruct("SubjectExtractionFailed", {}),
    () => ({ _tag: "SubjectExtractionFailed" as const }),
  ),
  AttributeResolveError: wire(
    "AttributeResolveError",
    Schema.TaggedStruct("AttributeResolveError", { attribute: Schema.String }),
    (error) => ({ _tag: error._tag, attribute: error.attribute }),
  ),
  RelationshipResolveError: wire(
    "RelationshipResolveError",
    Schema.TaggedStruct("RelationshipResolveError", {
      relation: Schema.String,
      resourceId: ResourceIdSchema,
    }),
    (error) => ({ _tag: error._tag, relation: error.relation, resourceId: error.resourceId }),
  ),
  DecisionHistoryUnavailable: wire(
    "DecisionHistoryUnavailable",
    Schema.TaggedStruct("DecisionHistoryUnavailable", { event: Schema.String }),
    (error) => ({ _tag: error._tag, event: error.event }),
  ),
  CustomPredicateError: wire(
    "CustomPredicateError",
    Schema.TaggedStruct("CustomPredicateError", { name: Schema.String }),
    (error) => ({ _tag: error._tag, name: error.name }),
  ),
  SignatureHistoryUnavailable: wire(
    "SignatureHistoryUnavailable",
    Schema.TaggedStruct("SignatureHistoryUnavailable", {
      subjectId: SubjectIdSchema,
      resourceId: Schema.optional(ResourceIdSchema),
    }),
    (error) =>
      error.resourceId === undefined
        ? { _tag: error._tag, subjectId: error.subjectId }
        : { _tag: error._tag, subjectId: error.subjectId, resourceId: error.resourceId },
  ),
  MissingAction: wire("MissingAction", MissingAction, (error) => error),
  MissingResource: wire("MissingResource", MissingResource, (error) => error),
  MissingResourceId: wire("MissingResourceId", MissingResourceId, (error) => error),
  PolicyTooDeep: wire("PolicyTooDeep", PolicyTooDeep, (error) => error),
} satisfies EnforcementErrorWireTable;

// Named views onto the table, kept under the names ADR-QD-072/075 and AGENTS.md
// §8 cite. Each is the table entry's schema, not a second declaration.

/**
 * The wire-facing shape of a denial reaching `RequirePermission`'s middleware:
 * `@qadi/core`'s `AccessDeniedPublic`, annotated with the denial status.
 *
 * `subjectId`, `policyTag` and `reason` reach the body; `AccessDenied`'s full
 * evaluation `trace` is never declared here and never reaches a response — "a
 * trace ... belongs in a log or a test failure, not in a response body."
 * A view onto `ENFORCEMENT_ERROR_WIRE.AccessDenied`; see that table for why
 * the schema is not `HttpApiSchema.Empty`.
 */
export const AccessDeniedRefused = ENFORCEMENT_ERROR_WIRE.AccessDenied.schema;

/**
 * The wire-facing shape of an unmet obligation: the tag only, no other fields.
 * A view onto `ENFORCEMENT_ERROR_WIRE.UndischargedObligation`.
 */
export const UndischargedObligationRefused = ENFORCEMENT_ERROR_WIRE.UndischargedObligation.schema;

/**
 * The wire-facing shape of a {@link SubjectExtractionFailed}: the tag only,
 * for the same reason as {@link AccessDeniedRefused}. A view onto
 * `ENFORCEMENT_ERROR_WIRE.SubjectExtractionFailed`.
 *
 * `SubjectExtractionFailed` is package-local (`SubjectExtractor.ts`), never
 * crosses `SinkCodec.ts`'s wire, and stays `Data.TaggedError`; this is its
 * hand-written wire mirror (AGENTS.md §4).
 */
export const SubjectExtractionRefused = ENFORCEMENT_ERROR_WIRE.SubjectExtractionFailed.schema;

/** Views onto `ENFORCEMENT_ERROR_WIRE`: the tags the middleware lets propagate. */
export const AttributeResolveErrorResponse = ENFORCEMENT_ERROR_WIRE.AttributeResolveError.schema;
export const RelationshipResolveErrorResponse = ENFORCEMENT_ERROR_WIRE.RelationshipResolveError.schema;
export const DecisionHistoryUnavailableResponse = ENFORCEMENT_ERROR_WIRE.DecisionHistoryUnavailable.schema;
export const CustomPredicateErrorResponse = ENFORCEMENT_ERROR_WIRE.CustomPredicateError.schema;
export const SignatureHistoryUnavailableResponse =
  ENFORCEMENT_ERROR_WIRE.SignatureHistoryUnavailable.schema;
export const MissingActionResponse = ENFORCEMENT_ERROR_WIRE.MissingAction.schema;
export const MissingResourceResponse = ENFORCEMENT_ERROR_WIRE.MissingResource.schema;
export const MissingResourceIdResponse = ENFORCEMENT_ERROR_WIRE.MissingResourceId.schema;
export const PolicyTooDeepResponse = ENFORCEMENT_ERROR_WIRE.PolicyTooDeep.schema;

type FailureByTag = {
  readonly [K in HttpEnforcementTag]: Extract<HttpEnforcementFailure, { readonly _tag: K }>;
};

type WireTypeByTag = {
  readonly [K in HttpEnforcementTag]: (typeof ENFORCEMENT_ERROR_WIRE)[K]["schema"]["Type"];
};

/**
 * The table, re-typed as a correlated record so a projection can be called
 * with a failure and its own tag without a cast. Assigned directly rather than
 * built through `Record.map`, which loses the key correlation (TS #47109).
 */
const projections: {
  readonly [K in HttpEnforcementTag]: {
    readonly project: (error: FailureByTag[K]) => WireTypeByTag[K];
  };
} = ENFORCEMENT_ERROR_WIRE;

const projectAt = <K extends HttpEnforcementTag>(tag: K, error: FailureByTag[K]): WireTypeByTag[K] =>
  projections[tag].project(error);

/**
 * Projects a real failure to the redacted wire value its schema declares.
 *
 * `RequirePermission.ts` fails with the result in-channel, so
 * `HttpApiMiddleware`'s encoder builds every response from the matching
 * declared schema — redaction is the per-tag `project`, typed to the schema's
 * `Type`, not a hand-caught arm (ADR-QD-072, amended by ADR-QD-081).
 */
export const projectHttpEnforcementFailure = (
  error: HttpEnforcementFailure,
): WireTypeByTag[HttpEnforcementTag] => projectAt(error._tag, error);

/**
 * Every tag this package answers, for `Effect.catchTag`'s array form (house
 * style §4 — never the object form): `@qadi/core`'s `ENFORCEMENT_ERROR_TAGS`
 * plus `SubjectExtractionFailed`.
 */
export const HTTP_ENFORCEMENT_TAGS = [...ENFORCEMENT_ERROR_TAGS, "SubjectExtractionFailed"] as const;

/**
 * Every wire schema, in table order — the one list `RequirePermission`'s
 * `error:` and its `clientError` are both derived from (ADR-QD-075), so an
 * omitted tag is a compile error rather than a runtime-only loss.
 */
export const HTTP_ENFORCEMENT_ERROR_SCHEMAS = Record.values(ENFORCEMENT_ERROR_WIRE).map(
  (entry) => entry.schema,
);

/**
 * Maps an `EnforcementError` to the bodyless response a bare `HttpRouter`
 * route answers it with.
 *
 * The status is `HTTP_STATUS_BY_CLASS[classifyEnforcementError(error)]` — the
 * same lookup the table's `wire` builder uses, so this and the HttpApi schemas
 * cannot disagree.
 */
export const toResponse = (error: EnforcementError): HttpServerResponse.HttpServerResponse =>
  HttpServerResponse.empty({ status: HTTP_STATUS_BY_CLASS[classifyEnforcementError(error)] });

/**
 * Logs a {@link SubjectExtractionFailed}'s real reason server-side.
 *
 * The reason never reaches a response body — `SubjectExtractionRefused`
 * carries no fields beyond the tag — so this is an operator's only answer to
 * "why".
 */
export const logSubjectExtractionFailed = (error: SubjectExtractionFailed): Effect.Effect<void> =>
  Effect.logError(`qadi/http: subject extraction failed — ${error.reason}`);

/**
 * The `SubjectExtractionFailed` arm `handleEnforcementErrors` below answers a
 * bare route with: log the actual reason, then answer 502 — an outage, not a
 * denial, the same status a broken `AttributeResolver` gets (INV-QD-006).
 *
 * The 502 body is {@link SubjectExtractionRefused}'s encoded tag, not an empty
 * response — an empty body decodes to `undefined` through a generated
 * `HttpApiClient`, which satisfies no `Schema.TaggedStruct`, so a client built
 * against `RequirePermission.ts`'s declared `clientError` union could never
 * actually decode this outage as the typed `SubjectExtractionFailed` it
 * promises (BL-01/MH-01/RM-01/GR-02). The real `reason` stays server-side, in
 * the log line.
 */
export const subjectExtractionFailedResponse = (error: SubjectExtractionFailed) =>
  logSubjectExtractionFailed(error).pipe(
    Effect.as(
      HttpServerResponse.jsonUnsafe(
        Schema.encodeSync(ENFORCEMENT_ERROR_WIRE.SubjectExtractionFailed.schema)(
          ENFORCEMENT_ERROR_WIRE.SubjectExtractionFailed.project(error),
        ),
        { status: ENFORCEMENT_ERROR_WIRE.SubjectExtractionFailed.status },
      ),
    ),
  );

/**
 * Logs a denial's stable code, subject and root reason before the response
 * reduces it to a bodyless — or, at `RequirePermission.ts`'s edge, tag-only —
 * 403. `AccessDenied` and `UndischargedObligation` are the only tags whose
 * originating error never reaches a response body (their real fields are the
 * disclosure concern `ENFORCEMENT_ERROR_WIRE`'s doc comment explains), so
 * without this an operator facing a 403 storm has no server-side answer to
 * "why" short of a separately wired `DecisionSink` (JD-03, JM-05).
 *
 * Takes `EnforcementDenial`, derived from `@qadi/core`'s class table, so a
 * third denial tag is a compile error here rather than going unlogged.
 *
 * Deliberately not the full evaluation `trace` — `errorCode`, `subjectId`, and
 * either the root denial's `reason` sentence or the unmet obligation ids are
 * enough to diagnose from an operator's log, without repeating what
 * `Evaluate.ts`'s own `Effect.logDebug` already records in full.
 */
export const logDenial = (error: EnforcementDenial): Effect.Effect<void> =>
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
 * `never` in the error channel is load-bearing here: a bare `HttpRouter`
 * handler has no schema-fixed error channel to escape into, so an enforcement
 * failure that isn't converted to a response here has nowhere else to go — see
 * `GuardRoute.ts`'s `guardRoute` doc comment. `RequirePermission.ts`'s
 * `HttpApiMiddleware` has no counterpart: its declared `error:` union is that
 * channel, and `HttpApiMiddleware`'s own encoder answers from it (ADR-QD-072).
 */
export const handleEnforcementErrors = <A, R>(
  self: Effect.Effect<A, HttpEnforcementFailure, R>,
): Effect.Effect<A | HttpServerResponse.HttpServerResponse, never, R> =>
  self.pipe(
    Effect.tapErrorTag(ENFORCEMENT_DENIAL_TAGS, logDenial),
    Effect.catchTag(ENFORCEMENT_ERROR_TAGS, (error) => Effect.succeed(toResponse(error))),
    Effect.catchTag("SubjectExtractionFailed", subjectExtractionFailedResponse),
  );
