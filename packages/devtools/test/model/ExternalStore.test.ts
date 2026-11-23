import { assert, describe, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Scope from "effect/Scope";
import * as Tracer from "effect/Tracer";
import { makeDerivedStore, makeExternalStore } from "../../src/model/ExternalStore.ts";
import type { Parent } from "../../src/model/ExternalStore.ts";
import { heardOn, thrownBy } from "../helpers.ts";

describe("makeExternalStore", () => {
  it("returns the initial value, and the same reference until something changes", () => {
    const initial = { n: 1 };
    const store = makeExternalStore(initial);
    assert.strictEqual(store.getSnapshot(), initial);
    assert.strictEqual(store.getSnapshot(), store.getSnapshot());
  });

  it("notifies once when set to a different reference", () => {
    const store = makeExternalStore({ n: 1 });
    let heard = 0;
    store.subscribe(() => {
      heard += 1;
    });
    const next = { n: 2 };
    store.set(next);
    assert.strictEqual(heard, 1);
    assert.strictEqual(store.getSnapshot(), next);
  });

  it("does not notify when set to the reference it already holds", () => {
    const initial = { n: 1 };
    const store = makeExternalStore(initial);
    let heard = 0;
    store.subscribe(() => {
      heard += 1;
    });
    store.set(initial);
    assert.strictEqual(heard, 0);
  });

  it("publish notifies even when the reference is unchanged", () => {
    const initial = { n: 1 };
    const store = makeExternalStore(initial);
    let heard = 0;
    store.subscribe(() => {
      heard += 1;
    });
    store.publish(initial);
    assert.strictEqual(heard, 1);
    assert.strictEqual(store.getSnapshot(), initial);
  });

  it("stops notifying a listener once it unsubscribes, and only that one", () => {
    const store = makeExternalStore(0);
    const heard: Array<string> = [];
    const stopA = store.subscribe(() => heard.push("a"));
    store.subscribe(() => heard.push("b"));
    store.set(1);
    stopA();
    store.set(2);
    assert.deepStrictEqual(heard, ["a", "b", "b"]);
  });

  it("calls every later listener when an earlier one throws", () => {
    const store = makeExternalStore(0);
    const heard: Array<string> = [];
    store.subscribe(() => {
      throw new Error("a failed");
    });
    store.subscribe(() => heard.push("b"));
    const outcome = thrownBy(() => store.set(1));
    assert.isTrue(outcome.threw);
    assert.deepStrictEqual(heard, ["b"]);
  });

  it("rethrows two thrown values as one AggregateError holding both in call order, with the fixed message", () => {
    const store = makeExternalStore(0);
    const heard: Array<string> = [];
    const ea = new Error("a failed");
    const ec = new Error("c failed");
    store.subscribe(() => {
      throw ea;
    });
    store.subscribe(() => heard.push("b"));
    store.subscribe(() => {
      throw ec;
    });
    const outcome = thrownBy(() => store.publish(0));
    assert.isTrue(outcome.threw);
    assert.instanceOf(outcome.thrown, AggregateError);
    assert.strictEqual(outcome.thrown.message, "More than one of the store's listeners threw.");
    assert.strictEqual(outcome.thrown.errors.length, 2);
    assert.strictEqual(outcome.thrown.errors[0], ea);
    assert.strictEqual(outcome.thrown.errors[1], ec);
    assert.deepStrictEqual(heard, ["b"]);
  });

  it("rethrows a single thrown value itself once every listener ran, undefined and null included", () => {
    const only = new Error("only one failed");
    for (const value of [only, undefined, null]) {
      const store = makeExternalStore(0);
      const heard: Array<string> = [];
      store.subscribe(() => {
        throw value;
      });
      store.subscribe(() => heard.push("second"));
      const outcome = thrownBy(() => store.publish(1));
      assert.isTrue(outcome.threw);
      assert.strictEqual(outcome.thrown, value);
      assert.deepStrictEqual(heard, ["second"]);
    }
  });

  it("decides by how many threw, not by what: two undefined throws are an AggregateError of two", () => {
    const store = makeExternalStore(0);
    store.subscribe(() => {
      throw undefined;
    });
    store.subscribe(() => {
      throw undefined;
    });
    const outcome = thrownBy(() => store.publish(1));
    assert.isTrue(outcome.threw);
    assert.instanceOf(outcome.thrown, AggregateError);
    assert.deepStrictEqual(outcome.thrown.errors, [undefined, undefined]);
  });

  it("keeps an AggregateError a listener throws as one value: alone it is rethrown itself, beside another it is one element", () => {
    const oa = new Error("outer a failed");
    const ob = new Error("outer b failed");
    const ic = new Error("inner c failed");
    const outer = makeExternalStore(0);
    outer.subscribe(() => {
      throw oa;
    });
    outer.subscribe(() => {
      throw ob;
    });
    const saved: Array<unknown> = [];
    const forward = () => {
      const caught = thrownBy(() => outer.publish(1));
      saved.push(caught.thrown);
      throw caught.thrown;
    };

    const alone = makeExternalStore(0);
    alone.subscribe(forward);
    const first = thrownBy(() => alone.publish(1));
    assert.instanceOf(saved[0], AggregateError);
    assert.strictEqual(first.thrown, saved[0]);
    assert.deepStrictEqual(saved[0].errors, [oa, ob]);

    const beside = makeExternalStore(0);
    beside.subscribe(forward);
    beside.subscribe(() => {
      throw ic;
    });
    const second = thrownBy(() => beside.publish(1));
    assert.instanceOf(second.thrown, AggregateError);
    assert.strictEqual(second.thrown.errors.length, 2);
    assert.strictEqual(second.thrown.errors[0], saved[1]);
    assert.strictEqual(second.thrown.errors[1], ic);
  });

  it("with no throw, calls every listener once in subscription order and throws nothing", () => {
    const store = makeExternalStore(0);
    const heard: Array<string> = [];
    store.subscribe(() => heard.push("a"));
    store.subscribe(() => heard.push("b"));
    store.subscribe(() => heard.push("c"));
    const outcome = thrownBy(() => store.publish(1));
    assert.isFalse(outcome.threw);
    assert.deepStrictEqual(heard, ["a", "b", "c"]);
  });

  it("does not call a listener removed during the notification before its turn", () => {
    const store = makeExternalStore(0);
    const heard: Array<string> = [];
    let stopC = () => {};
    store.subscribe(() => {
      heard.push("a");
      stopC();
    });
    store.subscribe(() => heard.push("b"));
    stopC = store.subscribe(() => heard.push("c"));
    store.set(1);
    assert.deepStrictEqual(heard, ["a", "b"]);
  });

  it("calls a listener added during the notification in the same pass", () => {
    const store = makeExternalStore(0);
    const heard: Array<string> = [];
    const d = () => {
      heard.push("d");
    };
    store.subscribe(() => {
      heard.push("a");
      store.subscribe(d);
    });
    store.subscribe(() => heard.push("b"));
    store.set(1);
    assert.deepStrictEqual(heard, ["a", "b", "d"]);
  });

  it("holds the new value before any listener runs, and keeps it when one throws", () => {
    const store = makeExternalStore({ n: 1 });
    const next = { n: 2 };
    let read: unknown;
    let calls = 0;
    store.subscribe(() => {
      calls += 1;
      read = store.getSnapshot();
      throw new Error("a failed");
    });
    const first = thrownBy(() => store.set(next));
    assert.isTrue(first.threw);
    assert.strictEqual(read, next);
    assert.strictEqual(store.getSnapshot(), next);
    const second = thrownBy(() => store.set(next));
    assert.isFalse(second.threw);
    assert.strictEqual(calls, 1);
  });

  it("never reads what a listener throws: a value whose every trap throws comes back by identity, alone and beside another", () => {
    const traps: Array<string> = [];
    const refuse = (trap: string) => () => {
      traps.push(trap);
      throw new Error(`read through ${trap}`);
    };
    const hostile = new Proxy(
      {},
      {
        get: refuse("get"),
        has: refuse("has"),
        ownKeys: refuse("ownKeys"),
        getOwnPropertyDescriptor: refuse("getOwnPropertyDescriptor"),
        getPrototypeOf: refuse("getPrototypeOf"),
        set: refuse("set"),
        defineProperty: refuse("defineProperty"),
        deleteProperty: refuse("deleteProperty"),
        isExtensible: refuse("isExtensible"),
        preventExtensions: refuse("preventExtensions"),
        setPrototypeOf: refuse("setPrototypeOf"),
      },
    );
    const alone = makeExternalStore(0);
    alone.subscribe(() => {
      throw hostile;
    });
    const one = thrownBy(() => alone.set(1));
    assert.isTrue(one.threw);
    assert.isTrue(one.thrown === hostile);

    const beside = makeExternalStore(0);
    const other = new Error("b failed");
    beside.subscribe(() => {
      throw hostile;
    });
    beside.subscribe(() => {
      throw other;
    });
    const two = thrownBy(() => beside.set(1));
    assert.isTrue(two.threw);
    assert.isTrue(two.thrown instanceof AggregateError);
    const errors = two.thrown instanceof AggregateError ? two.thrown.errors : [];
    assert.strictEqual(errors.length, 2);
    assert.isTrue(errors[0] === hostile);
    assert.isTrue(errors[1] === other);
    assert.deepStrictEqual(traps, []);
  });
});

/** A parent that exposes the listeners it currently holds. */
const observedParent = () => {
  const held = new Set<() => void>();
  const parent: Parent = {
    subscribe: (listener) => {
      held.add(listener);
      return () => {
        held.delete(listener);
      };
    },
  };
  return { parent, held };
};

describe("makeDerivedStore", () => {
  it.effect("the first compute runs at construction and notifies no listener", () =>
    Effect.gen(function* () {
      const parent = makeExternalStore({ n: 1 });
      const keys: Array<{ readonly value: { readonly n: number } }> = [];
      const results: Array<{ readonly seen: number }> = [];
      const store = yield* makeDerivedStore({
        parents: [parent],
        key: () => ({ value: parent.getSnapshot() }),
        compute: (key) => {
          keys.push(key);
          const result = { seen: key.value.n };
          results.push(result);
          return result;
        },
      });
      const heard = heardOn(store);

      assert.strictEqual(keys.length, 1);
      assert.strictEqual(keys[0]?.value, parent.getSnapshot());
      assert.strictEqual(store.getSnapshot(), results[0]);
      assert.strictEqual(heard.calls, 0);
    }));

  it.effect(
    "each field of a three-field key moved alone recomputes and notifies once",
    () =>
      Effect.gen(function* () {
        const parent = makeExternalStore(0);
        let a = 1;
        let b = "x";
        let c = false;
        let computed = 0;
        const store = yield* makeDerivedStore({
          parents: [parent],
          key: () => ({ a, b, c }),
          compute: (key) => {
            computed += 1;
            return { key };
          },
        });
        const heard = heardOn(store);
        const moves: ReadonlyArray<() => void> = [
          () => {
            a += 1;
          },
          () => {
            b += "y";
          },
          () => {
            c = !c;
          },
        ];

        for (const move of moves) {
          const computedBefore = computed;
          const heardBefore = heard.calls;
          move();
          store.refresh();
          assert.strictEqual(computed, computedBefore + 1);
          assert.strictEqual(heard.calls, heardBefore + 1);
        }
      }),
  );

  it.effect(
    "a one-field and a five-field key each recompute once when one field moves",
    () =>
      Effect.gen(function* () {
        const parent = makeExternalStore(0);
        let one = 1;
        let fifth = 5;
        let computedOne = 0;
        let computedFive = 0;
        const small = yield* makeDerivedStore({
          parents: [parent],
          key: () => ({ one }),
          compute: (key) => {
            computedOne += 1;
            return { key };
          },
        });
        const large = yield* makeDerivedStore({
          parents: [parent],
          key: () => ({
            first: parent.getSnapshot(),
            second: 2,
            third: 3,
            fourth: 4,
            fifth,
          }),
          compute: (key) => {
            computedFive += 1;
            return { key };
          },
        });
        const heardSmall = heardOn(small);
        const heardLarge = heardOn(large);

        one += 1;
        small.refresh();
        fifth += 1;
        large.refresh();

        assert.strictEqual(computedOne, 2);
        assert.strictEqual(heardSmall.calls, 1);
        assert.strictEqual(computedFive, 2);
        assert.strictEqual(heardLarge.calls, 1);
      }),
  );

  it.effect("an unchanged key calls neither the compute nor any listener", () =>
    Effect.gen(function* () {
      const parent = makeExternalStore({ n: 1 });
      let computed = 0;
      const store = yield* makeDerivedStore({
        parents: [parent],
        key: () => ({ value: parent.getSnapshot() }),
        compute: (key) => {
          computed += 1;
          return { key };
        },
      });
      const heard = heardOn(store);

      parent.publish(parent.getSnapshot());

      assert.strictEqual(computed, 1);
      assert.strictEqual(heard.calls, 0);
    }));

  it.effect(
    "a repeat trigger after a change calls neither the compute nor a listener",
    () =>
      Effect.gen(function* () {
        const parent = makeExternalStore({ n: 1 });
        let computed = 0;
        const store = yield* makeDerivedStore({
          parents: [parent],
          key: () => ({ value: parent.getSnapshot() }),
          compute: (key) => {
            computed += 1;
            return { key };
          },
        });
        const heard = heardOn(store);
        const next = { n: 2 };

        parent.set(next);
        parent.publish(next);

        assert.strictEqual(computed, 2);
        assert.strictEqual(heard.calls, 1);
      }),
  );

  it.effect("a key that loses a field holding undefined counts as changed", () =>
    Effect.gen(function* () {
      type Lossy = { readonly a: number; readonly b: undefined } | { readonly a: number };
      const parent = makeExternalStore(0);
      let whole = true;
      let computed = 0;
      const store = yield* makeDerivedStore({
        parents: [parent],
        key: (): Lossy => (whole ? { a: 1, b: undefined } : { a: 1 }),
        compute: (key) => {
          computed += 1;
          return { key };
        },
      });
      const heard = heardOn(store);

      whole = false;
      store.refresh();

      assert.strictEqual(computed, 2);
      assert.strictEqual(heard.calls, 1);
    }));

  it.effect("a key that gains a field counts as changed", () =>
    Effect.gen(function* () {
      type Gaining = { readonly a: number } | { readonly a: number; readonly b: number };
      const parent = makeExternalStore(0);
      let grown = false;
      let computed = 0;
      const store = yield* makeDerivedStore({
        parents: [parent],
        key: (): Gaining => (grown ? { a: 1, b: 2 } : { a: 1 }),
        compute: (key) => {
          computed += 1;
          return { key };
        },
      });
      const heard = heardOn(store);

      grown = true;
      store.refresh();

      assert.strictEqual(computed, 2);
      assert.strictEqual(heard.calls, 1);
    }));

  it.effect(
    "a key that swaps a field for another holding undefined counts as changed",
    () =>
      Effect.gen(function* () {
        type Swapping = { readonly a: undefined } | { readonly b: undefined };
        const parent = makeExternalStore(0);
        let swapped = false;
        let computed = 0;
        const store = yield* makeDerivedStore({
          parents: [parent],
          key: (): Swapping => (swapped ? { b: undefined } : { a: undefined }),
          compute: (key) => {
            computed += 1;
            return { key };
          },
        });
        const heard = heardOn(store);

        swapped = true;
        store.refresh();

        assert.strictEqual(computed, 2);
        assert.strictEqual(heard.calls, 1);
      }),
  );

  it.effect("a key with an inherited enumerable field compares equal to itself", () =>
    Effect.gen(function* () {
      const parent = makeExternalStore(0);
      const inherited: { readonly inheritedField: number } = Object.create({
        inheritedField: 1,
      });
      let computed = 0;
      const store = yield* makeDerivedStore({
        parents: [parent],
        key: () => inherited,
        compute: (key) => {
          computed += 1;
          return { key };
        },
      });
      const heard = heardOn(store);

      parent.publish(1);
      store.refresh();

      assert.strictEqual(computed, 1);
      assert.strictEqual(heard.calls, 0);
    }));

  it.effect(
    "a key differing only in an inherited, non-enumerable or symbol-keyed field is equal",
    () =>
      Effect.gen(function* () {
        const parent = makeExternalStore(0);
        const symbol = Symbol("hidden");
        let moved = 1;
        let computed = 0;
        const store = yield* makeDerivedStore({
          parents: [parent],
          key: (): { readonly shown: number; readonly inheritedField: number } => {
            const key = Object.assign(Object.create({ inheritedField: moved }), {
              shown: 1,
              [symbol]: moved,
            });
            return Object.defineProperty(key, "concealed", {
              value: moved,
              enumerable: false,
            });
          },
          compute: (key) => {
            computed += 1;
            return { key };
          },
        });
        const heard = heardOn(store);

        moved += 1;
        store.refresh();

        assert.strictEqual(computed, 1);
        assert.strictEqual(heard.calls, 0);
      }),
  );

  it.effect("a compute that returns the held reference notifies nothing", () =>
    Effect.gen(function* () {
      const parent = makeExternalStore(0);
      const held = { constant: true };
      let n = 1;
      let computed = 0;
      const store = yield* makeDerivedStore({
        parents: [parent],
        key: () => ({ n }),
        compute: () => {
          computed += 1;
          return held;
        },
      });
      const heard = heardOn(store);

      n += 1;
      store.refresh();

      assert.strictEqual(computed, 2);
      assert.strictEqual(heard.calls, 0);
      assert.strictEqual(store.getSnapshot(), held);
    }));

  it.effect("a throwing compute commits nothing and the next trigger recomputes", () =>
    Effect.gen(function* () {
      const parent = makeExternalStore(0);
      const boom = new Error("the compute failed");
      let n = 1;
      let failing = false;
      let computed = 0;
      const store = yield* makeDerivedStore({
        parents: [parent],
        key: () => ({ n }),
        compute: (key) => {
          computed += 1;
          if (failing) throw boom;
          return { key };
        },
      });
      const heard = heardOn(store);
      const before = store.getSnapshot();

      n += 1;
      failing = true;
      const first = thrownBy(() => store.refresh());
      assert.isTrue(first.threw);
      assert.strictEqual(first.thrown, boom);
      assert.strictEqual(store.getSnapshot(), before);
      assert.strictEqual(heard.calls, 0);

      failing = false;
      store.refresh();

      assert.strictEqual(computed, 3);
      assert.notStrictEqual(store.getSnapshot(), before);
      assert.strictEqual(heard.calls, 1);
    }));

  it.effect("a listener that calls refresh during its notification hears it once", () =>
    Effect.gen(function* () {
      const parent = makeExternalStore(0);
      let n = 1;
      let computed = 0;
      const store = yield* makeDerivedStore({
        parents: [parent],
        key: () => ({ n }),
        compute: (key) => {
          computed += 1;
          return { key };
        },
      });
      let heard = 0;
      store.subscribe(() => {
        heard += 1;
        store.refresh();
      });

      n += 1;
      store.refresh();

      assert.strictEqual(heard, 1);
      assert.strictEqual(computed, 2);
    }));

  it.effect("refresh recomputes once for a key input that is not a parent", () =>
    Effect.gen(function* () {
      const parent = makeExternalStore(0);
      let outside = 1;
      let computed = 0;
      const store = yield* makeDerivedStore({
        parents: [parent],
        key: () => ({ outside }),
        compute: (key) => {
          computed += 1;
          return { key };
        },
      });
      const heard = heardOn(store);

      outside += 1;
      store.refresh();
      store.refresh();

      assert.strictEqual(computed, 2);
      assert.strictEqual(heard.calls, 1);
    }));

  it.effect(
    "a listener added to either parent after construction reads the new value",
    () =>
      Effect.gen(function* () {
        const first = makeExternalStore(1);
        const second = makeExternalStore(10);
        const store = yield* makeDerivedStore({
          parents: [first, second],
          key: () => ({ one: first.getSnapshot(), two: second.getSnapshot() }),
          compute: (key) => ({ sum: key.one + key.two }),
        });
        const pushed: Array<{ readonly sum: number }> = [];
        first.subscribe(() => pushed.push(store.getSnapshot()));
        second.subscribe(() => pushed.push(store.getSnapshot()));
        const initial = store.getSnapshot();

        first.set(2);
        const afterFirst = store.getSnapshot();
        second.set(20);
        const afterSecond = store.getSnapshot();

        assert.strictEqual(pushed.length, 2);
        assert.strictEqual(pushed[0], afterFirst);
        assert.notStrictEqual(afterFirst, initial);
        assert.strictEqual(pushed[1], afterSecond);
        assert.notStrictEqual(afterSecond, afterFirst);
      }),
  );

  it.effect(
    "one throwing listener: the rest run and the parent rethrows that value",
    () =>
      Effect.gen(function* () {
        const parent = makeExternalStore(0);
        const boom = new Error("a listener failed");
        const store = yield* makeDerivedStore({
          parents: [parent],
          key: () => ({ value: parent.getSnapshot() }),
          compute: (key) => ({ key }),
        });
        let counted = 0;
        let parentHeard = 0;
        const before = store.getSnapshot();
        store.subscribe(() => {
          throw boom;
        });
        store.subscribe(() => {
          counted += 1;
        });
        parent.subscribe(() => {
          parentHeard += 1;
        });

        const outcome = thrownBy(() => parent.set(1));

        assert.isTrue(outcome.threw);
        assert.strictEqual(outcome.thrown, boom);
        assert.strictEqual(counted, 1);
        assert.strictEqual(parentHeard, 1);
        assert.notStrictEqual(store.getSnapshot(), before);
      }),
  );

  it.effect(
    "two throwing listeners: the rest run and the parent rethrows one AggregateError",
    () =>
      Effect.gen(function* () {
        const parent = makeExternalStore(0);
        const first = new Error("the first listener failed");
        const second = new Error("the second listener failed");
        const store = yield* makeDerivedStore({
          parents: [parent],
          key: () => ({ value: parent.getSnapshot() }),
          compute: (key) => ({ key }),
        });
        let counted = 0;
        let parentHeard = 0;
        store.subscribe(() => {
          throw first;
        });
        store.subscribe(() => {
          throw second;
        });
        store.subscribe(() => {
          counted += 1;
        });
        parent.subscribe(() => {
          parentHeard += 1;
        });

        const outcome = thrownBy(() => parent.set(1));

        assert.isTrue(outcome.threw);
        assert.instanceOf(outcome.thrown, AggregateError);
        assert.strictEqual(outcome.thrown.errors.length, 2);
        assert.strictEqual(outcome.thrown.errors[0], first);
        assert.strictEqual(outcome.thrown.errors[1], second);
        assert.strictEqual(
          outcome.thrown.message,
          "More than one of the store's listeners threw.",
        );
        assert.strictEqual(counted, 1);
        assert.strictEqual(parentHeard, 1);
      }),
  );

  it.effect(
    "after the scope closes nothing is read or computed and each parent is released",
    () =>
      Effect.gen(function* () {
        const first = observedParent();
        const second = observedParent();
        let moved = 1;
        let reads = 0;
        let computed = 0;
        const scope = yield* Scope.make();
        const store = yield* Scope.provide(
          makeDerivedStore({
            parents: [first.parent, second.parent],
            key: () => {
              reads += 1;
              return { moved };
            },
            compute: (key) => {
              computed += 1;
              return { key };
            },
          }),
          scope,
        );
        const heldBefore = [first.held.size, second.held.size];
        yield* Scope.close(scope, Exit.void);
        const readsAtClose = reads;
        const computedAtClose = computed;
        const last = store.getSnapshot();
        const heard = heardOn(store);

        moved += 1;
        store.refresh();

        assert.deepStrictEqual(heldBefore, [1, 1]);
        assert.strictEqual(first.held.size, 0);
        assert.strictEqual(second.held.size, 0);
        assert.strictEqual(reads, readsAtClose);
        assert.strictEqual(computed, computedAtClose);
        assert.strictEqual(store.getSnapshot(), last);
        assert.strictEqual(heard.calls, 0);
      }),
  );

  it.effect(
    "a parent whose subscribe throws leaves no earlier parent subscribed after close",
    () =>
      Effect.gen(function* () {
        const first = observedParent();
        const refused = new Error("the parent refused the listener");
        const throwing: Parent = {
          subscribe: () => {
            throw refused;
          },
        };
        const scope = yield* Scope.make();
        const exit = yield* Effect.exit(
          Scope.provide(
            makeDerivedStore({
              parents: [first.parent, throwing],
              key: () => ({ moved: 1 }),
              compute: (key) => ({ key }),
            }),
            scope,
          ),
        );
        const heldBefore = first.held.size;
        yield* Scope.close(scope, Exit.void);

        assert.isTrue(Exit.isFailure(exit) && Cause.hasDies(exit.cause));
        assert.strictEqual(
          Exit.isFailure(exit) ? Cause.squash(exit.cause) : undefined,
          refused,
        );
        assert.strictEqual(heldBefore, 1);
        assert.strictEqual(first.held.size, 0);
      }),
  );

  it.effect(
    "a release that throws leaves no later parent subscribed and fails the close",
    () =>
      Effect.gen(function* () {
        const refused = new Error("the parent could not release");
        const throwing: Parent = {
          subscribe: () => () => {
            throw refused;
          },
        };
        const later = observedParent();
        const scope = yield* Scope.make();
        yield* Scope.provide(
          makeDerivedStore({
            parents: [throwing, later.parent],
            key: () => ({ moved: 1 }),
            compute: (key) => ({ key }),
          }),
          scope,
        );
        const heldBefore = later.held.size;
        const exit = yield* Effect.exit(Scope.close(scope, Exit.void));

        assert.strictEqual(heldBefore, 1);
        assert.strictEqual(later.held.size, 0);
        assert.isTrue(Exit.isFailure(exit));
        assert.strictEqual(
          Exit.isFailure(exit) ? Cause.squash(exit.cause) : undefined,
          refused,
        );
      }),
  );

  it.effect(
    "two throwing releases fail the close with one AggregateError holding both",
    () =>
      Effect.gen(function* () {
        const first = new Error("the first parent could not release");
        const second = new Error("the second parent could not release");
        const releasing = (error: Error): Parent => ({
          subscribe: () => () => {
            throw error;
          },
        });
        const scope = yield* Scope.make();
        yield* Scope.provide(
          makeDerivedStore({
            parents: [releasing(first), releasing(second)],
            key: () => ({ moved: 1 }),
            compute: (key) => ({ key }),
          }),
          scope,
        );
        const exit = yield* Effect.exit(Scope.close(scope, Exit.void));
        const thrown = Exit.isFailure(exit) ? Cause.squash(exit.cause) : undefined;

        assert.instanceOf(thrown, AggregateError);
        assert.deepStrictEqual(thrown instanceof AggregateError ? thrown.errors : [], [
          first,
          second,
        ]);
        assert.strictEqual(
          thrown instanceof AggregateError ? thrown.message : undefined,
          "More than one of the store's parent releases threw.",
        );
      }),
  );

  it.effect("makeDerivedStore is built under a span named for it", () =>
    Effect.gen(function* () {
      const names: Array<string> = [];
      const tracer = Tracer.make({
        span: (options) => {
          names.push(options.name);
          return new Tracer.NativeSpan(options);
        },
      });
      const parent = makeExternalStore(0);

      yield* makeDerivedStore({
        parents: [parent],
        key: () => ({ value: parent.getSnapshot() }),
        compute: (key) => ({ key }),
      }).pipe(Effect.provideService(Tracer.Tracer, tracer));

      assert.include(names, "qadi.devtools.makeDerivedStore");
    }));
});
