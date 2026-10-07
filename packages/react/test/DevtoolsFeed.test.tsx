/**
 * What `useDevtoolsFeed` hands a devtools panel, and that none of it is a copy.
 *
 * The property that matters is the first one: the layer a panel builds is the
 * context the provider's decisions evaluated in, so a stateful service (the
 * decision cache) is one instance, with **no** hoisting of its layer out of the
 * atom set. Every atom set below is built from an un-hoisted
 * `decisionCacheLayer`, which is the shape that read "0 entries" before the feed
 * existed (CCR-QD-200). `@qadi/devtools` is deliberately not imported: the
 * cross-package proof lives in the example (`dock-wiring.test.ts`), because
 * neither package depends on the other (ADR-QD-053).
 */
import {
  decisionCacheLayer,
  DecisionCache,
  EvaluationServicesNone,
  hasRole,
  makeSubject,
} from "@qadi/core";
import type { DecisionCacheShape } from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Can, QadiProvider, makeQadiAtoms, runtimeLayer, useDevtoolsFeed, useQadiContext } from "../src/index.ts";
import type { DevtoolsFeed, QadiAtoms } from "../src/index.ts";

afterEach(cleanup);

const editor = makeSubject({ id: "u1", roles: ["Editor"] });
const isEditor = hasRole("Editor");

/** An atom set whose cache layer is a plain member of its layer, never hoisted. */
const unhoisted = (): QadiAtoms =>
  makeQadiAtoms(Layer.mergeAll(EvaluationServicesNone, decisionCacheLayer({ capacity: 8 })));

const noExtra = {};

interface Seen<Extra> {
  feed?: DevtoolsFeed<Extra>;
  registry?: AtomRegistry.AtomRegistry;
  renders: Array<DevtoolsFeed<Extra>>;
}

const makeProbe = <Extra extends object>(seen: Seen<Extra>, hook: () => DevtoolsFeed<Extra>) => {
  // `tick` exists so a test can re-render with a prop that changed: the same
  // element would be bailed out of by React, and nothing would re-render.
  const Probe = (_props: { readonly tick?: number }) => {
    const feed = hook();
    seen.feed = feed;
    seen.registry = useQadiContext("test").registry;
    seen.renders.push(feed);
    return null;
  };
  return Probe;
};

const required = <A,>(value: A | undefined, what: string): A => {
  if (value === undefined) throw new Error(`${what} was never captured`);
  return value;
};

/** The cache a layer yields, read the way a panel reads it. */
const cacheOf = (layer: Layer.Layer<never>): Promise<DecisionCacheShape | undefined> =>
  Effect.runPromise(
    Effect.serviceOption(DecisionCache).pipe(Effect.provide(layer), Effect.map(Option.getOrUndefined)),
  );

/** The cache a decision atom reads: the registry's own runtime, no layer between. */
const cacheOfAtoms = (atoms: QadiAtoms, registry: AtomRegistry.AtomRegistry) =>
  Effect.runPromise(
    AtomRegistry.getResult(registry, atoms.runtime.atom(Effect.serviceOption(DecisionCache))).pipe(
      Effect.map(Option.getOrUndefined),
    ),
  );

describe("the feed's layer is the provider's own build", () => {
  it("reads the provider's own cache", async () => {
    const atoms = unhoisted();
    const seen: Seen<typeof noExtra> = { renders: [] };
    const Probe = makeProbe(seen, () => useDevtoolsFeed(noExtra));
    render(
      <QadiProvider atoms={atoms} subject={editor}>
        <Can policy={isEditor}>yes</Can>
        <Probe />
      </QadiProvider>,
    );
    await waitFor(() => expect(screen.getByText("yes")).toBeDefined());

    const feed = required(seen.feed, "the feed");
    const registry = required(seen.registry, "the registry");
    const viaFeed = await cacheOf(feed.diagnostics.layer);
    const viaAtoms = await cacheOfAtoms(atoms, registry);

    expect(viaFeed).toBeDefined();
    expect(viaFeed).toBe(viaAtoms);
    expect(await Effect.runPromise(required(viaFeed, "the cache").size)).toBeGreaterThanOrEqual(1);
  });

  it("is the pitfall's opposite: the application layer, provided afresh, is another cache", async () => {
    const appLayer = Layer.mergeAll(EvaluationServicesNone, decisionCacheLayer({ capacity: 8 }));
    const atoms = makeQadiAtoms(appLayer);
    const seen: Seen<typeof noExtra> = { renders: [] };
    const Probe = makeProbe(seen, () => useDevtoolsFeed(noExtra));
    render(
      <QadiProvider atoms={atoms} subject={editor}>
        <Can policy={isEditor}>yes</Can>
        <Probe />
      </QadiProvider>,
    );
    await waitFor(() => expect(screen.getByText("yes")).toBeDefined());

    const registry = required(seen.registry, "the registry");
    const viaAtoms = await cacheOfAtoms(atoms, registry);
    const viaApp = await cacheOf(appLayer);
    const viaFeed = await cacheOf(required(seen.feed, "the feed").diagnostics.layer);

    expect(viaApp).not.toBe(viaAtoms);
    expect(viaFeed).toBe(viaAtoms);
  });

  it("two providers over one atom set read two caches", async () => {
    const atoms = unhoisted();
    const first: Seen<typeof noExtra> = { renders: [] };
    const second: Seen<typeof noExtra> = { renders: [] };
    const A = makeProbe(first, () => useDevtoolsFeed(noExtra));
    const B = makeProbe(second, () => useDevtoolsFeed(noExtra));
    render(
      <>
        <QadiProvider atoms={atoms} subject={editor}>
          <A />
        </QadiProvider>
        <QadiProvider atoms={atoms} subject={editor}>
          <B />
        </QadiProvider>
      </>,
    );

    const cacheA = await cacheOf(required(first.feed, "feed A").diagnostics.layer);
    const cacheB = await cacheOf(required(second.feed, "feed B").diagnostics.layer);
    expect(cacheA).toBeDefined();
    expect(cacheB).toBeDefined();
    expect(cacheA).not.toBe(cacheB);
  });
});

describe("what the feed forwards", () => {
  it("questions is atoms.asked, and lists what a guard asked", async () => {
    const atoms = unhoisted();
    const seen: Seen<typeof noExtra> = { renders: [] };
    const Probe = makeProbe(seen, () => useDevtoolsFeed(noExtra));
    render(
      <QadiProvider atoms={atoms} subject={editor}>
        <Can policy={isEditor}>yes</Can>
        <Probe />
      </QadiProvider>,
    );
    await waitFor(() => expect(screen.getByText("yes")).toBeDefined());

    const feed = required(seen.feed, "the feed");
    expect(feed.diagnostics.questions).toBe(atoms.asked);
    expect(feed.diagnostics.questions()).toHaveLength(1);
  });

  it("gates are the provider's effective registry: one per instrumented guard, none otherwise", async () => {
    const instrumented: Seen<typeof noExtra> = { renders: [] };
    const Probe = makeProbe(instrumented, () => useDevtoolsFeed(noExtra));
    const first = render(
      <QadiProvider atoms={unhoisted()} subject={editor} instrument>
        <Can policy={isEditor}>yes</Can>
        <Probe />
      </QadiProvider>,
    );
    await waitFor(() => expect(required(instrumented.feed, "the feed").gates).toHaveLength(1));
    first.unmount();

    const plain: Seen<typeof noExtra> = { renders: [] };
    const PlainProbe = makeProbe(plain, () => useDevtoolsFeed(noExtra));
    render(
      <QadiProvider atoms={unhoisted()} subject={editor}>
        <Can policy={isEditor}>yes</Can>
        <PlainProbe />
      </QadiProvider>,
    );
    await waitFor(() => expect(screen.getByText("yes")).toBeDefined());
    expect(required(plain.feed, "the feed").gates).toEqual([]);
  });

  it("onInvalidate discards the provider's decisions, so a mounted guard re-asks", async () => {
    let asks = 0;
    const atoms = makeQadiAtoms(
      Layer.mergeAll(EvaluationServicesNone, decisionCacheLayer({ capacity: 8 })),
    );
    const seen: Seen<typeof noExtra> = { renders: [] };
    const Probe = makeProbe(seen, () => useDevtoolsFeed(noExtra));
    const Counting = () => {
      asks += 1;
      return <Can policy={isEditor}>yes</Can>;
    };
    render(
      <QadiProvider atoms={atoms} subject={editor}>
        <Counting />
        <Probe />
      </QadiProvider>,
    );
    await waitFor(() => expect(screen.getByText("yes")).toBeDefined());

    const registry = required(seen.registry, "the registry");
    const before = await cacheOfAtoms(atoms, registry);
    const sizeBefore = await Effect.runPromise(required(before, "the cache").size);
    expect(sizeBefore).toBeGreaterThanOrEqual(1);

    act(() => required(seen.feed, "the feed").onInvalidate());
    // The cache is cleared before the atoms recompute (BEH-QD-069), and then
    // the still-mounted guard asks again and refills it.
    await waitFor(() => expect(screen.getByText("yes")).toBeDefined());
    await waitFor(async () => {
      expect(await Effect.runPromise(required(before, "the cache").size)).toBeGreaterThanOrEqual(1);
    });
    expect(asks).toBeGreaterThanOrEqual(1);
  });

  it("extra fields pass through by reference", () => {
    const collector = { calls: 0 };
    const extras = { collector, intervalMillis: 5 };
    const seen: Seen<typeof extras> = { renders: [] };
    const Probe = makeProbe(seen, () => useDevtoolsFeed(extras));
    render(
      <QadiProvider atoms={unhoisted()} subject={editor}>
        <Probe />
      </QadiProvider>,
    );
    const diagnostics = required(seen.feed, "the feed").diagnostics;
    expect(diagnostics.collector).toBe(collector);
    expect(diagnostics.intervalMillis).toBe(5);
  });

  it("keeps the layer and the diagnostics object across a re-render with the same extra", () => {
    const seen: Seen<typeof noExtra> = { renders: [] };
    const Probe = makeProbe(seen, () => useDevtoolsFeed(noExtra));
    const atoms = unhoisted();
    const tree = (tick: number) => (
      <QadiProvider atoms={atoms} subject={editor}>
        <Probe tick={tick} />
      </QadiProvider>
    );
    const view = render(tree(0));
    view.rerender(tree(1));
    view.rerender(tree(2));

    const [first, ...rest] = seen.renders;
    expect(rest.length).toBeGreaterThan(0);
    for (const later of rest) {
      expect(later.diagnostics).toBe(required(first, "the first render").diagnostics);
      expect(later.diagnostics.layer).toBe(required(first, "the first render").diagnostics.layer);
    }
  });
});

describe("outside a provider, and at the edges", () => {
  it("throws MissingQadiProviderError outside a provider", () => {
    const Probe = () => {
      useDevtoolsFeed(noExtra);
      return null;
    };
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      expect(() => render(<Probe />)).toThrow(/useDevtoolsFeed must be used inside <QadiProvider>/);
    } finally {
      quiet.mockRestore();
    }
  });

  it("unmounting the provider with a consumer's run alive logs and throws nothing", async () => {
    const atoms = unhoisted();
    const seen: Seen<typeof noExtra> = { renders: [] };
    const Probe = makeProbe(seen, () => useDevtoolsFeed(noExtra));
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const warned = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const view = render(
        <QadiProvider atoms={atoms} subject={editor}>
          <Can policy={isEditor}>yes</Can>
          <Probe />
        </QadiProvider>,
      );
      await waitFor(() => expect(screen.getByText("yes")).toBeDefined());
      // A consumer's run: the layer built and held, as the dock's diagnostics run does.
      const run = Effect.runFork(
        Effect.scoped(
          Effect.andThen(Layer.build(required(seen.feed, "the feed").diagnostics.layer), Effect.never),
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, 20));
      view.unmount();
      await new Promise((resolve) => setTimeout(resolve, 30));
      await Effect.runPromise(Effect.sync(() => run.interruptUnsafe()));
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(logged).not.toHaveBeenCalled();
      expect(warned).not.toHaveBeenCalled();
    } finally {
      logged.mockRestore();
      warned.mockRestore();
    }
  });
});

describe("runtimeLayer, headless", () => {
  it("yields the registry's own context, and releases its mount with the scope", async () => {
    const atoms = unhoisted();
    const registry = AtomRegistry.make();
    try {
      const viaLayer = await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const cache = yield* Effect.serviceOption(DecisionCache).pipe(
              Effect.provide(runtimeLayer(atoms, registry)),
              Effect.map(Option.getOrUndefined),
            );
            return cache;
          }),
        ),
      );
      const viaRegistry = await cacheOfAtoms(atoms, registry);
      expect(viaLayer).toBeDefined();
      expect(viaLayer).toBe(viaRegistry);

      // Held for the scope, dropped after it: no context outlives the consumer.
      await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            yield* Layer.build(runtimeLayer(atoms, registry));
            expect(registry.getNodes().has(atoms.runtime)).toBe(true);
          }),
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(registry.getNodes().has(atoms.runtime)).toBe(false);
    } finally {
      registry.dispose();
    }
  });
});
