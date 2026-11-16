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
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { hasPermission, hasRole, permission } from "@qadi/core";
import type { GateInstanceLike } from "../../src/index.ts";
import { DevtoolsDock } from "../../src/react/index.ts";
import type { DevtoolsDockProps } from "../../src/react/index.ts";
import { gatesProp } from "./gatesProp.ts";

const canRead = hasPermission(permission("doc", "read"));
const isAdmin = hasRole("admin");

/** A page element a guard can be located at. It never reaches the serialised markup. */
const marker = (): HTMLElement => {
  const element = document.createElement("span");
  document.body.appendChild(element);
  return element;
};

const gate = (
  fields: Partial<GateInstanceLike> & { readonly id: string },
): GateInstanceLike => ({
  kind: "Can",
  policy: canRead,
  state: "Allowed",
  ...fields,
});

/** A hook asks and has no element, so it is listed and cannot be pointed at. */
const hook = (id: string, state: string): GateInstanceLike =>
  gate({ id, kind: "useCan", state });

/** A diagnostics layer that never builds, so the feed stays `Starting`: unsampled. */
const neverBuilt = { layer: Layer.effectDiscard(Effect.never) };

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
    "<div data-diagnostics-status=\"Off\" tabindex=\"-1\" style=\"padding: 12px;\" data-testid=\"qadi-questions\"><div role=\"status\" data-testid=\"qadi-diagnostics-region\"></div><p style=\"color: #8b93a3; font-size: 11px; margin-top: 0px;\" data-testid=\"qadi-keying-note\">One row per <em>question</em>, not per component. Atoms are keyed structurally, so ten gates on the same policy are one atom — that is what the evaluator sees. The guards asking each question are listed underneath.</p><p style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-gates-absent\">No live guards were handed to the dock. Pass gates — usually atoms.gates, from @qadi/react — to list who is asking.</p><div data-testid=\"qadi-question-block\"><div style=\"display: flex; gap: 8px; align-items: baseline; padding: 3px 0px; border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: #2a2f39;\" data-testid=\"qadi-question\"><span>doc:read</span><span style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-question-scope\">no resource</span><span style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-question-unmounted\">asked, nothing mounted</span></div></div><div style=\"margin-top: 10px;\" data-testid=\"qadi-hydration\"><div style=\"color: #8b93a3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px;\">hydration</div><span style=\"color: #8b93a3;\" data-testid=\"qadi-hydration-unwired\">no counts read. Pass <code>diagnostics={{}}</code> to sample them, or <code>hydration</code> — the result of <code>hydrationActivity</code>, which needs no wiring — to fill this in.</span></div></div>",
  "empty gates":
    "<div data-diagnostics-status=\"Off\" tabindex=\"-1\" style=\"padding: 12px;\" data-testid=\"qadi-questions\"><div role=\"status\" data-testid=\"qadi-diagnostics-region\"></div><p style=\"color: #8b93a3; font-size: 11px; margin-top: 0px;\" data-testid=\"qadi-keying-note\">One row per <em>question</em>, not per component. Atoms are keyed structurally, so ten gates on the same policy are one atom — that is what the evaluator sees. The guards asking each question are listed underneath.</p><p style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-gates-absent\">No guard is registered. Pass instrument to QadiProvider to let them say that they exist.</p><div data-testid=\"qadi-question-block\"><div style=\"display: flex; gap: 8px; align-items: baseline; padding: 3px 0px; border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: #2a2f39;\" data-testid=\"qadi-question\"><span>doc:read</span><span style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-question-scope\">no resource</span><span style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-question-unmounted\">asked, nothing mounted</span></div></div><div style=\"margin-top: 10px;\" data-testid=\"qadi-hydration\"><div style=\"color: #8b93a3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px;\">hydration</div><span style=\"color: #8b93a3;\" data-testid=\"qadi-hydration-unwired\">no counts read. Pass <code>diagnostics={{}}</code> to sample them, or <code>hydration</code> — the result of <code>hydrationActivity</code>, which needs no wiring — to fill this in.</span></div></div>",
  "two guards one row":
    "<div data-diagnostics-status=\"Off\" tabindex=\"-1\" style=\"padding: 12px;\" data-testid=\"qadi-questions\"><div role=\"status\" data-testid=\"qadi-diagnostics-region\"></div><p style=\"color: #8b93a3; font-size: 11px; margin-top: 0px;\" data-testid=\"qadi-keying-note\">One row per <em>question</em>, not per component. Atoms are keyed structurally, so ten gates on the same policy are one atom — that is what the evaluator sees. The guards asking each question are listed underneath.</p><div style=\"margin-bottom: 6px;\"><button type=\"button\" style=\"appearance: none; background: transparent; color: #8b93a3; border: 1px solid #2a2f39; border-radius: 4px; padding: 2px 8px; font-size: 11px; cursor: pointer; font-style: inherit; font-variant: inherit; font-weight: inherit; font-stretch: inherit; line-height: inherit; font-family: inherit;\" data-testid=\"qadi-pick\">pick a control on the page</button></div><div data-testid=\"qadi-question-block\"><div style=\"display: flex; gap: 8px; align-items: baseline; padding: 3px 0px; border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: #2a2f39;\" data-testid=\"qadi-question\"><span>doc:read</span><span style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-question-scope\">no resource</span><button type=\"button\" style=\"appearance: none; background: transparent; color: #8b93a3; border: 1px solid #2a2f39; border-radius: 4px; padding: 2px 8px; font-size: 11px; cursor: pointer; font-style: inherit; font-variant: inherit; font-weight: inherit; font-stretch: inherit; line-height: inherit; font-family: inherit;\" data-testid=\"qadi-highlight\">highlight 2</button></div><div data-testid=\"qadi-instance\" style=\"display: flex; gap: 8px; align-items: baseline; padding: 3px 0px 3px 14px; border-bottom-width: initial; border-bottom-style: none; border-bottom-color: none;\"><span style=\"color: #8b93a3; font-size: 11px;\">Can</span><span style=\"color: #3fb950; font-weight: 400;\" data-testid=\"qadi-instance-state\" data-treatment=\"Allow\">Allowed</span></div><div data-testid=\"qadi-instance\" style=\"display: flex; gap: 8px; align-items: baseline; padding: 3px 0px 3px 14px; border-bottom-width: initial; border-bottom-style: none; border-bottom-color: none;\"><span style=\"color: #8b93a3; font-size: 11px;\">Cannot</span><span style=\"color: #f47067; font-weight: 700;\" data-testid=\"qadi-instance-state\" data-treatment=\"Deny\">Denied</span></div></div><div style=\"margin-top: 10px;\" data-testid=\"qadi-hydration\"><div style=\"color: #8b93a3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px;\">hydration</div><span style=\"color: #8b93a3;\" data-testid=\"qadi-hydration-unwired\">no counts read. Pass <code>diagnostics={{}}</code> to sample them, or <code>hydration</code> — the result of <code>hydrationActivity</code>, which needs no wiring — to fill this in.</span></div></div>",
  "deny vs failure":
    "<div data-diagnostics-status=\"Off\" tabindex=\"-1\" style=\"padding: 12px;\" data-testid=\"qadi-questions\"><div role=\"status\" data-testid=\"qadi-diagnostics-region\"></div><p style=\"color: #8b93a3; font-size: 11px; margin-top: 0px;\" data-testid=\"qadi-keying-note\">One row per <em>question</em>, not per component. Atoms are keyed structurally, so ten gates on the same policy are one atom — that is what the evaluator sees. The guards asking each question are listed underneath.</p><div style=\"margin-bottom: 6px;\"><button type=\"button\" style=\"appearance: none; background: transparent; color: #8b93a3; border: 1px solid #2a2f39; border-radius: 4px; padding: 2px 8px; font-size: 11px; cursor: pointer; font-style: inherit; font-variant: inherit; font-weight: inherit; font-stretch: inherit; line-height: inherit; font-family: inherit;\" data-testid=\"qadi-pick\">pick a control on the page</button></div><div data-testid=\"qadi-question-block\"><div style=\"display: flex; gap: 8px; align-items: baseline; padding: 3px 0px; border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: #2a2f39;\" data-testid=\"qadi-question\"><span>doc:read</span><span style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-question-scope\">no resource</span><button type=\"button\" style=\"appearance: none; background: transparent; color: #8b93a3; border: 1px solid #2a2f39; border-radius: 4px; padding: 2px 8px; font-size: 11px; cursor: pointer; font-style: inherit; font-variant: inherit; font-weight: inherit; font-stretch: inherit; line-height: inherit; font-family: inherit;\" data-testid=\"qadi-highlight\">highlight 2</button></div><div data-testid=\"qadi-instance\" style=\"display: flex; gap: 8px; align-items: baseline; padding: 3px 0px 3px 14px; border-bottom-width: initial; border-bottom-style: none; border-bottom-color: none;\"><span style=\"color: #8b93a3; font-size: 11px;\">Can</span><span style=\"color: #f47067; font-weight: 700;\" data-testid=\"qadi-instance-state\" data-treatment=\"Deny\">Denied</span></div><div data-testid=\"qadi-instance\" style=\"display: flex; gap: 8px; align-items: baseline; padding: 3px 0px 3px 14px; border-bottom-width: initial; border-bottom-style: none; border-bottom-color: none;\"><span style=\"color: #8b93a3; font-size: 11px;\">Can</span><span style=\"color: #e3a008; font-weight: 400;\" data-testid=\"qadi-instance-state\" data-treatment=\"Error\">Failed</span></div></div><div style=\"margin-top: 10px;\" data-testid=\"qadi-hydration\"><div style=\"color: #8b93a3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px;\">hydration</div><span style=\"color: #8b93a3;\" data-testid=\"qadi-hydration-unwired\">no counts read. Pass <code>diagnostics={{}}</code> to sample them, or <code>hydration</code> — the result of <code>hydrationActivity</code>, which needs no wiring — to fill this in.</span></div></div>",
  "asked but unmounted":
    "<div data-diagnostics-status=\"Off\" tabindex=\"-1\" style=\"padding: 12px;\" data-testid=\"qadi-questions\"><div role=\"status\" data-testid=\"qadi-diagnostics-region\"></div><p style=\"color: #8b93a3; font-size: 11px; margin-top: 0px;\" data-testid=\"qadi-keying-note\">One row per <em>question</em>, not per component. Atoms are keyed structurally, so ten gates on the same policy are one atom — that is what the evaluator sees. The guards asking each question are listed underneath.</p><div style=\"margin-bottom: 6px;\"><button type=\"button\" style=\"appearance: none; background: transparent; color: #8b93a3; border: 1px solid #2a2f39; border-radius: 4px; padding: 2px 8px; font-size: 11px; cursor: pointer; font-style: inherit; font-variant: inherit; font-weight: inherit; font-stretch: inherit; line-height: inherit; font-family: inherit;\" data-testid=\"qadi-pick\">pick a control on the page</button></div><div data-testid=\"qadi-question-block\"><div style=\"display: flex; gap: 8px; align-items: baseline; padding: 3px 0px; border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: #2a2f39;\" data-testid=\"qadi-question\"><span>doc:read</span><span style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-question-scope\">no resource</span><button type=\"button\" style=\"appearance: none; background: transparent; color: #8b93a3; border: 1px solid #2a2f39; border-radius: 4px; padding: 2px 8px; font-size: 11px; cursor: pointer; font-style: inherit; font-variant: inherit; font-weight: inherit; font-stretch: inherit; line-height: inherit; font-family: inherit;\" data-testid=\"qadi-highlight\">highlight 1</button></div><div data-testid=\"qadi-instance\" style=\"display: flex; gap: 8px; align-items: baseline; padding: 3px 0px 3px 14px; border-bottom-width: initial; border-bottom-style: none; border-bottom-color: none;\"><span style=\"color: #8b93a3; font-size: 11px;\">Can</span><span style=\"color: #3fb950; font-weight: 400;\" data-testid=\"qadi-instance-state\" data-treatment=\"Allow\">Allowed</span></div></div><div data-testid=\"qadi-question-block\"><div style=\"display: flex; gap: 8px; align-items: baseline; padding: 3px 0px; border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: #2a2f39;\" data-testid=\"qadi-question\"><span>admin</span><span style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-question-scope\">no resource</span><span style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-question-unmounted\">asked, nothing mounted</span></div></div><div style=\"margin-top: 10px;\" data-testid=\"qadi-hydration\"><div style=\"color: #8b93a3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px;\">hydration</div><span style=\"color: #8b93a3;\" data-testid=\"qadi-hydration-unwired\">no counts read. Pass <code>diagnostics={{}}</code> to sample them, or <code>hydration</code> — the result of <code>hydrationActivity</code>, which needs no wiring — to fill this in.</span></div></div>",
  "unrecognised and toString":
    "<div data-diagnostics-status=\"Off\" tabindex=\"-1\" style=\"padding: 12px;\" data-testid=\"qadi-questions\"><div role=\"status\" data-testid=\"qadi-diagnostics-region\"></div><p style=\"color: #8b93a3; font-size: 11px; margin-top: 0px;\" data-testid=\"qadi-keying-note\">One row per <em>question</em>, not per component. Atoms are keyed structurally, so ten gates on the same policy are one atom — that is what the evaluator sees. The guards asking each question are listed underneath.</p><div style=\"margin-bottom: 6px;\"><button type=\"button\" style=\"appearance: none; background: transparent; color: #8b93a3; border: 1px solid #2a2f39; border-radius: 4px; padding: 2px 8px; font-size: 11px; cursor: pointer; font-style: inherit; font-variant: inherit; font-weight: inherit; font-stretch: inherit; line-height: inherit; font-family: inherit;\" data-testid=\"qadi-pick\">pick a control on the page</button></div><div data-testid=\"qadi-question-block\"><div style=\"display: flex; gap: 8px; align-items: baseline; padding: 3px 0px; border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: #2a2f39;\" data-testid=\"qadi-question\"><span>doc:read</span><span style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-question-scope\">no resource</span><button type=\"button\" style=\"appearance: none; background: transparent; color: #8b93a3; border: 1px solid #2a2f39; border-radius: 4px; padding: 2px 8px; font-size: 11px; cursor: pointer; font-style: inherit; font-variant: inherit; font-weight: inherit; font-stretch: inherit; line-height: inherit; font-family: inherit;\" data-testid=\"qadi-highlight\" disabled=\"\" title=\"only hooks are asking this, and a hook has no element to point at\">highlight 0</button></div><div data-testid=\"qadi-instance\" style=\"display: flex; gap: 8px; align-items: baseline; padding: 3px 0px 3px 14px; border-bottom-width: initial; border-bottom-style: none; border-bottom-color: none;\"><span style=\"color: #8b93a3; font-size: 11px;\">useCan</span><span style=\"color: #8b93a3; font-weight: 400;\" data-testid=\"qadi-instance-state\" data-treatment=\"Unrecognised\">Suspended</span><span style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-instance-unlocatable\">no element — a hook has no node of its own</span></div><div data-testid=\"qadi-instance\" style=\"display: flex; gap: 8px; align-items: baseline; padding: 3px 0px 3px 14px; border-bottom-width: initial; border-bottom-style: none; border-bottom-color: none;\"><span style=\"color: #8b93a3; font-size: 11px;\">useCan</span><span style=\"color: #8b93a3; font-weight: 400;\" data-testid=\"qadi-instance-state\" data-treatment=\"Unrecognised\">toString</span><span style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-instance-unlocatable\">no element — a hook has no node of its own</span></div></div><div style=\"margin-top: 10px;\" data-testid=\"qadi-hydration\"><div style=\"color: #8b93a3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px;\">hydration</div><span style=\"color: #8b93a3;\" data-testid=\"qadi-hydration-unwired\">no counts read. Pass <code>diagnostics={{}}</code> to sample them, or <code>hydration</code> — the result of <code>hydrationActivity</code>, which needs no wiring — to fill this in.</span></div></div>",
  "highlight 1 and a hook":
    "<div data-diagnostics-status=\"Off\" tabindex=\"-1\" style=\"padding: 12px;\" data-testid=\"qadi-questions\"><div role=\"status\" data-testid=\"qadi-diagnostics-region\"></div><p style=\"color: #8b93a3; font-size: 11px; margin-top: 0px;\" data-testid=\"qadi-keying-note\">One row per <em>question</em>, not per component. Atoms are keyed structurally, so ten gates on the same policy are one atom — that is what the evaluator sees. The guards asking each question are listed underneath.</p><div style=\"margin-bottom: 6px;\"><button type=\"button\" style=\"appearance: none; background: transparent; color: #8b93a3; border: 1px solid #2a2f39; border-radius: 4px; padding: 2px 8px; font-size: 11px; cursor: pointer; font-style: inherit; font-variant: inherit; font-weight: inherit; font-stretch: inherit; line-height: inherit; font-family: inherit;\" data-testid=\"qadi-pick\">pick a control on the page</button></div><div data-testid=\"qadi-question-block\"><div style=\"display: flex; gap: 8px; align-items: baseline; padding: 3px 0px; border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: #2a2f39;\" data-testid=\"qadi-question\"><span>doc:read</span><span style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-question-scope\">no resource</span><button type=\"button\" style=\"appearance: none; background: transparent; color: #8b93a3; border: 1px solid #2a2f39; border-radius: 4px; padding: 2px 8px; font-size: 11px; cursor: pointer; font-style: inherit; font-variant: inherit; font-weight: inherit; font-stretch: inherit; line-height: inherit; font-family: inherit;\" data-testid=\"qadi-highlight\">highlight 1</button></div><div data-testid=\"qadi-instance\" style=\"display: flex; gap: 8px; align-items: baseline; padding: 3px 0px 3px 14px; border-bottom-width: initial; border-bottom-style: none; border-bottom-color: none;\"><span style=\"color: #8b93a3; font-size: 11px;\">Can</span><span style=\"color: #3fb950; font-weight: 400;\" data-testid=\"qadi-instance-state\" data-treatment=\"Allow\">Allowed</span></div><div data-testid=\"qadi-instance\" style=\"display: flex; gap: 8px; align-items: baseline; padding: 3px 0px 3px 14px; border-bottom-width: initial; border-bottom-style: none; border-bottom-color: none;\"><span style=\"color: #8b93a3; font-size: 11px;\">useCan</span><span style=\"color: #3fb950; font-weight: 400;\" data-testid=\"qadi-instance-state\" data-treatment=\"Allow\">Allowed</span><span style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-instance-unlocatable\">no element — a hook has no node of its own</span></div></div><div style=\"margin-top: 10px;\" data-testid=\"qadi-hydration\"><div style=\"color: #8b93a3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px;\">hydration</div><span style=\"color: #8b93a3;\" data-testid=\"qadi-hydration-unwired\">no counts read. Pass <code>diagnostics={{}}</code> to sample them, or <code>hydration</code> — the result of <code>hydrationActivity</code>, which needs no wiring — to fill this in.</span></div></div>",
  "only hooks (disabled title)":
    "<div data-diagnostics-status=\"Off\" tabindex=\"-1\" style=\"padding: 12px;\" data-testid=\"qadi-questions\"><div role=\"status\" data-testid=\"qadi-diagnostics-region\"></div><p style=\"color: #8b93a3; font-size: 11px; margin-top: 0px;\" data-testid=\"qadi-keying-note\">One row per <em>question</em>, not per component. Atoms are keyed structurally, so ten gates on the same policy are one atom — that is what the evaluator sees. The guards asking each question are listed underneath.</p><div style=\"margin-bottom: 6px;\"><button type=\"button\" style=\"appearance: none; background: transparent; color: #8b93a3; border: 1px solid #2a2f39; border-radius: 4px; padding: 2px 8px; font-size: 11px; cursor: pointer; font-style: inherit; font-variant: inherit; font-weight: inherit; font-stretch: inherit; line-height: inherit; font-family: inherit;\" data-testid=\"qadi-pick\">pick a control on the page</button></div><div data-testid=\"qadi-question-block\"><div style=\"display: flex; gap: 8px; align-items: baseline; padding: 3px 0px; border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: #2a2f39;\" data-testid=\"qadi-question\"><span>doc:read</span><span style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-question-scope\">no resource</span><button type=\"button\" style=\"appearance: none; background: transparent; color: #8b93a3; border: 1px solid #2a2f39; border-radius: 4px; padding: 2px 8px; font-size: 11px; cursor: pointer; font-style: inherit; font-variant: inherit; font-weight: inherit; font-stretch: inherit; line-height: inherit; font-family: inherit;\" data-testid=\"qadi-highlight\" disabled=\"\" title=\"only hooks are asking this, and a hook has no element to point at\">highlight 0</button></div><div data-testid=\"qadi-instance\" style=\"display: flex; gap: 8px; align-items: baseline; padding: 3px 0px 3px 14px; border-bottom-width: initial; border-bottom-style: none; border-bottom-color: none;\"><span style=\"color: #8b93a3; font-size: 11px;\">useCan</span><span style=\"color: #3fb950; font-weight: 400;\" data-testid=\"qadi-instance-state\" data-treatment=\"Allow\">Allowed</span><span style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-instance-unlocatable\">no element — a hook has no node of its own</span></div><div data-testid=\"qadi-instance\" style=\"display: flex; gap: 8px; align-items: baseline; padding: 3px 0px 3px 14px; border-bottom-width: initial; border-bottom-style: none; border-bottom-color: none;\"><span style=\"color: #8b93a3; font-size: 11px;\">useCan</span><span style=\"color: #8b93a3; font-weight: 400;\" data-testid=\"qadi-instance-state\" data-treatment=\"Pending\">Pending</span><span style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-instance-unlocatable\">no element — a hook has no node of its own</span></div></div><div style=\"margin-top: 10px;\" data-testid=\"qadi-hydration\"><div style=\"color: #8b93a3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px;\">hydration</div><span style=\"color: #8b93a3;\" data-testid=\"qadi-hydration-unwired\">no counts read. Pass <code>diagnostics={{}}</code> to sample them, or <code>hydration</code> — the result of <code>hydrationActivity</code>, which needs no wiring — to fill this in.</span></div></div>",
  "questions absent, gates absent":
    "<div data-diagnostics-status=\"Off\" tabindex=\"-1\" style=\"padding: 12px;\" data-testid=\"qadi-questions\"><div role=\"status\" data-testid=\"qadi-diagnostics-region\"></div><p style=\"color: #8b93a3; font-size: 11px; margin-top: 0px;\" data-testid=\"qadi-keying-note\">One row per <em>question</em>, not per component. Atoms are keyed structurally, so ten gates on the same policy are one atom — that is what the evaluator sees. The guards asking each question are listed underneath.</p><p style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-gates-absent\">No live guards were handed to the dock. Pass gates — usually atoms.gates, from @qadi/react — to list who is asking.</p><p style=\"color: #8b93a3;\" data-testid=\"qadi-questions-absent\">No atom set was handed to the dock. Pass <code>questions</code> — usually <code>atoms.asked()</code> — to list what has been asked.</p><div style=\"margin-top: 10px;\" data-testid=\"qadi-hydration\"><div style=\"color: #8b93a3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px;\">hydration</div><span style=\"color: #8b93a3;\" data-testid=\"qadi-hydration-unwired\">no counts read. Pass <code>diagnostics={{}}</code> to sample them, or <code>hydration</code> — the result of <code>hydrationActivity</code>, which needs no wiring — to fill this in.</span></div></div>",
  "questions absent, unsampled":
    "<div data-diagnostics-status=\"Starting\" tabindex=\"-1\" style=\"padding: 12px;\" data-testid=\"qadi-questions\"><div role=\"status\" data-testid=\"qadi-diagnostics-region\"><div data-testid=\"qadi-diagnostics-starting\" style=\"border: 1px solid #2a2f39; border-radius: 4px; padding: 8px 12px; margin-bottom: 8px; color: #8b93a3; font-size: 12px;\"><strong style=\"font-weight: 600;\">Waiting for the first sample.</strong> Diagnostics has started and has not read anything yet. This screen fills in when the first sample arrives.</div></div><p style=\"color: #8b93a3; font-size: 11px; margin-top: 0px;\" data-testid=\"qadi-keying-note\">One row per <em>question</em>, not per component. Atoms are keyed structurally, so ten gates on the same policy are one atom — that is what the evaluator sees. The guards asking each question are listed underneath.</p><div style=\"margin-bottom: 6px;\"><button type=\"button\" style=\"appearance: none; background: transparent; color: #8b93a3; border: 1px solid #2a2f39; border-radius: 4px; padding: 2px 8px; font-size: 11px; cursor: pointer; font-style: inherit; font-variant: inherit; font-weight: inherit; font-stretch: inherit; line-height: inherit; font-family: inherit;\" data-testid=\"qadi-pick\">pick a control on the page</button></div><div style=\"margin-top: 10px;\" data-testid=\"qadi-hydration\"><div style=\"color: #8b93a3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px;\">hydration</div><span style=\"color: #8b93a3;\" data-testid=\"qadi-hydration-pending\">no counts read yet.</span></div></div>",
  "questions empty":
    "<div data-diagnostics-status=\"Off\" tabindex=\"-1\" style=\"padding: 12px;\" data-testid=\"qadi-questions\"><div role=\"status\" data-testid=\"qadi-diagnostics-region\"></div><p style=\"color: #8b93a3; font-size: 11px; margin-top: 0px;\" data-testid=\"qadi-keying-note\">One row per <em>question</em>, not per component. Atoms are keyed structurally, so ten gates on the same policy are one atom — that is what the evaluator sees. The guards asking each question are listed underneath.</p><div style=\"margin-bottom: 6px;\"><button type=\"button\" style=\"appearance: none; background: transparent; color: #8b93a3; border: 1px solid #2a2f39; border-radius: 4px; padding: 2px 8px; font-size: 11px; cursor: pointer; font-style: inherit; font-variant: inherit; font-weight: inherit; font-stretch: inherit; line-height: inherit; font-family: inherit;\" data-testid=\"qadi-pick\">pick a control on the page</button></div><p style=\"color: #8b93a3;\" data-testid=\"qadi-questions-empty\">Nothing has been asked yet. A question appears here the first time a component reads its decision.</p><div style=\"margin-top: 10px;\" data-testid=\"qadi-hydration\"><div style=\"color: #8b93a3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px;\">hydration</div><span style=\"color: #8b93a3;\" data-testid=\"qadi-hydration-unwired\">no counts read. Pass <code>diagnostics={{}}</code> to sample them, or <code>hydration</code> — the result of <code>hydrationActivity</code>, which needs no wiring — to fill this in.</span></div></div>",
  "scoped and unscoped":
    "<div data-diagnostics-status=\"Off\" tabindex=\"-1\" style=\"padding: 12px;\" data-testid=\"qadi-questions\"><div role=\"status\" data-testid=\"qadi-diagnostics-region\"></div><p style=\"color: #8b93a3; font-size: 11px; margin-top: 0px;\" data-testid=\"qadi-keying-note\">One row per <em>question</em>, not per component. Atoms are keyed structurally, so ten gates on the same policy are one atom — that is what the evaluator sees. The guards asking each question are listed underneath.</p><div style=\"margin-bottom: 6px;\"><button type=\"button\" style=\"appearance: none; background: transparent; color: #8b93a3; border: 1px solid #2a2f39; border-radius: 4px; padding: 2px 8px; font-size: 11px; cursor: pointer; font-style: inherit; font-variant: inherit; font-weight: inherit; font-stretch: inherit; line-height: inherit; font-family: inherit;\" data-testid=\"qadi-pick\">pick a control on the page</button></div><div data-testid=\"qadi-question-block\"><div style=\"display: flex; gap: 8px; align-items: baseline; padding: 3px 0px; border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: #2a2f39;\" data-testid=\"qadi-question\"><span>doc:read</span><span style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-question-scope\">no resource</span><button type=\"button\" style=\"appearance: none; background: transparent; color: #8b93a3; border: 1px solid #2a2f39; border-radius: 4px; padding: 2px 8px; font-size: 11px; cursor: pointer; font-style: inherit; font-variant: inherit; font-weight: inherit; font-stretch: inherit; line-height: inherit; font-family: inherit;\" data-testid=\"qadi-highlight\">highlight 1</button></div><div data-testid=\"qadi-instance\" style=\"display: flex; gap: 8px; align-items: baseline; padding: 3px 0px 3px 14px; border-bottom-width: initial; border-bottom-style: none; border-bottom-color: none;\"><span style=\"color: #8b93a3; font-size: 11px;\">Can</span><span style=\"color: #3fb950; font-weight: 400;\" data-testid=\"qadi-instance-state\" data-treatment=\"Allow\">Allowed</span></div></div><div data-testid=\"qadi-question-block\"><div style=\"display: flex; gap: 8px; align-items: baseline; padding: 3px 0px; border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: #2a2f39;\" data-testid=\"qadi-question\"><span>doc:read</span><span style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-question-scope\">doc-1</span><button type=\"button\" style=\"appearance: none; background: transparent; color: #8b93a3; border: 1px solid #2a2f39; border-radius: 4px; padding: 2px 8px; font-size: 11px; cursor: pointer; font-style: inherit; font-variant: inherit; font-weight: inherit; font-stretch: inherit; line-height: inherit; font-family: inherit;\" data-testid=\"qadi-highlight\">highlight 1</button></div><div data-testid=\"qadi-instance\" style=\"display: flex; gap: 8px; align-items: baseline; padding: 3px 0px 3px 14px; border-bottom-width: initial; border-bottom-style: none; border-bottom-color: none;\"><span style=\"color: #8b93a3; font-size: 11px;\">Can</span><span style=\"color: #3fb950; font-weight: 400;\" data-testid=\"qadi-instance-state\" data-treatment=\"Allow\">Allowed</span></div></div><div data-testid=\"qadi-question-block\"><div style=\"display: flex; gap: 8px; align-items: baseline; padding: 3px 0px; border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: #2a2f39;\" data-testid=\"qadi-question\"><span>doc:read</span><span style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-question-scope\">title, owner</span><span style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-question-unmounted\">asked, nothing mounted</span></div></div><div style=\"margin-top: 10px;\" data-testid=\"qadi-hydration\"><div style=\"color: #8b93a3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px;\">hydration</div><span style=\"color: #8b93a3;\" data-testid=\"qadi-hydration-unwired\">no counts read. Pass <code>diagnostics={{}}</code> to sample them, or <code>hydration</code> — the result of <code>hydrationActivity</code>, which needs no wiring — to fill this in.</span></div></div>",
};

const pin = (name: string, actual: string): void => {
  assert.strictEqual(actual, GOLDEN[name]);
};

const asking = { reading: { questions: [{ policy: canRead }] } };

describe("the questions panel, byte for byte", () => {
  it("absent gates", () => {
    pin("absent gates", panelMarkup(asking));
  });

  it("empty gates", () => {
    pin("empty gates", panelMarkup(asking, []));
  });

  it("two guards one row", () => {
    pin(
      "two guards one row",
      panelMarkup(asking, [
        gate({ id: "a", element: marker() }),
        gate({ id: "b", kind: "Cannot", state: "Denied", element: marker() }),
      ]),
    );
  });

  it("deny vs failure", () => {
    pin(
      "deny vs failure",
      panelMarkup(asking, [
        gate({ id: "a", state: "Denied", element: marker() }),
        gate({ id: "b", state: "Failed", element: marker() }),
      ]),
    );
  });

  it("asked but unmounted", () => {
    pin(
      "asked but unmounted",
      panelMarkup({ reading: { questions: [{ policy: canRead }, { policy: isAdmin }] } }, [
        gate({ id: "a", element: marker() }),
      ]),
    );
  });

  it("unrecognised and toString", () => {
    pin(
      "unrecognised and toString",
      panelMarkup(asking, [hook("a", "Suspended"), hook("b", "toString")]),
    );
  });

  it("highlight 1 and a hook", () => {
    pin(
      "highlight 1 and a hook",
      panelMarkup(asking, [gate({ id: "a", element: marker() }), hook("b", "Allowed")]),
    );
  });

  it("only hooks (disabled title)", () => {
    pin(
      "only hooks (disabled title)",
      panelMarkup(asking, [hook("a", "Allowed"), hook("b", "Pending")]),
    );
  });

  it("questions absent, gates absent", () => {
    pin("questions absent, gates absent", panelMarkup({}));
  });

  it("questions absent, unsampled", () => {
    pin(
      "questions absent, unsampled",
      panelMarkup({ diagnostics: neverBuilt }, [gate({ id: "a", element: marker() })]),
    );
  });

  it("questions empty", () => {
    pin(
      "questions empty",
      panelMarkup({ reading: { questions: [] } }, [gate({ id: "a", element: marker() })]),
    );
  });

  it("scoped and unscoped", () => {
    pin(
      "scoped and unscoped",
      panelMarkup(
        {
          reading: {
            questions: [
              { policy: canRead },
              { policy: canRead, resource: { id: "doc-1" } },
              { policy: canRead, resource: { title: "Q3", owner: "alice" } },
            ],
          },
        },
        [
          gate({ id: "a", element: marker() }),
          gate({ id: "b", resource: { id: "doc-1" }, element: marker() }),
        ],
      ),
    );
  });
});
