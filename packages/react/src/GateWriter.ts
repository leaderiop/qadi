"use client";
/**
 * The write side of a gate registry, and the types a registry holds.
 *
 * Out of the barrel (AGENTS.md §9) for the reason `useGate.ts` is: the kind is
 * not a caller's to choose, and a consumer able to register an instance could
 * list a `<Can>` that does not exist. `GateRegistry.ts` re-exports the three
 * public types by name; nothing else here is reachable from outside the package.
 *
 * A registry the package built is bound to its writer in a side table keyed on
 * the registry object, the way hydration's seed lookup hides its seed atoms
 * (a closure the atom set owns, `QadiAtoms.hydrate`, ADR-QD-078). The table holds
 * no guard and no state of its own, so it is not the module-scope registry
 * [ADR-QD-080](../../../spec/decisions/080-a-gate-registry-belongs-to-its-atom-set.md)
 * removed. It is keyed on `object`, which is the real constraint, so this module
 * imports nothing local but the leaf `DecisionOutcome.ts`, and only its type, so
 * no import cycle can form (ADR-QD-037).
 */
import type { Policy, Resource } from "@qadi/core";
import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { DecisionOutcome } from "./DecisionOutcome.ts";

/** Which surface the instance is. */
export type GateKind =
  | "Can"
  | "Cannot"
  | "useCan"
  | "useDecision"
  | "useDecisionSuspense"
  | "usePolicies"
  | "useProjected"
  | "useQuestions";

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
 *
 * Derived from {@link DecisionOutcome}'s tag rather than restated, so a guard
 * reports exactly the outcome it rendered from, and a sixth outcome is a sixth
 * state.
 */
export type GateRenderState = DecisionOutcome["_tag"];

export interface GateInstance {
  /**
   * React's own `useId`, unless it collided with a live entry in the same
   * registry, in which case it is disambiguated (`~n`). Unique within one
   * `instances()` snapshot.
   */
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

/**
 * One registration, and the only token that can change or end it.
 *
 * The handle closes over its own key, so a stale cleanup firing after a newer
 * registration for the same id cannot evict the newer one: it can only ever
 * touch the entry it made. That used to be a checked property (an `owners` map
 * compared on every unregister) and is structural now.
 */
export interface GateHandle {
  /** Replaces the render state in place. A no-op after `unregister`, or when unchanged. */
  readonly update: (state: GateRenderState) => void;
  /** Removes the entry. Idempotent. */
  readonly unregister: () => void;
}

/** What a registry lets this package do to it. Never exported from the barrel. */
export interface GateWriter {
  readonly register: (instance: GateInstance) => GateHandle;
}

const writers = new WeakMap<object, GateWriter>();

/** Binds a registry to its writer. Called once, by `makeGateRegistry`. */
export const bindGateWriter = (registry: object, writer: GateWriter): void => {
  writers.set(registry, writer);
};

/**
 * The writer for a registry this package built, or `undefined` for anything else.
 *
 * `undefined` for a hand-built `{ instances, subscribe }`: guards under such a
 * registry register nothing and render no marker, so off means absent extends
 * to a registry nothing here can write to.
 */
export const gateWriterFor = (registry: object): GateWriter | undefined =>
  writers.get(registry);

/** What one guard is, as it renders. */
export interface GateIdentity {
  readonly id: string;
  readonly kind: GateKind;
  /**
   * The memoised decision atom for this question. Effects key on it, not on the
   * raw policy and resource, so an inline policy does not churn registration.
   */
  readonly atom: object;
  readonly wraps: boolean;
  readonly policy: Policy;
  readonly resource: Resource | undefined;
  readonly marker: RefObject<HTMLSpanElement | null>;
}

/** Whether two identities register as the same instance: everything but policy and resource. */
const sameIdentity = (a: GateIdentity, b: GateIdentity): boolean =>
  a.id === b.id &&
  a.kind === b.kind &&
  a.atom === b.atom &&
  a.wraps === b.wraps &&
  a.marker === b.marker;

/**
 * Registers a set of guards with `writer` for as long as they are mounted.
 *
 * One hook asking several questions (`usePolicies`, `useQuestions`) registers one
 * instance per question, each under its own `id`; a single-question guard is the
 * one-element case ({@link useGateRegistration}), so there is one lifecycle
 * implementation and not two.
 *
 * `writer` is `undefined` when instrumentation is off, and then every effect
 * returns immediately: the hooks run unconditionally because the rules of hooks
 * do not bend for a debug feature, and what the flag changes is what they do.
 * `identities` and `states` are index-aligned, and `id`s are unique within a call.
 */
export const useGateRegistrations = (
  writer: GateWriter | undefined,
  identities: ReadonlyArray<GateIdentity>,
  states: ReadonlyArray<GateRenderState>,
): void => {
  // The identities as they last *changed*, so the effect below keys on "did the
  // set of questions this hook asks actually change" and not on "did the caller
  // build a new array or a new policy object this render". `policy` and `resource`
  // compare by reference, and AGENTS.md §13 blesses passing them inline in render;
  // depending on them directly would unregister and re-register every instance on
  // every render of a caller doing exactly that. `atom` is what makes that safe:
  // the book keys it structurally, so it is the same reference across renders for
  // an equal policy and resource. `latest` still lets the effect body report the
  // current policy and resource.
  const stableRef = useRef(identities);
  const previous = stableRef.current;
  if (
    previous.length !== identities.length ||
    !identities.every((identity, i) => {
      const before = previous[i];
      return before !== undefined && sameIdentity(identity, before);
    })
  ) {
    stableRef.current = identities;
  }
  const stable = stableRef.current;
  const latest = useRef(identities);
  latest.current = identities;
  const statesRef = useRef(states);
  statesRef.current = states;
  const registered = useRef(new Map<string, { identity: GateIdentity; handle: GateHandle }>());

  // The writer going away, or the hook unmounting, ends every registration.
  useEffect(() => {
    if (writer === undefined) return;
    const live = registered.current;
    return () => {
      for (const { handle } of live.values()) handle.unregister();
      live.clear();
    };
  }, [writer]);

  // Identity lifecycle only: an instance that is new, or whose question changed,
  // registers; one that is gone unregisters; one that is unchanged is left alone.
  // `state` is deliberately not here — see the effect below. Re-registering is the
  // right cost only when what is being asked has actually changed, not on every
  // answer to the same question.
  useEffect(() => {
    if (writer === undefined) return;
    const live = registered.current;
    const wanted = new Set(stable.map((identity) => identity.id));
    for (const [id, entry] of live) {
      const current = stable.find((identity) => identity.id === id);
      if (!wanted.has(id) || current === undefined || !sameIdentity(current, entry.identity)) {
        entry.handle.unregister();
        live.delete(id);
      }
    }
    stable.forEach((identity, i) => {
      if (live.has(identity.id)) return;
      const now = latest.current[i] ?? identity;
      live.set(identity.id, {
        identity,
        handle: writer.register({
          id: identity.id,
          kind: identity.kind,
          policy: now.policy,
          resource: now.resource,
          state: statesRef.current[i] ?? "Pending",
          // Read inside the effect, which is the first moment React has attached
          // it. `?? undefined` because a ref holds `null` and the registry's type
          // says absent.
          element: identity.wraps ? (identity.marker.current ?? undefined) : undefined,
        }),
      });
    });
  }, [writer, stable]);

  // The per-render state update, split from the effect above (AGENTS.md §13
  // still holds: this mutates the registered instance's `state` field and
  // notifies at most once, it does not decide what anything renders). Without
  // this split every decision state transition tore the instance down and
  // rebuilt it — two notifications where one update is enough.
  const stateKey = states.join("|");
  useEffect(() => {
    if (writer === undefined) return;
    stable.forEach((identity, i) => {
      const state = statesRef.current[i];
      if (state !== undefined) registered.current.get(identity.id)?.handle.update(state);
    });
  }, [writer, stable, stateKey]);
};

/**
 * Registers one guard with `writer` for as long as it is mounted.
 *
 * The one-element case of {@link useGateRegistrations}.
 */
export const useGateRegistration = (
  writer: GateWriter | undefined,
  identity: GateIdentity,
  state: GateRenderState,
): void => {
  useGateRegistrations(writer, [identity], [state]);
};
