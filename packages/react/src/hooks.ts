"use client";
/**
 * The hooks.
 *
 * Every one of these is a thin read of an atom. There is no fetching, caching
 * or cancellation logic here — the registry does all of it, which is why two
 * components asking the same question cost one evaluation rather than two.
 */
import type { AuthSubject, Policy, Resource } from "@qadi/core";
import { projectVisible } from "@qadi/core";
import { useAtomSuspense } from "@effect/atom-react/Hooks";
import * as Atom from "effect/reactivity/Atom";
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import type { GateInstance } from "./GateRegistry.ts";
import type { DecisionResult } from "./DecisionOutcome.ts";
import type { QadiAtoms } from "./QadiAtoms.ts";
import { useAtomValue, useQadiContext } from "./QadiProvider.tsx";
import type { ClientDecision } from "./SeededDecision.ts";
import { useGate } from "./useGate.ts";

/** The subject under authorization, or `undefined` while it is still loading. */
export const useSubject = (): AuthSubject | undefined => {
  const { atoms } = useQadiContext("useSubject");
  return useAtomValue(atoms.subject);
};

/**
 * The decision for a policy, as observable state.
 *
 * The raw result, unread: the one surface that hands back an `AsyncResult`,
 * as ADR-QD-017's deliberate stale-while-revalidate opt-in. Read it with
 * `outcomeOf`, which keeps all five outcomes apart — not known yet, being
 * re-checked, allowed, denied, and could not be determined — and gives a
 * re-check or a failure no verdict to show.
 */
export const useDecision = (policy: Policy, resource?: Resource): DecisionResult =>
  useGate("useDecision", policy, resource).result;

/**
 * Whether the subject satisfies the policy.
 *
 * `true` exactly when the outcome is `Allowed`. `false` covers pending,
 * rechecking, denied and failed — `outcomeOf` tells them apart — so it is safe
 * for hiding a control and useless for explaining why it is hidden. A control
 * whose allow is being re-checked reads `false` like one never decided
 * ([ADR-QD-017](../../../spec/decisions/017-stale-decisions-are-not-decisions.md):
 * "a decision being re-checked is not a decision"). Reach for
 * {@link useDecision} and `outcomeOf` when the difference matters.
 */
export const useCan = (policy: Policy, resource?: Resource): boolean =>
  // `useGate` directly rather than through `useDecision`, so this instance
  // registers **once**, as itself. Nesting the two would report one `useCan`
  // as two instances, the inner one labelled `useDecision`.
  useGate("useCan", policy, resource).outcome._tag === "Allowed";

/**
 * The decision for a policy, suspending until it is known.
 *
 * Failures are thrown, so a component using this needs an error boundary. That
 * is the point: an unreachable attribute store should surface as an error, not
 * as a hidden button.
 */
export const useDecisionSuspense = (policy: Policy, resource?: Resource): ClientDecision => {
  const { atoms } = useQadiContext("useDecisionSuspense");
  const atom = useMemo(
    () =>
      resource === undefined ? atoms.decision(policy) : atoms.decisionFor(policy, resource),
    [atoms, policy, resource],
  );
  // Registers this instance for devtools instrumentation; its own `result`
  // read is unused here — `useAtomSuspense` below does the actual suspending
  // read of the same registry entry.
  useGate("useDecisionSuspense", policy, resource);
  // Replaces `settled.ts`'s hand-rolled Suspense-race fix with
  // `@effect/atom-react`'s own `useAtomSuspense` — closed, not experimental;
  // see ADR-QD-014's Reversal section for why. `suspendOnWaiting: true`
  // preserves ADR-QD-017 ("a decision being re-checked is not a decision") —
  // the library's default only suspends on `Initial`, not on `waiting`. This is
  // the one read of a result `outcomeOf` delegates rather than performs, and
  // `DecisionOutcome.ts`'s module comment says why (ARCH-14 D-14-e).
  return useAtomSuspense(atom, { suspendOnWaiting: true }).value;
};

/**
 * The combined atom `usePolicies` reads, keyed structurally.
 *
 * `Atom.family` compares its argument with `Equal.equals` — a plain record
 * hashes and compares by its own contents, recursively, down to each
 * `Policy`'s own structural equality — so two components asking for the same
 * named set of policies share one underlying atom even when each built its
 * `policies` record as a fresh object literal in render. Keyed first by
 * `atoms`, because the combined atom reads through `atoms.decision`, which is
 * specific to one `makeQadiAtoms` context; keying by record identity alone,
 * the way this hook used to, is exactly the inline churn the family keying
 * everywhere else in this package (`bare`/`byResource` in `QadiAtoms.ts`)
 * exists to eliminate.
 */
const combinedFamily = Atom.family((atoms: QadiAtoms) =>
  Atom.family((policies: Readonly<Record<string, Policy>>) =>
    Atom.make((get) => {
      const out: Record<string, DecisionResult> = {};
      for (const [key, policy] of Object.entries(policies)) {
        out[key] = get(atoms.decision(policy));
      }
      return out;
    }),
  ),
);

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
  const { atoms } = useQadiContext("usePolicies");
  // `useMemo` here is a performance hoist, not the source of correctness —
  // `combinedFamily` already memoises structurally, so calling it fresh every
  // render would still return the same atom. This only spares re-walking the
  // policy records' hashes on every render (AGENTS.md §13).
  const atom = useMemo(() => combinedFamily(atoms)(policies), [atoms, policies]);
  return useAtomValue(atom);
};

/**
 * Narrows a record to the fields the policy makes visible.
 *
 * The record is also the resource, so a policy may inspect the very fields it
 * is deciding about. Pending and denied both project to `{}` — use
 * {@link useDecision} to tell them apart.
 *
 * `useGate` directly rather than through `useDecision` (as `useCan` does, and
 * for the same reason): this instance registers **once**, under its own name.
 * It used to read through `useDecision`, which registered it there instead —
 * a devtools panel debugging "why is this field hidden" saw a `useDecision`
 * row for code that called `useProjected` (DA-08).
 */
export const useProjected = <A extends Resource>(
  policy: Policy,
  data: A,
): Partial<A> => {
  const { outcome } = useGate("useProjected", policy, data);
  // `Allowed` carries one of the two allow classes, both of which carry
  // `visibleFields`; every other outcome projects to nothing.
  return outcome._tag === "Allowed" ? projectVisible(outcome.decision.visibleFields, data) : {};
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

/**
 * Every live guard under this provider's gate registry, re-rendering its caller
 * as guards mount, unmount and change what they render.
 *
 * The host-side adapter ADR-QD-053 sanctions: it holds guard *instances*, never
 * a decision (AGENTS.md §13), and it re-renders only its caller, never a guard.
 * It reads the provider's effective registry (the `gates` prop, else
 * `atoms.gates`), so a host using the override gets the right one without
 * knowing which it is. Empty unless the provider is `instrument`ed. Outside a
 * provider, read `atoms.gates` with `useSyncExternalStore` instead.
 */
export const useGateInstances = (): ReadonlyArray<GateInstance> => {
  const { gates } = useQadiContext("useGateInstances");
  // The third argument is the server snapshot: no effect runs during SSR, so the
  // registry is empty there, and `[]` is the correct answer.
  return useSyncExternalStore(gates.subscribe, gates.instances, gates.instances);
};
