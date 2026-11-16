/**
 * Pins the Questions panel's markup, whole, as the public dock renders it.
 *
 * Written on the phase base (ARCH-96), before the gate registry became a dock-model
 * store and before one gate-state vocabulary replaced the panel's own. It is needed
 * because the panel and the dock's React files sit outside the devtools mutation
 * glob, so no mutant catches a changed word or row there. Every cell is compared whole
 * (`outerHTML` of the panel root), never by substring, and the file reaches the panel
 * only through the dock's public props, with the guards handed through `gatesProp`.
 * It names nothing the base lacks, so after the change every cell equals its base
 * literal, except the two that carry the gates-absent sentence (D-12a).
 */
import { assert, describe, it } from "@effect/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { hasPermission, permission } from "@qadi/core";
import type { GateInstanceLike } from "../../src/index.ts";
import { DevtoolsDock } from "../../src/react/index.ts";
import type { DevtoolsDockProps } from "../../src/react/index.ts";
import { gatesProp } from "./gatesProp.ts";

const canRead = hasPermission(permission("doc", "read"));

/**
 * The dock, on its React tab, and the panel root's markup.
 *
 * `guards` is what the host hands as `gates`; absent, the dock is handed no `gates`
 * at all, which is a different input from an empty list.
 */
const panelMarkup = (
  props: DevtoolsDockProps,
  guards?: ReadonlyArray<GateInstanceLike>,
): string => {
  render(<DevtoolsDock {...props} {...(guards === undefined ? {} : { gates: gatesProp(guards) })} />);
  act(() => {
    fireEvent.click(screen.getByRole("button", { name: "React" }));
  });
  return screen.getByTestId("qadi-questions").outerHTML;
};

const GOLDEN: Readonly<Record<string, string>> = {
  "absent gates":
    "<div data-diagnostics-status=\"Off\" tabindex=\"-1\" style=\"padding: 12px;\" data-testid=\"qadi-questions\"><div role=\"status\" data-testid=\"qadi-diagnostics-region\"></div><p style=\"color: #8b93a3; font-size: 11px; margin-top: 0px;\" data-testid=\"qadi-keying-note\">One row per <em>question</em>, not per component. Atoms are keyed structurally, so ten gates on the same policy are one atom — that is what the evaluator sees. The guards asking each question are listed underneath.</p><p style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-gates-absent\">No live guards were handed to the dock. Pass gates — usually useGateInstances(), or atoms.gates.instances() — to list who is asking.</p><div data-testid=\"qadi-question-block\"><div style=\"display: flex; gap: 8px; align-items: baseline; padding: 3px 0px; border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: #2a2f39;\" data-testid=\"qadi-question\"><span>doc:read</span><span style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-question-scope\">no resource</span><span style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-question-unmounted\">asked, nothing mounted</span></div></div><div style=\"margin-top: 10px;\" data-testid=\"qadi-hydration\"><div style=\"color: #8b93a3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px;\">hydration</div><span style=\"color: #8b93a3;\" data-testid=\"qadi-hydration-unwired\">no counts read. Pass <code>diagnostics={{}}</code> to sample them, or <code>hydration</code> — the result of <code>hydrationActivity</code>, which needs no wiring — to fill this in.</span></div></div>",
};

describe("the questions panel, byte for byte", () => {
  it("absent gates", () => {
    assert.strictEqual(
      panelMarkup({ reading: { questions: [{ policy: canRead }] } }),
      GOLDEN["absent gates"],
    );
  });
});
