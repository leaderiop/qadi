"use client";
/**
 * The React reader for the dock's own session: which screen, which filters,
 * which row.
 *
 * It subscribes and decides nothing: pairing, filtering, counting, selecting and
 * replaying are `DockSession`'s, tested without rendering, and the dock's model
 * owns the session. Package-private (ADR-QD-099).
 */
import type { DockSession, DockSnapshot } from "../model/DockSession.ts";
import { useRunningStore } from "./useRunningStore.ts";

/** Reads a session the caller owns. */
export const useDockSnapshot = (session: DockSession): DockSnapshot =>
  useRunningStore(session, undefined, [session]);
