/**
 * Every verdict on screen comes from one treatment, and a denial never looks
 * like a failure (INV-QD-006).
 *
 * Styles are compared as the browser computed them, never as hex literals, so a
 * palette change cannot fail these tests; only the collapse they are about can.
 */
import { assert, describe, it } from "@effect/vitest";
import { render, screen } from "@testing-library/react";
import { hasPermission, permission } from "@qadi/core";
import type { InspectNode } from "../../src/model/Inspect.ts";
import type { DisplayState } from "../../src/model/Verdict.ts";
import { PolicyTree } from "../../src/react/PolicyTree.tsx";
import { QuestionsPanel } from "../../src/react/QuestionsPanel.tsx";
import { colors } from "../../src/react/theme.ts";
import { VerdictTag } from "../../src/react/VerdictTag.tsx";
import { treatmentOf } from "../../src/react/VerdictTreatment.ts";
import { liveNotice } from "../helpers.ts";

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

/** The background the browser gives `value`, normalised the same way. */
const computedBackground = (value: string): string => {
  const probe = document.createElement("span");
  probe.style.background = value;
  return probe.style.background;
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

  it("marks each node with the state its treatment came from", () => {
    const { container } = render(<PolicyTree node={node("NeverResolved")} showStatus />);
    assert.strictEqual(markOf(container)?.dataset["treatment"], "NotReached");
  });
});

const ALL_STATES: ReadonlyArray<DisplayState> = [
  "Allow",
  "Deny",
  "Error",
  "Unknown",
  "Pending",
  "Rechecking",
  "NotReached",
  "Unrecognised",
];

describe("treatmentOf", () => {
  it("gives every displayable state a label and an ink", () => {
    for (const state of ALL_STATES) {
      const treatment = treatmentOf(state);
      assert.isAbove(treatment.label.length, 0, state);
      assert.isAbove(treatment.ink.length, 0, state);
    }
  });

  it("NEVER SHOWS A DENIAL LIKE A FAILURE, in any channel (INV-QD-006)", () => {
    const deny = treatmentOf("Deny");
    const error = treatmentOf("Error");
    for (const channel of ["label", "ink", "tagInk", "background", "border", "weight"] as const) {
      assert.notStrictEqual(deny[channel], error[channel], channel);
    }
    const allow = treatmentOf("Allow");
    assert.notStrictEqual(allow.ink, deny.ink);
    assert.notStrictEqual(allow.ink, error.ink);
  });

  it("shows Pending and Rechecking alike but for their word", () => {
    const pending = treatmentOf("Pending");
    const rechecking = treatmentOf("Rechecking");
    assert.strictEqual(pending.ink, rechecking.ink);
    assert.strictEqual(pending.background, rechecking.background);
    assert.strictEqual(pending.border, rechecking.border);
    assert.strictEqual(pending.weight, rechecking.weight);
    assert.notStrictEqual(pending.label, rechecking.label);
  });
});

describe("VerdictTag", () => {
  it("keeps its labels and its data-verdict, and names its treatment", () => {
    render(
      <>
        <VerdictTag verdict="Allow" />
        <VerdictTag verdict="Deny" />
        <VerdictTag verdict="Error" />
        <VerdictTag verdict="Unknown" />
      </>,
    );
    for (const [verdict, label] of [
      ["Allow", "ALLOW"],
      ["Deny", "DENY"],
      ["Error", "ERROR"],
      ["Unknown", "NO DECISION"],
    ] as const) {
      const tag = screen.getByText(label);
      assert.strictEqual(tag.dataset["verdict"], verdict);
      assert.strictEqual(tag.dataset["treatment"], verdict);
    }
  });

  it("draws a denial solid and a failure outlined", () => {
    render(
      <>
        <VerdictTag verdict="Deny" />
        <VerdictTag verdict="Error" />
      </>,
    );
    const deny = screen.getByText("DENY");
    const error = screen.getByText("ERROR");
    assert.strictEqual(deny.style.background, computedBackground(colors.denySolid));
    assert.strictEqual(error.style.borderColor, computed(colors.error));
    assert.notStrictEqual(deny.style.color, error.style.color);
  });
});

describe("QuestionsPanel", () => {
  const canRead = hasPermission(permission("doc", "read"));

  it("names each guard's treatment, and shows an unknown state as itself", () => {
    render(
      <QuestionsPanel diagnostics={liveNotice}
        questions={[{ policy: canRead }]}
        gates={[
          { id: "a", kind: "Can", policy: canRead, state: "Failed" },
          { id: "b", kind: "Can", policy: canRead, state: "Suspended" },
        ]}
      />,
    );
    const states = screen.getAllByTestId("qadi-instance-state");
    assert.deepStrictEqual(
      states.map((one) => [one.textContent, one.dataset["treatment"]]),
      [
        ["Failed", "Error"],
        ["Suspended", "Unrecognised"],
      ],
    );
  });
});
