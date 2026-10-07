"use client";
/**
 * The React adapter for `SimulationSession` — the only file under `react/` that
 * forks an Effect for the simulator.
 *
 * It subscribes and dispatches and decides nothing: the rules are the
 * session's, which is why this file is short. It is `useTimeline.ts`'s
 * relationship to `TimelineStore`.
 */
import * as Effect from "effect/Effect";
import { useCallback, useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";
import type { PolicySighting } from "../model/Catalogue.ts";
import {
  makeSimulationSession,
  type RunKind,
  type SimulationSession,
  type SimulationSnapshot,
} from "../model/SimulationSession.ts";
import type { EvaluationPortsLayer } from "../model/SimulationInput.ts";
import type { TimelineEntry } from "../model/Timeline.ts";

export interface UseSimulationSessionInput {
  readonly sightings: ReadonlyArray<PolicySighting>;
  readonly seed?: TimelineEntry | undefined;
  readonly ports?: EvaluationPortsLayer | undefined;
}

export interface SimulationSessionView {
  readonly session: SimulationSession;
  readonly snapshot: SimulationSnapshot;
  /** Forks one run or sweep. The session supersedes and interrupts; nothing is awaited here. */
  readonly run: (kind: RunKind) => void;
}

/**
 * Reads a session the caller owns: the snapshot, and a `run` that forks.
 *
 * Also forks `reap` whenever a command superseded a run, so a run left behind
 * by a policy change or a re-seed stops asking the application's resolvers
 * promptly instead of at the next run.
 */
export const useSimulationSnapshot = (session: SimulationSession): SimulationSessionView => {
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);

  useEffect(
    () =>
      session.subscribe(() => {
        if (session.hasRetired()) Effect.runFork(session.reap);
      }),
    [session],
  );

  const run = useCallback((kind: RunKind) => Effect.runFork(session.run(kind)), [session]);
  return { session, snapshot, run };
};

/**
 * Creates a session from props and keeps it in step with them — without
 * subscribing to it.
 *
 * For a host that owns the session and passes it down (`DevtoolsDock`): reading
 * the snapshot here would re-render the owner on every keystroke in a form it
 * does not display.
 *
 * The first values are the session's initial state, so a simulator mounted with
 * a seed seeds on its first render. Later changes are dispatched from a layout
 * effect, which runs before the browser paints — no frame of the previous row's
 * form is ever shown under the new row's heading. Unmounting disposes the
 * session, interrupting any run in flight.
 */
export const useOwnedSimulationSession = (input: UseSimulationSessionInput): SimulationSession => {
  const [session] = useState(() =>
    makeSimulationSession({
      sightings: input.sightings,
      ...(input.seed === undefined ? {} : { seed: input.seed }),
      ...(input.ports === undefined ? {} : { ports: input.ports }),
    }),
  );

  useLayoutEffect(() => {
    session.setSightings(input.sightings);
    session.seed(input.seed);
    session.setPorts(input.ports);
  }, [session, input.sightings, input.seed, input.ports]);

  useEffect(
    () => () => {
      Effect.runFork(session.dispose);
    },
    [session],
  );

  return session;
};

/** `useOwnedSimulationSession`, and the view of it: the snapshot and a forking `run`. */
export const useSimulationSession = (input: UseSimulationSessionInput): SimulationSessionView =>
  useSimulationSnapshot(useOwnedSimulationSession(input));
