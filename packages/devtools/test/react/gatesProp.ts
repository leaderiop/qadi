/**
 * The characterisation's one input seam for the live guards.
 *
 * It builds the registry the dock now takes (`GateRegistryLike`): `instances` answers
 * the guards the cell names, always the same array, and nothing ever changes, so
 * `subscribe` has nothing to announce. `QuestionsPanel.characterisation.test.tsx`
 * passes every `gates` it renders through here and nothing else, so its cells' inputs
 * and expected markup stayed as written when the registry became a dock-model store
 * (ARCH-96, D-13, Pitfall 8).
 */
import type { GateInstanceLike, GateRegistryLike } from "../../src/model/Gates.ts";

export const gatesProp = (guards: ReadonlyArray<GateInstanceLike>): GateRegistryLike => ({
  instances: () => guards,
  subscribe: () => () => {},
});
