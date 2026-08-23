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
 * tree, span attributes are flat primitives, and `Evaluate.ts` already documents
 * a deliberate cardinality objection to putting even the denial *reason* on a
 * span.
 *
 * **Write-only by design.** Reading back is a property of an implementation, not
 * of this contract — that is what lets an out-of-process sink serve a replicated
 * or serverless deployment without core learning anything about transports.
 */
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type { DecisionRecord } from "./DecisionRecord.ts";

export interface DecisionSinkShape {
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
   * `never` alone is not sufficient — that same finding showed exactly how it
   * gets subverted, by `Effect.die` — so `evaluate` also catches defects at the
   * call site. Both, because one was already proven not to be enough.
   */
  readonly record: (record: DecisionRecord) => Effect.Effect<void>;
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
