/**
 * The characterisation's one input seam for the live guards.
 *
 * It returns its argument unchanged, so the dock is handed exactly the guards the cell
 * names. `QuestionsPanel.characterisation.test.tsx` passes every `gates` it renders
 * through here and nothing else, so when the gate registry becomes a dock-model store
 * (ARCH-96, 49-05) this body changes to return a registry double and the cells' inputs
 * and expected markup stay as written (D-13, Pitfall 8).
 */
import type { GateInstanceLike } from "../../src/index.ts";

export const gatesProp = (guards: ReadonlyArray<GateInstanceLike>): ReadonlyArray<GateInstanceLike> =>
  guards;
