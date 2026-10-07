/**
 * Reports a refused record, the same way for every adapter that sends records
 * somewhere.
 *
 * Each adapter keeps its own message and its own hook (ADR-QD-095 D-09-e); this
 * owns the rest: the annotations ({@link encodeRefusalAnnotations}), the choice
 * between the hook and the log, and the containment of a hook that throws. It
 * lives beside, not in, `SinkWire.ts` because that leaf stays free of `Effect`
 * (ADR-QD-037).
 */
import * as Effect from "effect/Effect";
import { encodeRefusalAnnotations } from "./SinkWire.ts";
import type { EncodeRefusal } from "./SinkWire.ts";

/**
 * Calls `options.onRefused` once, or, with none, logs `options.message` as a
 * warning annotated by {@link encodeRefusalAnnotations}.
 *
 * Never fails and never dies: a hook that throws is a caller's bug, and one
 * record's report must not end a feed or fail a decision (INV-QD-035,
 * INV-QD-097). It is logged as "an encode-refusal hook threw" with the same
 * annotations plus `qadi.cause`. Runs only on the refusal branch, so an
 * accepted record pays for no span.
 */
export const reportEncodeRefusal = Effect.fn("qadi.encodeRefusal.report")(function* <
  R extends { readonly refusal: EncodeRefusal; readonly evaluationId: string },
>(
  refusal: R,
  options: {
    readonly message: string;
    readonly onRefused: ((refusal: R) => void) | undefined;
  },
) {
  // Captured once so the narrowing survives the closure below.
  const hook = options.onRefused;
  if (hook === undefined) {
    yield* Effect.logWarning(options.message).pipe(Effect.annotateLogs(encodeRefusalAnnotations(refusal)));
    return;
  }
  yield* Effect.sync(() => hook(refusal)).pipe(
    Effect.catchCause((cause) =>
      Effect.logWarning("qadi: an encode-refusal hook threw").pipe(
        Effect.annotateLogs({ ...encodeRefusalAnnotations(refusal), "qadi.cause": String(cause) }),
      ),
    ),
  );
});
