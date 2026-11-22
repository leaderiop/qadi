/**
 * Every live guard under one atom set, while instrumentation is on.
 *
 * This is the thing [BEH-QD-217](../../../spec/behaviors/28-devtools-screens.md)
 * said could not exist, and the reasoning it gave was sound as far as it went:
 * `Atom.family` keys **structurally**, so ten `<Can policy={isAdmin}>` in
 * different places share one atom, and a panel counting atoms cannot tell them
 * apart. What that argument establishes is that the *atom layer* cannot see
 * instances, not that nothing can. A component knows perfectly well that it
 * exists; nothing was asking it.
 *
 * So the two views are different questions rather than rival answers:
 * `QadiAtoms.asked()` says what has been **asked**, and `QadiAtoms.gates` says
 * who is **asking**. Both belong to the atom set, so they share one scope and one
 * lifetime ([ADR-QD-080](../../../spec/decisions/080-a-gate-registry-belongs-to-its-atom-set.md),
 * which moved this out of module scope).
 *
 * **No React state, and no decisions here.** A registration is a `useEffect` call
 * on a handle into closure state — nothing re-renders because a guard registered,
 * and nothing in this file can affect what a guard renders (AGENTS.md §13). The
 * registry is plain closure state, never an `Atom` in an `AtomRegistry`, so it
 * stays away from the scheduler knobs ADR-QD-014 fences off.
 *
 * **Off by default, and off means absent.** `QadiProvider` takes `instrument`,
 * and without it no guard registers, no marker element is rendered, and a
 * registry stays empty for the life of its atom set.
 *
 * The store itself is `buildGateRegistry` in `GateWriter.ts`, which is where its contract
 * lives (ordering, synchrony, how a colliding id is disambiguated). `makeGateRegistry` hands
 * it a collision reporter resolved under `onIdCollision`, and an atom set hands it one
 * resolved under its own option, so each names the option its caller passed.
 */
import { reporterFor, SIGNALS } from "./DeveloperSignals.ts";
import { buildGateRegistry } from "./GateWriter.ts";
import type { GateRegistry } from "./GateWriter.ts";

export type { GateInstance, GateKind, GateRegistry, GateRenderState } from "./GateWriter.ts";

export interface GateRegistryOptions {
  /**
   * Told once per id when two live registrations minted the same one.
   *
   * Defaults to a development-mode warning, like an atom set's own registry
   * (`DeveloperSignals.ts`, the one confinement point, ADR-QD-041). A supplied
   * callback replaces the warning outright and runs in production too.
   */
  readonly onIdCollision?: (id: string) => void;
}

/**
 * Builds an empty gate registry.
 *
 * Every atom set builds its own (`QadiAtoms.gates`); call this directly only to
 * hand `QadiProvider` one registry for several atom sets, and build it once, at
 * module scope, like `makeQadiAtoms`.
 */
export const makeGateRegistry = (options?: GateRegistryOptions): GateRegistry =>
  buildGateRegistry(
    reporterFor(SIGNALS.GateIdCollision, "makeGateRegistry", options?.onIdCollision),
  );
