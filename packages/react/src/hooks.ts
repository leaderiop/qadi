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
import type { RefObject } from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useSyncExternalStore } from "react";
import type { GateInstance } from "./GateRegistry.ts";
import type { DecisionResult } from "./DecisionOutcome.ts";
import { outcomeOf } from "./DecisionOutcome.ts";
import type { GateIdentity } from "./GateWriter.ts";
import { gateWriterFor, useGateRegistrations } from "./GateWriter.ts";
import type { AskedQuestion } from "./QuestionBook.ts";
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
  const atom = useMemo(() => atoms.decision(policy, resource), [atoms, policy, resource]);
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
 * One hook asking several questions: the shared body of `useQuestions` and
 * `usePolicies`, which differ only in the name they register under.
 *
 * Out of the barrel for the reason `useGate` is: the kind is not a caller's to
 * choose. The raw results are returned, as ADR-QD-093(d) keeps for
 * `useDecision`; each entry is read once more through `outcomeOf`, and only to
 * record its tag with the gate registry.
 */
const useQuestionsAs = (
  kind: "usePolicies" | "useQuestions",
  questions: Readonly<Record<string, AskedQuestion>>,
): Readonly<Record<string, DecisionResult>> => {
  const { atoms, instrument, gates } = useQadiContext(kind);
  // `useMemo` here is a performance hoist, not the source of correctness: the
  // atom set's `decisions` family keys structurally, so calling it fresh every
  // render would return the same atom. This only spares re-walking the records'
  // hashes on every render (AGENTS.md §13). It is also what makes the
  // registration below stable: an equal record is one `group` atom.
  const group = useMemo(() => atoms.decisions(questions), [atoms, questions]);
  const results = useAtomValue(group);

  const base = useId();
  const markers = useRef<RefObject<HTMLSpanElement | null>>({ current: null });
  const writer = useMemo(
    () => (instrument ? gateWriterFor(gates) : undefined),
    [instrument, gates],
  );
  // Keyed on `group`, so an inline record that is equal each render does not churn
  // registration. Each entry registers under its own `id`, the one `useId` this
  // hook minted plus the entry's name.
  const identities = useMemo(
    () =>
      Object.entries(questions).map(
        ([name, question]): GateIdentity => ({
          id: `${base}/${name}`,
          kind,
          atom: atoms.decision(question.policy, question.resource),
          wraps: false,
          policy: question.policy,
          resource: question.resource,
          marker: markers.current,
        }),
      ),
    [atoms, base, kind, group],
  );
  const states = Object.keys(questions).map((name) => {
    const result = results[name];
    return result === undefined ? "Pending" : outcomeOf(result)._tag;
  });
  useGateRegistrations(writer, identities, states);

  return results;
};

/**
 * Evaluates several questions as one unit, each a policy and optionally a resource.
 *
 * Each decision is still shared with every other component asking the same
 * question; grouping them only means the component re-renders once instead of
 * once per question. The raw results, unread, as {@link useDecision} returns
 * them; read each with `outcomeOf`. Under an instrumented provider each entry is
 * a gate instance of kind `useQuestions`, so the devtools panel sees every
 * question the hook is asking.
 */
export const useQuestions = (
  questions: Readonly<Record<string, AskedQuestion>>,
): Readonly<Record<string, DecisionResult>> => useQuestionsAs("useQuestions", questions);

/**
 * Evaluates several policies as one unit, with no resource in scope.
 *
 * {@link useQuestions} for policies alone: each entry is a gate instance of kind
 * `usePolicies`. Reach for `useQuestions` when an entry needs a resource.
 */
export const usePolicies = (
  policies: Readonly<Record<string, Policy>>,
): Readonly<Record<string, DecisionResult>> => {
  // A fresh record each render is fine: `atoms.decisions` keys structurally.
  const questions: Record<string, AskedQuestion> = {};
  for (const [name, policy] of Object.entries(policies)) questions[name] = { policy };
  return useQuestionsAs("usePolicies", questions);
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
