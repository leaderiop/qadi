"use client";
/**
 * The React adapter for `DockModel`: builds one per mounted dock and hands the host's inputs to it.
 *
 * It subscribes and dispatches and decides nothing: the rules between the dock's stores
 * are the model's, tested without rendering, which is why this file is short. It is
 * `useSimulationSession.ts`'s relationship to `SimulationSession` taken to the whole
 * dock (ARCH-74), and package-private for the same reason (ADR-QD-099).
 *
 * Nothing here forks a fiber or holds state: `useScoped` holds the model and its scope,
 * and the model reads the source in that scope. A pass with no live model sees
 * `undefined`, so the caller renders nothing for it and mounts every reader below
 * that branch, which is what keeps a hidden `Activity` from leaving one on a closed
 * model (ADR-QD-137).
 */
import { useLayoutEffect } from "react";
import type { Catalogue } from "../model/Catalogue.ts";
import { makeDockModel, type DockModel } from "../model/DockModel.ts";
import type { EvaluationPortsLayer } from "../model/SimulationInput.ts";
import type { Source } from "../model/Source.ts";
import { useScoped } from "./useScoped.ts";

export interface UseDockModelInput {
  readonly source: Source;
  readonly capacity?: number | undefined;
  readonly catalogue?: Catalogue | undefined;
  readonly ports?: EvaluationPortsLayer | undefined;
}

export const useDockModel = ({
  source,
  capacity,
  catalogue,
  ports,
}: UseDockModelInput): DockModel | undefined => {
  // One scope per mounted dock: unmounting closes it, which interrupts the source read
  // and a simulation run in flight.
  const model = useScoped(() => makeDockModel({ source, capacity, catalogue, ports }));

  // The model diffs each field by identity and re-reads on a new source or capacity. It
  // runs again on the render the model appears, so a prop changed in between still lands.
  useLayoutEffect(() => {
    if (model !== undefined) model.configure({ source, capacity, catalogue, ports });
  }, [model, source, capacity, catalogue, ports]);

  return model;
};
