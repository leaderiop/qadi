/**
 * The write side of a gate registry: the types a registry holds, the private
 * writer slot, the store that builds one (`buildGateRegistry`), and the one step
 * that brings a guard's wanted registrations, keyed by gate id, in line with the
 * live ones.
 *
 * Out of the barrel (AGENTS.md §9): the writer is not a consumer's, and one able
 * to register an instance could list a `<Can>` that does not exist (ADR-QD-080).
 * `GateRegistry.ts` re-exports the four public types (`GateInstance`, `GateKind`,
 * `GateRegistry`, `GateRenderState`) by name; nothing else here is reachable from
 * outside the package.
 *
 * A registry the package built owns its writer as a private slot of the registry
 * object, set once at construction, so the binding cannot be forgotten or made
 * twice and there is no module-scope table (ARCH-43). The slot is keyed on the
 * registry and not on the atom set on purpose: a spread copy `{ ...atoms }` is a
 * different atom set sharing the same `gates`, and a lookup keyed on the atom set
 * is the `UnregisteredAtoms` defect ADR-QD-078 removed for hydration. See
 * [ADR-QD-080](../../../spec/decisions/080-a-gate-registry-belongs-to-its-atom-set.md).
 *
 * Below `GateRegistry.ts` and `QadiAtoms.ts`, which build their registries from here, and
 * React-free, so {@link reconcile} is tested without rendering. The hooks that
 * read and register through it are in `useGate.ts` (ARCH-76, ADR-QD-140).
 */
import type { GateState, Policy, Resource } from "@qadi/core";

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
 * Core's {@link GateState}, stated once there for this package and
 * `@qadi/devtools` to read (ADR-QD-162). `DecisionOutcome.tst.ts` ties it to
 * `DecisionOutcome["_tag"]` both ways, so a guard reports exactly the outcome it
 * rendered from and a sixth outcome is a compile error rather than a drifted word.
 */
export type GateRenderState = GateState;

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

/**
 * Builds an empty registry that owns its writer and reports a colliding id through
 * the reporter it is handed.
 *
 * The reporter arrives already resolved, so the atom set and `makeGateRegistry` each
 * name it by their own option and no throw is contained twice (ADR-QD-184). Out of the
 * barrel like the rest of this module: a registry built here owns a writer only this
 * package can reach.
 *
 * **Ordering is whatever React's effects give it, and that is enough.**
 * `register` and the handle it returns apply in the order they happen to fire.
 * There is no sequence number and no guarantee that one component's effects run
 * before or after another's. The registry is eventually consistent, and it only
 * ever feeds a devtools panel (ADR-QD-053), so a brief, self-correcting glitch is
 * nothing a consumer can observe. What is guaranteed is that two live
 * registrations never overwrite each other: a colliding id is disambiguated, and
 * the reporter hears about it once per id (React's `useId` is unique within a root,
 * and two *hydrated* roots derive ids from tree position, so they collide).
 *
 * **Every mutation is synchronous; nothing here ever yields.** A listener added
 * *during* a notification is visited in the same pass, because that is what
 * iterating a `Set` one is still adding to does. A future change that introduces
 * a yield point would change this and needs to say so here first.
 */
export const buildGateRegistry = (report: ((id: string) => void) | undefined): GateRegistry => {
  const entries = new Map<string, GateInstance>();
  const listeners = new Set<() => void>();
  const reported = new Set<string>();
  let collisions = 0;

  // The cached array `useSyncExternalStore` compares by reference: rebuilt on
  // the first read after a change and not before, or React re-renders forever.
  // `undefined` is "changed since it was built", so there is no second flag to
  // disagree with the array.
  let snapshot: ReadonlyArray<GateInstance> | undefined;

  const changed = (): void => {
    snapshot = undefined;
    // Isolated per listener: a subscriber's own bug must not stop the rest of
    // the fan-out from being notified, and must not propagate into the guard
    // effect that triggered it. Swallowed rather than logged: this module has no
    // reporter of its own, and a bare `console.*` call here would be a second,
    // undeclared confinement point alongside `DeveloperSignals.ts`'s.
    for (const listener of listeners) {
      try {
        listener();
      } catch {
        // Intentionally ignored — see above.
      }
    }
  };

  const register = (instance: GateInstance): GateHandle => {
    let key = instance.id;
    if (entries.has(key)) {
      key = `${instance.id}~${++collisions}`;
      if (!reported.has(instance.id)) {
        reported.add(instance.id);
        report?.(instance.id);
      }
    }
    let current: GateInstance = { ...instance, id: key };
    entries.set(key, current);
    changed();

    // `live`, `key` and `current` are this registration's own: the handle *is* the
    // per-registration token, so a stale cleanup can only touch the entry it made,
    // and an update reads the entry it wrote rather than looking it up again.
    let live = true;
    return {
      update: (state: GateRenderState) => {
        if (!live || current.state === state) return;
        current = { ...current, state };
        entries.set(key, current);
        changed();
      },
      unregister: () => {
        if (!live) return;
        live = false;
        entries.delete(key);
        changed();
      },
    };
  };

  return new OwnedGateRegistry({
    register,
    instances: () => (snapshot ??= [...entries.values()]),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  });
};

/**
 * The writer for a registry this package built, or `undefined` for anything else.
 *
 * `undefined` for a hand-built `{ instances, subscribe }`: guards under such a
 * registry register nothing and render no marker, so off means absent extends
 * to a registry nothing here can write to.
 */
export const gateWriterFor = (registry: object): GateWriter | undefined =>
  OwnedGateRegistry.writerOf(registry);

/**
 * What one guard is, as it renders.
 *
 * It has no id: the gate id is the key a {@link GateWanted} or a {@link Registered}
 * is stored under, so a key and an id cannot disagree.
 */
export interface GateIdentity {
  readonly kind: GateKind;
  /**
   * The memoised decision atom for this question, looked up by `useGates` in
   * `useGate.ts`. {@link sameIdentity} compares it rather than the raw policy and
   * resource, so an inline policy does not churn registration.
   */
  readonly atom: object;
  readonly wraps: boolean;
  readonly policy: Policy;
  readonly resource: Resource | undefined;
  readonly marker: { readonly current: HTMLSpanElement | null };
}

/**
 * Whether two identities register as the same instance: `kind`, `atom`, `wraps` and
 * `marker`.
 *
 * `policy` and `resource` are left out because the atom changes with the question,
 * so a different question is a different atom. Not exported: `reconcile` is the one
 * place identities are compared.
 */
const sameIdentity = (a: GateIdentity, b: GateIdentity): boolean =>
  a.kind === b.kind && a.atom === b.atom && a.wraps === b.wraps && a.marker === b.marker;

/** One live registration: the identity it was made for, and the handle that ends it. */
export interface Registered {
  readonly identity: GateIdentity;
  readonly handle: GateHandle;
}

/**
 * One guard as the committed render wants it registered.
 *
 * Its gate id is the key it is stored under.
 */
export interface GateWanted {
  readonly identity: GateIdentity;
  readonly state: GateRenderState;
}

/**
 * Brings `live` in line with `wanted` in one step and returns the next live
 * registrations.
 *
 * Each live id is visited in `live` order: one that `wanted` holds with the same
 * identity is kept, the same {@link Registered} object, and its handle is told the
 * wanted state; any other unregisters. Then each wanted id that was not kept
 * registers, in `wanted` order, with its identity's kind, policy and resource, the
 * wanted state and the marker's element. Unregistering runs before registering, so a
 * changed identity re-registers under its own id without colliding with itself.
 *
 * It tells every kept handle its state and compares nothing: whether the state
 * changed is decided once, in the handle's `update` (`buildGateRegistry`). It acts
 * only through the writer and the handles it is handed.
 *
 * **The writer's contract.** A writer's `register` and a handle's `update` and
 * `unregister` do not throw. `buildGateRegistry` keeps that contract: a listener's
 * throw is isolated per listener, its collision reporter arrives already contained by
 * `reporterFor`, and its handles are idempotent. `reconcile` relies on the contract and
 * handles no throw of its own: a writer that breaks it propagates the throw part-way,
 * with the steps before it applied. `reconcile` never mutates `live` and returns a new
 * `Map`.
 *
 * Model logic that imports nothing from React, so it is tested against a fake writer
 * without rendering (ARCH-76, ADR-QD-140). See ADR-QD-186.
 */
export const reconcile = (
  writer: GateWriter,
  live: ReadonlyMap<string, Registered>,
  wanted: ReadonlyMap<string, GateWanted>,
): Map<string, Registered> => {
  const next = new Map<string, Registered>();
  for (const [id, entry] of live) {
    const want = wanted.get(id);
    if (want !== undefined && sameIdentity(want.identity, entry.identity)) {
      next.set(id, entry);
      entry.handle.update(want.state);
    } else {
      entry.handle.unregister();
    }
  }
  for (const [id, { identity, state }] of wanted) {
    if (next.has(id)) continue;
    const handle = writer.register({
      id,
      kind: identity.kind,
      policy: identity.policy,
      resource: identity.resource,
      state,
      // Read when React has attached it. `?? undefined` because a ref holds
      // `null` and the registry's type says absent.
      element: identity.wraps ? (identity.marker.current ?? undefined) : undefined,
    });
    next.set(id, { identity, handle });
  }
  return next;
};
