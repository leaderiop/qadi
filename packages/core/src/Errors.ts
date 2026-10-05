/**
 * Qadi error taxonomy.
 *
 * `_tag` is the identity. The stable `ACL###` code is derived from the tag by a
 * single exhaustive map, so a code can never be assigned to two unrelated
 * failures — the defect that produced ACL007 collisions in the predecessor.
 *
 * **Eleven `EnforcementError` members are `Schema.TaggedError`, not
 * `Data.TaggedError`** — the narrow, named exception to AGENTS.md §4. Nine of
 * them (ADR-QD-060) cross a process boundary as part of a `SinkRecord`
 * (`SinkCodec.ts`); the remaining two, `AccessDenied` and
 * `UndischargedObligation`, do not cross that wire but do cross a second,
 * independent trust boundary — `@qadi/http`'s response body — and ADR-QD-072
 * narrows ADR-QD-060 to cover them too, for the same reason: the class is the
 * schema `httpApiStatus` annotates, rather than a second, hand-mapped
 * description of the same eleven shapes living beside it in `@qadi/http`.
 * Every other error in this file stays `Data.TaggedError`.
 *
 * **`AccessDeniedPublic` is a twelfth `Schema.TaggedError`, but not one of the
 * eleven `EnforcementError` tags** — it is `AccessDenied`'s own no-trace
 * projection (see its doc comment), constructed only by `toAccessDeniedPublic`
 * at the moment a denial is about to cross the same `@qadi/http` response-body
 * boundary. It carries no independent stable code and does not appear in
 * `EvaluationError`/`QadiError`/`ERROR_CODES`: evaluation never raises it, so
 * it is not a failure this library "produces" in the sense those unions track.
 *
 * **`ENFORCEMENT_ERROR_CLASSES` is the second tag-keyed map beside
 * `ERROR_CODES`**, for the same ADR-QD-008 reason: which of denial, outage or
 * wiring mistake an `EnforcementError` tag is (INV-QD-006) is decided once,
 * here, and every adapter derives from it — `satisfies` makes a missing entry a
 * compile error instead of a silent gap in whichever adapter forgot it.
 *
 * **Naming: a suffix names a mechanism, no suffix names a violated
 * invariant** (GVR-04). `MissingResource`, `MissingAction`, `MissingResourceId`,
 * `PolicyTooDeep`, `CircularRoleInheritance`, `DuplicateRoleDefinition`,
 * `InvalidPermissionSegment`, `AccessDenied`, `UndischargedObligation` and
 * `InvalidBoundedPermits` are named for the domain condition that was
 * violated — a required input was absent, a structural limit or a decision
 * was reached. `AttributeResolveError`, `RelationshipResolveError` and
 * `CustomPredicateError` carry `-Error` because the failure is a *mechanism*
 * — a resolver call or a registered predicate — not producing an answer;
 * `DecisionHistoryUnavailable` and `SignatureHistoryUnavailable` carry
 * `-Unavailable` for the same reason, naming the specific way a store-backed
 * mechanism fails (unreachable, as opposed to a decoding or logic error).
 * `PolicyNotTranslatable` is named for its outcome rather than its mechanism
 * and reads as an adjective rather than either pattern above; no third
 * pattern is introduced for it; a future entry needing a suffix should
 * default to `-Error` unless it shares `-Unavailable`'s specific "store could
 * not be reached" shape.
 */
import * as Data from "effect/Data";
import * as Schema from "effect/Schema";
import { TraceSchema } from "./Decision.ts";
import { ResourceIdSchema, SubjectIdSchema } from "./Identity.ts";
import type { PolicyDecodeTooDeep } from "./Policy.ts";

/** A policy referenced a resource attribute but no resource was in context. */
export class MissingResource extends Schema.TaggedError<MissingResource>()("MissingResource", {
  attribute: Schema.String,
}) {}

/**
 * A policy read the action but the caller supplied none.
 *
 * `expected` is the action the policy required, when it named one; a matcher
 * referencing `action()` compares rather than requires, so it names nothing.
 */
export class MissingAction extends Schema.TaggedError<MissingAction>()("MissingAction", {
  // `Schema.optional`, not `Schema.UndefinedOr`: `Schema.encodeEffect` writing
  // `expected: undefined` survives a `JSON.stringify` round-trip as an
  // ABSENT key (JSON has no `undefined`), and `UndefinedOr` only tolerates a
  // *present* key whose value is `undefined` — it still requires the key on
  // decode. `optional` tolerates the key being genuinely missing, which is
  // exactly what a `JSON.parse(JSON.stringify(...))` round-trip produces.
  expected: Schema.optional(Schema.String),
}) {}

/** Resolving a subject or resource attribute failed. */
export class AttributeResolveError extends Schema.TaggedError<AttributeResolveError>()(
  "AttributeResolveError",
  {
    attribute: Schema.String,
    cause: Schema.Defect(),
  },
) {}

/** A relationship check failed to execute. Distinct from the check returning false. */
export class RelationshipResolveError extends Schema.TaggedError<RelationshipResolveError>()(
  "RelationshipResolveError",
  {
    relation: Schema.String,
    resourceId: ResourceIdSchema,
    cause: Schema.Defect(),
  },
) {}

/**
 * A policy needing `resource.id` was evaluated without one.
 *
 * Raised by `HasRelationship`, and by `HasActed`/`HasNotActed` under
 * `scope: "resource"`. One error rather than two: it is the same failure with
 * the same diagnosis, and a second code meaning the same thing would be worse
 * than a field named for the more general case.
 */
export class MissingResourceId extends Schema.TaggedError<MissingResourceId>()(
  "MissingResourceId",
  {
    /** The relation or event the policy asked about. */
    relation: Schema.String,
  },
) {}

/** A wired history store could not be reached. Distinct from it saying "Unknown". */
export class DecisionHistoryUnavailable extends Schema.TaggedError<DecisionHistoryUnavailable>()(
  "DecisionHistoryUnavailable",
  {
    event: Schema.String,
    cause: Schema.Defect(),
  },
) {}

/**
 * A wired `SignatureHistory` store could not be reached. Distinct from it
 * legitimately answering "no matching signatures" — see `SignatureHistory.ts`.
 */
export class SignatureHistoryUnavailable extends Schema.TaggedError<SignatureHistoryUnavailable>()(
  "SignatureHistoryUnavailable",
  {
    subjectId: SubjectIdSchema,
    // `Schema.optional`, not `Schema.UndefinedOr` — see `MissingAction.expected`'s
    // doc comment above for why: a JSON round-trip turns `undefined` into an
    // absent key, which only `optional` tolerates on decode.
    resourceId: Schema.optional(ResourceIdSchema),
    cause: Schema.Defect(),
  },
) {}

/** The policy tree is deeper than the configured limit. Guards against cyclic input. */
export class PolicyTooDeep extends Schema.TaggedError<PolicyTooDeep>()("PolicyTooDeep", {
  maxDepth: Schema.Number,
}) {}

/** A role graph loaded from serialized form contains a cycle. */
export class CircularRoleInheritance extends Data.TaggedError(
  "CircularRoleInheritance",
)<{
  readonly roleName: string;
  readonly cycle: ReadonlyArray<string>;
}> {}

/**
 * A role graph loaded from serialized form names the same role more than once.
 *
 * `resolveRoleGraph` built `byName` from a `Map`, so the last definition for a
 * repeated name silently won and every earlier definition's permissions
 * vanished with nothing said at any level — the same shape of defect an
 * unknown parent name has, except there the surviving behavior (grant less) is
 * defensible and here it is not: which of two same-named definitions "wins" is
 * not a decision this library can make on a caller's behalf, so it fails
 * instead of guessing.
 */
export class DuplicateRoleDefinition extends Data.TaggedError(
  "DuplicateRoleDefinition",
)<{
  readonly names: ReadonlyArray<string>;
}> {}

/**
 * A permission segment contained the reserved `:` separator.
 *
 * Reserved for this purpose but not currently raised by any code path: today
 * a colon in a decoded permission's `resource`/`action` surfaces as a generic
 * `Schema` issue from {@link PermissionSchema}'s pattern check, not as this
 * typed error — {@link Permission.ts}'s `permission()` constructor rejects a
 * colon-containing literal at compile time via `NoColon` instead of at
 * runtime. Kept in {@link QadiError}/{@link ERROR_CODES} (`ACL008`) as the
 * stable code this violation would carry if a call site is ever added that
 * raises it directly, rather than removed and the code retired.
 */
export class InvalidPermissionSegment extends Data.TaggedError(
  "InvalidPermissionSegment",
)<{
  readonly segment: string;
  readonly value: string;
}> {}

/**
 * Enforcement denied access.
 *
 * `reason` is the root node's sentence; `trace` is the tree behind it, so a
 * caller can answer "why" without re-evaluating. Render it with `renderTrace`.
 *
 * The trace is carried rather than summarised because enforcement is where a
 * denial usually surfaces — `assert`, `enforce`, `enforceProjected` and `guard`
 * all fail with this value, `@qadi/promise` rejects with it and `@qadi/http`
 * maps it — and it was the one path that built the whole tree and then dropped
 * it. Note what that means for disclosure: a trace names every node's tag, its
 * label and the sentence explaining why it refused, so it belongs in a log or a
 * test failure, not in a response body. `toResponse` returns an empty body for
 * exactly that reason.
 */
export class AccessDenied extends Schema.TaggedError<AccessDenied>()("AccessDenied", {
  subjectId: SubjectIdSchema,
  policyTag: Schema.String,
  reason: Schema.String,
  trace: TraceSchema,
}) {}

/**
 * The public, no-trace projection of {@link AccessDenied} — the only shape of
 * a denial safe to hand across a process boundary (an HTTP response body,
 * and anywhere else a caller outside this process can read it).
 *
 * `AccessDenied` carries `trace`: attribute values, matched rules, and policy
 * internals, meant for a log or a test failure, never a response body — see
 * {@link AccessDenied}'s own doc comment. Before this type existed, keeping
 * that promise fell to whoever wrote the consumer: `@qadi/http`'s
 * `QadiHttpError.ts` hand-built a tag-only `Schema.TaggedStruct("AccessDenied",
 * {})`, and `RequirePermission.ts` hand-caught the error and discarded it down
 * to an empty response — two independent, ad hoc redactions of the same
 * value, each free to drift from the other. `AccessDeniedPublic` and
 * {@link toAccessDeniedPublic} formalize the one redaction both actually need:
 * `subjectId` (the caller already knows who they are), `policyTag` and
 * `reason` (the root node's sentence — a diagnosis, not the tree behind it)
 * survive; `trace` does not.
 *
 * Never raised by evaluation directly — `guard`/`enforce`/`assert` still fail
 * with the real {@link AccessDenied}. This type is only ever *constructed*,
 * by {@link toAccessDeniedPublic}, at the boundary a denial is about to cross.
 * It shares `AccessDenied`'s `_tag` ("AccessDenied") rather than a distinct
 * one: a caller on the other side of that boundary is told the same thing
 * either way — the policy denied — just without the internals.
 */
export class AccessDeniedPublic extends Schema.TaggedError<AccessDeniedPublic>()("AccessDenied", {
  subjectId: SubjectIdSchema,
  policyTag: Schema.String,
  reason: Schema.String,
}) {}

/** Projects a real {@link AccessDenied} down to {@link AccessDeniedPublic}, dropping `trace`. */
export const toAccessDeniedPublic = (self: AccessDenied): AccessDeniedPublic =>
  new AccessDeniedPublic({
    subjectId: self.subjectId,
    policyTag: self.policyTag,
    reason: self.reason,
  });

/**
 * Enforcement met an obligation it could not discharge.
 *
 * `enforce` returns the guarded effect's value, not the decision, so an
 * obligation would otherwise be computed and thrown away while the caller ran
 * the protected work believing the policy permitted it unconditionally. Failing
 * is the only honest option: the permission had a condition nobody met.
 */
export class UndischargedObligation extends Schema.TaggedError<UndischargedObligation>()(
  "UndischargedObligation",
  {
    subjectId: SubjectIdSchema,
    obligationIds: Schema.Array(Schema.String),
  },
) {}

/**
 * A `HasCustom` node's registered predicate could not produce an answer.
 *
 * Covers two distinct causes under one tag: the name has no entry in a
 * populated `CustomPredicate` registry (a wiring mistake), or the registered
 * function's own logic failed. Neither is a denial — "failure is not denial"
 * applies to a misconfigured or broken custom predicate exactly as it does to
 * a broken attribute lookup.
 */
export class CustomPredicateError extends Schema.TaggedError<CustomPredicateError>()(
  "CustomPredicateError",
  {
    name: Schema.String,
    reason: Schema.String,
  },
) {}

/**
 * A policy could not be translated into a row predicate.
 *
 * Raised rather than approximated. A node outside the translatable subset
 * rendered as "true" would return rows the policy denies, which is the one
 * failure mode that makes predicate output worse than its absence
 * (ADR-QD-024).
 */
export class PolicyNotTranslatable extends Data.TaggedError(
  "PolicyNotTranslatable",
)<{
  readonly policyTag: string;
  readonly reason: string;
}> {}

/**
 * Why `toRenderable` refused a `Compare`/`MemberOf`.
 *
 * A closed union, so a renderer or a caller matching on the reason is a compile
 * error away from a new one.
 *
 * - `UnsafeColumn`: the column fails the `IdentifierRule`.
 * - `ReservedColumn`: the column is in the renderer's `reservedColumns`.
 * - `UnsafeValue`: a value is not a `SafeLiteral`.
 * - `TooManyValues`: a `MemberOf` exceeds `maxInValues`.
 * - `NullOnNonNullableColumn`: a null comparison on a column the caller declared
 *   NOT NULL.
 * - `NonFiniteColumn`: a `Gte`/`Lt` on a column the target can hold a non-finite
 *   number in, for a target that cannot exclude one from a range
 *   (`FiniteExclusion: "Inexpressible"`, CCR-QD-172).
 */
export type RenderRefusal =
  | "UnsafeColumn"
  | "ReservedColumn"
  | "UnsafeValue"
  | "TooManyValues"
  | "NullOnNonNullableColumn"
  | "NonFiniteColumn";

/**
 * A predicate a renderer must refuse to render.
 *
 * Raised rather than approximated, the same discipline as
 * `PolicyNotTranslatable` one layer down: `toPredicate` raises that when a
 * policy node has no row-filter meaning, `toRenderable` raises this when a
 * `Compare`/`MemberOf` has one but no safe rendering — an unsafe value or
 * column, a `MemberOf` past `maxInValues`, a null comparison on a column
 * declared NOT NULL (ADR-QD-079), a range on a column that may hold a
 * non-finite number the target cannot exclude (CCR-QD-172).
 *
 * Declared once, here, and re-exported by `@qadi/predicate-sql` and
 * `@qadi/predicate-prisma`. Before ADR-QD-079 each package declared its own
 * class with the same `_tag` (ticket 95), which ADR-QD-008's "the `_tag` is the
 * identity" bent: a `catchTag` site saw two structurally identical classes.
 * `Data.TaggedError`, not `Schema.TaggedError`: it crosses no codec.
 */
export class PredicateNotRenderable extends Data.TaggedError("PredicateNotRenderable")<{
  readonly predicateTag: "Compare" | "MemberOf";
  readonly refusal: RenderRefusal;
  readonly reason: string;
}> {}

/**
 * A `…Bounded` port wrapper was given a non-positive permit count.
 *
 * `effect/Semaphore`'s `Semaphore.make` performs no validation of its own: with
 * `permits <= 0`, `free` is permanently below `1`, so every `withPermit` call
 * enqueues in `waitForPermits` and nothing ever releases enough to wake it —
 * every wrapped call deadlocks forever rather than failing. Caught here, at
 * layer construction, rather than left to manifest as an unexplained hang the
 * first time a caller reaches the wrapped port.
 */
export class InvalidBoundedPermits extends Data.TaggedError("InvalidBoundedPermits")<{
  readonly permits: number;
}> {}

/**
 * The `_tag` of a `SinkRecord` — `"Decision"` or `"Obligations"`.
 *
 * Restated as a literal union rather than imported: `DecisionRecord.ts`
 * imports `EvaluationError` from this module, so importing `SinkRecord` back —
 * even as a type, which madge counts (ADR-QD-037) — would be a cycle.
 * `Errors.tst.ts` pins it equal to `SinkRecord["_tag"]`, so the two cannot
 * drift.
 */
export type SinkRecordTag = "Decision" | "Obligations";

/**
 * Where in a record's wire form a refusal was found: object keys and array
 * indices from the wire record's root, e.g. `["resource", "tags"]`.
 */
export type WirePath = ReadonlyArray<string | number>;

/**
 * Which kind of object has no JSON form.
 *
 * Each is something `JSON.stringify` renders as `{}` (a `Map`, a `Set`, a
 * `RegExp`, an `Error`, a `Promise`), as an index object (binary data), as its
 * unboxed value (a boxed primitive), or through a `toJSON` of its own that the
 * receiver cannot reverse (`CustomToJSON`, a `URL` for example).
 * `OtherBuiltIn` is any other built-in brand.
 */
export type OpaqueKind =
  | "Map"
  | "Set"
  | "WeakMap"
  | "WeakSet"
  | "RegExp"
  | "BinaryData"
  | "Promise"
  | "Error"
  | "BoxedPrimitive"
  | "CustomToJSON"
  | "OtherBuiltIn";

/** A value JSON cannot carry at all: it would be dropped, or throw. */
export type UnrepresentableKind = "function" | "symbol" | "bigint" | "undefined-element";

/**
 * Why `encodeSinkRecord` refused a record.
 *
 * A closed union, so a reporter matching on it with `Match.tagsExhaustive` is a
 * compile error away from a new reason.
 *
 * - `Circular`: an object is its own ancestor at `path`.
 * - `TooDeep`: the wire form nests deeper than `maxDepth`, the bound every
 *   receiver's decode enforces, so a receiver would refuse it.
 * - `NonFinite`: `NaN`, `±Infinity` or an invalid `Date`, which JSON writes as
 *   `null`.
 * - `Unrepresentable`: a function, a symbol, a `bigint`, or `undefined` as an
 *   array element.
 * - `Opaque`: an object JSON renders as something it is not; `brand` is its
 *   `Object.prototype.toString` brand (`"Set"`, `"URL"`).
 * - `EncodeFailed`: the wire schema rejected the record, or inspecting it
 *   threw (a throwing getter, for example).
 */
export type EncodeRefusal = Data.TaggedEnum<{
  Circular: { readonly path: WirePath };
  TooDeep: { readonly path: WirePath; readonly maxDepth: number };
  NonFinite: { readonly path: WirePath };
  Unrepresentable: { readonly path: WirePath; readonly kind: UnrepresentableKind };
  Opaque: { readonly path: WirePath; readonly kind: OpaqueKind; readonly brand: string };
  EncodeFailed: { readonly message: string };
}>;

/** Constructors and guards for {@link EncodeRefusal}. */
export const EncodeRefusal = Data.taggedEnum<EncodeRefusal>();

/**
 * A record `encodeSinkRecord` will not put on the wire, and why.
 *
 * A refusal is a value, never a thrown error and never a defect: every
 * outbound adapter (forwarding, the decision stream, the audit encoder)
 * reports it and drops that one record (INV-QD-097).
 *
 * Declared here rather than in `SinkCodec.ts`, which raises it, because it
 * joins `QadiError` and `ERROR_CODES`, and `Errors.ts` cannot import
 * `SinkCodec.ts` without a cycle (ADR-QD-037). `Data.TaggedError`, not
 * `Schema.TaggedError`: it is reported where it happens and crosses no codec,
 * so `SCHEMA_ERROR_BUDGET` is unchanged.
 */
export class SinkRecordNotEncodable extends Data.TaggedError("SinkRecordNotEncodable")<{
  readonly recordTag: SinkRecordTag;
  readonly evaluationId: string;
  readonly refusal: EncodeRefusal;
}> {}

/**
 * A version of the record wire (ADR-QD-096).
 *
 * Version 1 is spelled by the absence of a `version` key — every `@qadi/core`
 * before ADR-QD-096 wrote it — and carries a decision's outcome as two optional
 * fields, `decided`/`failed`. Version 2 carries `version: 2` and the outcome as
 * one tagged value. A closed union: a third version is a full-union edit.
 *
 * Declared here rather than in `SinkCodec.ts` because {@link DecodeRefusal}
 * names it, and `Errors.ts` cannot import `SinkCodec.ts` (ADR-QD-037).
 */
export type WireVersion = 1 | 2;

/** Every wire version `decodeSinkRecord` reads: version 1 for good, and version 2. */
export const WIRE_VERSIONS: ReadonlyArray<WireVersion> = [1, 2];

/**
 * Why `decodeSinkRecord` refused its input.
 *
 * A closed union, edited as a whole when a reason is added.
 *
 * - `NotJson`: the text did not parse as JSON (`decodeSinkRecordString` only).
 * - `TooDeep`: the input nests deeper than `maxDepth`; refused before the
 *   schema recurses into it.
 * - `Malformed`: the input is JSON but not a record of the version it claims —
 *   including a decision naming neither outcome, or both.
 * - `UnsupportedVersion`: the input's `version` is not one this reader reads
 *   (`supported`). A different fix from `Malformed`: the sender is newer than
 *   this reader, so upgrade the reader (ADR-QD-096). `version` is the value as
 *   sent, which may be any JSON value.
 */
export type DecodeRefusal = Data.TaggedEnum<{
  NotJson: Record<never, never>;
  TooDeep: { readonly maxDepth: number };
  Malformed: { readonly message: string };
  UnsupportedVersion: { readonly version: unknown; readonly supported: ReadonlyArray<WireVersion> };
}>;

/** Constructors and guards for {@link DecodeRefusal}. */
export const DecodeRefusal = Data.taggedEnum<DecodeRefusal>();

/**
 * Input `decodeSinkRecord` could not turn into a record, and why.
 *
 * A value, never a thrown error or a defect, whatever the input
 * (INV-QD-097). Declared here for the same reason as
 * {@link SinkRecordNotEncodable}.
 */
export class SinkRecordNotDecodable extends Data.TaggedError("SinkRecordNotDecodable")<{
  readonly refusal: DecodeRefusal;
}> {}

/** Every error this library can produce during evaluation. */
export type EvaluationError =
  | AttributeResolveError
  | RelationshipResolveError
  | DecisionHistoryUnavailable
  | CustomPredicateError
  | SignatureHistoryUnavailable
  | MissingAction
  | MissingResource
  | MissingResourceId
  | PolicyTooDeep;

/**
 * Every error this library can produce, including enforcement and construction.
 *
 * `PolicyDecodeTooDeep` is defined in `Policy.ts`, not here, and imported as a
 * type only: it is raised by the public `decodePolicy`/`fromJson` API, before
 * evaluation, and `Errors.ts` cannot import it as a value without a circular
 * dependency (see the class's own doc comment in `Policy.ts`) — a type-only
 * import is erased at compile time, so it carries none of that risk. It
 * belongs in this union regardless: ADR-QD-008/INV-QD-010 promise every error
 * this library can produce a stable code, and this one previously bypassed
 * both the union and `ERROR_CODES`.
 */
export type QadiError =
  | EvaluationError
  | PolicyNotTranslatable
  | PredicateNotRenderable
  | AccessDenied
  | UndischargedObligation
  | CircularRoleInheritance
  | DuplicateRoleDefinition
  | InvalidPermissionSegment
  | PolicyDecodeTooDeep
  | InvalidBoundedPermits
  | SinkRecordNotEncodable
  | SinkRecordNotDecodable;

/**
 * Stable numeric codes for logging and cross-process correlation.
 *
 * The map is exhaustive over the tag union: adding an error without a code is a
 * compile error, and reusing a code is visible in one place rather than spread
 * across constructors.
 */
export const ERROR_CODES = {
  "AccessDenied": "ACL001",
  "AttributeResolveError": "ACL002",
  "RelationshipResolveError": "ACL003",
  "MissingResource": "ACL004",
  "MissingResourceId": "ACL005",
  "PolicyTooDeep": "ACL006",
  "CircularRoleInheritance": "ACL007",
  "InvalidPermissionSegment": "ACL008",
  "MissingAction": "ACL009",
  "UndischargedObligation": "ACL010",
  "DecisionHistoryUnavailable": "ACL011",
  "PolicyNotTranslatable": "ACL012",
  "CustomPredicateError": "ACL013",
  "SignatureHistoryUnavailable": "ACL014",
  "DuplicateRoleDefinition": "ACL015",
  "InvalidBoundedPermits": "ACL016",
  "PolicyDecodeTooDeep": "ACL017",
  "PredicateNotRenderable": "ACL018",
  "SinkRecordNotEncodable": "ACL019",
  "SinkRecordNotDecodable": "ACL020",
} as const satisfies Record<QadiError["_tag"], `ACL${string}`>;

/** The stable code for a guard error. */
export const errorCode = (self: { readonly _tag: QadiError["_tag"] }): string =>
  ERROR_CODES[self._tag];

/**
 * Errors any enforcing entry point can produce.
 *
 * Declared here, beside {@link EvaluationError} and the two enforcement
 * errors it adds, rather than in `Qadi.ts` where `guard`/`enforce`/`assert`
 * raise it: the tag-keyed tables below are `satisfies`-checked against it,
 * and `Errors.ts` is where every other tag-keyed map (`ERROR_CODES`) already
 * lives. `Qadi.ts` imports it, and the package barrel exports it unchanged.
 */
export type EnforcementError = EvaluationError | AccessDenied | UndischargedObligation;

/**
 * The three things an enforcement failure can mean.
 *
 * INV-QD-006 at the type level: a denial is the policy's answer, an outage is
 * something this service depends on failing, and a wiring mistake is this
 * service being set up wrong. A closed union, never widened — a fourth class
 * is a decision every consumer (`@qadi/http`'s status table, the decision
 * stream's reauth label, an application's own error reporting) must take.
 *
 * Transport-neutral on purpose. An HTTP status is `@qadi/http`'s concern
 * (ADR-QD-072); which of the three a tag *is* is not.
 */
export type EnforcementErrorClass = "denied" | "outage" | "wiringMistake";

/**
 * A tag-keyed table of {@link EnforcementErrorClass}, total over `E`.
 *
 * Generic over the error union so a type-level test can model a tag added to
 * `EnforcementError` (`Errors.tst.ts`), and so `@qadi/http` can extend the
 * domain by its own package-local failure.
 */
export type EnforcementErrorClassTable<E extends { readonly _tag: string } = EnforcementError> = {
  readonly [K in E["_tag"]]: EnforcementErrorClass;
};

/**
 * The class every `EnforcementError` tag belongs to — the one place the
 * partition is decided.
 *
 * The second tag-keyed map beside {@link ERROR_CODES}, for the same ADR-QD-008
 * reason: `satisfies` makes a tag added to `EnforcementError` without a class a
 * compile error, so no adapter can forget one. Before this table the partition
 * lived in `@qadi/http` as a `Match.tagsExhaustive`, which the Next.js example
 * and the decision stream each re-derived by hand and got wrong or left out
 * (ARCH-04).
 */
export const ENFORCEMENT_ERROR_CLASSES = {
  // A denial or an unmet obligation is the policy's answer, not a fault.
  AccessDenied: "denied",
  UndischargedObligation: "denied",
  // A resolver or the history port broke — an outage in something this
  // service depends on, not a fault in the request.
  AttributeResolveError: "outage",
  RelationshipResolveError: "outage",
  DecisionHistoryUnavailable: "outage",
  // Covers both causes this tag carries — an unregistered name and the
  // registered predicate's own logic failing — under the same class the
  // other resolver outages get, since the common case is the latter.
  CustomPredicateError: "outage",
  // A wired signature history store could not be reached — the same outage
  // shape as the other resolver errors above.
  SignatureHistoryUnavailable: "outage",
  // The evaluation was missing something the policy needed — a wiring
  // mistake in this service, not the caller's.
  MissingAction: "wiringMistake",
  MissingResource: "wiringMistake",
  MissingResourceId: "wiringMistake",
  // Also a wiring mistake in this service. No path in `@qadi/http` lets a
  // *request* supply a policy — the middleware reads it from a compile-time
  // endpoint annotation, and `guardRoute` takes it as a layer-construction
  // argument — so "malformed or hostile input", which a 400 would assert,
  // cannot reach it there. A 400 is classified non-retryable client error by
  // SDKs and dashboards, so an operator whose own policy tree is too deep
  // would never have been paged for it.
  PolicyTooDeep: "wiringMistake",
} as const satisfies EnforcementErrorClassTable;

/**
 * The {@link EnforcementErrorClass} of an enforcement failure.
 *
 * Mirrors {@link errorCode}: a table lookup, with a structural parameter so
 * `AccessDeniedPublic` (the same `_tag`, no `trace`) classifies too.
 */
export const classifyEnforcementError = (self: {
  readonly _tag: EnforcementError["_tag"];
}): EnforcementErrorClass => ENFORCEMENT_ERROR_CLASSES[self._tag];

/**
 * The tags of {@link EnforcementError} whose class is `C`, read off
 * {@link ENFORCEMENT_ERROR_CLASSES}.
 */
export type EnforcementErrorTagOf<C extends EnforcementErrorClass> = {
  readonly [K in EnforcementError["_tag"]]: (typeof ENFORCEMENT_ERROR_CLASSES)[K] extends C
    ? K
    : never;
}[EnforcementError["_tag"]];

/** The `EnforcementError` members that are a denial rather than a fault. */
export type EnforcementDenial = Extract<
  EnforcementError,
  { readonly _tag: EnforcementErrorTagOf<"denied"> }
>;

/**
 * Exhaustiveness check for a literal tag tuple, resolved at the type level so
 * the exported tuple keeps the literal, non-empty-tuple shape
 * `Effect.catchTag`'s array form itself requires — a plain
 * `ReadonlyArray<EnforcementError["_tag"]>` (e.g. from `Object.keys` on a
 * `satisfies` object) does not typecheck there.
 *
 * `T`'s constraint already rejects a stray or misspelled tag in `T`; the
 * conditional catches the other direction, a **missing** one — `U` extends
 * `T[number]` only when every tag is actually present in `T`, and this alias
 * resolves to `never` otherwise. The exports below assign their tuple (never
 * `never` itself) to this type, so a tag added to the union with no matching
 * entry fails to compile (TS2322) instead of being a possible silent miss at
 * whichever call site forgot it.
 */
type CoversExactly<T extends ReadonlyArray<U>, U> = [U] extends [T[number]] ? T : never;

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
 * Every `EnforcementError` tag, for `Effect.catchTag`'s array form (house
 * style §4 — never the object form). Shared by every adapter so a tag can't be
 * caught in one and forgotten in another.
 */
export const ENFORCEMENT_ERROR_TAGS: CoversExactly<
  typeof enforcementErrorTags,
  EnforcementError["_tag"]
> = enforcementErrorTags;

const enforcementDenialTags = ["AccessDenied", "UndischargedObligation"] as const;

/**
 * The tags whose class is `"denied"`, for `Effect.tapErrorTag`'s array form —
 * the adapters log a denial's reason before reducing it to a response, and a
 * third denial tag must not compile and go unlogged.
 */
export const ENFORCEMENT_DENIAL_TAGS: CoversExactly<
  typeof enforcementDenialTags,
  EnforcementErrorTagOf<"denied">
> = enforcementDenialTags;
