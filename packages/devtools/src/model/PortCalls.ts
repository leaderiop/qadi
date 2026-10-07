/**
 * The port calls an evaluation made, read out of its spans.
 *
 * `portActivity` counts calls per port and can say nothing else: `PortMetrics.ts`
 * keys its frequencies on the **port name** — `portCallsTotal`'s five closed
 * values — precisely for cardinality, so an attribute name could never live
 * there. Its doc comment also rejects the other obvious reader, a per-call
 * sink, because that "would put a write on the evaluation's hot path for a
 * debug view".
 *
 * A collecting tracer answers both objections. The span already exists and is
 * already annotated ([BEH-QD-227](../../../../spec/behaviors/30-port-calls.md)),
 * so keeping the object adds nothing to the hot path; and it is a layer the host
 * opts into rather than a cost core always pays. The pattern is not new here —
 * `packages/core/test/Evaluate.test.ts` has substituted `Tracer.Tracer` to
 * assert on spans since URS-QD-012; this promotes that fixture into a capability.
 *
 * **It wraps rather than replaces.** `Tracer.Tracer` is a `Context.Reference`
 * with a default, so a host that has wired its own tracer has one in scope — and
 * a devtools panel that shadowed it would silently turn off an application's
 * tracing for as long as the dock was mounted. The layer reads the tracer that
 * was there, delegates every span to it, and records only the five it cares
 * about.
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Tracer from "effect/Tracer";
import { decodePortSpan, forEveryPort, PORTS } from "@qadi/core";
import type { DescriptionOf, PortInterpreter, PortName, PortSpanName, PortSpanRowOf } from "@qadi/core";

/** The five ports an evaluation can touch, named as `wiringReport` names them. */
export type PortCallPort = PortCall["_tag"];

/**
 * Which span belongs to which port, read from the descriptions.
 *
 * One map rather than a list and a chain of name tests: deciding what to *keep*
 * and deciding how to *decode* used to be separate, and the pair could disagree.
 * Both now start from the span's port, and the decode table below is indexed by
 * `PortName`, so a sixth port without a row is a compile error rather than a
 * blank one.
 */
const PORT_BY_SPAN: ReadonlyMap<string, PortName> = new Map(
  forEveryPort((d): readonly [PortSpanName, PortName] => [d.span, d.port]),
);

/**
 * Which interpreter made a call — `qadi.interpreter` on the span, a closed pair.
 *
 * `undefined` is "not recorded", the same reading every other field here has:
 * an older `@qadi/core` that does not annotate the span, or a value outside the
 * pair, is not guessed at.
 */
export type PortCallInterpreter = PortInterpreter;

/** What every row carries, whatever the port asked. */
interface PortCallBase {
  /** The span this row was read from. */
  readonly span: string;
  /** When the call started, in epoch millis — the same clock `DecisionRecord.at` uses. */
  readonly at: number;
  /**
   * How long the call took.
   *
   * **Absent while the call is still in flight**, never zero: a zero duration is
   * a call that finished instantly, and reporting an unfinished one that way
   * would invent the one number a reader is looking at this table for.
   */
  readonly durationMillis: number | undefined;
}

/**
 * One port's row: what every call carries, plus the fields its description
 * states (`PortDescription.attributes`, BEH-QD-228).
 *
 * The per-port fields are the description's — `subjectId`, `interpreter` (both
 * recorded on every span, and when the evaluator or `toPredicate` asked), the
 * question's own, the answer's, and `attempts` when a retrying wrapper ran. Each
 * is absent when the span did not record it or recorded something of another
 * type: a wrong-typed value reads the same as a missing one, because coercing it
 * would put a number's `String()` where a name belongs.
 */
export type PortCallOf<K extends PortName> = PortCallBase & {
  readonly _tag: K;
} & PortSpanRowOf<DescriptionOf<K>>;

/**
 * An attribute resolution.
 *
 * `resolved` says a value came back. **Never what it was**
 * ([INV-QD-044](../../../../spec/invariants.md)) — the value is arbitrary data
 * and this row is read in a panel and, upstream of it, in whatever tracing
 * backend the host wired.
 */
export type AttributeCall = PortCallOf<"AttributeResolver">;

/** A `HasActed`/`HasNotActed` read. `resourceId` is absent for an `Any`-scoped question. */
export type ActedCall = PortCallOf<"DecisionHistory">;

/** A `HasRelationship` read. */
export type RelationshipCall = PortCallOf<"RelationshipResolver">;

/**
 * A `HasCustom` node's registered predicate.
 *
 * `answer` is a plain boolean, unlike the three-valued history/relationship
 * answers — there is no "unwired" case to distinguish here, since an unwired
 * registry already denies through `CustomPredicateNone` rather than answering
 * a closed third value.
 */
export type CustomPredicateCall = PortCallOf<"CustomPredicate">;

/**
 * A `HasSignature` node's lookup. `matched` is a plain boolean, the same shape
 * `CustomPredicateCall.answer` is and for the same reason — no three-valued
 * "unwired" case, since an unwired history already denies through
 * `SignatureHistoryNone` rather than answering a closed third value. `scope`
 * and `resourceId` say whether the lookup was about one resource or any.
 */
export type SignatureHistoryCall = PortCallOf<"SignatureHistory">;

/**
 * One row per port call.
 *
 * A union rather than a flat row with an `asked` string, because the five ports
 * genuinely ask different questions: a scope and a depth have nowhere to live in
 * a shape built for the union of their names.
 */
export type PortCall =
  | AttributeCall
  | ActedCall
  | RelationshipCall
  | CustomPredicateCall
  | SignatureHistoryCall;

export interface PortCallLog {
  /**
   * The calls, oldest first, in the order they **started**.
   *
   * Start order rather than completion order, and the difference shows up under
   * concurrent evaluation. Start order never reorders a row that is already on
   * screen, and it leaves an in-flight call where the reader last saw it —
   * completion order would have to either hold such a row back or move it later.
   */
  readonly calls: ReadonlyArray<PortCall>;
  /** Calls the capacity pushed out. Stated, because a full ring looks like a quiet one. */
  readonly dropped: number;
  readonly capacity: number;
}

/**
 * How many calls a collector keeps.
 *
 * Bounded for the reason the timeline is: this runs for as long as a page is
 * open, and a policy evaluated per render makes a call per render. The number is
 * smaller than the timeline's because a row here is one lookup rather than one
 * decision, and a reader scanning for "did my store get asked" needs the recent
 * ones rather than all of them.
 */
export const DEFAULT_PORT_CALL_CAPACITY = 200;

export interface PortCallCollector {
  /**
   * Provide this anywhere the evaluations to be watched will run.
   *
   * `Layer<never>` and not `Layer<Tracer.Tracer>`: `Tracer.Tracer` is a
   * `Context.Reference` with a default, so it is never an unmet requirement and
   * supplying one adds nothing to anybody's `R`. What this layer does is
   * *override* the reference for the effects beneath it — which is also why it
   * has to delegate rather than discard.
   */
  readonly layer: Layer.Layer<never>;
  readonly snapshot: Effect.Effect<PortCallLog>;
}

/**
 * A tracer that records the five port spans and passes everything through.
 *
 * State lives in this function's closure rather than the layer's, so `snapshot`
 * can read what the layer wrote — the arrangement a decision log and
 * `capturing` both use, and the reason providing the returned layer twice shares
 * one log.
 */
export const collectPortCalls = (options?: {
  readonly capacity?: number;
}): PortCallCollector => {
  const capacity = options?.capacity ?? DEFAULT_PORT_CALL_CAPACITY;
  if (!Number.isInteger(capacity) || capacity < 0) {
    throw new Error(
      `collectPortCalls: capacity must be a non-negative integer, got ${String(capacity)}`,
    );
  }

  // The port is carried beside the span rather than re-derived at read time.
  // `span.name` is a bare `string`, so reading it back would need a second
  // lookup whose failing branch nothing could ever reach.
  const kept: Array<{ readonly span: Tracer.Span; readonly port: PortName }> = [];
  let dropped = 0;

  const layer = Layer.effect(
    Tracer.Tracer,
    Effect.gen(function* () {
      // The tracer that was already there. Read before this layer supplies its
      // own, so what comes back is the host's rather than this one.
      const inner = yield* Tracer.Tracer;
      return Tracer.make({
        span: (spanOptions) => {
          const span = inner.span(spanOptions);
          const port = PORT_BY_SPAN.get(spanOptions.name);
          if (port !== undefined) {
            // The span object is mutable and outlives this call — its
            // attributes are annotated and its status ends afterwards — so
            // holding it is how a row reads its own final state.
            kept.push({ span, port });
            while (kept.length > capacity) {
              kept.shift();
              dropped += 1;
            }
          }
          return span;
        },
      });
    }),
  );

  return {
    layer,
    snapshot: Effect.sync(() => ({
      calls: kept.map((one) => ROWS[one.port](one.span)),
      dropped,
      capacity,
    })),
  };
};

/** What every row carries, read off the span itself. */
const baseOf = (span: Tracer.Span): PortCallBase => ({
  span: span.name,
  at: Number(span.status.startTime / 1_000_000n),
  durationMillis: durationOf(span),
});

/**
 * One span as a row, per port.
 *
 * A mapped type over `PortName`, so a port without a line here is a compile
 * error; and no key appears — each field is read through the port's own
 * description (`decodePortSpan`), the one statement of what its span says.
 * Built once, and indexed rather than matched: this runs once per span read out
 * of the collector's bounded log, not on an evaluation's hot path.
 */
const ROWS: { readonly [K in PortName]: (span: Tracer.Span) => PortCallOf<K> } = {
  AttributeResolver: (span) => ({
    ...baseOf(span),
    _tag: "AttributeResolver",
    ...decodePortSpan(PORTS.AttributeResolver, span.attributes),
  }),
  DecisionHistory: (span) => ({
    ...baseOf(span),
    _tag: "DecisionHistory",
    ...decodePortSpan(PORTS.DecisionHistory, span.attributes),
  }),
  RelationshipResolver: (span) => ({
    ...baseOf(span),
    _tag: "RelationshipResolver",
    ...decodePortSpan(PORTS.RelationshipResolver, span.attributes),
  }),
  CustomPredicate: (span) => ({
    ...baseOf(span),
    _tag: "CustomPredicate",
    ...decodePortSpan(PORTS.CustomPredicate, span.attributes),
  }),
  SignatureHistory: (span) => ({
    ...baseOf(span),
    _tag: "SignatureHistory",
    ...decodePortSpan(PORTS.SignatureHistory, span.attributes),
  }),
};

/** Nanoseconds to milliseconds, and `undefined` while the span is open. */
const durationOf = (span: Tracer.Span): number | undefined =>
  span.status._tag === "Ended"
    ? Number(span.status.endTime - span.status.startTime) / 1_000_000
    : undefined;
