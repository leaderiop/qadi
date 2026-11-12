"use client";
/**
 * The React adapters for `SimulationSession`.
 *
 * They subscribe and dispatch and decide nothing: the rules are the session's,
 * which is why this file is short. It is `useTimeline.ts`'s relationship to
 * `TimelineStore`. Nothing here forks a run: the session owns its runs in the
 * scope `useScoped` opens for it, and unmounting closes that scope (ADR-QD-137).
 */
import { useLayoutEffect } from "react";
import type { PolicySighting } from "../model/Catalogue.ts";
import {
  makeSimulationSession,
  type SimulationSession,
  type SimulationSnapshot,
} from "../model/SimulationSession.ts";
import type { EvaluationPortsLayer } from "../model/SimulationInput.ts";
import type { TimelineEntry } from "../model/Timeline.ts";
import { useScoped } from "./useScoped.ts";
import { useStoreSnapshot } from "./useStoreSnapshot.ts";

export interface UseSimulationSessionInput {
  readonly sightings: ReadonlyArray<PolicySighting>;
  readonly seed?: TimelineEntry | undefined;
  readonly ports?: EvaluationPortsLayer | undefined;
}

export interface SimulationSessionView {
  readonly session: SimulationSession;
  readonly snapshot: SimulationSnapshot;
}

/** Reads a session the caller owns: the session, and its snapshot as it changes. */
export const useSimulationSnapshot = (session: SimulationSession): SimulationSessionView => {
  const snapshot = useStoreSnapshot(session);
  return { session, snapshot };
};

const noSubscription = (): (() => void) => () => undefined;

/** A snapshot read that waits for the session: it subscribes to nothing until one exists. */
const useSnapshotOf = (session: SimulationSession | undefined): SimulationSnapshot | undefined => {
  const read = () => session?.getSnapshot();
  return useStoreSnapshot({ subscribe: session?.subscribe ?? noSubscription, getSnapshot: read });
};

/**
 * Creates a session from props and keeps it in step with them, and is the view of it.
 *
 * For a host that builds a session from props and reads it here. A dock-style owner
 * uses the dock model instead (`useDockModel`): that holds the session, and reading
 * the snapshot in an owner would re-render it on every keystroke in a form it does
 * not display.
 *
 * The first values are the session's initial state, so a simulator mounted with
 * a seed seeds on its first render after the session exists. Later changes are
 * dispatched from a layout effect, which runs before the browser paints: no
 * frame of the previous row's form is ever shown under the new row's heading.
 * Each prop is dispatched only when it changes, so a host that replays through
 * `session.replay` is never overridden by an unchanged `seed` prop.
 *
 * The session is built in a scope this component owns, so it does not exist on
 * the first pass: `undefined` until it does. Unmounting closes the scope, which
 * interrupts any run in flight.
 */
export const useSimulationSession = (
  input: UseSimulationSessionInput,
): SimulationSessionView | undefined => {
  const session = useScoped(() =>
    makeSimulationSession({
      sightings: input.sightings,
      ...(input.seed === undefined ? {} : { seed: input.seed }),
      ...(input.ports === undefined ? {} : { ports: input.ports }),
    }),
  );

  useLayoutEffect(() => {
    if (session !== undefined) session.setSightings(input.sightings);
  }, [session, input.sightings]);
  useLayoutEffect(() => {
    if (session !== undefined) session.seed(input.seed);
  }, [session, input.seed]);
  useLayoutEffect(() => {
    if (session !== undefined) session.setPorts(input.ports);
  }, [session, input.ports]);

  const snapshot = useSnapshotOf(session);
  return session === undefined || snapshot === undefined ? undefined : { session, snapshot };
};
