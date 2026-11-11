"use client";
/**
 * The React adapters for `SimulationSession`.
 *
 * They subscribe and dispatch and decide nothing: the rules are the session's,
 * which is why this file is short. It is `useTimeline.ts`'s relationship to
 * `TimelineStore`. Nothing here forks a run: the session owns its runs in the
 * scope `useScoped` opens for it, and unmounting closes that scope (ADR-QD-137).
 */
import { useLayoutEffect, useSyncExternalStore } from "react";
import type { PolicySighting } from "../model/Catalogue.ts";
import {
  makeSimulationSession,
  type SimulationSession,
  type SimulationSnapshot,
} from "../model/SimulationSession.ts";
import type { EvaluationPortsLayer } from "../model/SimulationInput.ts";
import type { TimelineEntry } from "../model/Timeline.ts";
import { useScoped } from "./useScoped.ts";

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
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  return { session, snapshot };
};

/**
 * Creates a session from props and keeps it in step with them, without
 * subscribing to it.
 *
 * For a host that owns the session and passes it down (`DevtoolsDock`): reading
 * the snapshot here would re-render the owner on every keystroke in a form it
 * does not display.
 *
 * The first values are the session's initial state, so a simulator mounted with
 * a seed seeds on its first render after the session exists. Later changes are
 * dispatched from a layout effect, which runs before the browser paints — no
 * frame of the previous row's form is ever shown under the new row's heading.
 * Each prop is dispatched only when it changes, so a host that replays through
 * `session.replay` is never overridden by an unchanged `seed` prop.
 *
 * The session is built in a scope this component owns, so it does not exist on
 * the first pass: `undefined` until it does. Unmounting closes the scope, which
 * interrupts any run in flight.
 */
export const useOwnedSimulationSession = (
  input: UseSimulationSessionInput,
): SimulationSession | undefined => {
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

  return session;
};

const noSubscription = (): (() => void) => () => undefined;

/** A snapshot read that waits for the session: it subscribes to nothing until one exists. */
const useSnapshotOf = (session: SimulationSession | undefined): SimulationSnapshot | undefined => {
  const read = () => session?.getSnapshot();
  return useSyncExternalStore(session?.subscribe ?? noSubscription, read, read);
};

/** `useOwnedSimulationSession`, and the view of it; `undefined` until the session exists. */
export const useSimulationSession = (
  input: UseSimulationSessionInput,
): SimulationSessionView | undefined => {
  const session = useOwnedSimulationSession(input);
  const snapshot = useSnapshotOf(session);
  return session === undefined || snapshot === undefined ? undefined : { session, snapshot };
};
