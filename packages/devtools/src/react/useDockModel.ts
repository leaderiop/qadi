"use client";
/**
 * The React adapter for `DockModel`: builds one per mounted dock and hands the host's inputs to it.
 *
 * It subscribes and dispatches and decides nothing: the rules between the dock's stores
 * are the model's, tested without rendering, which is why this file is short. It is
 * `useSimulationSession.ts`'s relationship to `SimulationSession` taken to the whole
 * dock (ARCH-74), and package-private for the same reason (ADR-QD-099).
 *
 * Nothing here forks a fiber or holds state: `useConfigured` holds the model and its scope,
 * and the model reads the source in that scope. The host's diagnostics options and
 * supplied reading are inputs like the source: the model polls and merges them in its
 * scope, and so are the gate registry and the questions source: the model's gates feed
 * subscribes to the one and reads the other there. A pass with no live model sees
 * `undefined`, so the caller renders nothing for it and mounts every reader below
 * that branch, which is what keeps a hidden `Activity` from leaving one on a closed
 * model (ADR-QD-137).
 */
import { makeDockModel, type DockModel, type DockModelInputs } from "../model/DockModel.ts";
import { useConfigured } from "./useConfigured.ts";

export const useDockModel = (inputs: DockModelInputs): DockModel | undefined =>
  // One scope per mounted dock: unmounting closes it, which interrupts the source read
  // and a simulation run in flight. The model diffs each field by identity and re-reads
  // on a new source or capacity, so the record is handed over whenever it changes.
  useConfigured(makeDockModel, inputs);
