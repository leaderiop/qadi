"use client";
/**
 * Reads an external store's snapshot as it changes: the dock's one `useSyncExternalStore` call.
 *
 * Every screen reads a model store the same way, and a second copy of this line is
 * how a constant-`undefined` run once crept into a plain read. Package-private
 * (AGENTS.md §9).
 */
import { useSyncExternalStore } from "react";
import type { ExternalStore } from "../model/ExternalStore.ts";

export const useStoreSnapshot = <A>(store: Pick<ExternalStore<A>, "subscribe" | "getSnapshot">): A =>
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
