/**
 * JOB 2 ledger — E2.1 … E2.12, rendered.
 *
 * The load-bearing case is E2.1, and it is why `PolicyTree` has a `showStatus`
 * prop at all: `inspect(policy, undefined)` marks every node `NeverResolved`,
 * which the *inspector* correctly reads as "this branch was short-circuited"
 * and which here would say a policy was skipped when it was simply never run.
 * A screen describing a rule must state no verdict (INV-QD-041).
 */
import { assert, describe, it } from "@effect/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import * as Effect from "effect/Effect";
import {
  allOf,
  anyOf,
  hasPermission,
  hasRole,
  not,
  permission,
  toJson,
} from "@qadi/core";
import type { Policy } from "@qadi/core";
import { PolicyExplorer } from "../../src/react/PolicyExplorer.tsx";
import type { PolicySighting } from "../../src/model/Catalogue.ts";
import { makeExplorerSession } from "../../src/model/ExplorerSession.ts";
import { policyLabel } from "../../src/model/Catalogue.ts";

const read = permission("doc", "read");
const write = permission("doc", "write");

const sighting = (policy: Policy, count = 1): PolicySighting => ({
  policy,
  label: policyLabel(policy),
  count,
  allows: count,
  denies: 0,
  errors: 0,
  lastAt: count === 0 ? undefined : 100,
});

/**
 * Mounts the panel over a session it owns, as the dock does.
 *
 * The rules (which policy is shown, what a preview is, what the JSON pane
 * describes) are pinned in `test/model/ExplorerSession.test.ts`; what is here is
 * the wording and the wiring from each control to its command.
 */
const mount = (sightings: ReadonlyArray<PolicySighting>) => {
  const session = makeExplorerSession({ sightings });
  return { session, ...render(<PolicyExplorer session={session} />) };
};

const click = async (element: HTMLElement) => {
  await act(async () => {
    element.click();
  });
};

const nodes = () => screen.queryAllByTestId("qadi-node");

describe("the rail", () => {
  // E2.12
  it("with nothing to show, explains that the rail fills as decisions arrive", () => {
    mount([]);
    const empty = screen.getByTestId("qadi-policies-empty").textContent ?? "";
    assert.include(empty, "log has seen");
    assert.include(empty, "catalogue");
  });

  it("lists each policy with how often it decided", () => {
    mount([sighting(hasPermission(read), 3), sighting(hasPermission(write), 1)]);

    const items = screen.getAllByTestId("qadi-policy-rail-item");
    assert.strictEqual(items.length, 2);
    assert.include(items[0]?.textContent ?? "", "3 decisions");
    assert.include(items[1]?.textContent ?? "", "1 decision");
  });

  it("marks a policy that has never been evaluated", () => {
    mount([sighting(hasPermission(read), 0)]);
    assert.include(
      screen.getAllByTestId("qadi-policy-rail-item")[0]?.textContent ?? "",
      "never evaluated",
    );
  });

  it("a rail click chooses that policy", async () => {
    mount([sighting(hasPermission(read)), sighting(hasPermission(write))]);
    assert.include(nodes()[0]?.textContent ?? "", "doc:read");

    await click(screen.getAllByTestId("qadi-policy-rail-item")[1] ?? fail());
    assert.include(nodes()[0]?.textContent ?? "", "doc:write");
  });

  it("says so when the chosen policy has left the log", async () => {
    const { session } = mount([sighting(hasPermission(read)), sighting(hasPermission(write))]);
    await click(screen.getAllByTestId("qadi-policy-rail-item")[1] ?? fail());

    act(() => session.setSightings([sighting(hasPermission(read))]));

    assert.include(nodes()[0]?.textContent ?? "", "doc:write");
    assert.include(screen.getByTestId("qadi-policies-evicted").textContent ?? "", "no longer in the log");
  });

  it("highlights the chosen policy only while no draft covers it", async () => {
    mount([sighting(hasPermission(read))]);
    const style = () => screen.getAllByTestId("qadi-policy-rail-item")[0]?.getAttribute("style") ?? "";
    const highlighted = style();

    await click(screen.getByRole("button", { name: "Tree" }));
    await paste(Effect.runSync(toJson(hasRole("editor"))));
    await click(screen.getByTestId("qadi-policy-load"));
    assert.notStrictEqual(style(), highlighted);
  });
});

describe("the structure view", () => {
  /**
   * E2.1 — the rule this screen exists to keep.
   */
  it("shows a policy with no verdict on any node", () => {
    mount([sighting(allOf([hasPermission(read), hasRole("editor")]))]);

    assert.strictEqual(nodes().length, 3);
    // No status attribute, no marks, no "never resolved" — the policy was not
    // skipped, it was never run.
    assert.isTrue(nodes().every((node) => node.getAttribute("data-status") === null));
    assert.deepStrictEqual(screen.queryAllByTestId("qadi-never-resolved"), []);
    for (const mark of ["✓", "✗", "·"]) {
      assert.notInclude(screen.getByTestId("qadi-policies").textContent ?? "", mark);
    }
  });

  it("still names each requirement and its combining algorithm", () => {
    mount([sighting(anyOf([hasPermission(read)]))]);
    const text = screen.getByTestId("qadi-policies").textContent ?? "";
    assert.include(text, "any of");
    assert.include(text, "doc:read");
  });

  it("states a field restriction, which understating would overstate the grant", () => {
    mount([sighting(hasPermission(read, { fields: ["id", "title"] }))]);
    assert.include(screen.getByTestId("qadi-policies").textContent ?? "", "exposing only id, title");
  });

  it("a path-aware field spec renders as the literal string it is", () => {
    mount([sighting(hasPermission(read, { fields: ["id", "contact.*"] }))]);
    assert.include(screen.getByTestId("qadi-policies").textContent ?? "", "exposing only id, contact.*");
  });
});

describe("depth", () => {
  // E2.11
  it("shows the policy's depth beside the bound it would be evaluated under", () => {
    mount([sighting(allOf([hasPermission(read)]))]);
    assert.include(screen.getByTestId("qadi-policy-depth").textContent ?? "", "depth 1 of 64");
    assert.isNull(screen.queryByTestId("qadi-depth-over"));
  });

  it("flags a policy deeper than the default bound", () => {
    let policy: Policy = hasPermission(read);
    for (let i = 0; i < 65; i += 1) policy = allOf([policy]);

    mount([sighting(policy)]);
    assert.include(screen.getByTestId("qadi-depth-over").textContent ?? "", "PolicyTooDeep");
  });
});

describe("simplify", () => {
  // E2.8 — the correction the design document had to make about itself: the
  // screen offers no double-negation elimination the library refuses.
  it("says a policy with nothing to rewrite is already simple", () => {
    mount([sighting(not(not(hasPermission(read))))]);
    assert.include(
      screen.getByTestId("qadi-simplify-effect").textContent ?? "",
      "already as simple",
    );
  });

  it("says a rewritable policy would collapse or flatten", () => {
    mount([sighting(allOf([hasPermission(read)]))]);
    assert.include(screen.getByTestId("qadi-simplify-effect").textContent ?? "", "would collapse");
  });

  // E2.10 — previewing is not applying.
  it("simplify, cancel and apply are three controls on three commands", async () => {
    mount([sighting(allOf([hasPermission(read)]))]);
    assert.strictEqual(nodes().length, 2);
    assert.isNull(screen.queryByRole("button", { name: "apply" }));

    await click(screen.getByTestId("qadi-simplify"));
    assert.strictEqual(screen.getByTestId("qadi-simplify").textContent, "cancel");
    assert.strictEqual(nodes().length, 1);

    await click(screen.getByTestId("qadi-simplify"));
    assert.strictEqual(nodes().length, 2);

    await click(screen.getByTestId("qadi-simplify"));
    await click(screen.getByRole("button", { name: "apply" }));
    assert.strictEqual(nodes().length, 1);
    assert.strictEqual(screen.getByTestId("qadi-simplify").textContent, "simplify");
    assert.include(
      screen.getByTestId("qadi-simplify-effect").textContent ?? "",
      "already as simple",
    );
  });
});

const paste = async (text: string) => {
  await act(async () => {
    fireEvent.change(screen.getByTestId("qadi-policy-json"), { target: { value: text } });
  });
};

describe("the JSON view", () => {
  // E2.3 — the real codec, not an approximation.
  it("the Tree/JSON button switches the view and shows what `toJson` produces", async () => {
    const policy = allOf([hasPermission(read)]);
    mount([sighting(policy)]);
    await click(screen.getByRole("button", { name: "Tree" }));

    assert.strictEqual(
      screen.getByTestId<HTMLTextAreaElement>("qadi-policy-json").value,
      Effect.runSync(toJson(policy)),
    );
    await click(screen.getByRole("button", { name: "JSON" }));
    assert.isNull(screen.queryByTestId("qadi-policy-json"));
  });

  // E2.5
  it("typing and load redraw the tree from a pasted policy", async () => {
    mount([sighting(hasPermission(read))]);
    await click(screen.getByRole("button", { name: "Tree" }));
    await paste(Effect.runSync(toJson(anyOf([hasRole("editor"), hasRole("admin")]))));
    await click(screen.getByTestId("qadi-policy-load"));
    await click(screen.getByRole("button", { name: "JSON" }));

    assert.strictEqual(nodes().length, 3);
    assert.include(nodes()[0]?.textContent ?? "", "any of");
  });

  // E2.4 — the ordinary way to learn a payload is malformed.
  it("a paste that does not decode shows the issue beside the box", async () => {
    mount([sighting(hasPermission(read))]);
    await click(screen.getByRole("button", { name: "Tree" }));
    await paste('{"_tag":"NotAPolicy"}');
    await click(screen.getByTestId("qadi-policy-load"));

    assert.isNotNull(screen.getByTestId("qadi-policy-json-error"));
    assert.isNotNull(screen.getByTestId("qadi-policy-json"));
  });
});

const fail = (): never => {
  throw new Error("expected an element");
};
