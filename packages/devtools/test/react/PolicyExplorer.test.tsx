/**
 * JOB 2 ledger — E2.1 … E2.12.
 *
 * The load-bearing case is E2.1, and it is why `PolicyTree` has a `showStatus`
 * prop at all: `inspect(policy, undefined)` marks every node `NeverResolved`,
 * which the *inspector* correctly reads as "this branch was short-circuited"
 * and which here would say a policy was skipped when it was simply never run.
 * A screen describing a rule must state no verdict (INV-QD-041).
 */
import { assert, describe, it } from "@effect/vitest";
import { afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import {
  allOf,
  anyOf,
  fromJson,
  hasPermission,
  hasRole,
  labeled,
  not,
  permission,
  toJson,
} from "@qadi/core";
import type { Policy } from "@qadi/core";
import { PolicyExplorer } from "../../src/react/PolicyExplorer.tsx";
import type { PolicySighting } from "../../src/model/Catalogue.ts";
import { policyLabel } from "../../src/model/Catalogue.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

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

const mount = (sightings: ReadonlyArray<PolicySighting>) =>
  render(<PolicyExplorer sightings={sightings} />);

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

  it("selecting a policy shows it", async () => {
    mount([sighting(hasPermission(read)), sighting(hasPermission(write))]);
    assert.include(nodes()[0]?.textContent ?? "", "doc:read");

    await click(screen.getAllByTestId("qadi-policy-rail-item")[1] ?? fail());
    assert.include(nodes()[0]?.textContent ?? "", "doc:write");
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
    // `policyDepth(p) <= n` is exactly the condition under which
    // `evaluate(p, { maxDepth: n })` will not raise (INV-QD-037), so this
    // comparison is a fact rather than a hint.
    assert.include(
      screen.getByTestId("qadi-depth-over").textContent ?? "",
      "PolicyTooDeep",
    );
  });
});

describe("simplify", () => {
  // E2.6 — one of the two rewrites `simplify` actually performs.
  it("previews a single-child composite collapse", async () => {
    mount([sighting(allOf([hasPermission(read)]))]);
    assert.include(screen.getByTestId("qadi-simplify-effect").textContent ?? "", "would collapse");

    await click(screen.getByTestId("qadi-simplify"));
    // The preview is the collapsed tree: one node where there were two.
    assert.strictEqual(nodes().length, 1);
    assert.include(nodes()[0]?.textContent ?? "", "doc:read");
  });

  // E2.7 — the other one.
  it("previews same-tag flattening", async () => {
    mount([sighting(allOf([allOf([hasPermission(read), hasRole("a")]), hasRole("b")]))]);
    await click(screen.getByTestId("qadi-simplify"));

    // Flattened: three leaves directly under one `all of`, not a nested pair.
    const root = nodes()[0];
    assert.include(root?.textContent ?? "", "all of");
    assert.strictEqual(nodes().length, 4);
  });

  /**
   * E2.8 — the correction the design document had to make about itself.
   *
   * `simplify` does exactly two things, and double-negation elimination is not
   * one of them: `Simplify.ts` records that as a finding rather than an
   * omission. A screen offering it would promise a rewrite the library refuses.
   */
  it("leaves a double negation alone, and says the policy is already simple", () => {
    mount([sighting(not(not(hasPermission(read))))]);
    assert.include(
      screen.getByTestId("qadi-simplify-effect").textContent ?? "",
      "already as simple",
    );
  });

  // E2.9
  it("a policy with nothing to simplify says so rather than showing an empty diff", () => {
    mount([sighting(hasPermission(read))]);
    assert.include(
      screen.getByTestId("qadi-simplify-effect").textContent ?? "",
      "already as simple",
    );
  });

  // E2.10 — previewing is not applying.
  it("previewing can be cancelled, and applying is a second action", async () => {
    mount([sighting(allOf([hasPermission(read)]))]);
    assert.strictEqual(nodes().length, 2);

    await click(screen.getByTestId("qadi-simplify"));
    assert.strictEqual(nodes().length, 1);

    // Cancel restores the original — nothing was applied.
    await click(screen.getByTestId("qadi-simplify"));
    assert.strictEqual(nodes().length, 2);

    await click(screen.getByTestId("qadi-simplify"));
    await click(screen.getByRole("button", { name: "apply" }));
    assert.strictEqual(nodes().length, 1);
    // And once applied, there is nothing left to simplify.
    assert.include(
      screen.getByTestId("qadi-simplify-effect").textContent ?? "",
      "already as simple",
    );
  });
});

describe("the JSON view", () => {
  // E2.3 — the real codec, not an approximation.
  it("shows what `toJson` produces, which is what a caller would store", async () => {
    const policy = allOf([hasPermission(read)]);
    mount([sighting(policy)]);
    await click(screen.getByRole("button", { name: "Tree" }));

    const encoded = Effect.runSync(toJson(policy));
    assert.strictEqual(
      (screen.getByTestId("qadi-policy-json") as HTMLTextAreaElement).value,
      encoded,
    );
  });

  // E2.5
  it("loads a pasted policy and redraws the tree", async () => {
    mount([sighting(hasPermission(read))]);
    await click(screen.getByRole("button", { name: "Tree" }));

    const pasted = Effect.runSync(toJson(anyOf([hasRole("editor"), hasRole("admin")])));
    await act(async () => {
      fireEvent.change(screen.getByTestId("qadi-policy-json"), { target: { value: pasted } });
    });
    await click(screen.getByTestId("qadi-policy-load"));
    await click(screen.getByRole("button", { name: "JSON" }));

    assert.strictEqual(nodes().length, 3);
    assert.include(nodes()[0]?.textContent ?? "", "any of");
  });

  // E2.4 — the ordinary way to learn a payload is malformed.
  it("a paste that does not decode shows the issue and keeps the panel", async () => {
    mount([sighting(hasPermission(read))]);
    await click(screen.getByRole("button", { name: "Tree" }));

    await act(async () => {
      fireEvent.change(screen.getByTestId("qadi-policy-json"), {
        target: { value: '{"_tag":"NotAPolicy"}' },
      });
    });
    await click(screen.getByTestId("qadi-policy-load"));

    assert.isNotNull(screen.getByTestId("qadi-policy-json-error"));
    assert.isNotNull(screen.getByTestId("qadi-policy-json"));
  });

  it("a paste that is not JSON at all is reported the same way", async () => {
    mount([sighting(hasPermission(read))]);
    await click(screen.getByRole("button", { name: "Tree" }));

    await act(async () => {
      fireEvent.change(screen.getByTestId("qadi-policy-json"), { target: { value: "}{" } });
    });
    await click(screen.getByTestId("qadi-policy-load"));

    assert.isNotNull(screen.getByTestId("qadi-policy-json-error"));
  });

  it("round-trips: what it shows decodes back to the policy it showed", () => {
    const policy = labeled("can publish", allOf([hasPermission(write), hasRole("editor")]));
    const encoded = Effect.runSync(toJson(policy));
    assert.isTrue(Equal.equals(Effect.runSync(Effect.orDie(fromJson(encoded))), policy));
  });
});

describe("selection and drafts", () => {
  it("choosing another policy discards a draft belonging to the first", async () => {
    mount([sighting(hasPermission(read)), sighting(hasPermission(write))]);
    await click(screen.getByRole("button", { name: "Tree" }));

    const pasted = Effect.runSync(toJson(hasRole("editor")));
    await act(async () => {
      fireEvent.change(screen.getByTestId("qadi-policy-json"), { target: { value: pasted } });
    });
    await click(screen.getByTestId("qadi-policy-load"));
    await click(screen.getByRole("button", { name: "JSON" }));
    assert.include(nodes()[0]?.textContent ?? "", "editor");

    // A draft belongs to the policy it came from; carrying it across would show
    // one policy's contents under another's name.
    await click(screen.getAllByTestId("qadi-policy-rail-item")[1] ?? fail());
    assert.include(nodes()[0]?.textContent ?? "", "doc:write");
  });

  it("a rail item stops looking selected while a draft is showing", async () => {
    mount([sighting(hasPermission(read))]);
    await click(screen.getByRole("button", { name: "Tree" }));

    const pasted = Effect.runSync(toJson(hasRole("editor")));
    await act(async () => {
      fireEvent.change(screen.getByTestId("qadi-policy-json"), { target: { value: pasted } });
    });
    await click(screen.getByTestId("qadi-policy-load"));

    const item = screen.getAllByTestId("qadi-policy-rail-item")[0] ?? fail();
    assert.notInclude(item.getAttribute("style") ?? "", "background: rgb(28, 31, 38)");
  });
});

const fail = (): never => {
  throw new Error("expected an element");
};
