/**
 * Grouping live guards by the question they ask.
 *
 * The load-bearing property is that a group here is **exactly an atom** in
 * `@qadi/react`: both use `Equal.equals`, which is structural in Effect v4. If
 * they disagreed, the panel would claim two questions where the evaluator sees
 * one — which is the failure BEH-QD-217 was written to prevent, and this
 * increment preserves it rather than abandoning it.
 */
import { assert, describe, it } from "@effect/vitest";
import { hasPermission, hasRole, permission } from "@qadi/core";
import {
  GATE_STATES,
  gateGroups,
  instancesAsking,
  isLocatable,
  locatableIds,
} from "../../src/model/Gates.ts";
import type { GateGroup, GateInstanceLike } from "../../src/model/Gates.ts";

/** AGENTS.md §6 leaves no `!`, and an absent group is a failure worth naming. */
const only = (groups: ReadonlyArray<GateGroup>): GateGroup => {
  const first = groups[0];
  if (first === undefined) throw new Error("expected one group, got none");
  return first;
};

const canRead = hasPermission(permission("doc", "read"));
const isAdmin = hasRole("admin");

const instance = (fields: Partial<GateInstanceLike> & { readonly id: string }): GateInstanceLike => ({
  kind: "Can",
  policy: canRead,
  state: "Allowed",
  ...fields,
});

describe("gateGroups", () => {
  it("groups two guards asking the same question", () => {
    const groups = gateGroups([instance({ id: "a" }), instance({ id: "b" })]);

    assert.strictEqual(groups.length, 1);
    assert.strictEqual(groups[0]?.instances.length, 2);
  });

  it("GROUPS A POLICY BUILT TWICE, because equality is structural", () => {
    // The property that makes a group an atom. Two separately constructed but
    // equal policies share one atom in `@qadi/react`; they must share one row
    // here, or the panel disagrees with the evaluator.
    const groups = gateGroups([
      instance({ id: "a", policy: hasPermission(permission("doc", "read")) }),
      instance({ id: "b", policy: hasPermission(permission("doc", "read")) }),
    ]);
    assert.strictEqual(groups.length, 1);
  });

  it("separates two different questions", () => {
    const groups = gateGroups([
      instance({ id: "a", policy: canRead }),
      instance({ id: "b", policy: isAdmin }),
    ]);
    assert.strictEqual(groups.length, 2);
  });

  it("separates the same policy with and without a resource", () => {
    // BEH-QD-217's surviving requirement: they are two questions.
    const groups = gateGroups([
      instance({ id: "a" }),
      instance({ id: "b", resource: { id: "invoice-42" } }),
    ]);
    assert.strictEqual(groups.length, 2);
  });

  it("separates two different resources", () => {
    const groups = gateGroups([
      instance({ id: "a", resource: { id: "one" } }),
      instance({ id: "b", resource: { id: "two" } }),
    ]);
    assert.strictEqual(groups.length, 2);
  });

  it("groups two equal resources built separately", () => {
    const groups = gateGroups([
      instance({ id: "a", resource: { id: "one" } }),
      instance({ id: "b", resource: { id: "one" } }),
    ]);
    assert.strictEqual(groups.length, 1);
  });

  it("keeps registration order, so rows do not jump", () => {
    const groups = gateGroups([
      instance({ id: "a", policy: isAdmin }),
      instance({ id: "b", policy: canRead }),
    ]);
    assert.deepStrictEqual(
      groups.map((group) => group.label),
      ["admin", "doc:read"],
    );
  });

  it("groups nothing from nothing", () => {
    assert.deepStrictEqual(gateGroups([]), []);
  });

  describe("counts", () => {
    it("reports only the states that occurred", () => {
      // The opposite call from `hydrationActivity`'s drop reasons, and
      // deliberately: there the closed set at zero is the reassurance, here a
      // row of zeros would be four fifths noise beside the instance list.
      const groups = gateGroups([
        instance({ id: "a", state: "Allowed" }),
        instance({ id: "b", state: "Allowed" }),
        instance({ id: "c", state: "Denied" }),
      ]);

      assert.deepStrictEqual(groups[0]?.counts, [
        { state: "Denied", count: 1 },
        { state: "Allowed", count: 2 },
      ]);
    });

    it("orders worst news first", () => {
      // A reader opens this panel because something is missing.
      const groups = gateGroups(
        ["Allowed", "Pending", "Rechecking", "Denied", "Failed"].map((state, index) =>
          instance({ id: String(index), state }),
        ),
      );
      assert.deepStrictEqual(
        groups[0]?.counts.map((count) => count.state),
        [...GATE_STATES],
      );
    });

    it("puts a state it does not know AFTER the ones it does", () => {
      // This package reads a structure it does not own. An unknown value is
      // shown as itself — a wrong label is visible, a missing row is not.
      const groups = gateGroups([
        instance({ id: "a", state: "Somersault" }),
        instance({ id: "b", state: "Failed" }),
      ]);
      assert.deepStrictEqual(
        groups[0]?.counts.map((count) => count.state),
        ["Failed", "Somersault"],
      );
    });
  });
});

describe("isLocatable", () => {
  it("is true for an instance carrying an element", () => {
    assert.isTrue(isLocatable(instance({ id: "a", element: {} })));
  });

  it("is false for a hook, which has no node of its own", () => {
    assert.isFalse(isLocatable(instance({ id: "a" })));
  });

  it("is false for a ref that was never attached", () => {
    // A ref holds `null`; the registry's type says absent. Both must read the
    // same way here or the panel offers a highlight that does nothing.
    assert.isFalse(isLocatable(instance({ id: "a", element: null })));
  });
});

describe("locatableIds", () => {
  it("names only the instances the lens can point at", () => {
    const groups = gateGroups([
      instance({ id: "a", element: {} }),
      instance({ id: "b" }),
      instance({ id: "c", element: {} }),
    ]);
    assert.deepStrictEqual(locatableIds(only(groups).instances), ["a", "c"]);
  });

  it("counts them on the group, so a panel can say how many it cannot show", () => {
    const groups = gateGroups([instance({ id: "a", element: {} }), instance({ id: "b" })]);

    assert.strictEqual(groups[0]?.locatable, 1);
    assert.strictEqual(groups[0]?.instances.length, 2);
  });

  it("is empty where nothing can be pointed at", () => {
    const groups = gateGroups([instance({ id: "a", kind: "useCan" })]);
    // A caller must be able to tell "highlighted nothing" from "nothing to
    // highlight" — this is what makes that possible.
    assert.deepStrictEqual(locatableIds(only(groups).instances), []);
  });
});

describe("instancesAsking", () => {
  const groups = gateGroups([
    instance({ id: "a", policy: canRead }),
    instance({ id: "b", policy: canRead, resource: { id: "x" } }),
  ]);

  it("finds the guards asking one question", () => {
    assert.deepStrictEqual(
      instancesAsking(groups, canRead, undefined).map((one) => one.id),
      ["a"],
    );
  });

  it("distinguishes the resource-scoped question", () => {
    assert.deepStrictEqual(
      instancesAsking(groups, canRead, { id: "x" }).map((one) => one.id),
      ["b"],
    );
  });

  it("is empty for a question nothing is mounted for", () => {
    // A real and common state, not an error: a component that asked and then
    // unmounted leaves its question behind in the atom layer.
    assert.deepStrictEqual(instancesAsking(groups, isAdmin, undefined), []);
  });
});
