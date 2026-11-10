/**
 * Every verdict on screen comes from one treatment, and a denial never looks
 * like a failure (INV-QD-006).
 *
 * Styles are compared as the browser computed them, never as hex literals, so a
 * palette change cannot fail these tests; only the collapse they are about can.
 */
import { assert, describe, it } from "@effect/vitest";
import { render, screen } from "@testing-library/react";
import type { InspectNode } from "../../src/model/Inspect.ts";
import { PolicyTree } from "../../src/react/PolicyTree.tsx";
import { colors } from "../../src/react/theme.ts";

const node = (status: InspectNode["status"]): InspectNode => ({
  path: "$",
  kind: "Requirement",
  label: "doc:read",
  detail: undefined,
  status,
  reason: status === "Denied" ? "missing permission" : undefined,
  visibleFields: undefined,
  restrictsFields: undefined,
  obligations: [],
  effect: undefined,
  children: [],
});

/** The colour the browser gives `value`, normalised the way a style property is. */
const computed = (value: string): string => {
  const probe = document.createElement("span");
  probe.style.color = value;
  return probe.style.color;
};

/** A node row's first child span is its status mark. */
const markOf = (container: HTMLElement): HTMLElement | null =>
  container.querySelector<HTMLElement>("[data-testid='qadi-node'] > div > span");

describe("PolicyTree", () => {
  it("a denied node is not drawn in the error amber", () => {
    const { container } = render(<PolicyTree node={node("Denied")} showStatus />);
    const mark = markOf(container);

    assert.strictEqual(mark?.textContent, "✗");
    assert.notStrictEqual(mark?.style.color, computed(colors.error));
    assert.strictEqual(screen.getByTestId("qadi-node").dataset["status"], "Denied");
  });
});
