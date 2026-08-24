/**
 * The port calls an evaluation made, read out of its spans.
 *
 * `portActivity` counts calls per port and can say nothing else: `PortMetrics.ts`
 * keys its frequencies on the **port name** — three closed values — precisely
 * for cardinality, so an attribute name could never live there. Its doc comment
 * also rejects the other obvious reader, a per-call sink, because that "would
 * put a write on the evaluation's hot path for a debug view".
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
 * was there, delegates every span to it, and records only the three it cares
 * about.
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Tracer from "effect/Tracer";

/** The three ports an evaluation can touch, named as `wiringReport` names them. */
export type PortCallPort = PortCall["_tag"];

/**
 * The spans this collector keeps, as a closed union.
 *
 * One list rather than two. Deciding what to *keep* and deciding how to *decode*
 * used to be separate — a lookup at collection time and a chain of name tests at
 * read time — and the pair could disagree: a name added to the lookup without an
 * arm to decode it produced a row with every field blank, and the guard that was
 * supposed to catch that could never fire, because nothing else could reach it.
 * Narrowing the name once makes `rowOf` exhaustive, so a fourth span is a
 * compile error rather than a blank row.
 */
const PORT_SPANS = ["qadi.attribute", "qadi.acted", "qadi.hasRelationship"] as const;

type PortSpan = (typeof PORT_SPANS)[number];

const isPortSpan = (name: string): name is PortSpan =>
  PORT_SPANS.some((one) => one === name);

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
  /** Absent when the span did not record it. */
  readonly subjectId: string | undefined;
}

/**
 * An attribute resolution.
 *
 * `resolved` says a value came back. **Never what it was**
 * ([INV-QD-044](../../../../spec/invariants.md)) — the value is arbitrary data
 * and this row is read in a panel and, upstream of it, in whatever tracing
 * backend the host wired.
 */
export interface AttributeCall extends PortCallBase {
  readonly _tag: "AttributeResolver";
  readonly attribute: string | undefined;
  readonly resolved: boolean | undefined;
}

export interface ActedCall extends PortCallBase {
  readonly _tag: "DecisionHistory";
  readonly event: string | undefined;
  readonly scope: string | undefined;
  /** Absent for an `Any`-scoped question, which asks about no resource at all. */
  readonly resourceId: string | undefined;
  readonly answer: string | undefined;
}

export interface RelationshipCall extends PortCallBase {
  readonly _tag: "RelationshipResolver";
  readonly relation: string | undefined;
  readonly resourceId: string | undefined;
  readonly depth: number | undefined;
  readonly answer: string | undefined;
}

/**
 * One row per port call.
 *
 * A union rather than a flat row with an `asked` string, because the three ports
 * genuinely ask different questions: a scope and a depth have nowhere to live in
 * a shape built for the union of their names.
 */
export type PortCall = AttributeCall | ActedCall | RelationshipCall;

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
 * A tracer that records the three port spans and passes everything through.
 *
 * State lives in this function's closure rather than the layer's, so `snapshot`
 * can read what the layer wrote — the arrangement `decisionSinkRing` and
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

  // The narrowed name is carried beside the span rather than re-derived at read
  // time. `span.name` is a bare `string`, so reading it back would need a second
  // `isPortSpan` whose failing branch nothing could ever reach.
  const kept: Array<{ readonly span: Tracer.Span; readonly name: PortSpan }> = [];
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
          if (isPortSpan(spanOptions.name)) {
            // The span object is mutable and outlives this call — its
            // attributes are annotated and its status ends afterwards — so
            // holding it is how a row reads its own final state.
            kept.push({ span, name: spanOptions.name });
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
      calls: kept.map((one) => rowOf(one.span, one.name)),
      dropped,
      capacity,
    })),
  };
};

/**
 * One span as a row.
 *
 * Total over `PortSpan`, so adding a fourth name to `PORT_SPANS` without an arm
 * here does not compile — the `never` assignment below is what makes that true,
 * and it is free at runtime (the shape AGENTS.md §5a prescribes for the two
 * switches whose return type could otherwise absorb `undefined`).
 */
const rowOf = (span: Tracer.Span, name: PortSpan): PortCall => {
  const base = {
    span: span.name,
    at: Number(span.status.startTime / 1_000_000n),
    durationMillis: durationOf(span),
    subjectId: stringAt(span, "qadi.subject_id"),
  };

  if (name === "qadi.attribute") {
    return {
      ...base,
      _tag: "AttributeResolver",
      attribute: stringAt(span, "qadi.attribute"),
      resolved: booleanAt(span, "qadi.resolved"),
    };
  }
  if (name === "qadi.acted") {
    return {
      ...base,
      _tag: "DecisionHistory",
      event: stringAt(span, "qadi.event"),
      scope: stringAt(span, "qadi.scope"),
      resourceId: stringAt(span, "qadi.resource_id"),
      answer: stringAt(span, "qadi.answer"),
    };
  }
  const exhaustive: "qadi.hasRelationship" = name;
  return {
    ...base,
    span: exhaustive,
    _tag: "RelationshipResolver",
    relation: stringAt(span, "qadi.relation"),
    resourceId: stringAt(span, "qadi.resource_id"),
    depth: numberAt(span, "qadi.depth"),
    answer: stringAt(span, "qadi.answer"),
  };
};

/** Nanoseconds to milliseconds, and `undefined` while the span is open. */
const durationOf = (span: Tracer.Span): number | undefined =>
  span.status._tag === "Ended"
    ? Number(span.status.endTime - span.status.startTime) / 1_000_000
    : undefined;

/**
 * A span attribute is `unknown`, so every read is a check.
 *
 * A wrong-typed value reads the same as an absent one — `undefined`, which the
 * panel renders as *not recorded*. Coercing it instead would put a number's
 * `String()` where a name belongs and give a reader something to chase.
 */
const stringAt = (span: Tracer.Span, key: string): string | undefined => {
  const value = span.attributes.get(key);
  return typeof value === "string" ? value : undefined;
};

const numberAt = (span: Tracer.Span, key: string): number | undefined => {
  const value = span.attributes.get(key);
  return typeof value === "number" ? value : undefined;
};

const booleanAt = (span: Tracer.Span, key: string): boolean | undefined => {
  const value = span.attributes.get(key);
  return typeof value === "boolean" ? value : undefined;
};
