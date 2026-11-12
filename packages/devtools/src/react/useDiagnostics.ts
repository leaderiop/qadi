"use client";
/**
 * The React adapter for the diagnostics feed.
 *
 * It decides nothing: the feed is the one the dock model builds, so there is one
 * poll. The feed lives in a scope the component holds, so unmounting closes it
 * (ADR-QD-137).
 */
import { useLayoutEffect } from "react";
import {
  idleDiagnostics,
  makeDiagnosticsFeed,
  type DiagnosticsDockOptions,
  type DiagnosticsSnapshot,
} from "../model/DiagnosticsFeed.ts";
import { useScoped } from "./useScoped.ts";
import { useStoreSnapshot } from "./useStoreSnapshot.ts";

export type { DiagnosticsDockOptions } from "../model/DiagnosticsFeed.ts";

/**
 * Samples the diagnostics while mounted, and returns the poll's status and its latest reading.
 *
 * With `options` absent nothing runs and the reading is `noDiagnostics`: a hook
 * that sampled by default would give every mounted dock a fiber it never asked
 * for. `{}` is the one-token opt-in for the metric reads.
 *
 * **The run restarts when one of the four fields changes identity, never when
 * the `options` object does**, so an inline literal does not tear the layer
 * down on every render. Hold the fields at module scope, or in a `useMemo`, as
 * `useTimeline` asks of a source.
 *
 * The status is `Off` with no options, `Starting` until the first sample (also on
 * the pass before the feed exists), `Live`, or `Stopped` with the reason and
 * whether a sample was taken, keeping the last reading. Changing a field restarts
 * a stopped sampler. A StrictMode remount or a hidden-then-shown tree starts a
 * fresh run.
 */
export const useDiagnostics = (options?: DiagnosticsDockOptions): DiagnosticsSnapshot => {
  const feed = useScoped(() => makeDiagnosticsFeed(options));

  // The feed compares each field by identity. It runs again on the render the feed
  // appears, so an input changed in between still lands.
  useLayoutEffect(() => {
    if (feed !== undefined) feed.configure(options);
  }, [feed, options]);

  return useStoreSnapshot(feed ?? idleDiagnostics(options));
};
