/**
 * Pins how many times a dock reads the gate registry's `instances()`, through `useDockModel`.
 *
 * The first-render characterisation pins the registry's `subscribe` counts and no read count,
 * and the decision record for the one-rule `configure` states the read counts: a healthy
 * registry is read once under the hook and twice under StrictMode, a failing one never, and
 * a `configure` that moves no input reads nothing. A statement a host relies on is held by a
 * test, so these cells hold it. The harness is the file's own: a registry that counts both calls.
 *
 * A failed watch is retried by any `configure` (the rule's one stated exception), and the hook
 * configures on each commit that hands it a new inputs record, so a registry that keeps
 * refusing is subscribed once more by each host re-render. The last cells pin that as the
 * behaviour: one more `subscribe`, no read, and nothing published, until the registry accepts.
 */
import { assert, describe, it } from "@effect/vitest";
import { act, render } from "@testing-library/react";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { StrictMode, useEffect } from "react";
import { hasPermission, permission } from "@qadi/core";
import type { DockModel } from "../../src/model/DockModel.ts";
import type { GateInstanceLike, GateRegistryLike } from "../../src/model/Gates.ts";
import { useDockModel } from "../../src/react/useDockModel.ts";

const canRead = hasPermission(permission("doc", "read"));

/**
 * A gate registry that counts its `instances` and `subscribe` calls and can be made to refuse a subscribe.
 *
 * `refusing.on` is read at each `subscribe`, so a cell can mend the registry between two renders.
 */
const makeRegistry = (failing: boolean) => {
  const refusing = { on: failing };
  const held: ReadonlyArray<GateInstanceLike> = [{ id: "a", kind: "Can", policy: canRead, state: "Allowed" }];
  const counts = { reads: 0, subscribes: 0 };
  const registry: GateRegistryLike = {
    instances: () => {
      counts.reads += 1;
      return held;
    },
    subscribe: () => {
      counts.subscribes += 1;
      if (refusing.on) throw new Error("subscribe refused");
      return () => undefined;
    },
  };
  return { registry, counts, refusing };
};

type DockInputs = Parameters<typeof useDockModel>[0];

/** The model the mounted dock holds, set after each commit so a cell can listen to its stores. */
interface Held {
  model: DockModel | undefined;
}

const Dock = ({ inputs, held }: { readonly inputs: DockInputs; readonly held: Held }) => {
  const model = useDockModel(inputs);
  useEffect(() => {
    held.model = model;
  });
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
  const held: Held = { model: undefined };
  const tree = (value: DockInputs) =>
    strict ? (
      <StrictMode>
        <Dock inputs={value} held={held} />
      </StrictMode>
    ) : (
      <Dock inputs={value} held={held} />
    );
  const view = render(tree(inputs()));
  await settle();
  return { view, inputs, tree, held };
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

  it("a registry that keeps refusing is subscribed once more by each re-render, read never, and publishes nothing", async () => {
    const { registry, counts } = makeRegistry(true);
    const { view, inputs, tree, held } = await mount(registry, false);
    const model = held.model;
    assert.isDefined(model);
    let heard = 0;
    const stores = [model?.questions, model?.services, model?.diagnostics, model?.dock];
    const unsubscribes = stores.map((store) =>
      store?.subscribe(() => {
        heard += 1;
      }),
    );
    const before = { ...counts };

    for (const round of [1, 2, 3]) {
      view.rerender(tree(inputs()));
      await settle();
      assert.deepStrictEqual(counts, { reads: before.reads, subscribes: before.subscribes + round });
    }

    assert.strictEqual(counts.reads, 0);
    assert.strictEqual(heard, 0);
    for (const unsubscribe of unsubscribes) unsubscribe?.();
    view.unmount();
  });

  it("a registry that stops refusing is watched and read by the next commit, and then left alone", async () => {
    const { registry, counts, refusing } = makeRegistry(true);
    const { view, inputs, tree, held } = await mount(registry, false);
    const model = held.model;
    assert.isDefined(model);
    let heard = 0;
    const unsubscribe = model?.questions.subscribe(() => {
      heard += 1;
    });
    const before = { ...counts };
    refusing.on = false;

    view.rerender(tree(inputs()));
    await settle();

    assert.deepStrictEqual(counts, { reads: before.reads + 1, subscribes: before.subscribes + 1 });
    assert.isAbove(heard, 0);
    const mended = { ...counts };
    const heardMended = heard;

    view.rerender(tree(inputs()));
    await settle();

    assert.deepStrictEqual(counts, mended);
    assert.strictEqual(heard, heardMended);
    unsubscribe?.();
    view.unmount();
  });
});
