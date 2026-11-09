"use client";
/**
 * The React adapters for the dock-owned screen stores: the policy explorer's
 * session and the role viewer's held choice.
 *
 * They subscribe and dispatch and decide nothing: the rules are the stores',
 * which is why this file is short. It is `useSimulationSession.ts`'s
 * relationship to `SimulationSession`, one screen later, and for the same
 * reason: a screen is unmounted when its tab is left, so a store owned by the
 * screen would take what it shows with it (INV-QD-107).
 */
import { useLayoutEffect, useState } from "react";
import type { PolicySighting } from "../model/Catalogue.ts";
import { makeExplorerSession, type ExplorerSession, type ExplorerSnapshot } from "../model/ExplorerSession.ts";
import {
  makeHeldChoiceStore,
  type HeldChoiceSnapshot,
  type HeldChoiceStore,
} from "../model/HeldChoice.ts";
import { useRunningStore } from "./useRunningStore.ts";

/**
 * Creates the explorer's session from the rail and keeps it in step with it —
 * without subscribing to it.
 *
 * For the dock, which owns the session and passes it down: reading the snapshot
 * here would re-render the dock on every keystroke in a pane it does not
 * display. The first rail is the session's initial state, and later ones are
 * dispatched from a layout effect, before the browser paints. The session holds
 * no fiber, so there is nothing to dispose.
 */
export const useOwnedExplorerSession = (
  sightings: ReadonlyArray<PolicySighting>,
): ExplorerSession => {
  const [session] = useState(() => makeExplorerSession({ sightings }));
  useLayoutEffect(() => session.setSightings(sightings), [session, sightings]);
  return session;
};

/** Reads a session the caller owns. */
export const useExplorerSnapshot = (session: ExplorerSession): ExplorerSnapshot =>
  useRunningStore(session, undefined, [session]);

/** `useOwnedExplorerSession`'s sibling for a held choice over a list: the role viewer's. */
export const useOwnedHeldChoice = <A>(
  list: ReadonlyArray<A>,
  same: (a: A, b: A) => boolean,
): HeldChoiceStore<A> => {
  const [store] = useState(() => makeHeldChoiceStore(list, same));
  useLayoutEffect(() => store.setList(list), [store, list]);
  return store;
};

/** Reads a held-choice store the caller owns. */
export const useHeldChoiceSnapshot = <A>(store: HeldChoiceStore<A>): HeldChoiceSnapshot<A> =>
  useRunningStore(store, undefined, [store]);
