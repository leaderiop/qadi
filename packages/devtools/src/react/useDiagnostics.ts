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
import type * as Layer from "effect/Layer";
import * as Schedule from "effect/Schedule";
import { useState } from "react";
import {
  DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS,
  makeDiagnosticsStore,
  noDiagnostics,
  runDiagnostics,
  type Diagnostics,
} from "../model/DiagnosticsStore.ts";
import type { AskedQuestionLike } from "../model/Gates.ts";
import type { PortCallCollector } from "../model/PortCalls.ts";
import { useRunningStore } from "./useRunningStore.ts";

/**
 * What a host hands over to have its diagnostics sampled: things it already
 * owns, and no Effects.
 *
 * Gates are not here. They are pushed by the host's subscription to
 * `@qadi/react`'s registry and stay a plain prop (AGENTS.md §13).
 */
export interface DiagnosticsDockOptions {
  /**
   * The application's layer, read for the wiring report.
   *
   * Built once while the dock is mounted, and released on unmount. It is its
   * own build, so a service that keeps state in its constructor is shared with
   * the application only if the host shares it by value: build its context once
   * and pass `Layer.succeedContext(context)` here and to the atoms.
   *
   * Typed `Layer<never, unknown>` because `Layer` is contravariant in what it
   * provides: that is the one type every layer is assignable to.
   */
  readonly layer?: Layer.Layer<never, unknown>;
  /** The collector whose `layer` is wired where evaluations run, for the recent port calls. */
  readonly collector?: PortCallCollector;
  /** Where the questions asked so far come from, usually `() => atoms.asked()`. */
  readonly questions?: () => ReadonlyArray<AskedQuestionLike>;
  /** How often to sample, in milliseconds. Defaults to `DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS`. */
  readonly intervalMillis?: number;
}

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
