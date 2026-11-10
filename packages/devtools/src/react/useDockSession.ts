"use client";
/**
 * The React adapter for the dock's own session: which screen, which filters,
 * which row.
 *
 * It subscribes and dispatches and decides nothing: pairing, filtering,
 * counting, selecting and replaying are `DockSession`'s, tested without
 * rendering. It is `useExplorerSession.ts`'s relationship to `ExplorerSession`,
 * one level up, and package-private for the same reason (ADR-QD-099).
 */
import { useLayoutEffect, useState } from "react";
import { makeDockSession, type DockSession, type DockSnapshot } from "../model/DockSession.ts";
import type { Timeline, TimelineEntry } from "../model/Timeline.ts";
import { useRunningStore } from "./useRunningStore.ts";

/**
 * Creates the dock's session, with the simulation as its replay target, and
 * keeps it in step with the timeline.
 *
 * The first timeline is the session's initial state, and later ones are
 * dispatched from a layout effect, before the browser paints. The simulation is
 * read once: the dock owns it for as long as it owns this session.
 */
export const useOwnedDockSession = (
  timeline: Timeline,
  simulation: { readonly replay: (entry: TimelineEntry) => void },
): DockSession => {
  const [session] = useState(() => makeDockSession({ timeline, simulation }));
  useLayoutEffect(() => session.setTimeline(timeline), [session, timeline]);
  return session;
};

/** Reads a session the caller owns. */
export const useDockSnapshot = (session: DockSession): DockSnapshot =>
  useRunningStore(session, undefined, [session]);
