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
 * casts. The wire-crossing `EvaluationError` tags are `Schema.TaggedError` classes
 * ([AGENTS.md §4](../../../AGENTS.md),
 * [ADR-QD-060](../../../spec/decisions/060-schema-taggederror-for-the-nine-wire-crossing-errors.md)),
 * so the class already *is* the wire schema of an error.
 *
 * **The seam for the wire's shape.** How the outcome is carried and the wire
 * version check live behind `decodeSinkRecord`, so they change in this module
 * and nowhere else. One version is read and written: version 2 (ADR-QD-096;
 * the version-1 reader was removed in 0.11.0).
 *
 * **A stored record's envelope** ({@link StoredRecordJson}, ARCH-11). A decision
 * log's reader — `/__decisions`'s frames, `/__decisions/backlog`'s elements —
 * needs the producer's environment too, which a `SinkRecord` deliberately does
 * not carry. It travels in `{ environment, record }`, built by the same
 * pipeline: {@link encodeStoredRecord} is {@link encodeSinkRecord} plus the
 * label, and {@link decodeStoredRecord} reads the envelope and hands `record` to
 * {@link decodeSinkRecord}, so the version check, the depth guard and the
 * strict decode apply unchanged. Forwarding and audit never see the envelope.
 */
import * as Match from "effect/Match";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";
import type { DecisionDisagreement, Trace } from "./Decision.ts";
import type { DecisionOutcome, SinkRecord, StoredRecord } from "./DecisionRecord.ts";
import { Decided, DecisionRecord, Failed, ObligationRecord, stampRecord } from "./DecisionRecord.ts";
import { DecisionWire, decodeDecision, encodeDecision } from "./DecisionWire.ts";
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
  SinkRecordNotDecodable,
  SinkRecordNotEncodable,
} from "./Errors.ts";
import { Policy, policyDepth } from "./Policy.ts";
import { wireHazard } from "./JsonHazard.ts";
import { EncodeRefusal } from "./JsonRefusal.ts";
import { isPlainObject } from "./JsonShape.ts";
import {
  DECISION_RECORD_TAG,
  decisionRecordFields,
  OBLIGATION_RECORD_TAG,
  obligationRecordFields,
} from "./SinkRecordFields.ts";
import { DecodeRefusal, WIRE_VERSIONS } from "./SinkWire.ts";
import type { WireVersion } from "./SinkWire.ts";
import { MAX_DECODE_DEPTH, untrustedDecoder } from "./UntrustedDecode.ts";
import type { UntrustedRefusal } from "./UntrustedDecode.ts";

/**
 * An `EvaluationError` on the wire — the union of the wire-crossing
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

// ---------------------------------------------------------------------------
// Version 2 (ADR-QD-096) — the only version read or written since 0.11.0
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

/**
 * A version-2 decision's fields, in the order they are written: the envelope
 * `_tag` and `version`, the record's own fields (`SinkRecordFields.ts`, which also
 * documents `at`'s finiteness) and the outcome as the wire carries it.
 */
const decisionV2Fields = {
  _tag: Schema.Literal(DECISION_RECORD_TAG),
  version: Schema.Literal(2),
  ...decisionRecordFields.fields,
  outcome: OutcomeWire,
};

/** A version-2 obligation record's fields, in the order they are written. */
const obligationsV2Fields = {
  _tag: Schema.Literal(OBLIGATION_RECORD_TAG),
  version: Schema.Literal(2),
  ...obligationRecordFields.fields,
};

/**
 * The wire form of a {@link SinkRecord}, version 2: the one wire type.
 *
 * Module-private: callers see only `SinkRecordJson`, its encoded side, and the
 * four operations. Version 2 is the only version this module reads or writes
 * (ADR-QD-096's 2026-10-06 amendment): the version-1 reader, which upgraded
 * pre-0.10 bytes into this type, was removed in 0.11.0.
 */
const SinkRecordWire = Schema.Union([
  Schema.Struct(decisionV2Fields),
  Schema.Struct(obligationsV2Fields),
]);

type SinkRecordWire = typeof SinkRecordWire.Type;

/**
 * Each member's declared top-level keys, read from the schema's own fields so
 * they cannot drift from it: the envelope {@link envelopeOf} keeps.
 */
const DECISION_KEYS: ReadonlySet<string> = new Set(Object.keys(decisionV2Fields));
const OBLIGATIONS_KEYS: ReadonlySet<string> = new Set(Object.keys(obligationsV2Fields));

/** A record's outcome as the wire carries it. */
const outcomeOf: (outcome: DecisionOutcome) => OutcomeWire = Match.type<DecisionOutcome>().pipe(
  Match.tagsExhaustive({
    Decided: (outcome) => ({ _tag: "Decided" as const, decision: encodeDecision(outcome.decision) }),
    Failed: (outcome) => ({ _tag: "Failed" as const, error: outcome.error }),
  }),
);

/**
 * Deletes from `fresh` its own keys whose value is `undefined`, and returns it.
 *
 * The wire never carried such a key (a property whose value is `undefined`
 * crosses as absent), and a `Schema.Struct` encode writes one it is handed, so
 * {@link project} drops them here instead of listing the optional fields: the
 * list is `SinkRecordFields.ts`'s, and this names none of it (ARCH-71, ADR-QD-135).
 * **Mutates its argument, so call it only on an object just built** (a spread
 * literal, as {@link project} does): that saves a second copy on a path every
 * sink runs per record. Top level only; a nested `undefined` (inside `resource`)
 * is not touched, as before.
 */
const omitUndefined = <A extends object>(fresh: A): A => {
  for (const key in fresh) {
    if (fresh[key] === undefined) delete fresh[key];
  }
  return fresh;
};

/**
 * The wire projection of a record, ready for the schema encode.
 *
 * Adds `version` and, for a decision, the outcome as the wire carries it; every
 * other field is the record's own, spread whole, so this names no envelope field
 * and a field added to `SinkRecordFields.ts` crosses with no edit here (ARCH-71,
 * ADR-QD-135). The struct's encode writes the keys in its own order and drops any
 * key it does not declare; {@link omitUndefined} leaves out an optional key
 * whose value is `undefined`.
 *
 * `Match.tagsExhaustive` over `SinkRecord`, not a ternary on `record._tag`
 * (issue #109): `SinkRecord` has exactly two tags today, so a ternary reads as
 * exhaustive without being one by construction — a third tag would compile and
 * fall through as though it were the other. Here, a new tag is a compile error.
 */
const project: (record: SinkRecord) => SinkRecordWire = Match.type<SinkRecord>().pipe(
  Match.tagsExhaustive({
    Obligations: (record) => omitUndefined({ ...record, version: 2 as const }),
    Decision: (record) =>
      omitUndefined({ ...record, version: 2 as const, outcome: outcomeOf(record.outcome) }),
  }),
);

/** The record-level facts a decided outcome's decision must agree with. */
interface RecordFacts {
  readonly evaluationId: string;
  readonly subjectId: string;
  readonly policyTag: Policy["_tag"];
}

/**
 * A wire outcome as the record's own classes, or how it contradicts itself.
 *
 * A decided outcome's decision repeats the record's `evaluationId` and
 * `subjectId`, and its trace root names the record's policy; the three are
 * compared before the decision is read, then {@link decodeDecision} checks the
 * decision against its own trace (INV-QD-170). Both facts and checks are
 * `Decision.ts`'s vocabulary ({@link DecisionDisagreement}); this is the one
 * place the record wire raises the record-level three, so no adapter re-checks.
 */
const rebuildOutcome: (
  outcome: OutcomeWire,
) => (facts: RecordFacts) => Result.Result<DecisionOutcome, DecisionDisagreement> =
  Match.type<OutcomeWire>().pipe(
    Match.tagsExhaustive({
      Decided: (outcome) => (facts: RecordFacts): Result.Result<DecisionOutcome, DecisionDisagreement> => {
        const wire = outcome.decision;
        if (wire.evaluationId !== facts.evaluationId) return Result.fail("EvaluationId");
        if (wire.subjectId !== facts.subjectId) return Result.fail("SubjectId");
        if (wire.trace.policyTag !== facts.policyTag) return Result.fail("PolicyTag");
        return Result.map(decodeDecision(wire), (decision) => new Decided({ decision }));
      },
      Failed: (outcome) => (): Result.Result<DecisionOutcome, DecisionDisagreement> =>
        Result.succeed(new Failed({ error: outcome.error })),
    }),
  );

/**
 * Rebuilds a record from an already-validated version-2 wire value.
 *
 * **Not a validating step, and module-private for that reason.** It
 * `Match`-matches an already-typed `SinkRecordWire` into the record classes:
 * strips `version`, runs {@link rebuildOutcome} on a decision's outcome, and
 * constructs with every other field as the schema decoded it, so it names no
 * envelope field (ARCH-71, ADR-QD-135). It does not strip `_tag` (the class
 * sets its own after its arguments) or the wire's `outcome` (the rebuilt one
 * replaces it): stripping either changes no record, only the order of its keys. {@link decodeSinkRecord} runs the
 * depth guard and the untrusted schema decode first. It used to be exported as
 * `fromWireUnsafe`, where a caller who called it on a `JSON.parse` result skipped
 * validation entirely with nothing at the type level to stop it (PH-05).
 *
 * `Match.tagsExhaustive` over `SinkRecordWire`, not an `if (wire._tag === …)`,
 * for the reason {@link project} gives. The outcome is one tagged value and
 * `subjectId` is required, so there is no fallback arm.
 */
const rebuild: (wire: SinkRecordWire) => Result.Result<SinkRecord, DecisionDisagreement> =
  Match.type<SinkRecordWire>().pipe(
    Match.tagsExhaustive({
      Obligations: (wire) =>
        Result.succeed(new ObligationRecord(Struct.omit(wire, ["version"]))),
      Decision: (wire) => {
        const fields = Struct.omit(wire, ["version"]);
        return Result.map(
          rebuildOutcome(wire.outcome)({
            evaluationId: wire.evaluationId,
            subjectId: wire.subjectId,
            policyTag: wire.policy._tag,
          }),
          (outcome) => new DecisionRecord({ ...fields, outcome }),
        );
      },
    }),
  );

/**
 * The encoded form of a record — version-2 bytes: what {@link encodeSinkRecord}
 * writes, what {@link decodeSinkRecord} reads, what an audit row holds and what
 * forwarding's `send` receives.
 *
 * One version, not a union of them (ADR-QD-096's 2026-10-06 amendment). Until
 * 0.11.0 this was `version-2 | version-1`, because a store kept pre-0.10 rows
 * for good; 0.11.0 reads version 2 only, and a version-1 row is re-encoded with
 * 0.10.x before upgrading (the documented migration).
 *
 * Derived from the wire schema (ADR-QD-002), never hand-written:
 * `Schema.toEncoded` gives a schema whose `Type` is the encoded side, so
 * `@qadi/audit` can embed it in its own row schema. Decoding it alone is a
 * description of the bytes, not a reader: use {@link decodeSinkRecord}.
 */
export const SinkRecordJson = Schema.toEncoded(SinkRecordWire);

export type SinkRecordJson = typeof SinkRecordJson.Type;

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

/** The wire schema's encoder, built once. It writes version 2, the one version there is. */
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
 * Written as wire version 2 (ADR-QD-096), which every reader since 0.10.0
 * reads; a reader older than 0.10 reads only version 1 and must upgrade.
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

const notDecodable = (refusal: DecodeRefusal) => Result.fail(new SinkRecordNotDecodable({ refusal }));

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
const envelopeOf = (input: object): unknown => {
  const keys = ownValue(input, "_tag") === "Obligations" ? OBLIGATIONS_KEYS : DECISION_KEYS;
  return Object.fromEntries(Object.entries(input).filter(([key]) => keys.has(key)));
};

/**
 * A decode's result as a record, or the refusal it carries, or `Inconsistent`
 * when the record's copies disagree.
 */
const decoded = (
  wire: Result.Result<SinkRecordWire, DecodeRefusal>,
): Result.Result<SinkRecord, SinkRecordNotDecodable> => {
  if (Result.isFailure(wire)) return notDecodable(wire.failure);
  const record = rebuild(wire.success);
  return Result.isFailure(record)
    ? notDecodable(DecodeRefusal.Inconsistent({ disagreement: record.failure }))
    : Result.succeed(record.success);
};

/** The version this reader reads, as a value to compare a record's `version` with. */
const WIRE_VERSION: WireVersion = 2;

type UnsupportedVersion = Extract<DecodeRefusal, { readonly _tag: "UnsupportedVersion" }>;

/**
 * The decoder's `prepare`: the version check, then the envelope projection.
 *
 * The version is read before the projection so a record of another version is
 * never decoded against this version's keys (ADR-QD-096). `version: 2` is read;
 * any other value, **or none**, is `UnsupportedVersion` rather than `Malformed`
 * (the same convention ADR-QD-078 gives the hydration payload). A value that is
 * not a JSON object passes through unchanged, so the strict decode reports it
 * `Malformed`: it is not a record of any version.
 */
const versionThenEnvelope = (input: unknown): Result.Result<unknown, UnsupportedVersion> => {
  if (!isPlainObject(input)) return Result.succeed(input);
  const version = ownValue(input, "version");
  return version === WIRE_VERSION
    ? Result.succeed(envelopeOf(input))
    : Result.fail(DecodeRefusal.UnsupportedVersion({ version, supported: WIRE_VERSIONS }));
};

/**
 * The untrusted decoder for the wire, built once (ADR-QD-143).
 *
 * `UntrustedDecode.ts` runs the depth guard, then {@link versionThenEnvelope},
 * then the strict decode (a typo'd field inside the embedded policy fails
 * rather than decoding with the grant silently dropped, ADR-QD-002). The
 * decode is handed the {@link envelopeOf} projection, so the one place an
 * unknown key is tolerated is the envelope's top level (GH-01, ADR-QD-096).
 * No `Result.try` around the decode: the guard is what makes it safe, and a
 * throw past it would be a library defect that should stay visible.
 */
const sinkWire = untrustedDecoder(SinkRecordWire, { prepare: versionThenEnvelope });

/** The decoder's refusal in this wire's own vocabulary; `Inconsistent` comes later, from `rebuild`. */
const asDecodeRefusal: (refusal: UntrustedRefusal | UnsupportedVersion) => DecodeRefusal = Match.type<
  UntrustedRefusal | UnsupportedVersion
>().pipe(
  Match.tagsExhaustive({
    NotJson: () => DecodeRefusal.NotJson(),
    TooDeep: ({ maxDepth }) => DecodeRefusal.TooDeep({ maxDepth }),
    Malformed: ({ message }) => DecodeRefusal.Malformed({ message }),
    UnsupportedVersion: (refusal) => refusal,
  }),
);

/**
 * Untrusted input as a record, or the reason it is not one.
 *
 * The depth guard runs first, so the schema's recursion through `Policy` and
 * `Trace` cannot overflow, then the version, then the projection onto the
 * envelope's declared keys, then the strict decode, all inside the decoder
 * ({@link sinkWire}); the result is rebuilt into record classes. A record with
 * no `version` is a pre-0.10 record — wire version 1, whose reader 0.11.0
 * removed (ADR-QD-096's 2026-10-06 amendment) — and is reported as
 * `UnsupportedVersion` with `version: undefined`, never upgraded and never
 * given a fabricated outcome or subject. It accepts whatever
 * {@link encodeSinkRecord} emits (INV-QD-096).
 *
 * **The seam for the wire's shape.** How the outcome is carried and the
 * version dispatch live behind this function, so no adapter observes them and
 * a change to them is an edit to this module alone.
 */
export const decodeSinkRecord = (input: unknown): Result.Result<SinkRecord, SinkRecordNotDecodable> =>
  decoded(Result.mapError(sinkWire.decode(input), asDecodeRefusal));

/**
 * JSON text as a record, or the reason it is not one: `NotJson` when the text
 * does not parse, otherwise whatever {@link decodeSinkRecord} says. Never
 * throws (INV-QD-097).
 */
export const decodeSinkRecordString = (text: string): Result.Result<SinkRecord, SinkRecordNotDecodable> =>
  decoded(Result.mapError(sinkWire.decodeText(text), asDecodeRefusal));

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
 * **Not a decoder of its own.** It reads the envelope with `ownValue` and hands
 * `record` to {@link decodeSinkRecord}, which is guarded; walking the envelope
 * too would refuse a deep unknown envelope key that D-15-c says is ignored.
 *
 * **Only an envelope is read.** A bare record — what a server older than 0.10,
 * which predates the envelope, sends — is refused as `Malformed`, naming
 * itself as bare, so an older server is reported rather than silently
 * mislabelled. 0.10 accepted one under a deprecated `legacyEnvironment` label
 * for one minor (ARCH-11 D-11-e); 0.11.0 removed it (ADR-QD-097's 2026-10-06
 * amendment), and with it the only reason this function took options.
 *
 * The record is rebuilt and stamped here, with `stampRecord`, so the
 * environment is the producer's, never the reader's. Never throws.
 */
export const decodeStoredRecord = (input: unknown): Result.Result<StoredRecord, SinkRecordNotDecodable> => {
  if (!isPlainObject(input)) return notAnEnvelope("a stored record is a JSON object { environment, record }");
  if (!Object.hasOwn(input, "environment") && !Object.hasOwn(input, "record")) {
    return notAnEnvelope("a bare record, not a stored-record envelope { environment, record }");
  }
  const environment = ownValue(input, "environment");
  if (typeof environment !== "string") return notAnEnvelope("a stored record's environment is not a string");
  if (!Object.hasOwn(input, "record")) return notAnEnvelope("a stored record names no record");
  return Result.map(decodeSinkRecord(ownValue(input, "record")), (record) => stampRecord(record, environment));
};

/**
 * JSON text as a stored record, or the reason it is not one: `NotJson` when
 * the text does not parse, otherwise whatever {@link decodeStoredRecord} says.
 */
export const decodeStoredRecordString = (text: string): Result.Result<StoredRecord, SinkRecordNotDecodable> => {
  // Not `decodeText`: the envelope must not be walked, since an unknown envelope key is
  // ignored however deep (ADR-QD-096 D-15-c). `record` is guarded from its own root.
  const parsed = Result.try((): unknown => JSON.parse(text));
  return Result.isFailure(parsed) ? notDecodable(DecodeRefusal.NotJson()) : decodeStoredRecord(parsed.success);
};
