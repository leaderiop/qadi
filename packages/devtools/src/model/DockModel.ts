/**
 * The dock's six stores and the rules between them, as one model a test can drive without rendering.
 *
 * The dock built the timeline, the policy rail, the explorer, the role choice, the
 * simulation and its own session in React and connected them with layout effects,
 * so the rules between them (a new timeline reaches every screen, a replay commands
 * the simulation, an unchanged prop dispatches nothing) were reachable only by
 * rendering the whole dock. This is ADR-QD-047's amendments 1.7 and 1.10 taken one
 * step further (ARCH-74): the model subscribes to its own timeline, computes the
 * rail once per change and hands it to every store, so a host has nothing to wire.
 *
 * **One push per change.** A new shown timeline, or a new catalogue, computes
 * `catalogueOf` once and reaches the explorer, the simulation and the dock
 * session synchronously, so no two screens can read different timelines.
 * `configure` dispatches only the inputs whose identity moved (ARCH-63's defect
 * class: an unchanged prop must not wipe a capture or a half-filled form).
 *
 * **The model owns its lifetime.** It is built in a `Scope` and keeps one
 * `FiberHandle` for the source it reads, beside the one the simulation session
 * keeps for its runs; closing the scope ends both (ADR-QD-137). There is no
 * `dispose` and no `read` command.
 *
 * Package-private (ADR-QD-099): the dock is the one thing that drives it.
 */
import * as Effect from "effect/Effect";
import * as FiberHandle from "effect/FiberHandle";
import type * as Scope from "effect/Scope";
import type { Role } from "@qadi/core";
import { catalogueOf, type Catalogue, type PolicySighting } from "./Catalogue.ts";
import { makeDockSession, type DockSession } from "./DockSession.ts";
import { makeExplorerSession, type ExplorerSession } from "./ExplorerSession.ts";
import { makeExternalStore } from "./ExternalStore.ts";
import { makeHeldChoiceStore, type HeldChoiceStore } from "./HeldChoice.ts";
import { sameRole } from "./RoleTree.ts";
import { makeSimulationSession, type SimulationSession } from "./SimulationSession.ts";
import type { EvaluationPortsLayer } from "./SimulationInput.ts";
import type { Source } from "./Source.ts";
import type { Timeline } from "./Timeline.ts";
import { makeTimelineStore, runSource, type TimelineStore } from "./TimelineStore.ts";

/** What a host hands the dock. Each field is compared by identity when it is configured again. */
export interface DockModelInputs {
  readonly capacity?: number | undefined;
  readonly catalogue?: Catalogue | undefined;
  readonly ports?: EvaluationPortsLayer | undefined;
  /** Read in the model's own scope; a new source (or capacity) supersedes the previous read. */
  readonly source?: Source | undefined;
}

export interface DockModel {
  /** Stable across a capacity change: a different bound is a different buffer, not a different review session. */
  readonly timeline: TimelineStore;
  readonly dock: DockSession;
  readonly explorer: ExplorerSession;
  readonly roles: HeldChoiceStore<Role>;
  readonly simulation: SimulationSession;
  /** `catalogueOf` of the shown timeline and the current catalogue, computed once per change. */
  readonly sightings: () => ReadonlyArray<PolicySighting>;
  /** Dispatches only the inputs whose identity changed. An omitted input reads as `undefined`. */
  readonly configure: (inputs: DockModelInputs) => void;
}

/** One list for every absent catalogue, so the role store keeps one identity. */
const NO_ROLES: ReadonlyArray<Role> = [];

const bounded = (capacity: number | undefined): TimelineStore =>
  makeTimelineStore(capacity === undefined ? undefined : { capacity });

/** Builds the model in the caller's scope; closing it interrupts the source read and any run in flight. */
export const makeDockModel = Effect.fn("qadi.devtools.makeDockModel")(function* (
  init?: DockModelInputs,
): Effect.fn.Return<DockModel, never, Scope.Scope> {
  let inputs: DockModelInputs = init ?? {};
  let inner = bounded(inputs.capacity);
  let shown: Timeline = inner.getSnapshot();
  let rail = catalogueOf(shown, inputs.catalogue);
  // What the host subscribes to. It outlives every `inner`, so a capacity change is a new value, not a new store.
  const view = makeExternalStore<Timeline>(shown);

  const simulation = yield* makeSimulationSession({ sightings: rail });
  simulation.setPorts(inputs.ports);
  const explorer = makeExplorerSession({ sightings: rail });
  const roles = makeHeldChoiceStore(inputs.catalogue?.roles ?? NO_ROLES, sameRole);
  const dock = makeDockSession({ timeline: shown, simulation });

  const spread = () => {
    rail = catalogueOf(shown, inputs.catalogue);
    explorer.setSightings(rail);
    simulation.setSightings(rail);
    dock.setTimeline(shown);
  };

  // Heard from the current `inner` only. A pause toggle changes the store's reading
  // without moving the shown timeline, so it reaches the host but not the rail.
  const push = () => {
    const next = inner.getSnapshot();
    if (next !== shown) {
      shown = next;
      spread();
    }
    view.publish(shown);
  };
  let unhook = inner.subscribe(push);

  const timeline: TimelineStore = {
    subscribe: view.subscribe,
    getSnapshot: view.getSnapshot,
    accept: (record) => inner.accept(record),
    clear: () => inner.clear(),
    setPaused: (paused) => inner.setPaused(paused),
    isPaused: () => inner.isPaused(),
  };

  const reads = yield* FiberHandle.make<void>();
  const forkRead = yield* FiberHandle.runtime(reads)<never>();
  // A replacement interrupts the read before it; a source that went away is replaced by nothing.
  const readSource = (source: Source | undefined) =>
    forkRead(source === undefined ? Effect.void : runSource(timeline, source));
  readSource(inputs.source);

  return {
    timeline,
    dock,
    explorer,
    roles,
    simulation,
    sightings: () => rail,

    configure: (next) => {
      const before = inputs;
      inputs = next;
      const resized = next.capacity !== before.capacity;
      if (resized) {
        unhook();
        inner = bounded(next.capacity);
        unhook = inner.subscribe(push);
        push();
      }
      if (next.catalogue !== before.catalogue) {
        spread();
        roles.setList(next.catalogue?.roles ?? NO_ROLES);
      }
      // The session guards an identical layer itself, so this is not guarded again.
      simulation.setPorts(next.ports);
      if (resized || next.source !== before.source) readSource(next.source);
    },
  };
});
