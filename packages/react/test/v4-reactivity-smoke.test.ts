/**
 * Canary for the `effect/unstable/reactivity` APIs `@qadi/react` is built on.
 *
 * The module is unstable by name ([ADR-QD-014](../../../spec/decisions/014-react-via-atoms.md)):
 * its API may move before Effect 4.0, and this package moves with it. The core
 * package has `v4-api-smoke.test.ts` for the same reason. Without this, a beta
 * bump fails diffusely across the React suite and the cause has to be inferred
 * from four failing component tests.
 *
 * Every API exercised here is one `QadiAtoms.ts` or `QadiProvider.tsx` actually
 * calls. Pinning more than that would make the canary noisy, and a noisy canary
 * gets skipped.
 */
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as Atom from "effect/unstable/reactivity/Atom";
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";
import * as Reactivity from "effect/unstable/reactivity/Reactivity";
import { afterEach, describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// A service to put behind a runtime, so "the layer reached the atom" is
// observable rather than assumed.
// ---------------------------------------------------------------------------

interface TickerShape {
  readonly next: Effect.Effect<number>;
}

class Ticker extends Context.Service<Ticker, TickerShape>()("smoke/Ticker") {}

class Broken extends Data.TaggedError("smoke/Broken")<{ readonly why: string }> {}

/** Counts how many times an atom's effect actually ran. */
const tickerLayer = (counter: { count: number }) =>
  Layer.succeed(Ticker, {
    next: Effect.sync(() => (counter.count += 1)),
  });

const registries: Array<AtomRegistry.AtomRegistry> = [];
const makeRegistry = (options?: {
  readonly initialValues: Iterable<readonly [Atom.Atom<unknown>, unknown]>;
}) => {
  const registry = options === undefined ? AtomRegistry.make() : AtomRegistry.make(options);
  registries.push(registry);
  return registry;
};

afterEach(() => {
  for (const registry of registries.splice(0)) registry.dispose();
});

describe("effect/unstable/reactivity API canary", () => {
  // -------------------------------------------------------------------------
  // Atom.make / Atom.family — the subject atom and the per-policy memo
  // -------------------------------------------------------------------------

  it("Atom.make is writable through the registry", () => {
    const atom: Atom.Writable<string | undefined> = Atom.make<string | undefined>(undefined);
    const registry = makeRegistry();

    expect(registry.get(atom)).toBeUndefined();
    registry.set(atom, "u1");
    expect(registry.get(atom)).toBe("u1");
  });

  it("Atom.family memoises on the argument STRUCTURALLY, not by reference", () => {
    // This is what makes one shared evaluation per policy possible, and the
    // keying rule is not what this package documented for its first three
    // revisions. `Atom.family` holds a `MutableHashMap`, which compares with
    // `Equal.equals` — structural for plain objects. Two independently
    // constructed but equal policies therefore share one atom.
    //
    // Pinned because a bump either way is silent and serious. If it became
    // reference keying, every component building its policy inline would
    // evaluate separately — the predecessor's defect, reintroduced with no
    // other test failing. If it stopped discriminating unequal arguments, two
    // different policies would share one decision, which is a breach.
    const family = Atom.family((key: { readonly id: string }) => Atom.make(key.id));

    expect(family({ id: "x" })).toBe(family({ id: "x" }));
    expect(family({ id: "x" })).not.toBe(family({ id: "y" }));

    const byString = Atom.family((key: string) => Atom.make(key));
    expect(byString("a")).toBe(byString("a"));
    expect(byString("a")).not.toBe(byString("b"));
  });

  it("AtomRegistry.make seeds initial values before the first read", () => {
    // `QadiProvider` seeds the subject at construction rather than writing it in
    // an effect, so the first render already has it. That depends on seeding
    // being observable synchronously.
    const atom = Atom.make<string | undefined>(undefined);
    const registry = makeRegistry({ initialValues: [[atom, "seeded"] as const] });

    expect(registry.get(atom)).toBe("seeded");
  });

  // -------------------------------------------------------------------------
  // Atom.runtime — the decision atoms
  // -------------------------------------------------------------------------

  it("Atom.runtime provides its layer to an atom's effect", async () => {
    const counter = { count: 0 };
    const runtime = Atom.runtime(tickerLayer(counter));
    const atom = runtime.atom(Effect.flatMap(Ticker, (t) => t.next));
    const registry = makeRegistry();

    const value = await Effect.runPromise(
      AtomRegistry.getResult(registry, atom, { suspendOnWaiting: true }),
    );
    expect(value).toBe(1);
  });

  it("an atom reading another atom re-runs when that atom is written", async () => {
    const counter = { count: 0 };
    const runtime = Atom.runtime(tickerLayer(counter));
    const input = Atom.make<string | undefined>(undefined);

    const atom = runtime.atom((get) => {
      const current = get(input);
      // `Effect.never` is load-bearing: with no subject yet, the question is
      // unanswerable rather than refused, and an effect that never settles
      // leaves the atom Initial. Anything that made this resolve — or reject —
      // would render every guarded control as forbidden on first paint.
      if (current === undefined) return Effect.never;
      return Effect.map(Ticker, () => current);
    });

    const registry = makeRegistry();
    const unmount = registry.mount(atom);

    expect(AsyncResult.isInitial(registry.get(atom))).toBe(true);

    registry.set(input, "u1");
    const settled = await Effect.runPromise(
      AtomRegistry.getResult(registry, atom, { suspendOnWaiting: true }),
    );
    expect(settled).toBe("u1");
    unmount();
  });

  it("withReactivity + Reactivity.invalidate re-runs a mounted atom", async () => {
    // Authority changes without the subject object changing — a role granted
    // server-side leaves the same subject holding different powers. Invalidation
    // is the only thing that notices, so `invalidate` is the whole of
    // `QadiAtoms.invalidate`.
    const counter = { count: 0 };
    const runtime = Atom.runtime(tickerLayer(counter));
    const key = "smoke/ticks";

    const atom = runtime
      .atom(Effect.flatMap(Ticker, (t) => t.next))
      .pipe(runtime.factory.withReactivity([key]));

    const invalidate: Atom.AtomResultFn<void, void> = runtime.fn((_: void) =>
      Reactivity.invalidate([key]),
    );

    const registry = makeRegistry();
    registry.mount(invalidate);
    const unmount = registry.mount(atom);

    await Effect.runPromise(AtomRegistry.getResult(registry, atom, { suspendOnWaiting: true }));
    expect(counter.count).toBe(1);

    registry.set(invalidate, undefined);
    await Effect.runPromise(AtomRegistry.getResult(registry, atom, { suspendOnWaiting: true }));
    expect(counter.count).toBe(2);
    unmount();
  });

  // -------------------------------------------------------------------------
  // registry.subscribe — the useSyncExternalStore contract
  // -------------------------------------------------------------------------

  it("registry.subscribe notifies on change and returns an unsubscribe", () => {
    // `useAtomValue` is one `useSyncExternalStore` call over exactly this pair.
    // The store must hand back the same reference until it changes, or React
    // re-renders forever.
    const atom = Atom.make(0);
    const registry = makeRegistry();
    const seen: Array<number> = [];

    const unsubscribe = registry.subscribe(atom, () => seen.push(registry.get(atom)));
    registry.set(atom, 1);
    registry.set(atom, 2);
    unsubscribe();
    registry.set(atom, 3);

    expect(seen).toEqual([1, 2]);
  });

  it("a snapshot is referentially stable until the value changes", () => {
    const atom = Atom.make({ n: 1 });
    const registry = makeRegistry();

    expect(registry.get(atom)).toBe(registry.get(atom));
  });

  // -------------------------------------------------------------------------
  // AsyncResult — the three states a decision can be in
  // -------------------------------------------------------------------------

  it("AsyncResult distinguishes initial, success and failure", async () => {
    // Initial, Deny and Failure are three different answers. Collapsing them to
    // a boolean is what makes an attribute-store outage look like a permissions
    // problem — INV-QD-006.
    const runtime = Atom.runtime(Layer.empty);
    const pending = runtime.atom(Effect.never);
    const failing = runtime.atom(Effect.fail(new Broken({ why: "store down" })));
    const registry = makeRegistry();

    // Unanswered is Initial. A synchronous failure never passes through Initial,
    // so the two are asserted on separate atoms rather than in sequence.
    expect(AsyncResult.isInitial(registry.get(pending))).toBe(true);

    const unmount = registry.mount(failing);
    await Effect.runPromise(
      Effect.result(AtomRegistry.getResult(registry, failing, { suspendOnWaiting: true })),
    );

    const result = registry.get(failing);
    expect(AsyncResult.isFailure(result)).toBe(true);
    expect(AsyncResult.isSuccess(result)).toBe(false);
    expect(AsyncResult.isInitial(result)).toBe(false);
    unmount();
  });

  it("a waiting success still reports isSuccess, which is why currentDecision exists", () => {
    // `AsyncResult.isSuccess` alone is not "the decision holds": a waiting result
    // carries the *previous* value while a new one computes. For most data that
    // staleness is a feature; for authorization it is an over-permission —
    // ADR-QD-017. `currentDecision` is the single place that rule lives, and it
    // is only necessary because of the shape asserted here.
    const settled = AsyncResult.success("allow");
    expect(AsyncResult.isSuccess(settled)).toBe(true);
    expect(settled.waiting).toBe(false);
    expect(settled.value).toBe("allow");

    const stale = AsyncResult.waiting(settled);
    expect(AsyncResult.isSuccess(stale)).toBe(true);
    expect(stale.waiting).toBe(true);
  });
});
