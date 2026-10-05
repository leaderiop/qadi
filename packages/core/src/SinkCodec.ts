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
 * to the named normalisations below (INV-QD-902). Neither direction throws,
 * whatever it is given, so one record can never end a feed (INV-QD-903).
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
 */
import * as Match from "effect/Match";
import * as Predicate from "effect/Predicate";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import type { Trace } from "./Decision.ts";
import type { SinkRecord } from "./DecisionRecord.ts";
import { Decided, DecisionRecord, Failed, ObligationRecord } from "./DecisionRecord.ts";
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
 * The `subjectId` `rebuild` substitutes when a wire record's own `subjectId`
 * is absent — an older sender, mid rolling-deploy, predating that field
 * (`SinkRecordWire`'s own doc comment above).
 *
 * A distinctive sentinel, not `""` (PH-03): `SubjectId` is a total,
 * non-validating brand (`Identity.ts`), so `""` is itself a legal subject id
 * a real caller could hold, and using it for "unknown" would make the two
 * indistinguishable to a devtools row or an audit reviewer reading the
 * decoded record back.
 */
const UNKNOWN_SUBJECT = makeSubjectId("<unknown subject: wire version skew>");

/**
 * The `Decision` member's fields, in the order they are written: the order is
 * part of the bytes (the v1 goldens pin it).
 */
const decisionFields = {
  _tag: Schema.Literal("Decision"),
  evaluationId: Schema.String,
  at: Schema.Number,
  // Optional on the wire, though never absent from anything this module
  // encodes: `SinkRecordWire` crosses process boundaries (a devtools
  // socket, a replica forwarding to a shared store), and a sender running
  // an older version during a rolling deploy predates this field. Rejecting
  // such a record outright would silently drop real decisions for the
  // length of the deploy; `rebuild` falls back to {@link UNKNOWN_SUBJECT}
  // instead — not `""`, which `SubjectId`'s brand (a total, non-validating
  // `Brand.nominal`, `Identity.ts`) accepts as a legal id in its own right,
  // making "the sender predates this field" indistinguishable downstream
  // from "this subject's real id happens to be the empty string" (PH-03).
  subjectId: Schema.optional(Schema.String),
  policy: Policy,
  resource: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  action: Schema.optional(Schema.String),
  cache: Schema.optional(Schema.Literals(["hit", "coalesced", "miss"])),
  decided: Schema.optional(DecisionWire),
  failed: Schema.optional(EvaluationErrorSchema),
};

type DecisionWireFields = Schema.Struct.Type<typeof decisionFields>;

/**
 * A decision record names exactly one outcome: `decided` or `failed`.
 *
 * The two optional fields admit four states and only two are meaningful, so a
 * record naming neither or both is refused here, at decode, rather than given
 * an outcome its sender never sent (tickets 96 and 155, CCR-QD-904). Before,
 * "neither" became a fabricated `MissingResource`, indistinguishable by code
 * (`ACL004`) from a real resolver failure, and "both" silently preferred
 * `decided`, an artifact of check order.
 */
const exactlyOneOutcome = Schema.makeFilter((wire: DecisionWireFields) =>
  (wire.decided === undefined) !== (wire.failed === undefined) ||
  (wire.decided === undefined ? "a decision record names no outcome" : "a decision record names both outcomes"),
);

/**
 * The wire form of a {@link SinkRecord} — the one schema both operations are
 * derived from. Module-private: callers see only `SinkRecordJson`, its encoded
 * side, and the four operations.
 */
const SinkRecordWire = Schema.Union([
  Schema.Struct(decisionFields).check(exactlyOneOutcome),
  Schema.Struct({
    _tag: Schema.Literal("Obligations"),
    evaluationId: Schema.String,
    at: Schema.Number,
    outcome: Schema.Literals(["Discharged", "HandlerFailed", "Refused", "NotRequired"]),
    obligationIds: Schema.Array(Schema.String),
  }),
]);

type SinkRecordWire = typeof SinkRecordWire.Type;

/**
 * A decoded wire record whose outcome is exactly one of the two, by type.
 *
 * A schema check does not narrow a TypeScript type, so the decoded type still
 * admits four outcome states; {@link isExclusive} narrows it to the two the
 * check admits, and {@link rebuild} takes only those, so it has no arm to
 * fabricate an outcome in.
 */
type ExclusiveSinkRecordWire =
  | Extract<SinkRecordWire, { readonly _tag: "Obligations" }>
  | (Omit<DecisionWireFields, "decided" | "failed"> &
      (
        | { readonly decided: NonNullable<DecisionWireFields["decided"]>; readonly failed?: undefined }
        | { readonly decided?: undefined; readonly failed: NonNullable<DecisionWireFields["failed"]> }
      ));

const isExclusive = (wire: SinkRecordWire): wire is ExclusiveSinkRecordWire =>
  wire._tag === "Obligations" || (wire.decided === undefined) !== (wire.failed === undefined);

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
      evaluationId: record.evaluationId,
      at: record.at,
      outcome: record.outcome,
      obligationIds: record.obligationIds,
    }),
    Decision: (record) => ({
      _tag: "Decision" as const,
      evaluationId: record.evaluationId,
      at: record.at,
      subjectId: record.subjectId,
      policy: record.policy,
      ...(record.resource === undefined ? {} : { resource: record.resource }),
      ...(record.action === undefined ? {} : { action: record.action }),
      ...(record.cache === undefined ? {} : { cache: record.cache }),
      ...(record.outcome._tag === "Decided"
        ? { decided: encodeDecision(record.outcome.decision) }
        : { failed: record.outcome.error }),
    }),
  }),
);

/**
 * Rebuilds a record from an already-validated wire value.
 *
 * **Not a validating step, and module-private for that reason.** It
 * `Match`-matches an already-typed `SinkRecordWire` into the record classes,
 * nothing more; {@link decodeSinkRecord} runs the depth guard and the
 * untrusted schema decode first. It used to be exported as `fromWireUnsafe`,
 * where a caller who called it on a `JSON.parse` result skipped validation
 * entirely with nothing at the type level to stop it (PH-05).
 *
 * `Match.tagsExhaustive` over `SinkRecordWire`, not an `if (wire._tag === …)`,
 * for the reason {@link project} gives.
 *
 * It takes only an {@link ExclusiveSinkRecordWire}: a record naming neither
 * outcome or both is refused by the decode (tickets 96 and 155, CCR-QD-904),
 * so the outcome below is total by type and there is no fallback arm.
 */
const rebuild: (wire: ExclusiveSinkRecordWire) => SinkRecord = Match.type<ExclusiveSinkRecordWire>().pipe(
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
        // `?? UNKNOWN_SUBJECT` mirrors every other fallback in this file:
        // unreachable for anything this module encodes, real for a wire
        // record sent by an older process during a rolling deploy, before
        // this field existed. See `UNKNOWN_SUBJECT`'s own doc comment (PH-03)
        // for why the fallback is a sentinel and not `""`.
        subjectId: wire.subjectId === undefined ? UNKNOWN_SUBJECT : makeSubjectId(wire.subjectId),
        policy: wire.policy,
        ...(wire.resource === undefined ? {} : { resource: wire.resource }),
        ...(wire.action === undefined ? {} : { action: wire.action }),
        ...(wire.cache === undefined ? {} : { cache: wire.cache }),
        outcome:
          wire.decided !== undefined
            ? new Decided({ decision: decodeDecision(wire.decided) })
            : new Failed({ error: wire.failed }),
      }),
  }),
);

/**
 * The encoded form of a record: what {@link encodeSinkRecord} returns, what
 * forwarding's `send` receives, and what an audit row carries.
 *
 * Derived from the one wire schema (ADR-QD-002), never hand-written:
 * `Schema.toEncoded` gives the schema whose `Type` is the wire's encoded
 * side, so `@qadi/audit` can embed it in its own row schema.
 */
export const SinkRecordJson = Schema.toEncoded(SinkRecordWire);

export type SinkRecordJson = typeof SinkRecordWire.Encoded;

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
        ? EncodeRefusal.TooDeep({ path: ["decided", "trace"], maxDepth: MAX_DECODE_DEPTH })
        : undefined;
    },
  }),
);

/** The wire schema's encoder, built once. */
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
 * Runs the depth pre-checks, the schema encode (so every resolver error's
 * `cause` crosses through `Schema.Defect()`, ADR-QD-060), and then one walk
 * over the encoded output. What it returns `JSON.stringify` renders without
 * throwing and {@link decodeSinkRecord} accepts (INV-QD-902); it never
 * throws, whatever the record holds (INV-QD-903).
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
 * The wire schema's untrusted decoder, built once.
 *
 * **Known gap, not fixed here (GH-01): this hard-rejects forward version
 * skew, the mirror image of the backward skew `SinkRecordWire.subjectId`'s
 * own doc comment says would be unacceptable.** `UNTRUSTED_DECODE_OPTIONS`
 * sets `onExcessProperty: "error"` — correctly, for the embedded `Policy`,
 * where an adversarial typo'd field must fail rather than decode silently
 * (ADR-QD-002). But it applies to the whole envelope, not just `Policy`, so a
 * NEWER sender that has gained an envelope-level field an OLDER receiver's
 * schema does not know about hard-rejects the record outright — exactly the
 * "silently drop real decisions for the length of the deploy" harm the
 * subjectId comment above says a sender predating a field must not suffer,
 * just on the envelope's *shape* instead of one field's presence.
 *
 * Not fixed locally because both ways to close it are wire-protocol design
 * decisions, not local patches: either give the envelope a version/known-
 * fields marker so an older reader can tolerate unknown envelope keys while
 * `Policy` stays strict, or split the decode so `onExcessProperty: "error"`
 * applies only at the `Policy`/`TraceSchema` positions and the envelope
 * itself uses the default (lenient) excess-property handling — `Schema`'s
 * `ParseOptions` apply to a whole decode call, not per nested schema, so the
 * second option needs decoding the envelope and its embedded `Policy`
 * separately rather than as one decode call. Either
 * choice changes this module's wire contract and belongs in an ADR, per the
 * recommendation on issue GH-01, not as a guess made in a doc comment.
 */
const decodeWire = Schema.decodeUnknownResult(SinkRecordWire, UNTRUSTED_DECODE_OPTIONS);

const notDecodable = (refusal: DecodeRefusal) => Result.fail(new SinkRecordNotDecodable({ refusal }));

/**
 * Untrusted input as a record, or the reason it is not one.
 *
 * The depth guard runs first, so the schema's recursion through `Policy` and
 * `Trace` cannot overflow; then the schema decode with
 * `UNTRUSTED_DECODE_OPTIONS`; then the rebuild into record classes. It accepts
 * whatever {@link encodeSinkRecord} emits (INV-QD-902).
 *
 * **The seam for the wire's shape.** How the outcome is carried, the
 * refusal of a record naming neither outcome or both (tickets 96 and 155,
 * CCR-QD-904) and any future version handling live behind this function, so no adapter observes them and a change
 * to them is an edit to this module alone.
 *
 * The depth guard is `DecodeDepthGuard.ts`'s, shared with `Policy.ts`'s own
 * untrusted entry points: `SinkRecordWire` embeds `Policy` and the
 * self-recursive `TraceSchema`, neither bounded on its own, and without the
 * guard `Schema`'s descent raised a raw `RangeError` on a payload nested about
 * 60,000 levels deep. The decode options are `Policy.ts`'s too (CCR-QD-139), so
 * a typo'd field inside the embedded policy fails rather than decoding with
 * the grant silently dropped.
 *
 * No `Result.try` around the decode: the depth guard is what makes it safe, and
 * a throw past it would be a library defect that should stay visible.
 */
export const decodeSinkRecord = (input: unknown): Result.Result<SinkRecord, SinkRecordNotDecodable> => {
  if (exceedsJsonDepth(input, MAX_DECODE_DEPTH)) {
    return notDecodable(DecodeRefusal.TooDeep({ maxDepth: MAX_DECODE_DEPTH }));
  }
  const wire = decodeWire(input);
  if (Result.isFailure(wire)) return notDecodable(DecodeRefusal.Malformed({ message: wire.failure.message }));
  // Unreachable after the schema's `exactlyOneOutcome` check; the predicate
  // is what narrows the type for `rebuild`, and its refusal says the same.
  if (!isExclusive(wire.success)) {
    return notDecodable(DecodeRefusal.Malformed({ message: "a decision record names no outcome, or both" }));
  }
  return Result.succeed(rebuild(wire.success));
};

/**
 * JSON text as a record, or the reason it is not one: `NotJson` when the text
 * does not parse, otherwise whatever {@link decodeSinkRecord} says. Never
 * throws (INV-QD-903).
 */
export const decodeSinkRecordString = (text: string): Result.Result<SinkRecord, SinkRecordNotDecodable> => {
  const parsed = Result.try((): unknown => JSON.parse(text));
  return Result.isFailure(parsed) ? notDecodable(DecodeRefusal.NotJson()) : decodeSinkRecord(parsed.success);
};
