/**
 * The envelope fields of each sink record, stated once.
 *
 * `DecisionRecord`'s and `ObligationRecord`'s field types and `SinkCodec`'s
 * version-2 wire structs both derive from the two structs below, so a field is
 * added, renamed or retyped in one place (ARCH-71,
 * [ADR-QD-135](../../../spec/decisions/135-sink-record-fields-stated-once.md)).
 * Before, a field was written in five: the record class, the wire struct,
 * `project`, `rebuild` and the brand re-application in `rebuild`, and a field
 * left out of `project` or `rebuild` compiled.
 *
 * Declaration order is the wire's key order (a `Schema.Struct` encode emits keys
 * in field order), so reordering an entry moves the bytes.
 *
 * **Package-private, and imports only `effect/*`, `Policy.ts` and `Identity.ts`**,
 * so `SinkWire.ts` can import the record tags without a cycle (ADR-QD-037, which
 * counts type-only edges): `Errors.ts` imports `SinkWire.ts`, and nothing here
 * reaches `Errors.ts`. Not in the barrel; the record classes and `CacheOutcome`
 * are the public names for what is stated here (ADR-QD-099).
 */
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as SchemaTransformation from "effect/SchemaTransformation";
import { ResourceIdSchema, SubjectIdSchema } from "./Identity.ts";
import { Policy } from "./Policy.ts";

/**
 * An optional field that is absent on the wire when its value is `undefined`.
 *
 * The same `Type` and `Encoded` as `Schema.optional(schema)` (`?: T | undefined`,
 * which is what a record's constructor accepts), but the encode leaves the key
 * out instead of writing it as an own `undefined`-valued key: the wire never
 * carried one (a property whose value is `undefined` crosses as absent), so a
 * projection that spreads the record whole needs no per-field conditional
 * (ARCH-71, ADR-QD-135). Decoding is unchanged.
 */
const optionalAbsent = <S extends Schema.Top>(schema: S) =>
  Schema.optional(schema).pipe(
    Schema.decodeTo(
      Schema.optional(schema),
      SchemaTransformation.transformOptional({
        decode: (input) => input,
        encode: Option.filter((value) => value !== undefined),
      }),
    ),
  );

/** The `_tag` of a `DecisionRecord`. */
export const DECISION_RECORD_TAG = "Decision";

/** The `_tag` of an `ObligationRecord`. */
export const OBLIGATION_RECORD_TAG = "Obligations";

/**
 * What happened at the obligation gate, as a closed set of literals: the type
 * `ObligationOutcome` is, and the wire's own check of it.
 */
export const ObligationOutcomeSchema = Schema.Literals([
  "Discharged",
  "HandlerFailed",
  "Refused",
  "NotRequired",
]);

/**
 * Which of the decision cache's three paths a lookup took: the type
 * `CacheOutcome` is, and the wire's own check of it.
 */
export const CacheOutcomeSchema = Schema.Literals(["hit", "coalesced", "miss"]);

/**
 * A decision record's fields except `outcome`, in the order they are written.
 *
 * `outcome` stays out: in memory it is `Decided | Failed`, on the wire
 * `OutcomeWire`, and `rebuildOutcome` (`SinkCodec.ts`) sits between them
 * (ADR-QD-106), so each side adds its own.
 */
export const decisionRecordFields = Schema.Struct({
  evaluationId: Schema.String,
  /**
   * When evaluation started, in epoch millis, from `Clock`.
   *
   * `Clock` rather than `Date.now()` so records are reproducible under
   * `TestClock` — the same reason durations are (see [Decision.ts](./Decision.ts)).
   * The start rather than the end, so a record's order matches the order the
   * questions were asked; the end is `at + durationMillis` for a `Decided` one.
   *
   * `Schema.Finite` is the inbound twin of `wireHazard`'s `NonFinite` refusal, so
   * a stored `1e400` (which `JSON.parse` reads as `Infinity`) or a `NaN` is
   * `Malformed` rather than a timestamp every reader must distrust.
   */
  at: Schema.Finite,
  /**
   * Who was asking, for both outcomes.
   *
   * `Decided`'s payload already names it on the `Decision` itself, but a
   * `Failed` record previously carried no actor at all — not here, not on any
   * `EvaluationError` member — even though `evaluate` resolves `CurrentSubject`
   * before the code that can fail. A sink watching for who a broken attribute
   * lookup was for had nothing to read. Top-level rather than duplicated onto
   * `Failed` specifically, so a consumer reads one field regardless of outcome.
   */
  subjectId: SubjectIdSchema,
  policy: Policy,
  /**
   * The resource under consideration, if any.
   *
   * **Carried whole, to every sink, with no projection or redaction** —
   * unlike `Decision`'s own `visibleFields` lattice, which exists precisely
   * to gate what a *caller* sees. A sink is a different audience: "a socket
   * to a devtools page, a replica forwarding to a shared store" (`SinkCodec.ts`),
   * and whatever this resource carries — potentially customer data — travels
   * to whatever that sink forwards to, in full. `policy` above discloses
   * every other rule in the deployment for the same reason. Denial reasons
   * (`Walk.ts`'s `attributeReason`) deliberately withhold attribute
   * values by contrast; this field does not have an equivalent restraint.
   * A `DecisionSink` implementation that forwards outside a trust boundary
   * as controlled as the enforcement path itself is the caller's own
   * projection to add — nothing here does it for them.
   */
  resource: optionalAbsent(Schema.Record(Schema.String, Schema.Unknown)),
  /** What the caller was doing, if it said. */
  action: optionalAbsent(Schema.String),
  /**
   * How the decision cache answered, when one was wired.
   *
   * **Absent means no cache was consulted at all**, which is a different fact
   * from `"miss"` — that one says the cache was asked and did not have it. A
   * single optional field keeps the two apart without a third tag.
   *
   * Observability only. A hit still produces the same verdict, trace and fields
   * as a miss ([INV-QD-025](../../../spec/invariants.md)); this reports how the
   * answer was reached, in the same category as `durationMillis`.
   */
  cache: optionalAbsent(CacheOutcomeSchema),
});

/**
 * An obligation record's fields, in the order they are written.
 *
 * The three optional identity keys are the first use of ADR-QD-096's rule for
 * the future: a record written before they existed lacks them, and a reader that
 * does not declare them drops them silently.
 */
export const obligationRecordFields = Schema.Struct({
  /** The decision these duties came from, so the two rows pair. */
  evaluationId: Schema.String,
  at: Schema.Finite,
  outcome: ObligationOutcomeSchema,
  obligationIds: Schema.Array(Schema.String),
  /**
   * Who the allow was decided for, so an obligation row can say whom it
   * concerns without its decision row (an orphan, whose decision never arrived).
   *
   * Identity, not content: the question's subject, action and resource id are
   * here, never the resource itself, which stays on the `DecisionRecord`
   * so customer data is not disclosed twice to every sink. Optional only because
   * a row written before these keys existed lacks them; `discharge` always sets
   * `subjectId`.
   */
  subjectId: optionalAbsent(SubjectIdSchema),
  /** What the caller was doing, when the question said. */
  action: optionalAbsent(Schema.String),
  /** The question's resource id, when its resource had a string `id`. */
  resourceId: optionalAbsent(ResourceIdSchema),
});
