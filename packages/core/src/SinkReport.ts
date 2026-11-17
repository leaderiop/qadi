/**
 * How a contained decision-sink failure is reported: one warning, naming the sink.
 *
 * Internal (not in the barrel). The emitter (`SinkEmit.ts`) and `decisionSinkAll`'s
 * member report (`DecisionSinkForwarding.ts`) each contain a failure and each say so,
 * with their own message; the keys they annotate, and the containment of the report
 * itself, are written here once, so the two lines cannot drift apart (ADR-QD-159,
 * INV-QD-337, INV-QD-338).
 */
import type * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import type { SinkRecord } from "./DecisionRecord.ts";
import type { DecisionSinkShape } from "./DecisionSink.ts";

const UNNAMED = "unnamed";
const UNKNOWN = "unknown";

/**
 * The name a report gives a sink: its own `name`, or `unnamed`.
 *
 * Read when a failure is reported, never when the emitter is built, and guarded
 * because `name` may be a getter in a caller's code. `??`, not `||`: an empty name
 * is one the sink chose.
 */
export const sinkName = (shape: DecisionSinkShape): Effect.Effect<string> =>
  Effect.sync(() => shape.name ?? UNNAMED).pipe(Effect.catchCause(() => Effect.succeed(UNNAMED)));

/**
 * The two fields of a record a report names, read before the sink sees it.
 *
 * `string`, not the record's own types: a record whose fields cannot be read is
 * reported as `unknown` rather than not at all (INV-QD-337).
 */
export interface HandedOver {
  readonly _tag: string;
  readonly evaluationId: string;
}

/**
 * Reads what a report will name from `record`, contained.
 *
 * The record is the same mutable object the sink is handed, so a sink that
 * redefines a field and then fails must not take the report with it, nor make
 * the report name an evaluation it did not lose. Read first, so the report
 * describes what was handed over; a getter that throws gives `unknown`.
 */
export const handedOver = (record: SinkRecord): HandedOver => {
  try {
    return { _tag: record._tag, evaluationId: record.evaluationId };
  } catch {
    return { _tag: UNKNOWN, evaluationId: UNKNOWN };
  }
};

/**
 * Reports one contained sink failure as one warning, `message`, annotated with
 * exactly four keys: `qadi.sink`, `qadi.record_tag`, `evaluationId`, `qadi.cause`.
 *
 * Built lazily and contained because a throwing logger, name getter or cause
 * rendering must not turn an observer's failure into a defect (INV-QD-035); the
 * rendering runs inside that containment, so it is one whether or not `String(cause)`
 * can throw. Never a subject, resource, policy or action. A plain function, not a
 * traced one: it runs only on a failure.
 */
export const reportSinkFailure = (
  message: string,
  shape: DecisionSinkShape,
  handed: HandedOver,
  cause: Cause.Cause<unknown>,
): Effect.Effect<void> =>
  Effect.suspend(() =>
    sinkName(shape).pipe(
      Effect.flatMap((name) =>
        Effect.logWarning(message).pipe(
          Effect.annotateLogs({
            "qadi.sink": name,
            "qadi.record_tag": handed._tag,
            evaluationId: handed.evaluationId,
            "qadi.cause": String(cause),
          }),
        ),
      ),
    ),
  ).pipe(Effect.catchCause(() => Effect.void));
