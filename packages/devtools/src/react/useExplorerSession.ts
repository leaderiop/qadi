"use client";
/**
 * The React readers for the dock-owned screen stores: the policy explorer's
 * session and the role viewer's held choice.
 *
 * They subscribe and decide nothing: the rules are the stores', and the dock's
 * model owns them, because a screen is unmounted when its tab is left and a
 * store owned by the screen would take what it shows with it (INV-QD-107).
 */
import type { ExplorerSession, ExplorerSnapshot } from "../model/ExplorerSession.ts";
import type { HeldChoiceSnapshot, HeldChoiceStore } from "../model/HeldChoice.ts";
import { useRunningStore } from "./useRunningStore.ts";

/** Reads a session the caller owns. */
export const useExplorerSnapshot = (session: ExplorerSession): ExplorerSnapshot =>
  useRunningStore(session, undefined, [session]);

/** Reads a held-choice store the caller owns. */
export const useHeldChoiceSnapshot = <A>(store: HeldChoiceStore<A>): HeldChoiceSnapshot<A> =>
  useRunningStore(store, undefined, [store]);
