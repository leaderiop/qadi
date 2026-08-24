/**
 * Every live guard in the tree, while instrumentation is on.
 *
 * This is the thing [BEH-QD-217](../../../spec/behaviors/28-devtools-screens.md)
 * said could not exist, and the reasoning it gave was sound as far as it went:
 * `Atom.family` keys **structurally**, so ten `<Can policy={isAdmin}>` in
 * different places share one atom, and a panel counting atoms cannot tell them
 * apart. What that argument establishes is that the *atom layer* cannot see
 * instances — not that nothing can. A component knows perfectly well that it
 * exists; nothing was asking it.
 *
 * So the two views are different questions rather than rival answers, and the
 * panel now shows both: `QadiAtoms.asked()` says what has been **asked**, and
 * this says who is **asking**. A reader chasing "why is this button missing"
 * needs the second and was offered the first.
 *
 * **No React state, and no decisions here.** A registration is a `useEffect`
 * write into a module-scope map, exactly as `HydrationSeed.ts` is a module-scope
 * `WeakMap` — nothing re-renders because a gate registered, and nothing in this
 * file can affect what a gate renders. That is the half of AGENTS.md §13 the
 * amendment does **not** touch.
 *
 * **Off by default, and off means absent.** `QadiProvider` takes `instrument`,
 * and without it no gate registers, no marker element is rendered, and this map
 * stays empty for the life of the process. A production bundle that never passes
 * the prop pays for one `useId` and one effect that returns immediately.
 */
import type { Policy, Resource } from "@qadi/core";

/** Which surface the instance is. */
export type GateKind = "Can" | "Cannot" | "useCan" | "useDecision" | "useDecisionSuspense";

/**
 * What the instance rendered, at the moment it last rendered.
 *
 * `Rechecking` is separate from `Pending` because they are separate facts: one
 * has never had an answer and the other has one it no longer trusts. Collapsing
 * them would put a control that is about to reappear in the same bucket as one
 * that has never been decided, and the panel is read precisely when those look
 * the same on screen.
 *
 * Neither carries the previous verdict, per
 * [ADR-QD-017](../../../spec/decisions/017-stale-decisions-are-not-decisions.md):
 * a decision being re-checked is not a decision.
 */
export type GateRenderState = "Pending" | "Rechecking" | "Allowed" | "Denied" | "Failed";

export interface GateInstance {
  /** React's own `useId`, stable across this instance's renders. */
  readonly id: string;
  readonly kind: GateKind;
  readonly policy: Policy;
  /** Absent when the question was asked with no resource in scope. */
  readonly resource: Resource | undefined;
  readonly state: GateRenderState;
  /**
   * The marker element wrapping what this instance rendered.
   *
   * Present only for `Can` and `Cannot`, which have children to wrap. A hook
   * has no node of its own, so it is enumerable and **not locatable** — a
   * distinction a panel offering to highlight things has to keep, or it offers
   * a button that silently does nothing.
   *
   * The element is carried rather than found by selector, and that is a lesson
   * this repository has already paid for once: a string contract between two
   * packages that do not import each other
   * ([ADR-QD-052](../../../spec/decisions/052-hydration-is-counted-where-both-ends-can-see-it.md))
   * fails silently when one side's spelling drifts. A reference cannot drift.
   * `@qadi/react` still calls no DOM API — React fills the ref in; this module
   * only holds what it was handed.
   */
  readonly element: Element | undefined;
}

const instances = new Map<string, GateInstance>();
const listeners = new Set<() => void>();

/**
 * The cached array `useSyncExternalStore` compares by reference.
 *
 * Rebuilt on the first read after a change and not before. `getSnapshot` must
 * return the identical reference while nothing has changed or React re-renders
 * forever, so this cannot be a fresh `[...instances.values()]` per call.
 */
let snapshot: ReadonlyArray<GateInstance> = [];
let stale = false;

const changed = (): void => {
  stale = true;
  for (const listener of listeners) listener();
};

/** Every instance currently mounted, in registration order. */
export const gateInstances = (): ReadonlyArray<GateInstance> => {
  if (stale) {
    snapshot = [...instances.values()];
    stale = false;
  }
  return snapshot;
};

/** Subscribes to mounts, unmounts and render-state changes. */
export const subscribeGates = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Records one instance until the returned function is called.
 *
 * Called from an effect, so the cleanup runs on unmount and the map cannot
 * outlive the tree — which matters more than usual here, because an entry holds
 * a DOM element and a leaked one would keep a detached subtree alive.
 */
export const registerGate = (instance: GateInstance): (() => void) => {
  instances.set(instance.id, instance);
  changed();
  return () => {
    instances.delete(instance.id);
    changed();
  };
};

/**
 * Empties the registry.
 *
 * For tests, which mount and unmount trees in one process and would otherwise
 * read each other's instances. Not part of the flow a page takes: a gate
 * unregisters itself when it unmounts.
 */
export const clearGatesUnsafe = (): void => {
  instances.clear();
  changed();
};
