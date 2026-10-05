"use client";
/**
 * The one place a guard reads its decision and records that it exists.
 *
 * Registration goes through the provider's gate registry (`atoms.gates`, or the
 * `gates` prop), by a handle only `@qadi/react` can reach (`GateWriter.ts`).
 *
 * Both halves are here together deliberately. Registration has to happen
 * **exactly once per instance**, and the surfaces nest — `Can` used to call
 * `useDecision`, and `useCan` still would — so registering inside `useDecision`
 * and again inside its callers would report one `<Can>` as two instances, one of
 * them mislabelled. Every public surface calls this instead, naming what it is,
 * and `useDecision` is simply the case whose name is `"useDecision"`.
 *
 * The result is read once, with `outcomeOf`, and that one object is both what
 * the registry records (`outcome._tag`) and what the surface renders from. The
 * panel and the guard therefore cannot disagree about what is on screen: they
 * are not two reads kept in the same order, they are one read.
 *
 * Out of the barrel (AGENTS.md §9): the kind is not a caller's to choose. A
 * consumer able to pass one could register a `<Can>` that does not exist.
 */
import type { Policy, Resource } from "@qadi/core";
import { useId, useMemo, useRef } from "react";
import type { RefObject } from "react";
import type { DecisionOutcome, DecisionResult } from "./DecisionOutcome.ts";
import { outcomeOf } from "./DecisionOutcome.ts";
import type { GateKind } from "./GateRegistry.ts";
import { gateWriterFor, useGateRegistration } from "./GateWriter.ts";
import { useAtomValue, useQadiContext } from "./QadiProvider.tsx";

export interface Gate {
  /** The raw result, for `useDecision`, which hands it on unread (ADR-QD-017's opt-in). */
  readonly result: DecisionResult;
  /** What the result means: the one read every other surface renders from. */
  readonly outcome: DecisionOutcome;
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
 * The hooks below run unconditionally, because the rules of hooks do not bend
 * for a debug feature. What the flag changes is what the effects *do*, which is
 * nothing at all when it is off.
 */
export const useGate = (kind: GateKind, policy: Policy, resource?: Resource): Gate => {
  const { atoms, instrument, gates } = useQadiContext(kind);
  const atom = useMemo(
    () =>
      resource === undefined ? atoms.decision(policy) : atoms.decisionFor(policy, resource),
    [atoms, policy, resource],
  );
  const result = useAtomValue(atom);

  const id = useId();
  const marker = useRef<HTMLSpanElement | null>(null);
  const outcome = outcomeOf(result);
  // Whether this surface has a node to point at. `Can` and `Cannot` wrap
  // children; a hook returns a value to a component that may render nothing.
  const wraps = kind === "Can" || kind === "Cannot";

  // `undefined` when instrumentation is off, or when `gates` is a registry this
  // package did not build: either way nothing registers and no marker renders.
  const writer = useMemo(
    () => (instrument ? gateWriterFor(gates) : undefined),
    [instrument, gates],
  );
  // `id` stays React's raw `useId`: it is hydration-stable and is what
  // `data-qadi-gate` renders. Only the registry rewrites an id, and only on a
  // collision (ADR-QD-080).
  useGateRegistration(writer, { id, kind, atom, wraps, policy, resource, marker }, outcome._tag);

  return { result, outcome, id, ref: writer !== undefined && wraps ? marker : undefined };
};
