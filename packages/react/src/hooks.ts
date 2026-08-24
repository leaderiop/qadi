"use client";
/**
 * The hooks.
 *
 * Every one of these is a thin read of an atom. There is no fetching, caching
 * or cancellation logic here — the registry does all of it, which is why two
 * components asking the same question cost one evaluation rather than two.
 */
import type { AuthSubject, Decision, Policy, Resource } from "@qadi/core";
import { isAllowed, project } from "@qadi/core";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as Atom from "effect/unstable/reactivity/Atom";
import type * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";
import { useCallback, useEffect, useMemo } from "react";
import type { DecisionResult } from "./QadiAtoms.ts";
import { currentDecision } from "./QadiAtoms.ts";
import { useAtomValue, useQadiContext } from "./QadiProvider.tsx";
import { useGate } from "./useGate.ts";

/** The subject under authorization, or `undefined` while it is still loading. */
export const useSubject = (): AuthSubject | undefined => {
  const { registry, atoms } = useQadiContext("useSubject");
  return useAtomValue(registry, atoms.subject);
};

/**
 * The decision for a policy, as observable state.
 *
 * This is the primitive the rest of the package is built from, and the only
 * hook that keeps all three outcomes apart: not known yet, decided, and
 * could not be determined.
 */
export const useDecision = (policy: Policy, resource?: Resource): DecisionResult =>
  useGate("useDecision", policy, resource).result;

/**
 * Whether the subject satisfies the policy.
 *
 * `false` covers three different situations — pending, denied, and failed — so
 * it is safe for hiding a control and useless for explaining why it is hidden.
 * Reach for {@link useDecision} when the difference matters.
 */
export const useCan = (policy: Policy, resource?: Resource): boolean => {
  // `useGate` directly rather than through `useDecision`, so this instance
  // registers **once**, as itself. Nesting the two would report one `useCan`
  // as two instances, the inner one labelled `useDecision`.
  const decision = currentDecision(useGate("useCan", policy, resource).result);
  return decision !== undefined && isAllowed(decision);
};

/**
 * The decision for a policy, suspending until it is known.
 *
 * Failures are thrown, so a component using this needs an error boundary. That
 * is the point: an unreachable attribute store should surface as an error, not
 * as a hidden button.
 */
export const useDecisionSuspense = (policy: Policy, resource?: Resource): Decision => {
  const { registry, atoms } = useQadiContext("useDecisionSuspense");
  const atom = useMemo(
    () =>
      resource === undefined ? atoms.decision(policy) : atoms.decisionFor(policy, resource),
    [atoms, policy, resource],
  );
  // The atom is needed here in its own right — `settled` subscribes to it — so
  // this one reads through `useGate` for the registration and keeps the atom it
  // already had. Both reads hit the same registry entry.
  const result = useGate("useDecisionSuspense", policy, resource).result;
  if (AsyncResult.isInitial(result) || result.waiting) throw settled(registry, atom);
  return AsyncResult.getOrThrow(result);
};

const pending = new WeakMap<Atom.Atom<DecisionResult>, Promise<void>>();

/**
 * A promise that resolves when the decision leaves `Initial`.
 *
 * Suspense is defined in terms of thrown promises, so one has to exist here.
 * It is memoised per atom because React re-renders on every throw, and a fresh
 * promise each time would suspend forever.
 */
const settled = (
  registry: AtomRegistry.AtomRegistry,
  atom: Atom.Atom<DecisionResult>,
): Promise<void> => {
  const existing = pending.get(atom);
  if (existing !== undefined) return existing;
  // React's throw-to-suspend contract is defined in terms of a thrown
  // Promise, not an Effect — this is the one framework boundary AGENTS.md
  // §6's async ban cannot reach through, hence this file's
  // `no-raw-promise` exemption in check-house-style.mjs.
  const promise = new Promise<void>((resolve) => {
    const unsubscribe = registry.subscribe(atom, (result) => {
      if (AsyncResult.isInitial(result) || result.waiting) return;
      unsubscribe();
      pending.delete(atom);
      resolve();
    });
  });
  pending.set(atom, promise);
  return promise;
};

/**
 * Evaluates several policies as one unit.
 *
 * Each decision is still shared with every other component asking the same
 * question; grouping them only means the component re-renders once instead of
 * once per policy.
 */
export const usePolicies = (
  policies: Readonly<Record<string, Policy>>,
): Readonly<Record<string, DecisionResult>> => {
  const { registry, atoms } = useQadiContext("usePolicies");
  const atom = useMemo(
    () =>
      Atom.make((get) => {
        const out: Record<string, DecisionResult> = {};
        for (const [key, policy] of Object.entries(policies)) {
          out[key] = get(atoms.decision(policy));
        }
        return out;
      }),
    [atoms, policies],
  );
  return useAtomValue(registry, atom);
};

/**
 * Narrows a record to the fields the policy makes visible.
 *
 * The record is also the resource, so a policy may inspect the very fields it
 * is deciding about. Pending and denied both project to `{}` — use
 * {@link useDecision} to tell them apart.
 */
export const useProjected = <A extends Resource>(
  policy: Policy,
  data: A,
): Partial<A> => {
  const decision = currentDecision(useDecision(policy, data));
  return decision === undefined ? {} : project(decision, data);
};

/**
 * Returns a callback that discards every decision in this context.
 *
 * Call it when the subject's authority changes underneath the application — a
 * role granted, a grant revoked. Mounted decisions re-evaluate; unmounted ones
 * are simply dropped.
 */
export const useInvalidate = (): (() => void) => {
  const { registry, atoms } = useQadiContext("useInvalidate");
  useEffect(() => registry.mount(atoms.invalidate), [registry, atoms]);
  return useCallback(() => {
    registry.set(atoms.invalidate, undefined);
  }, [registry, atoms]);
};
