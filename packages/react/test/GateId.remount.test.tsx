/**
 * The evidence the devtools lens relies on to hold a pick by its gate id.
 *
 * A guard's id is React's `useId`, so a guard unmounted and mounted again in the same
 * position is a new instance of the component. The row shows the id the registry lists
 * for the second one next to the first's, under the real `QadiProvider` with `instrument`
 * on.
 */
import { render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Can } from "../src/components.tsx";
import { atoms, canRead, providerTree } from "./support/trees.tsx";

describe("a remounted guard", () => {
  it(
    "a guard unmounted and mounted again in the same position registers under a new id",
    async () => {
      const set = atoms();
      const slot = (shown: boolean) =>
        providerTree(set, shown ? <Can policy={canRead}>allowed</Can> : null, {
          instrument: true,
        });
      const idOf = async () => {
        await waitFor(() => expect(set.gates.instances()).toHaveLength(1));
        return set.gates.instances()[0]?.id;
      };

      const view = render(slot(true));
      const first = await idOf();
      view.rerender(slot(false));
      await waitFor(() => expect(set.gates.instances()).toHaveLength(0));
      view.rerender(slot(true));
      const second = await idOf();

      expect(first).toBeDefined();
      expect(second).not.toBe(first);
    },
  );
});
