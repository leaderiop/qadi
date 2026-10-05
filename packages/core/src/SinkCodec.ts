/**
 * A {@link SinkRecord}'s wire form, owned in both directions: one call out, one
 * call in.
 *
 * - **Outbound**: {@link encodeSinkRecord} turns a record into a verified JSON
 *   value (`SinkRecordJson`), or a `SinkRecordNotEncodable` naming why and
 *   where; {@link encodeSinkRecordString} gives the same as text.
 * - **Inbound**: {@link decodeSinkRecord} turns untrusted `unknown` into a
 *   record, or a `SinkRecordNotDecodable`; {@link decodeSinkRecordString} does
 *   the same from text, adding "not JSON" as a reason.
 *
 * The guard, the projection, the schema encode, the depth bound and the
 * rebuild are this module's implementation, so every sink (forwarding, the
 * decision stream, the audit encoder, the devtools source) makes one call and
 * puts the same bytes on the wire. Before ARCH-09 each assembled a different
 * subset of them, and each defect in the shared guard was fixed one caller at
 * a time.
 *
 * **Two invariants the interface carries.** Whatever the outbound operation
 * emits, the inbound operation accepts, and rebuilds equal to the original up
 * to the named normalisations below (INV-QD-096). Neither direction throws,
 * whatever it is given, so one record can never end a feed (INV-QD-097).
 *
 * **Named normalisations.** A resolver error's `cause` crosses through
 * `Schema.Defect()` on every path (ADR-QD-060): an `Error` keeps `name`,
 * `message` and `cause`, a cycle is dropped, a `bigint` becomes `"10n"` and a
 * non-finite number `null`. A record is never refused because of its `cause`,
 * which is diagnostic, and an outage record is the one an operator most wants
 * to see. A `Date` in `resource` or `params` crosses as its ISO string. A
 * property whose value is `undefined` crosses as absent.
 *
 * **Schema-derived, decoded as untrusted.** A record crossing a process
 * boundary crosses a trust boundary, which is the reasoning
 * [ADR-QD-002](../../../spec/decisions/002-schema-derived-policy-adt.md) applies to
 * policies, so the wire form is one schema and decoding validates rather than
 * casts. The nine `EvaluationError` tags are `Schema.TaggedError` classes
 * ([AGENTS.md §4](../../../AGENTS.md),
 * [ADR-QD-060](../../../spec/decisions/060-schema-taggederror-for-the-nine-wire-crossing-errors.md)),
 * so the class already *is* the wire schema of an error.
 *
 * **The seam for the wire's shape.** How the outcome is carried and any wire
 * version handling live behind `decodeSinkRecord`, so they change in this
 * module and nowhere else.
 *
 * **A stored record's envelope** ({@link StoredRecordJson}, ARCH-11). A decision
 * log's reader — `/__decisions`'s frames, `/__decisions/backlog`'s elements —
 * needs the producer's environment too, which a `SinkRecord` deliberately does
 * not carry. It travels in `{ environment, record }`, built by the same
 * pipeline: {@link encodeStoredRecord} is {@link encodeSinkRecord} plus the
 * label, and {@link decodeStoredRecord} reads the envelope and hands `record` to
 * {@link decodeSinkRecord}, so the version dispatch, the depth guard and the
 * strict decode apply unchanged. Forwarding and audit never see the envelope.
 */
import * as Match from "effect/Match";
import * as Predicate from "effect/Predicate";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import type { Trace } from "./Decision.ts";
import type { DecisionOutcome, SinkRecord, StoredRecord } from "./DecisionRecord.ts";
import { Decided, DecisionRecord, Failed, ObligationRecord, stampRecord } from "./DecisionRecord.ts";
import { DecisionWire, decodeDecision, encodeDecision } from "./DecisionWire.ts";
import { exceedsJsonDepth } from "./DecodeDepthGuard.ts";
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
  DecodeRefusal,
  EncodeRefusal,
  SinkRecordNotDecodable,
  SinkRecordNotEncodable,
  WIRE_VERSIONS,
} from "./Errors.ts";
import type { OpaqueKind, WirePath } from "./Errors.ts";
import { makeSubjectId } from "./Identity.ts";
import { MAX_DECODE_DEPTH, Policy, policyDepth, UNTRUSTED_DECODE_OPTIONS } from "./Policy.ts";

/**
 * An `EvaluationError` on the wire — the union of the nine wire-crossing
 * classes themselves (ADR-QD-060), not a second description of them.
 *
 * `cause` (`AttributeResolveError`, `RelationshipResolveError`,
 * `DecisionHistoryUnavailable`, `SignatureHistoryUnavailable`) is
 * `Schema.Defect()` on each class, not a hand-rolled renderer: an `Error`
 * encodes to `{ name, message, cause? }` and decodes back to one; anything
 * else — a circular object, a function, a thrown non-`Error` — is formatted
 * and falls back to a string, the same "never break the thing observing it"
 * guarantee the old `renderCause` gave, from a maintained library schema
 * instead of one this file owned alone.
 *
 * **No wire-embedded `code`.** The deleted `ErrorSchema`'s `code` field was,
 * by its own doc comment, written on encode and ignored on decode — a value
 * nothing ever validated. A reader wanting the stable `ACL###` now derives it
 * from the decoded error's `_tag` via `errorCode()`/`ERROR_CODES`
 * (`Errors.ts`), which cannot drift from the tag the way a second,
 * independently-written wire value could.
 */
const EvaluationErrorSchema = Schema.Union([
  MissingResource,
  MissingAction,
  AttributeResolveError,
  RelationshipResolveError,
  MissingResourceId,
  DecisionHistoryUnavailable,
  PolicyTooDeep,
  CustomPredicateError,
  SignatureHistoryUnavailable,
]);

/**
 * The `subjectId` a version-1 record gets when it has none — a sender that
 * predates the field, mid rolling-deploy.
 *
 * A distinctive sentinel, not `""` (PH-03): `SubjectId` is a total,
 * non-validating brand (`Identity.ts`), so `""` is itself a legal subject id
 * a real caller could hold, and using it for "unknown" would make the two
 * indistinguishable to a devtools row or an audit reviewer reading the
 * decoded record back.
 *
 * Used by {@link upgradeV1} alone: version 2 requires `subjectId`
 * (ADR-QD-096 D-15-i), so this skew can only arrive as version 1.
 */
const UNKNOWN_SUBJECT = makeSubjectId("<unknown subject: wire version skew>");

// ---------------------------------------------------------------------------
// Version 1 — FROZEN (ADR-QD-096 D-15-d)
// ---------------------------------------------------------------------------

/**
 * A version-1 decision's fields, in the order every release before
 * ADR-QD-096 wrote them (`test/fixtures/sinkWireV1.ts` holds those bytes).
 *
 * **FROZEN, and read-only.** Version 1 is read for good — audit rows are
 * durable, and a row written before ADR-QD-096 must still read years later —
 * so nothing here may change; a change to the wire is a new version. It is no
 * longer written: the writer writes version 2 (ADR-QD-096 Phase C).
 *
 * `subjectId` is optional because a sender older than the field omitted it;
 * {@link upgradeV1} substitutes {@link UNKNOWN_SUBJECT}.
 */
const decisionV1Fields = {
  _tag: Schema.Literal("Decision"),
  evaluationId: Schema.String,
  at: Schema.Number,
  subjectId: Schema.optional(Schema.String),
  policy: Policy,
  resource: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  action: Schema.optional(Schema.String),
  cache: Schema.optional(Schema.Literals(["hit", "coalesced", "miss"])),
  decided: Schema.optional(DecisionWire),
  failed: Schema.optional(EvaluationErrorSchema),
};

type DecisionV1Fields = Schema.Struct.Type<typeof decisionV1Fields>;

/**
 * A version-1 decision names exactly one outcome: `decided` or `failed`.
 *
 * The two optional fields admit four states and only two are meaningful, so a
 * record naming neither or both is refused here, at decode, rather than given
 * an outcome its sender never sent (tickets 96 and 155, CCR-QD-180). Before,
 * "neither" became a fabricated `MissingResource`, indistinguishable by code
 * (`ACL004`) from a real resolver failure, and "both" silently preferred
 * `decided`, an artifact of check order. Version 2 cannot express either.
 */
const exactlyOneOutcome = Schema.makeFilter((wire: DecisionV1Fields) =>
  (wire.decided === undefined) !== (wire.failed === undefined) ||
  (wire.decided === undefined ? "a decision record names no outcome" : "a decision record names both outcomes"),
);

/** A version-1 obligation record's fields. **FROZEN**, as {@link decisionV1Fields}. */
const obligationsV1Fields = {
  _tag: Schema.Literal("Obligations"),
  evaluationId: Schema.String,
  at: Schema.Number,
  outcome: Schema.Literals(["Discharged", "HandlerFailed", "Refused", "NotRequired"]),
  obligationIds: Schema.Array(Schema.String),
};

/** Version-1 bytes: no `version` key, the outcome as `decided`/`failed`. **FROZEN**, read-only. */
const SinkRecordWireV1 = Schema.Union([
  Schema.Struct(decisionV1Fields).check(exactlyOneOutcome),
  Schema.Struct(obligationsV1Fields),
]);

type SinkRecordWireV1 = typeof SinkRecordWireV1.Type;

/**
 * A decoded version-1 record whose outcome is exactly one of the two, by type.
 *
 * A schema check does not narrow a TypeScript type, so the decoded type still
 * admits four outcome states; {@link isExclusive} narrows it to the two the
 * check admits, and {@link upgradeV1} takes only those, so it has no arm to
 * invent an outcome in.
 */
type ExclusiveSinkRecordWireV1 =
  | Extract<SinkRecordWireV1, { readonly _tag: "Obligations" }>
  | (Omit<DecisionV1Fields, "decided" | "failed"> &
      (
        | { readonly decided: NonNullable<DecisionV1Fields["decided"]>; readonly failed?: undefined }
        | { readonly decided?: undefined; readonly failed: NonNullable<DecisionV1Fields["failed"]> }
      ));

const isExclusive = (wire: SinkRecordWireV1): wire is ExclusiveSinkRecordWireV1 =>
  wire._tag === "Obligations" || (wire.decided === undefined) !== (wire.failed === undefined);

// ---------------------------------------------------------------------------
// Version 2 (ADR-QD-096)
// ---------------------------------------------------------------------------

/**
 * A decision's outcome on the wire: one tagged value, the same closed
 * `Decided | Failed` the in-memory `DecisionRecord.outcome` is. "Both" and
 * "neither" cannot be written down.
 */
const OutcomeWire = Schema.Union([
  Schema.TaggedStruct("Decided", { decision: DecisionWire }),
  Schema.TaggedStruct("Failed", { error: EvaluationErrorSchema }),
]);

type OutcomeWire = typeof OutcomeWire.Type;

/** A version-2 decision's fields, in the order they are written. */
const decisionV2Fields = {
  _tag: Schema.Literal("Decision"),
  version: Schema.Literal(2),
  evaluationId: Schema.String,
  at: Schema.Number,
  subjectId: Schema.String,
  policy: Policy,
  resource: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  action: Schema.optional(Schema.String),
  cache: Schema.optional(Schema.Literals(["hit", "coalesced", "miss"])),
  outcome: OutcomeWire,
};

/** A version-2 obligation record's fields. */
const obligationsV2Fields = {
  _tag: Schema.Literal("Obligations"),
  version: Schema.Literal(2),
  evaluationId: Schema.String,
  at: Schema.Number,
  outcome: Schema.Literals(["Discharged", "HandlerFailed", "Refused", "NotRequired"]),
  obligationIds: Schema.Array(Schema.String),
};

/**
 * The wire form of a {@link SinkRecord}, version 2: the one in-memory wire type.
 *
 * Module-private: callers see only `SinkRecordJson`, its encoded side, and the
 * four operations. Version-1 bytes decode into {@link SinkRecordWireV1} and are
 * upgraded into this type, so {@link rebuild} reads one shape.
 */
const SinkRecordWire = Schema.Union([Schema.Struct(decisionV2Fields), Schema.Struct(obligationsV2Fields)]);

type SinkRecordWire = typeof SinkRecordWire.Type;

/**
 * Each member's declared top-level keys, read from the schema's own fields so
 * they cannot drift from it: the envelope {@link envelopeOf} keeps.
 */
const DECISION_V1_KEYS: ReadonlySet<string> = new Set(Object.keys(decisionV1Fields));
const OBLIGATIONS_V1_KEYS: ReadonlySet<string> = new Set(Object.keys(obligationsV1Fields));
const DECISION_V2_KEYS: ReadonlySet<string> = new Set(Object.keys(decisionV2Fields));
const OBLIGATIONS_V2_KEYS: ReadonlySet<string> = new Set(Object.keys(obligationsV2Fields));

/**
 * A version-1 record as the version-2 type: `version: 2`, the outcome as one
 * tagged value, and {@link UNKNOWN_SUBJECT} for a sender that predates
 * `subjectId`.
 *
 * A function rather than a `Schema.decodeTo` transformation into
 * `Schema.toType` of version 2, so the embedded `Policy` is walked once per
 * decode, not twice (ARCH-15 C13). Total: it takes only an exclusive record.
 */
const upgradeV1: (wire: ExclusiveSinkRecordWireV1) => SinkRecordWire = Match.type<ExclusiveSinkRecordWireV1>().pipe(
  Match.tagsExhaustive({
    Obligations: (wire) => ({
      _tag: "Obligations" as const,
      version: 2 as const,
      evaluationId: wire.evaluationId,
      at: wire.at,
      outcome: wire.outcome,
      obligationIds: wire.obligationIds,
    }),
    Decision: (wire) => ({
      _tag: "Decision" as const,
      version: 2 as const,
      evaluationId: wire.evaluationId,
      at: wire.at,
      subjectId: wire.subjectId ?? UNKNOWN_SUBJECT,
      policy: wire.policy,
      ...(wire.resource === undefined ? {} : { resource: wire.resource }),
      ...(wire.action === undefined ? {} : { action: wire.action }),
      ...(wire.cache === undefined ? {} : { cache: wire.cache }),
      outcome:
        wire.decided !== undefined
          ? { _tag: "Decided" as const, decision: wire.decided }
          : { _tag: "Failed" as const, error: wire.failed },
    }),
  }),
);

/** A record's outcome as the wire carries it. */
const outcomeOf: (outcome: DecisionOutcome) => OutcomeWire = Match.type<DecisionOutcome>().pipe(
  Match.tagsExhaustive({
    Decided: (outcome) => ({ _tag: "Decided" as const, decision: encodeDecision(outcome.decision) }),
    Failed: (outcome) => ({ _tag: "Failed" as const, error: outcome.error }),
  }),
);

/**
 * The wire projection of a record, ready for the schema encode.
 *
 * `Match.tagsExhaustive` over `SinkRecord`, not a ternary on `record._tag`
 * (issue #109): `SinkRecord` has exactly two tags today, so a ternary reads as
 * exhaustive without being one by construction — a third tag would compile and
 * fall through as though it were the other. Here, a new tag is a compile error.
 */
const project: (record: SinkRecord) => SinkRecordWire = Match.type<SinkRecord>().pipe(
  Match.tagsExhaustive({
    Obligations: (record) => ({
      _tag: "Obligations" as const,
      version: 2 as const,
      evaluationId: record.evaluationId,
      at: record.at,
      outcome: record.outcome,
      obligationIds: record.obligationIds,
    }),
    Decision: (record) => ({
      _tag: "Decision" as const,
      version: 2 as const,
      evaluationId: record.evaluationId,
      at: record.at,
      subjectId: record.subjectId,
      policy: record.policy,
      ...(record.resource === undefined ? {} : { resource: record.resource }),
      ...(record.action === undefined ? {} : { action: record.action }),
      ...(record.cache === undefined ? {} : { cache: record.cache }),
      outcome: outcomeOf(record.outcome),
    }),
  }),
);

/** A wire outcome as the record's own classes. */
const rebuildOutcome: (outcome: OutcomeWire) => DecisionOutcome = Match.type<OutcomeWire>().pipe(
  Match.tagsExhaustive({
    Decided: (outcome) => new Decided({ decision: decodeDecision(outcome.decision) }),
    Failed: (outcome) => new Failed({ error: outcome.error }),
  }),
);

/**
 * Rebuilds a record from an already-validated version-2 wire value.
 *
 * **Not a validating step, and module-private for that reason.** It
 * `Match`-matches an already-typed `SinkRecordWire` into the record classes,
 * nothing more; {@link decodeSinkRecord} runs the depth guard and the
 * untrusted schema decode first. It used to be exported as `fromWireUnsafe`,
 * where a caller who called it on a `JSON.parse` result skipped validation
 * entirely with nothing at the type level to stop it (PH-05).
 *
 * `Match.tagsExhaustive` over `SinkRecordWire`, not an `if (wire._tag === …)`,
 * for the reason {@link project} gives. The outcome is one tagged value and
 * `subjectId` is required, so there is no fallback arm: version-1 skew is
 * resolved by {@link upgradeV1} before this runs.
 */
const rebuild: (wire: SinkRecordWire) => SinkRecord = Match.type<SinkRecordWire>().pipe(
  Match.tagsExhaustive({
    Obligations: (wire) =>
      new ObligationRecord({
        evaluationId: wire.evaluationId,
        at: wire.at,
        outcome: wire.outcome,
        obligationIds: wire.obligationIds,
      }),
    Decision: (wire) =>
      new DecisionRecord({
        evaluationId: wire.evaluationId,
        at: wire.at,
        subjectId: makeSubjectId(wire.subjectId),
        policy: wire.policy,
        ...(wire.resource === undefined ? {} : { resource: wire.resource }),
        ...(wire.action === undefined ? {} : { action: wire.action }),
        ...(wire.cache === undefined ? {} : { cache: wire.cache }),
        outcome: rebuildOutcome(wire.outcome),
      }),
  }),
);

/**
 * The encoded form of a record — version-2 bytes or version-1 bytes, a closed
 * union (ADR-QD-096): what {@link decodeSinkRecord} reads, what an audit row
 * holds (a store keeps rows of both for good), and what forwarding's `send`
 * receives. {@link encodeSinkRecord} writes the version-2 member only; the
 * type stays the union because a receiver of the wire, or a row, may hold
 * either.
 *
 * Derived from the wire schemas (ADR-QD-002), never hand-written:
 * `Schema.toEncoded` gives each schema whose `Type` is that version's encoded
 * side, so `@qadi/audit` can embed it in its own row schema. Decoding it alone
 * is a description of the bytes, not a reader: use {@link decodeSinkRecord}.
 */
export const SinkRecordJson = Schema.Union([Schema.toEncoded(SinkRecordWire), Schema.toEncoded(SinkRecordWireV1)]);

export type SinkRecordJson = typeof SinkRecordJson.Type;

/**
 * A container the walk has entered and not yet left: an array's items, or an
 * object's own enumerable string keys.
 */
interface WalkFrame {
  readonly container: object;
  readonly items: ReadonlyArray<unknown> | undefined;
  readonly keys: ReadonlyArray<string>;
  readonly length: number;
  readonly depth: number;
  index: number;
}

/**
 * The `OpaqueKind` of each built-in brand JSON cannot carry. A lookup table
 * rather than a dispatch: any brand absent here (and not `Object`/`Array`) is
 * `"OtherBuiltIn"`. Binary data is recognised by `ArrayBuffer.isView` or its
 * buffer brands, since each typed array has a brand of its own.
 */
const OPAQUE_KIND_BY_BRAND: ReadonlyMap<string, OpaqueKind> = new Map<string, OpaqueKind>([
  ["Map", "Map"],
  ["Set", "Set"],
  ["WeakMap", "WeakMap"],
  ["WeakSet", "WeakSet"],
  ["RegExp", "RegExp"],
  ["Promise", "Promise"],
  ["Error", "Error"],
  ["ArrayBuffer", "BinaryData"],
  ["SharedArrayBuffer", "BinaryData"],
  ["DataView", "BinaryData"],
  ["Boolean", "BoxedPrimitive"],
  ["Number", "BoxedPrimitive"],
  ["String", "BoxedPrimitive"],
]);

/** `"Set"` for a `Set`: the `Object.prototype.toString` brand, unwrapped. */
const brandOf = (value: object): string => Object.prototype.toString.call(value).slice(8, -1);

const opaqueKindOf = (value: object, brand: string): OpaqueKind =>
  ArrayBuffer.isView(value) ? "BinaryData" : (OPAQUE_KIND_BY_BRAND.get(brand) ?? "OtherBuiltIn");

const hasCustomToJSON = (value: object): boolean =>
  Predicate.hasProperty(value, "toJSON") && typeof value.toJSON === "function";

const hasEnumerableSymbolKey = (value: object): boolean =>
  Object.getOwnPropertySymbols(value).some((key) => Object.prototype.propertyIsEnumerable.call(value, key));

/** A plain object — `Object.prototype` or no prototype — needs no brand lookup. */
const isPlainObject = (value: object): boolean => {
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const NO_KEYS: ReadonlyArray<string> = [];

/**
 * The first value in an encoded record that would not survive JSON as itself,
 * or `undefined` when the whole value round-trips.
 *
 * One iterative walk with one mutable on-path set, the technique the retired `isJsonSafe`
 * used, over the *encoded* output — so it cannot miss a field the way per-field
 * guards did: whatever the encode emitted is what it checks. Its depth count
 * matches `exceedsJsonDepth`'s (the root is depth 0, each child one more, and
 * any value deeper than `maxDepth` is refused), so it refuses exactly what a
 * receiver's depth guard would.
 *
 * An `undefined` object property is absence, not a hazard: JSON drops the key
 * and decode reads it as absent, and `Schema`'s own encoded output carries such
 * keys for unset optional fields. An `undefined` array element is refused,
 * because JSON writes it as `null`. A valid `Date` is accepted and crosses as
 * its ISO string, a named normalisation. The path is rebuilt from the stack
 * only when a hazard is found, so the accepting walk allocates no paths.
 */
const wireHazard = (root: unknown, maxDepth: number): EncodeRefusal | undefined => {
  const onPath = new Set<object>();
  const stack: Array<WalkFrame> = [];
  const pathHere = (): WirePath =>
    stack.map((frame) => (frame.items === undefined ? (frame.keys[frame.index - 1] ?? "") : frame.index - 1));

  const visit = (value: unknown, depth: number, isElement: boolean): EncodeRefusal | undefined => {
    if (value === undefined) {
      return isElement ? EncodeRefusal.Unrepresentable({ path: pathHere(), kind: "undefined-element" }) : undefined;
    }
    if (depth > maxDepth) return EncodeRefusal.TooDeep({ path: pathHere(), maxDepth });
    if (value === null || typeof value === "string" || typeof value === "boolean") return undefined;
    if (typeof value === "number") {
      return Number.isFinite(value) ? undefined : EncodeRefusal.NonFinite({ path: pathHere() });
    }
    if (typeof value === "function") return EncodeRefusal.Unrepresentable({ path: pathHere(), kind: "function" });
    if (typeof value === "symbol") return EncodeRefusal.Unrepresentable({ path: pathHere(), kind: "symbol" });
    if (typeof value === "bigint") return EncodeRefusal.Unrepresentable({ path: pathHere(), kind: "bigint" });
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? EncodeRefusal.NonFinite({ path: pathHere() }) : undefined;
    }
    if (onPath.has(value)) return EncodeRefusal.Circular({ path: pathHere() });
    if (Array.isArray(value)) {
      onPath.add(value);
      stack.push({ container: value, items: value, keys: NO_KEYS, length: value.length, depth, index: 0 });
      return undefined;
    }
    if (hasCustomToJSON(value)) {
      return EncodeRefusal.Opaque({ path: pathHere(), kind: "CustomToJSON", brand: brandOf(value) });
    }
    if (!isPlainObject(value)) {
      const brand = brandOf(value);
      if (brand !== "Object") return EncodeRefusal.Opaque({ path: pathHere(), kind: opaqueKindOf(value, brand), brand });
    }
    if (hasEnumerableSymbolKey(value)) return EncodeRefusal.Unrepresentable({ path: pathHere(), kind: "symbol" });
    const keys = Object.keys(value);
    onPath.add(value);
    stack.push({ container: value, items: undefined, keys, length: keys.length, depth, index: 0 });
    return undefined;
  };

  const atRoot = visit(root, 0, false);
  if (atRoot !== undefined) return atRoot;
  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    if (frame === undefined) break;
    if (frame.index >= frame.length) {
      onPath.delete(frame.container);
      stack.pop();
      continue;
    }
    const index = frame.index;
    frame.index += 1;
    const child: unknown =
      frame.items === undefined ? Reflect.get(frame.container, frame.keys[index] ?? "") : frame.items[index];
    const refusal = visit(child, frame.depth + 1, frame.items !== undefined);
    if (refusal !== undefined) return refusal;
  }
  return undefined;
};

/**
 * `true` once a trace nests deeper than `maxDepth` nodes. Iterative, and
 * bounded by `maxDepth`, so a trace no evaluation produced (a cyclic one)
 * still terminates, as too deep.
 */
const traceExceeds = (trace: Trace, maxDepth: number): boolean => {
  const stack: Array<{ readonly node: Trace; readonly depth: number }> = [{ node: trace, depth: 1 }];
  while (stack.length > 0) {
    const frame = stack.pop();
    if (frame === undefined) break;
    if (frame.depth > maxDepth) return true;
    for (const child of frame.node.children) stack.push({ node: child, depth: frame.depth + 1 });
  }
  return false;
};

/**
 * Refuses, before the encode, the two recursive positions the wire schema
 * descends with no bound of its own — so the encode itself cannot overflow
 * the stack (a policy about 5,000 levels deep made it throw). Each bound is
 * no tighter than the final walk's: a policy or trace more than
 * `MAX_DECODE_DEPTH` nodes deep is more than that deep on the wire too, so
 * these refuse nothing the walk would accept.
 *
 * `policyDepth` is memoised per policy object and already computed for any
 * record `evaluate` produced; it throws only on a cycle.
 */
const preEncodeHazard: (record: SinkRecord) => EncodeRefusal | undefined = Match.type<SinkRecord>().pipe(
  Match.tagsExhaustive({
    Obligations: () => undefined,
    Decision: (record) => {
      const depth = Result.try(() => policyDepth(record.policy));
      if (Result.isFailure(depth)) return EncodeRefusal.Circular({ path: ["policy"] });
      if (depth.success > MAX_DECODE_DEPTH) {
        return EncodeRefusal.TooDeep({ path: ["policy"], maxDepth: MAX_DECODE_DEPTH });
      }
      return record.outcome._tag === "Decided" && traceExceeds(record.outcome.decision.trace, MAX_DECODE_DEPTH)
        ? EncodeRefusal.TooDeep({ path: ["outcome", "decision", "trace"], maxDepth: MAX_DECODE_DEPTH })
        : undefined;
    },
  }),
);


/**
 * The wire schema's encoder, built once. It writes version 2 only: version 1
 * is read for good and written no more (ADR-QD-096 Phase C).
 */
const encodeWire = Schema.encodeResult(SinkRecordWire);

/** A thrown value's message, without letting a hostile `toString` throw again. */
const describeThrown = (thrown: unknown): string =>
  Result.getOrElse(
    Result.try(() => (thrown instanceof Error ? thrown.message : String(thrown))),
    () => "a value that could not be described",
  );

const encodeFailed = (thrown: unknown): EncodeRefusal => EncodeRefusal.EncodeFailed({ message: describeThrown(thrown) });

/**
 * A record as a verified JSON wire value, or the reason it cannot be one.
 *
 * Written as wire version 2 (ADR-QD-096). A reader on a release before the
 * versioned wire reads only version 1, so readers upgrade before writers.
 *
 * Runs the depth pre-checks, the schema encode (so every resolver error's
 * `cause` crosses through `Schema.Defect()`, ADR-QD-060), and then one walk
 * over the encoded output. What it returns `JSON.stringify` renders without
 * throwing and {@link decodeSinkRecord} accepts (INV-QD-096); it never
 * throws, whatever the record holds (INV-QD-097).
 */
export const encodeSinkRecord = (record: SinkRecord): Result.Result<SinkRecordJson, SinkRecordNotEncodable> => {
  const refuse = (refusal: EncodeRefusal) =>
    Result.fail(new SinkRecordNotEncodable({ recordTag: record._tag, evaluationId: record.evaluationId, refusal }));

  const before = Result.try({ try: () => preEncodeHazard(record), catch: encodeFailed });
  if (Result.isFailure(before)) return refuse(before.failure);
  if (before.success !== undefined) return refuse(before.success);

  const encoded = Result.try({ try: () => encodeWire(project(record)), catch: encodeFailed });
  if (Result.isFailure(encoded)) return refuse(encoded.failure);
  if (Result.isFailure(encoded.success)) return refuse(encodeFailed(encoded.success.failure));
  const json = encoded.success.success;

  const hazard = Result.try({ try: () => wireHazard(json, MAX_DECODE_DEPTH), catch: encodeFailed });
  if (Result.isFailure(hazard)) return refuse(hazard.failure);
  if (hazard.success !== undefined) return refuse(hazard.success);
  return Result.succeed(json);
};

/**
 * A record as JSON text, or the reason it cannot be.
 *
 * `JSON.stringify` cannot throw here: {@link encodeSinkRecord} has verified the
 * value is cycle-free, at most `MAX_DECODE_DEPTH` levels deep, holds no
 * `bigint`, and has no `toJSON` but `Date`'s.
 */
export const encodeSinkRecordString = (record: SinkRecord): Result.Result<string, SinkRecordNotEncodable> =>
  Result.map(encodeSinkRecord(record), (json) => JSON.stringify(json));

/**
 * The untrusted decoders, one per version, built once.
 *
 * Strict everywhere (`UNTRUSTED_DECODE_OPTIONS`): a typo'd field inside the
 * embedded policy fails rather than decoding with the grant silently dropped
 * (ADR-QD-002). Each is handed the {@link envelopeOf} projection, so the one
 * place an unknown key is tolerated is the envelope's top level (GH-01,
 * ADR-QD-096).
 */
const decodeWireV1 = Schema.decodeUnknownResult(SinkRecordWireV1, UNTRUSTED_DECODE_OPTIONS);
const decodeWireV2 = Schema.decodeUnknownResult(SinkRecordWire, UNTRUSTED_DECODE_OPTIONS);

const notDecodable = (refusal: DecodeRefusal) => Result.fail(new SinkRecordNotDecodable({ refusal }));

const malformed = (error: { readonly message: string }) =>
  notDecodable(DecodeRefusal.Malformed({ message: error.message }));

/** A JSON object: what an envelope is, and what an array or a primitive is not. */
const isJsonObject = (input: unknown): input is object =>
  typeof input === "object" && input !== null && !Array.isArray(input);

/** An own property's value, or `undefined`: never one inherited from a prototype. */
const ownValue = (input: object, key: string): unknown => Object.getOwnPropertyDescriptor(input, key)?.value;

/**
 * The input with only the top-level keys its member declares.
 *
 * `Schema`'s parse options apply to a whole decode call, not to one position,
 * so tolerating an unknown envelope key while refusing one inside the policy
 * cannot be said to the decoder; it is said here instead, by handing the
 * strict decode only what the envelope declares (ADR-QD-096 D-15-c). A newer
 * sender's additive envelope metadata then no longer refuses the whole record
 * for the length of a rolling deploy (GH-01). Nothing nested is touched. An
 * unknown `_tag` takes the decision's key set and fails in the decode, as it
 * always did.
 */
const envelopeOf = (input: object, decisionKeys: ReadonlySet<string>, obligationsKeys: ReadonlySet<string>) => {
  const keys = ownValue(input, "_tag") === "Obligations" ? obligationsKeys : decisionKeys;
  return Object.entries(input).filter(([key]) => keys.has(key));
};

/**
 * A pre-0.5 error's `code`, dropped (ADR-QD-096 D-15-g).
 *
 * ADR-QD-060 removed `code` from the error's wire form in 0.5.0, unversioned,
 * and `@qadi/audit` had persisted rows since 0.3.0: every `Failed` row written
 * by 0.3.x or 0.4.x carries `failed.code`. The version-1 reader tolerates
 * exactly that key at exactly that position; any other excess key under
 * `failed`, or a `code` anywhere else, is still refused.
 */
const withoutLegacyCode = (failed: unknown): unknown =>
  isJsonObject(failed) ? Object.fromEntries(Object.entries(failed).filter(([key]) => key !== "code")) : failed;

/** A version-1 envelope: its declared keys, with a pre-0.5 `failed.code` dropped. */
const envelopeV1 = (input: object): unknown =>
  Object.fromEntries(
    envelopeOf(input, DECISION_V1_KEYS, OBLIGATIONS_V1_KEYS).map(([key, value]) =>
      key === "failed" ? [key, withoutLegacyCode(value)] : [key, value],
    ),
  );

/** A version-2 envelope: its declared keys. */
const envelopeV2 = (input: object): unknown =>
  Object.fromEntries(envelopeOf(input, DECISION_V2_KEYS, OBLIGATIONS_V2_KEYS));

/** Version-1 bytes as a record: decoded, checked for one outcome, upgraded, rebuilt. */
const decodeV1 = (input: object): Result.Result<SinkRecord, SinkRecordNotDecodable> => {
  const wire = decodeWireV1(envelopeV1(input));
  if (Result.isFailure(wire)) return malformed(wire.failure);
  // Unreachable after the schema's `exactlyOneOutcome` check; the predicate
  // is what narrows the type for `upgradeV1`, and its refusal says the same.
  if (!isExclusive(wire.success)) {
    return notDecodable(DecodeRefusal.Malformed({ message: "a decision record names no outcome, or both" }));
  }
  return Result.succeed(rebuild(upgradeV1(wire.success)));
};

/** Version-2 bytes as a record. */
const decodeV2 = (input: object): Result.Result<SinkRecord, SinkRecordNotDecodable> => {
  const wire = decodeWireV2(envelopeV2(input));
  return Result.isFailure(wire) ? malformed(wire.failure) : Result.succeed(rebuild(wire.success));
};

/**
 * Untrusted input as a record, or the reason it is not one.
 *
 * The depth guard runs first, so the schema's recursion through `Policy` and
 * `Trace` cannot overflow. Then the version: no `version` key is version 1,
 * read for good; `version: 2` is version 2; any other value is
 * `UnsupportedVersion` — the sender is newer than this reader — rather than
 * `Malformed` (ADR-QD-096, the same convention ADR-QD-078 gives the hydration
 * payload). Each version is projected onto its envelope's declared keys,
 * decoded with `UNTRUSTED_DECODE_OPTIONS`, and rebuilt into record classes. It
 * accepts whatever {@link encodeSinkRecord} emits (INV-QD-096), and a record
 * decodes to the same `SinkRecord` whichever version carried it (INV-QD-099).
 *
 * **The seam for the wire's shape.** How the outcome is carried, the refusal
 * of a record naming neither outcome or both (tickets 96 and 155,
 * CCR-QD-180), and the version dispatch live behind this function, so no
 * adapter observes them and a change to them is an edit to this module alone.
 *
 * The depth guard is `DecodeDepthGuard.ts`'s, shared with `Policy.ts`'s own
 * untrusted entry points: the wire embeds `Policy` and the self-recursive
 * `TraceSchema`, neither bounded on its own, and without the guard `Schema`'s
 * descent raised a raw `RangeError` on a payload nested about 60,000 levels
 * deep. The decode options are `Policy.ts`'s too (CCR-QD-139), so a typo'd
 * field inside the embedded policy fails rather than decoding with the grant
 * silently dropped.
 *
 * No `Result.try` around the decode: the depth guard is what makes it safe, and
 * a throw past it would be a library defect that should stay visible.
 */
export const decodeSinkRecord = (input: unknown): Result.Result<SinkRecord, SinkRecordNotDecodable> => {
  if (exceedsJsonDepth(input, MAX_DECODE_DEPTH)) {
    return notDecodable(DecodeRefusal.TooDeep({ maxDepth: MAX_DECODE_DEPTH }));
  }
  if (!isJsonObject(input)) {
    const wire = decodeWireV2(input);
    return Result.isFailure(wire) ? malformed(wire.failure) : Result.succeed(rebuild(wire.success));
  }
  if (!Object.hasOwn(input, "version")) return decodeV1(input);
  const version = ownValue(input, "version");
  return version === 2
    ? decodeV2(input)
    : notDecodable(DecodeRefusal.UnsupportedVersion({ version, supported: WIRE_VERSIONS }));
};

/**
 * JSON text as a record, or the reason it is not one: `NotJson` when the text
 * does not parse, otherwise whatever {@link decodeSinkRecord} says. Never
 * throws (INV-QD-097).
 */
export const decodeSinkRecordString = (text: string): Result.Result<SinkRecord, SinkRecordNotDecodable> => {
  const parsed = Result.try((): unknown => JSON.parse(text));
  return Result.isFailure(parsed) ? notDecodable(DecodeRefusal.NotJson()) : decodeSinkRecord(parsed.success);
};

// ---------------------------------------------------------------------------
// The stored-record envelope (ARCH-11 D-11-e)
// ---------------------------------------------------------------------------

/**
 * A stored record on the wire: the producer's environment beside the record's
 * own wire form.
 *
 * An envelope rather than an `environment` field on the record wire, because
 * forwarding and `@qadi/audit` read the record wire too and never asked for a
 * label. The `version` key lives inside `record` (ADR-QD-096), so the envelope
 * itself is unversioned: a later change to it is additive at its top level,
 * which {@link decodeStoredRecord} ignores, or a new `record` version.
 *
 * Schema-first (ADR-QD-002), type derived: the encoded side of what
 * {@link encodeStoredRecord} returns. Decoding it alone is a description, not a
 * reader — use {@link decodeStoredRecord}.
 */
export const StoredRecordJson = Schema.Struct({ environment: Schema.String, record: SinkRecordJson });

export type StoredRecordJson = typeof StoredRecordJson.Type;

/**
 * A stored record as a verified JSON envelope, or the reason it cannot be one.
 *
 * {@link encodeSinkRecord} on the record, with the environment beside it — the
 * same refusals, the same `cause` normalisation, the same bytes forwarding
 * sends. Never throws.
 */
export const encodeStoredRecord = (
  stored: StoredRecord,
): Result.Result<StoredRecordJson, SinkRecordNotEncodable> =>
  Result.map(encodeSinkRecord(stored), (record) => ({ environment: stored.environment, record }));

/** A stored record as JSON text, or the reason it cannot be. Never throws. */
export const encodeStoredRecordString = (
  stored: StoredRecord,
): Result.Result<string, SinkRecordNotEncodable> =>
  Result.map(encodeStoredRecord(stored), (json) => JSON.stringify(json));

/** How {@link decodeStoredRecord} reads a frame that is not an envelope. */
export interface DecodeStoredRecordOptions {
  /**
   * Accept a bare record — what a server older than the envelope sends — and
   * stamp it with this label, which is the only thing such a server cannot say.
   * Without it, a bare record is refused as `Malformed`, so an older server is
   * reported rather than silently mislabelled.
   *
   * @deprecated Accepted for one minor so a newer reader can read an older
   * server (ARCH-11 D-11-e). Remove in the minor after next.
   */
  readonly legacyEnvironment?: string | undefined;
}

const notAnEnvelope = (message: string) => notDecodable(DecodeRefusal.Malformed({ message }));

/**
 * Untrusted input as a stored record, or the reason it is not one.
 *
 * The envelope is read first — an own `environment` that must be a string, an
 * own `record` — and `record` then goes through {@link decodeSinkRecord}, so
 * every rule about the record (depth, version, strictness inside the policy) is
 * that function's. A top-level envelope key this reader does not declare is
 * ignored, as {@link decodeSinkRecord} ignores one on the record (ADR-QD-096
 * D-15-c): a newer server's additive metadata must not refuse every frame for
 * the length of a rolling deploy.
 *
 * The record is rebuilt and stamped here, with `stampRecord`, so the
 * environment is the producer's, never the reader's. Never throws.
 */
export const decodeStoredRecord = (
  input: unknown,
  options?: DecodeStoredRecordOptions,
): Result.Result<StoredRecord, SinkRecordNotDecodable> => {
  if (!isJsonObject(input)) return notAnEnvelope("a stored record is a JSON object { environment, record }");
  if (Object.hasOwn(input, "environment") || Object.hasOwn(input, "record")) {
    const environment = ownValue(input, "environment");
    if (typeof environment !== "string") return notAnEnvelope("a stored record's environment is not a string");
    if (!Object.hasOwn(input, "record")) return notAnEnvelope("a stored record names no record");
    return Result.map(decodeSinkRecord(ownValue(input, "record")), (record) => stampRecord(record, environment));
  }
  const legacy = options?.legacyEnvironment;
  return legacy === undefined
    ? notAnEnvelope("a bare record, not a stored-record envelope { environment, record }")
    : Result.map(decodeSinkRecord(input), (record) => stampRecord(record, legacy));
};

/**
 * JSON text as a stored record, or the reason it is not one: `NotJson` when
 * the text does not parse, otherwise whatever {@link decodeStoredRecord} says.
 */
export const decodeStoredRecordString = (
  text: string,
  options?: DecodeStoredRecordOptions,
): Result.Result<StoredRecord, SinkRecordNotDecodable> => {
  const parsed = Result.try((): unknown => JSON.parse(text));
  return Result.isFailure(parsed) ? notDecodable(DecodeRefusal.NotJson()) : decodeStoredRecord(parsed.success, options);
};
