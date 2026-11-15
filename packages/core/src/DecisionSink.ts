/**
 * An optional, write-only port that receives every evaluation as it completes.
 *
 * Read through `Effect.serviceOption`, exactly as `DecisionCache` is
 * (ADR-QD-031), so it contributes **nothing** to `EvaluationServices`: an
 * application that never provides one behaves precisely as it did, at the cost
 * of one option read per evaluation.
 *
 * ADR-QD-009 deleted four bespoke observability ports — `AuditTrailPort`,
 * `QadiEventSink`, `QadiSpanSink` and `QadiInspector` — and that reasoning
 * holds: always-on parallel observability machinery is what it removed. This is
 * not that. It is absent unless wired, it is one method, and it carries the real
 * `Decision` rather than a projection of one. The alternative considered and
 * rejected was enriching span attributes, which cannot work: a `Trace` is a
 * tree, span attributes are flat primitives, and `EvaluationMetrics.ts` already
 * documents a deliberate cardinality objection to keying anything on the denial
 * *reason*.
 *
 * **Write-only by design.** Reading back is a property of an implementation, not
 * of this contract — that is what lets an out-of-process sink serve a replicated
 * or serverless deployment without core learning anything about transports.
 *
 * **One method taking a tagged union**, rather than a method per event. A
 * decision is recorded by `evaluate`; what happened at the obligation gate is
 * known only later, in `Qadi.ts`'s enforcing entry points, after `evaluate` has
 * returned. A second method would make every sink implement two, and a sink
 * wanting both in order would have to re-interleave them. `Match.tagsExhaustive`
 * makes a new tag a compile error at every consumer.
 */
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type { SinkRecord } from "./DecisionRecord.ts";

export interface DecisionSinkShape {
  /**
   * A label a reader sees when this sink's failure is reported; never an input to a decision.
   *
   * A sink with no name is reported as `unnamed`. The name is read only when a
   * failure is reported, never when the emitter is built and never on the
   * success path, so a sink that never fails costs nothing for having one.
   * Nothing branches on it, as with `AttributeResolverShape.name`.
   */
  readonly name?: string | undefined;
  /**
   * Receives one completed evaluation.
   *
   * **The error channel is `never`, and unlike `SubjectExtractorShape.extract` —
   * where `never` was a defect — here it is the point.** An extractor that
   * cannot reach its token store *must* change the answer, so denying it an
   * error channel forced implementors into `Effect.die` or a false `anonymous`.
   * A sink is the opposite: whatever happens to it must never change the
   * decision, so it is handed no way to say otherwise. An implementation that
   * can fail handles its own failure.
   *
   * `never` alone is not sufficient (BEH-QD-175 showed exactly how it gets
   * subverted, by `Effect.die`), so the one emitter contains whatever `record`
   * does: a defect, a throw before it returns an effect, a self-interruption or
   * a failure leaked through a type escape. It reports each once, as a warning
   * naming this sink (ADR-QD-159).
   */
  readonly record: (record: SinkRecord) => Effect.Effect<void>;
}

/**
 * No static method accessors, for the reason `DecisionCache` states: `evaluate`
 * reads this *optionally*, through `Effect.serviceOption`, so it holds the shape
 * directly and never goes through the class. Accessors nothing can call would be
 * convention-shaped dead code.
 */
export class DecisionSink extends Context.Service<DecisionSink, DecisionSinkShape>()(
  "qadi/DecisionSink",
) {}
