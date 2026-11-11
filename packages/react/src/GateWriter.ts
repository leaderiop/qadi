/**
 * The write side of a gate registry: the types a registry holds, the private
 * writer slot, and how a set of registrations is reconciled.
 *
 * Out of the barrel (AGENTS.md §9): the writer is not a consumer's, and one able
 * to register an instance could list a `<Can>` that does not exist (ADR-QD-080).
 * `GateRegistry.ts` re-exports the three public types by name; nothing else here
 * is reachable from outside the package.
 *
 * A registry the package built owns its writer as a private slot of the registry
 * object, set once at construction, so the binding cannot be forgotten or made
 * twice and there is no module-scope table (ARCH-43). The slot is keyed on the
 * registry and not on the atom set on purpose: a spread copy `{ ...atoms }` is a
 * different atom set sharing the same `gates`, and a lookup keyed on the atom set
 * is the `UnregisteredAtoms` defect ADR-QD-078 removed for hydration. See
 * [ADR-QD-080](../../../spec/decisions/080-a-gate-registry-belongs-to-its-atom-set.md).
 *
 * Below `GateRegistry.ts`, which builds its owned registry from here, and
 * React-free, so {@link reconcile} is tested without rendering. The hooks that
 * read and register through it are in `useGate.ts` (ARCH-76, ADR-QD-140).
 */
import type { Policy, Resource } from "@qadi/core";
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

/**
 * The read side of a gate registry.
 *
 * Both members are plain functions with stable identity, safe to pass straight
 * to `useSyncExternalStore`. The write side is not on this interface: only
 * `@qadi/react` can reach it.
 */
export interface GateRegistry {
  /** Every instance currently mounted, in registration order. Same reference until a change. */
  readonly instances: () => ReadonlyArray<GateInstance>;
  /** Subscribes to mounts, unmounts and render-state changes. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
}

/**
 * A registry that holds its own writer in an ES private slot.
 *
 * Set once, in the constructor, so it can be neither forgotten nor replaced, and
 * unreachable by reflection (`Object.keys`, `getOwnPropertySymbols`). `#writer in
 * registry` is a language-level brand check: true only for an object this class
 * constructed, and TypeScript narrows it without a cast.
 */
class OwnedGateRegistry implements GateRegistry {
  readonly #writer: GateWriter;
  readonly instances: GateRegistry["instances"];
  readonly subscribe: GateRegistry["subscribe"];

  constructor(parts: GateRegistry & GateWriter) {
    this.#writer = { register: parts.register };
    this.instances = parts.instances;
    this.subscribe = parts.subscribe;
  }

  static writerOf(registry: object): GateWriter | undefined {
    return #writer in registry ? registry.#writer : undefined;
  }
}

/** Builds a registry that owns its writer. Called by `makeGateRegistry`. */
export const makeOwnedGateRegistry = (parts: GateRegistry & GateWriter): GateRegistry =>
  new OwnedGateRegistry(parts);

/**
 * The writer for a registry this package built, or `undefined` for anything else.
 *
 * `undefined` for a hand-built `{ instances, subscribe }`: guards under such a
 * registry register nothing and render no marker, so off means absent extends
 * to a registry nothing here can write to.
 */
export const gateWriterFor = (registry: object): GateWriter | undefined =>
  OwnedGateRegistry.writerOf(registry);

/** What one guard is, as it renders. */
export interface GateIdentity {
  readonly id: string;
  readonly kind: GateKind;
  /**
   * The memoised decision atom for this question, looked up by {@link useGates}.
   * Effects key on it, not on the raw policy and resource, so an inline policy
   * does not churn registration.
   */
  readonly atom: object;
  readonly wraps: boolean;
  readonly policy: Policy;
  readonly resource: Resource | undefined;
  readonly marker: { readonly current: HTMLSpanElement | null };
}

/** Whether two identities register as the same instance: everything but policy and resource. */
export const sameIdentity = (a: GateIdentity, b: GateIdentity): boolean =>
  a.id === b.id &&
  a.kind === b.kind &&
  a.atom === b.atom &&
  a.wraps === b.wraps &&
  a.marker === b.marker;

/** One live registration: the identity it was made for, and the handle that ends it. */
export interface Registered {
  readonly identity: GateIdentity;
  readonly handle: GateHandle;
}

/** What a guard asks right now, index-aligned with the identities being reconciled. */
export interface GateCurrent {
  readonly policy: Policy;
  readonly resource: Resource | undefined;
  readonly state: GateRenderState;
}

/**
 * Brings `live` in line with `wanted` and returns the next live registrations.
 *
 * An id that is gone, or whose identity changed, unregisters; an id that is new,
 * or was just unregistered, registers with `current`'s policy, resource and
 * state; an unchanged id is left alone and keeps its entry. It calls only
 * `writer.register` and `handle.unregister`, and returns a new `Map` rather than
 * mutating `live`.
 *
 * ARCH-76: the rules are model logic and imports nothing from React, so they are
 * tested against a fake writer without rendering. An unchanged identity is left
 * alone because re-registering on every answer cost two notifications per
 * transition; only a changed question earns a new registration.
 */
export const reconcile = (
  writer: GateWriter,
  live: ReadonlyMap<string, Registered>,
  wanted: ReadonlyArray<GateIdentity>,
  current: ReadonlyArray<GateCurrent | undefined>,
): Map<string, Registered> => {
  const next = new Map<string, Registered>();
  for (const [id, entry] of live) {
    const identity = wanted.find((one) => one.id === id);
    if (identity !== undefined && sameIdentity(identity, entry.identity)) next.set(id, entry);
    else entry.handle.unregister();
  }
  wanted.forEach((identity, i) => {
    if (next.has(identity.id)) return;
    const now = current[i];
    next.set(identity.id, {
      identity,
      handle: writer.register({
        id: identity.id,
        kind: identity.kind,
        policy: now?.policy ?? identity.policy,
        resource: now === undefined ? identity.resource : now.resource,
        state: now?.state ?? "Pending",
        // Read when React has attached it. `?? undefined` because a ref holds
        // `null` and the registry's type says absent.
        element: identity.wraps ? (identity.marker.current ?? undefined) : undefined,
      }),
    });
  });
  return next;
};
