"use client";
/**
 * The React adapter for the diagnostics feed.
 *
 * It decides nothing: the feed is the one the dock model builds, so there is one
 * poll. The feed lives in a scope the component holds, so unmounting closes it
 * (ADR-QD-137).
 */
import {
  idleDiagnostics,
  makeDiagnosticsFeed,
  type DiagnosticsFeed,
  type DiagnosticsSnapshot,
} from "../model/DiagnosticsFeed.ts";
import type { DiagnosticsOptions } from "../model/DiagnosticsStore.ts";
import { useConfigured } from "./useConfigured.ts";
import { useStoreSnapshot } from "./useStoreSnapshot.ts";

const configureDiagnostics = (feed: DiagnosticsFeed, options: DiagnosticsOptions | undefined): void => {
  feed.configure(options);
};

/**
 * Samples the diagnostics while mounted, and returns the poll's status and its latest reading.
 *
 * With `options` absent nothing runs, the status is `Off` and the reading is empty: a
 * hook that sampled by default would give every mounted dock a fiber it never asked
 * for. `{}` is the one-token opt-in for the metric reads.
 *
 * **The run restarts when one of the three fields (`layer`, `collector`,
 * `intervalMillis`) changes identity, never when the `options` object does**, so
 * an inline literal does not tear the layer down on every render. Hold the fields at module scope, or in a `useMemo`, as
 * `useTimeline` asks of a source.
 *
 * The status is `Off` with no options, `Starting` until the first sample (also on
 * the pass before the feed exists), `Live`, or `Stopped` with the reason and
 * whether a sample was taken, keeping the last reading. Changing a field restarts
 * a stopped sampler. A StrictMode remount or a hidden-then-shown tree starts a
 * fresh run.
 */
export const useDiagnostics = (options?: DiagnosticsOptions): DiagnosticsSnapshot => {
  // The feed compares each field by identity, so an `options` object rebuilt every render
  // configures nothing.
  const feed = useConfigured(makeDiagnosticsFeed, configureDiagnostics, options);

  return useStoreSnapshot(feed ?? idleDiagnostics(options));
};
