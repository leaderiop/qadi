"use client";
/**
 * Keeps the diagnostics current for as long as a component is mounted.
 *
 * `runDiagnostics` forked on mount and interrupted on unmount, read through
 * `useSyncExternalStore`, and nothing else: the cadence, the identity rule and
 * the layer's lifetime are the model's (`model/DiagnosticsStore.ts`), the way
 * `useTimeline` leaves the timeline to `TimelineStore`. This file is tested for
 * the three things only React can get wrong: starting on mount, stopping on
 * unmount, and not restarting on a re-render that changed nothing.
 */
import * as Schedule from "effect/Schedule";
import { useState } from "react";
import {
  DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS,
  makeDiagnosticsStore,
  noDiagnostics,
  runDiagnostics,
  type Diagnostics,
} from "../model/DiagnosticsStore.ts";
import type { DiagnosticsDockOptions } from "../model/DiagnosticsFeed.ts";
import { useRunningStore } from "./useRunningStore.ts";

export type { DiagnosticsDockOptions } from "../model/DiagnosticsFeed.ts";

/**
 * Samples the diagnostics while mounted, and returns the latest reading.
 *
 * With `options` absent nothing runs and the reading is `noDiagnostics`: a hook
 * that sampled by default would give every mounted dock a fiber it never asked
 * for. `{}` is the one-token opt-in for the metric reads.
 *
 * **The run restarts when one of the four fields changes identity, never when
 * the `options` object does**, so an inline literal does not tear the layer
 * down on every render. Hold the fields at module scope, or in a `useMemo`, as
 * `useTimeline` asks of a source.
 */
export const useDiagnostics = (options?: DiagnosticsDockOptions): Diagnostics => {
  const [store] = useState(makeDiagnosticsStore);
  const layer = options?.layer;
  const collector = options?.collector;
  const questions = options?.questions;
  const intervalMillis = options?.intervalMillis;

  const run =
    options === undefined
      ? undefined
      : runDiagnostics(store, {
          ...(layer === undefined ? {} : { layer }),
          ...(collector === undefined ? {} : { collector }),
          ...(questions === undefined ? {} : { questions }),
          schedule: Schedule.spaced(intervalMillis ?? DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS),
        });

  const reading = useRunningStore(store, run, [
    options === undefined,
    layer,
    collector,
    questions,
    intervalMillis,
  ]);
  return options === undefined ? noDiagnostics : reading;
};
