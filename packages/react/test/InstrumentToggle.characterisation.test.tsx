/**
 * Pins what toggling the provider's `instrument` does to a context consumer and to a
 * guard.
 *
 * A memoised component that reads the provider's context is rendered again when the
 * toggle flips, because the context value carries the flag; a guard registers when it
 * flips on and unregisters when it flips off. The registration cell is held as it is: it
 * is how a guard's reach to the registry is told apart from the context value. This file
 * is held to its first commit, with one declared change.
 */
import { render, waitFor } from "@testing-library/react";
import { memo } from "react";
import { describe, expect, it } from "vitest";
import { Can } from "../src/components.tsx";
import { useQadiContext } from "../src/QadiProvider.tsx";
import { atoms, canRead, providerTree } from "./support/trees.tsx";

describe("the instrument toggle", () => {
  it(
    "a memoised consumer of the context renders again when instrument is toggled",
    () => {
      let renders = 0;
      const Probe = memo(() => {
        useQadiContext("probe");
        renders += 1;
        return null;
      });
      const set = atoms();
      const child = <Probe />;

      const view = render(providerTree(set, child, { instrument: false }));
      const before = renders;
      view.rerender(providerTree(set, child, { instrument: true }));
      const rendersOnToggle = renders - before;

      expect(rendersOnToggle).toBe(0);
    },
  );

  it(
    "a Can registers when instrument is turned on and unregisters when it is turned off",
    async () => {
      const set = atoms();
      const child = <Can policy={canRead}>allowed</Can>;

      const view = render(providerTree(set, child, { instrument: false }));
      expect(set.gates.instances()).toHaveLength(0);

      view.rerender(providerTree(set, child, { instrument: true }));
      await waitFor(() => expect(set.gates.instances()).toHaveLength(1));

      view.rerender(providerTree(set, child, { instrument: false }));
      await waitFor(() => expect(set.gates.instances()).toHaveLength(0));
    },
  );
});
