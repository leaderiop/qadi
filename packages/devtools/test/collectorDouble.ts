/**
 * A port-call collector whose snapshot counts its calls and answers by script.
 *
 * The diagnostics poll's tests used a questions thunk for a probe: it counted the
 * samples, scripted what each one saw and, by throwing, stopped the run. ADR-QD-169 takes
 * the thunk out of the poll, so the probe is a collector, the poll's other host-supplied
 * read. A script that throws is a defect in the sample, like the thunk's, and the
 * call count is the same count of samples.
 *
 * `script` is given the 1-based call number and answers that sample's log; the default
 * answers an empty log every time.
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { PortCallCollector, PortCallLog } from "../src/index.ts";

const emptyLog: PortCallLog = { calls: [], dropped: 0, capacity: 10 };

export const makeCollectorDouble = (
  script: (call: number) => PortCallLog = () => emptyLog,
): {
  readonly state: { calls: number };
  readonly collector: PortCallCollector;
} => {
  const state = { calls: 0 };
  return {
    state,
    collector: {
      layer: Layer.empty,
      snapshot: Effect.sync(() => {
        state.calls += 1;
        return script(state.calls);
      }),
    },
  };
};
