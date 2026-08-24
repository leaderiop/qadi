"use client";
/**
 * The one place a guard reads its decision and records that it exists.
 *
 * Both halves are here together deliberately. Registration has to happen
 * **exactly once per instance**, and the surfaces nest — `Can` used to call
 * `useDecision`, and `useCan` still would — so registering inside `useDecision`
 * and again inside its callers would report one `<Can>` as two instances, one of
 * them mislabelled. Every public surface calls this instead, naming what it is,
 * and `useDecision` is simply the case whose name is `"useDecision"`.
 *
 * Out of the barrel (AGENTS.md §9): the kind is not a caller's to choose. A
 * consumer able to pass one could register a `<Can>` that does not exist.
 */
import type { Policy, Resource } from "@qadi/core";
import { isAllowed } from "@qadi/core";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useEffect, useId, useMemo, useRef } from "react";
import type { RefObject } from "react";
import type { GateKind, GateRenderState } from "./GateRegistry.ts";
import { registerGate } from "./GateRegistry.ts";
import type { DecisionResult } from "./QadiAtoms.ts";
import { useAtomValue, useQadiContext } from "./QadiProvider.tsx";

/**
 * What an instance in this result state renders.
 *
 * Read off the same `AsyncResult` the component branches on, in the same order,
 * so the panel cannot disagree with the screen. `waiting` is checked before
 * failure for the reason `Can` checks it there: a decision being re-checked is
 * not yet an answer, whichever answer it held before.
 */
export const renderStateOf = (result: DecisionResult): GateRenderState => {
  if (AsyncResult.isInitial(result)) return "Pending";
  if (result.waiting) return "Rechecking";
  if (AsyncResult.isFailure(result)) return "Failed";
  return isAllowed(result.value) ? "Allowed" : "Denied";
};

export interface Gate {
  readonly result: DecisionResult;
  /** React's own id for this instance, so a marker can be labelled with it. */
  readonly id: string;
  /**
   * Attached to the marker element, or `undefined` when uninstrumented.
   *
   * `undefined` rather than an unused ref, so a component can tell whether to
   * render a marker at all by asking one question — and so an uninstrumented
   * tree renders byte for byte what it rendered before.
   */
  readonly ref: RefObject<HTMLSpanElement | null> | undefined;
}

/**
 * Reads a decision, and registers the reader while instrumentation is on.
 *
 * The hooks below the `instrument` check run unconditionally, because the rules
 * of hooks do not bend for a debug feature. What the flag changes is what the
 * effect *does*, which is nothing at all when it is off.
 */
export const useGate = (kind: GateKind, policy: Policy, resource?: Resource): Gate => {
  const { registry, atoms, instrument } = useQadiContext(kind);
  const atom = useMemo(
    () =>
      resource === undefined ? atoms.decision(policy) : atoms.decisionFor(policy, resource),
    [atoms, policy, resource],
  );
  const result = useAtomValue(registry, atom);

  const id = useId();
  const marker = useRef<HTMLSpanElement | null>(null);
  const state = renderStateOf(result);
  // Whether this surface has a node to point at. `Can` and `Cannot` wrap
  // children; a hook returns a value to a component that may render nothing.
  const wraps = kind === "Can" || kind === "Cannot";

  useEffect(() => {
    if (!instrument) return;
    return registerGate({
      id,
      kind,
      policy,
      resource,
      state,
      // Read inside the effect, which is the first moment React has attached
      // it. `?? undefined` because a ref holds `null` and the registry's type
      // says absent — two spellings of nothing are one too many.
      element: wraps ? (marker.current ?? undefined) : undefined,
    });
  }, [instrument, id, kind, policy, resource, state, wraps]);

  return { result, id, ref: instrument && wraps ? marker : undefined };
};
