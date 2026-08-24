/**
 * Live guards, grouped by the question they ask.
 *
 * The companion to `Catalogue.ts`'s `policiesSeen`, and the answer to a
 * different question. `asked()` says a question **has been asked** and cannot
 * say by whom; this says who is asking it **right now** and what each of them
 * is currently rendering. A reader chasing "why is this button missing" needs
 * the second, and the React panel offered only the first.
 *
 * **Grouped by `Equal.equals`**, which is structural in Effect v4 — the same
 * property `Atom.family` uses to share one atom between two independently
 * constructed but equal policies, pinned by
 * `packages/react/test/v4-reactivity-smoke.test.ts`. So a group here is exactly
 * an atom there: the panel cannot claim two questions where the evaluator sees
 * one, which is the failure mode BEH-QD-217 was written to prevent and is
 * preserved rather than abandoned.
 *
 * Nothing in this file touches the DOM. `element` is `unknown` here because a
 * headless model has no business knowing what one is — only whether the reader
 * has something to point at. `react/Lens.ts` is where that becomes an `Element`.
 */
import * as Equal from "effect/Equal";
import type { Policy, Resource } from "@qadi/core";
import { policyLabel } from "./Catalogue.ts";

/**
 * One live guard, as `@qadi/react`'s registry reports it.
 *
 * Structurally identical to that package's `GateInstance` and deliberately not
 * imported from it, exactly as `AskedQuestionLike` is not: `@qadi/devtools` does
 * not depend on `@qadi/react`. A host passes `gateInstances()` straight in.
 *
 * `kind` and `state` are `string` rather than the unions that produced them, for
 * the reason `PortCalls.ts` gives about span attributes and `Hydration.ts` gives
 * about frequency keys: this package reads a structure it does not own. A value
 * it does not recognise is shown as itself rather than dropped or coerced —
 * a wrong label is a visible defect, and a silently missing row is not.
 */
export interface GateInstanceLike {
  readonly id: string;
  readonly kind: string;
  readonly policy: Policy;
  readonly resource?: Resource | undefined;
  readonly state: string;
  /** Opaque. The model knows only whether there is one. */
  readonly element?: unknown;
}

/**
 * The render states, in the order a panel should show them.
 *
 * Declared as values rather than restated as a type, so a state this build does
 * not know sorts after these rather than vanishing. The order is
 * *worst-news-first*: a reader opens this panel because something is missing.
 */
export const GATE_STATES: ReadonlyArray<string> = [
  "Failed",
  "Denied",
  "Rechecking",
  "Pending",
  "Allowed",
];

/** How many instances are in one state. */
export interface GateStateCount {
  readonly state: string;
  readonly count: number;
}

/** Every live guard asking one question. */
export interface GateGroup {
  readonly policy: Policy;
  /** Absent when the question is asked with no resource in scope. */
  readonly resource: Resource | undefined;
  /** A stable display name. Two distinct policies may share one. */
  readonly label: string;
  readonly instances: ReadonlyArray<GateInstanceLike>;
  /** Non-zero states only, worst news first. */
  readonly counts: ReadonlyArray<GateStateCount>;
  /** How many of them the lens can actually point at. */
  readonly locatable: number;
}

/** Whether the reader has something to point at for this instance. */
export const isLocatable = (self: GateInstanceLike): boolean =>
  self.element !== undefined && self.element !== null;

const sameQuestion = (a: GateInstanceLike, b: GateInstanceLike): boolean =>
  Equal.equals(a.policy, b.policy) && Equal.equals(a.resource, b.resource);

const rank = (state: string): number => {
  const index = GATE_STATES.indexOf(state);
  // Unknown sorts after every known one, rather than to the front where
  // `indexOf`'s `-1` would put it.
  return index === -1 ? GATE_STATES.length : index;
};

const countsOf = (instances: ReadonlyArray<GateInstanceLike>): ReadonlyArray<GateStateCount> => {
  const tally = new Map<string, number>();
  for (const instance of instances) {
    tally.set(instance.state, (tally.get(instance.state) ?? 0) + 1);
  }
  // Only states that occurred. A row of zeros per state would be four fifths
  // noise on a panel that already lists the instances themselves — the opposite
  // call from `hydrationActivity`'s drop reasons, where the *closed set* is the
  // reassurance and a zero says "watched, and clean".
  return [...tally]
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => rank(a.state) - rank(b.state));
};

/**
 * Groups live guards by the question they ask, in first-seen order.
 *
 * A linear scan with `Equal.equals` rather than `policiesSeen`'s
 * `MutableHashMap`, and the difference is the input size: that walks a bounded
 * timeline of up to 500 rows, this walks the guards **mounted right now**. A
 * page with more than a few dozen is already a page whose author has a bigger
 * problem than this panel's render cost.
 *
 * Order is the order they registered, which is mount order — so a group does
 * not jump around the panel as unrelated components re-render.
 */
export const gateGroups = (
  instances: ReadonlyArray<GateInstanceLike>,
): ReadonlyArray<GateGroup> => {
  const groups: Array<Array<GateInstanceLike>> = [];

  for (const instance of instances) {
    const existing = groups.find((group) => group[0] !== undefined && sameQuestion(group[0], instance));
    if (existing === undefined) groups.push([instance]);
    else existing.push(instance);
  }

  return groups.flatMap((group) => {
    const first = group[0];
    if (first === undefined) return [];
    return [
      {
        policy: first.policy,
        resource: first.resource,
        label: policyLabel(first.policy),
        instances: group,
        counts: countsOf(group),
        locatable: group.filter(isLocatable).length,
      },
    ];
  });
};

/**
 * The ids the lens should highlight for one group.
 *
 * The unlocatable ones are left out rather than passed on to fail quietly
 * downstream: a hook has no node, so highlighting it is not a thing that can
 * happen, and a caller needs to be able to tell "highlighted nothing" from
 * "nothing to highlight".
 */
export const locatableIds = (self: GateGroup): ReadonlyArray<string> =>
  self.instances.filter(isLocatable).map((instance) => instance.id);

/**
 * The instances asking a question, across every group.
 *
 * For joining an `asked()` row to the guards currently asking it. Returns an
 * empty array where a question has been asked and nothing is mounted — which is
 * a real and common state, not an error: a component that asked and unmounted
 * leaves its question behind in the atom layer.
 */
export const instancesAsking = (
  groups: ReadonlyArray<GateGroup>,
  policy: Policy,
  resource: Resource | undefined,
): ReadonlyArray<GateInstanceLike> =>
  groups.find(
    (group) => Equal.equals(group.policy, policy) && Equal.equals(group.resource, resource),
  )?.instances ?? [];
