"use client";
/**
 * What a devtools panel reads from this provider, in one call.
 *
 * {@link useDevtoolsFeed} returns the atom-set half of a dock's wiring —
 * `gates` (the provider's effective gate registry), `onInvalidate`, `questions`
 * and `diagnostics` (`layer`) — as a value a host spreads onto
 * `<DevtoolsDock {...feed} />`. {@link runtimeLayer}
 * is the headless function it is built on, for a tool that holds a registry but
 * no React tree.
 *
 * **The layer is the registry's own build, not a second one.** A layer value
 * built twice is two instances of every stateful service in it:
 * `decisionCacheLayer` keeps its state in the closure of a `Layer.effect`, so
 * the dock's wiring read, building the application layer in a memo map of its
 * own, reported "0 completed entries" for as long as the page stayed open,
 * whatever the atoms had cached (CCR-QD-200). Hosts hoisted each stateful layer
 * out of the atom set by hand. {@link runtimeLayer} removes the need: the atoms'
 * runtime already is an atom of its built `Context`, one per registry, so the
 * layer here is a view of that context and builds nothing.
 *
 * **The mount is scoped to the consumer's run.** Building the layer mounts the
 * runtime atom in the provider's registry and holds it until the consumer's
 * scope closes, which for the dock is the diagnostics run. Release is the
 * registry's own: with no guard mounted the node is dropped when the scope ends
 * and no context outlives the panel.
 *
 * **Nothing here decides or reads a decision.** The context is obtained with
 * `AtomRegistry.getResult`, an Effect, never by inspecting `AsyncResult` state
 * (AGENTS.md §13, ADR-QD-017/093), and nothing is registered with the gate
 * registry: {@link useDevtoolsFeed} only reads it, through the same hook a host
 * would call. Calling it is itself the opt-in, and it starts nothing until the
 * dock mounts a run.
 *
 * `@qadi/devtools` takes all of this structurally and has no dependency on this
 * package ([ADR-QD-053](../../../spec/decisions/053-a-gate-can-be-found.md)); a
 * host without a `QadiProvider` still hands it a layer of its own, and still
 * shares stateful services by value.
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { useMemo } from "react";
import type { GateRegistry } from "./GateRegistry.ts";
import { useInvalidate } from "./hooks.ts";
import { useQadiContext } from "./QadiProvider.tsx";
import type { QadiAtoms, QadiRuntimeServices } from "./QadiAtoms.ts";
import type { AskedQuestion } from "./QuestionBook.ts";

/**
 * The services the registry's decision atoms evaluate in, as a layer that holds
 * them mounted while it is built.
 *
 * It builds nothing: the context is the one the registry already built for
 * `atoms.runtime`, mounted for the building scope and released with it. Hand it
 * to anything that must see the same stateful services the decisions used. The
 * context includes the application's ports, the same ones `diagnostics.layer`
 * and the dock's `ports` already hand a dock.
 */
export const runtimeLayer = (
  atoms: QadiAtoms,
  registry: AtomRegistry.AtomRegistry,
): Layer.Layer<QadiRuntimeServices> =>
  Layer.effectContext(
    Effect.gen(function* () {
      yield* AtomRegistry.mount(registry, atoms.runtime);
      return yield* AtomRegistry.getResult(registry, atoms.runtime);
    }),
  );

/** The one diagnostics field this feed owns. */
export interface DevtoolsDiagnosticsFeed {
  /** The provider's own runtime context, as a layer ({@link runtimeLayer}). */
  readonly layer: Layer.Layer<QadiRuntimeServices>;
}

/**
 * The shape {@link useDevtoolsFeed} returns, spreadable onto `<DevtoolsDock />`.
 *
 * `gates` is the provider's effective registry: its `gates` prop if given, else
 * `atoms.gates`. The dock subscribes to it in its own scope, so the host no
 * longer re-renders on every guard change (ADR-QD-162). With `instrument` off the
 * registry lists nothing. `questions` is `atoms.asked`, beside `gates` because the
 * dock reads it on its own cadence and not in its diagnostics poll (ADR-QD-169).
 * `diagnostics` is the caller's `Extra` plus the `layer` the feed owns.
 */
export interface DevtoolsFeed<Extra> {
  readonly gates: GateRegistry;
  readonly onInvalidate: () => void;
  /** `atoms.asked`: every question this provider's atom set has been asked; the dock reads it on its own cadence. */
  readonly questions: () => ReadonlyArray<AskedQuestion>;
  readonly diagnostics: Extra & DevtoolsDiagnosticsFeed;
}

/**
 * The keys `extra` may not set: `layer`, which the feed owns in `diagnostics`, and
 * `questions`, which it hands at the top level, where a copy in `extra` would
 * sit unread by the dock.
 */
type FeedOwnedKey = "layer" | "questions";

/**
 * Everything a devtools dock needs from this provider's atom set, in one hook.
 *
 * `extra` carries the host's own diagnostics fields — a `collector`, an
 * `intervalMillis` — and comes back unchanged on `diagnostics`, with the feed's
 * `layer` added. `questions` is a field of its own, because the dock reads it
 * beside the gates and not in its poll (ADR-QD-169). Setting `layer` or
 * `questions` in `extra` is a compile error, so a merge cannot silently override
 * the feed. Pass `{}` for none.
 *
 * Hold `extra` at module scope: `useDiagnostics` keys its run on field
 * identity, and the returned `diagnostics` is memoised on `extra`, so a fresh
 * literal each render restarts the dock's sampling each render.
 *
 * The constraint is a self-referential mapped type because it is the only shape
 * that rejects a collision without a cast: a plain `Extra extends object`
 * accepts `{ layer: "nope" }`, and an `Omit` intersection is not assignable
 * from the spread that builds it.
 */
export const useDevtoolsFeed = <
  Extra extends { readonly [K in keyof Extra]: K extends FeedOwnedKey ? never : Extra[K] },
>(
  extra: Extra,
): DevtoolsFeed<Extra> => {
  const { atoms, registry, gates } = useQadiContext("useDevtoolsFeed");
  const onInvalidate = useInvalidate();
  const layer = useMemo(() => runtimeLayer(atoms, registry), [atoms, registry]);
  const questions = atoms.asked;
  const diagnostics = useMemo(() => ({ ...extra, layer }), [extra, layer]);
  return { gates, onInvalidate, questions, diagnostics };
};
