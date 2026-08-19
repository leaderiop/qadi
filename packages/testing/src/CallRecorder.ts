/**
 * A synchronously-readable log of calls a test fixture received.
 *
 * `recordingAttributeResolver`, `edgeRelationshipResolver`, and
 * `eventDecisionHistory` each independently held their own `Array<string>`
 * and pushed into it — three copies of the identical pattern, and a mutable
 * array is also the wrong shape for what `effect/Array`'s idiom already
 * provides: growing a collection by replacing it with a new one, not
 * mutating the one a caller might be holding a reference to. `MutableRef`
 * holds that replacement without needing an `Effect` on either side of the
 * boundary — `record` is called from inside an already-`Effect.sync`-wrapped
 * resolver body, and `calls` is read directly by test assertions outside any
 * Effect at all.
 */
import * as Arr from "effect/Array";
import * as MutableRef from "effect/MutableRef";

export interface CallRecorder {
  /** Every call recorded so far, in order. Live — reflects `record` calls made after this property is first read. */
  readonly calls: ReadonlyArray<string>;
  readonly record: (entry: string) => void;
}

export const makeCallRecorder = (): CallRecorder => {
  const ref = MutableRef.make<ReadonlyArray<string>>(Arr.empty());
  return {
    get calls() {
      return MutableRef.get(ref);
    },
    record: (entry) => {
      MutableRef.update(ref, (calls) => Arr.append(calls, entry));
    },
  };
};
