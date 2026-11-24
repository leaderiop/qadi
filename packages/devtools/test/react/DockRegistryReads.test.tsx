/**
 * Pins how many times a dock reads the gate registry's `instances()`, through `useDockModel`.
 *
 * The first-render characterisation pins the registry's `subscribe` counts and no read count,
 * and the decision record for the one-rule `configure` states the read counts: a healthy
 * registry is read once under the hook and twice under StrictMode, a failing one never, and
 * a `configure` that moves no input reads nothing. A statement a host relies on is held by a
 * test, so these cells hold it. The harness is the file's own: a registry that counts both calls.
 */
import { assert, describe, it } from "@effect/vitest";
import { act, render } from "@testing-library/react";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { StrictMode } from "react";
import { hasPermission, permission } from "@qadi/core";
import type { GateInstanceLike, GateRegistryLike } from "../../src/model/Gates.ts";
import { useDockModel } from "../../src/react/useDockModel.ts";

const canRead = hasPermission(permission("doc", "read"));

/** A gate registry that counts its `instances` and `subscribe` calls and can be made to refuse a subscribe. */
const makeRegistry = (failing: boolean) => {
  const held: ReadonlyArray<GateInstanceLike> = [{ id: "a", kind: "Can", policy: canRead, state: "Allowed" }];
  const counts = { reads: 0, subscribes: 0 };
  const registry: GateRegistryLike = {
    instances: () => {
      counts.reads += 1;
      return held;
    },
    subscribe: () => {
      counts.subscribes += 1;
      if (failing) throw new Error("subscribe refused");
      return () => undefined;
    },
  };
  return { registry, counts };
};

type DockInputs = Parameters<typeof useDockModel>[0];

const Dock = ({ inputs }: { readonly inputs: DockInputs }) => {
  useDockModel(inputs);
  return null;
};

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

const asked = () => [{ policy: canRead }];

const mount = async (registry: GateRegistryLike, strict: boolean) => {
  const inputs = (interval?: number): DockInputs => ({
    gates: registry,
    questions: asked,
    ...(interval === undefined ? {} : { diagnostics: { layer: Layer.effectDiscard(Effect.never), intervalMillis: interval } }),
  });
  const tree = (value: DockInputs) => (strict ? <StrictMode><Dock inputs={value} /></StrictMode> : <Dock inputs={value} />);
  const view = render(tree(inputs()));
  await settle();
  return { view, inputs, tree };
};

describe("the gate registry reads of a dock built through the hook", () => {
  it("a healthy registry is read once under the hook and twice under StrictMode", async () => {
    for (const { strict, reads, subscribes } of [
      { strict: false, reads: 1, subscribes: 1 },
      { strict: true, reads: 2, subscribes: 2 },
    ]) {
      const { registry, counts } = makeRegistry(false);
      const { view } = await mount(registry, strict);

      assert.strictEqual(counts.reads, reads);
      assert.strictEqual(counts.subscribes, subscribes);
      view.unmount();
    }
  });

  it("a registry whose subscribe throws is subscribed again by each build and read never", async () => {
    for (const { strict, subscribes } of [
      { strict: false, subscribes: 2 },
      { strict: true, subscribes: 3 },
    ]) {
      const { registry, counts } = makeRegistry(true);
      const { view } = await mount(registry, strict);

      assert.strictEqual(counts.reads, 0);
      assert.strictEqual(counts.subscribes, subscribes);
      view.unmount();
    }
  });

  it("a re-render with a fresh inputs record holding the same fields reads nothing and subscribes nothing", async () => {
    const { registry, counts } = makeRegistry(false);
    const { view, inputs, tree } = await mount(registry, false);
    const before = { ...counts };

    view.rerender(tree(inputs()));
    await settle();
    view.rerender(tree(inputs()));
    await settle();

    assert.deepStrictEqual(counts, before);
  });

  it("a re-render that moves an input of the gates feed reads the registry once", async () => {
    const { registry, counts } = makeRegistry(false);
    const { view, inputs, tree } = await mount(registry, false);
    const before = counts.reads;

    view.rerender(tree(inputs(2_000)));
    await settle();

    assert.strictEqual(counts.reads, before + 1);
  });
});
