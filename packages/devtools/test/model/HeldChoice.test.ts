/**
 * The held-choice rule, tested once for every screen that uses it.
 *
 * Every arm of `resolveHeld` is per-call, so each is pinned by an output
 * (ADR-QD-076). The screens' own tests keep only what is theirs.
 */
import { assert, describe, it } from "@effect/vitest";
import * as FastCheck from "fast-check";
import {
  heldIndex,
  heldValue,
  makeHeldChoice,
  makeHeldChoiceStore,
  pinHead,
  resolveHeld,
  type HeldChoiceStore,
} from "../../src/model/HeldChoice.ts";

interface Item {
  readonly key: string;
  readonly n: number;
}
const item = (key: string, n = 0): Item => ({ key, n });
const sameKey = (a: Item, b: Item) => a.key === b.key;

describe("resolveHeld", () => {
  it("is Empty for an empty list with nothing held", () => {
    assert.deepStrictEqual(resolveHeld([], undefined, sameKey), { _tag: "Empty" });
  });

  it("reads nothing held as the head of the list", () => {
    const list = [item("a"), item("b")];
    assert.deepStrictEqual(resolveHeld(list, undefined, sameKey), {
      _tag: "Listed",
      value: item("a"),
      index: 0,
    });
  });

  it("finds a held value and returns the list's own element", () => {
    const newest = item("b", 2);
    const result = resolveHeld([item("a"), newest], item("b", 1), sameKey);
    assert.strictEqual(result._tag, "Listed");
    if (result._tag !== "Listed") return;
    assert.strictEqual(result.index, 1);
    assert.strictEqual(result.value, newest);
  });

  it("follows a held value through a reorder", () => {
    const result = resolveHeld([item("b"), item("a")], item("b"), sameKey);
    assert.deepStrictEqual(result, { _tag: "Listed", value: item("b"), index: 0 });
  });

  it("follows a held value past a head insertion", () => {
    const result = resolveHeld([item("c"), item("a"), item("b")], item("b"), sameKey);
    assert.deepStrictEqual(result, { _tag: "Listed", value: item("b"), index: 2 });
  });

  it("keeps a value that left the list, as Evicted", () => {
    const held = item("b");
    assert.deepStrictEqual(resolveHeld([item("a")], held, sameKey), {
      _tag: "Evicted",
      value: held,
    });
  });

  it("keeps a held value through an empty list", () => {
    const held = item("b");
    assert.deepStrictEqual(resolveHeld([], held, sameKey), { _tag: "Evicted", value: held });
  });

  it("matches the first of two equal elements", () => {
    const result = resolveHeld([item("x", 1), item("x", 2)], item("x"), sameKey);
    assert.deepStrictEqual(result, { _tag: "Listed", value: item("x", 1), index: 0 });
  });

  it("names the held value under any permutation of the list", () => {
    FastCheck.assert(
      FastCheck.property(
        FastCheck.uniqueArray(FastCheck.integer(), { minLength: 1 }).chain((list) =>
          FastCheck.tuple(
            FastCheck.constant(list),
            FastCheck.shuffledSubarray(list, { minLength: list.length, maxLength: list.length }),
            FastCheck.nat(list.length - 1),
          ),
        ),
        ([list, permuted, pick]) => {
          const held = list[pick];
          const result = resolveHeld(permuted, held, (a, b) => a === b);
          return result._tag === "Listed" && result.value === held && permuted[result.index] === held;
        },
      ),
    );
  });
});

describe("pinHead", () => {
  it("keeps what is held", () => {
    assert.strictEqual(pinHead([item("a")], item("z"))?.key, "z");
  });

  it("holds the head when nothing is held", () => {
    const list = [item("a"), item("b")];
    assert.strictEqual(pinHead(list, undefined), list[0]);
  });

  it("holds nothing from an empty list", () => {
    assert.isUndefined(pinHead([], undefined));
  });
});

describe("makeHeldChoice", () => {
  it("holds nothing at construction, and reads the head as Listed at 0", () => {
    const cell = makeHeldChoice([item("a"), item("b")], sameKey);
    assert.isUndefined(cell.held());
    assert.deepStrictEqual(cell.resolve(), { _tag: "Listed", value: item("a"), index: 0 });
  });

  it("is Empty over an empty list", () => {
    assert.deepStrictEqual(makeHeldChoice<Item>([], sameKey).resolve(), { _tag: "Empty" });
  });

  it("pins the head once: a later new head does not move the choice", () => {
    const cell = makeHeldChoice([item("a")], sameKey);
    cell.pin();
    assert.strictEqual(cell.held()?.key, "a");
    cell.setList([item("z"), item("a")]);
    cell.pin();
    assert.deepStrictEqual(cell.resolve(), { _tag: "Listed", value: item("a"), index: 1 });
  });

  it("does not pin by itself: setList alone leaves the default on the head", () => {
    const cell = makeHeldChoice([item("a")], sameKey);
    assert.isTrue(cell.setList([item("z"), item("a")]));
    assert.isUndefined(cell.held());
    assert.deepStrictEqual(cell.resolve(), { _tag: "Listed", value: item("z"), index: 0 });
  });

  it("pins nothing from an empty list", () => {
    const cell = makeHeldChoice<Item>([], sameKey);
    cell.pin();
    assert.isUndefined(cell.held());
  });

  it("answers false and changes nothing for a list of the same elements", () => {
    const list = [item("a"), item("b")];
    const cell = makeHeldChoice(list, sameKey);
    assert.isFalse(cell.setList([...list]));
    assert.strictEqual(cell.list(), list);
  });

  it("answers true and keeps the new list for a different one", () => {
    const next = [item("a"), item("c")];
    const cell = makeHeldChoice([item("a")], sameKey);
    assert.isTrue(cell.setList(next));
    assert.strictEqual(cell.list(), next);
  });

  it("answers false for a value already held under `same`, true otherwise", () => {
    const cell = makeHeldChoice([item("a"), item("b")], sameKey);
    cell.pin();
    assert.isFalse(cell.choose(item("a", 9)));
    assert.strictEqual(cell.held()?.n, 0);
    assert.isTrue(cell.choose(item("b")));
    assert.strictEqual(cell.held()?.key, "b");
  });

  it("holds a chosen value absent from the list as Evicted", () => {
    const cell = makeHeldChoice([item("a")], sameKey);
    assert.isTrue(cell.choose(item("q")));
    assert.deepStrictEqual(cell.resolve(), { _tag: "Evicted", value: item("q") });
  });

  it("holds a value chosen before anything was pinned", () => {
    const cell = makeHeldChoice<Item>([], sameKey);
    assert.isTrue(cell.choose(item("a")));
    assert.isFalse(cell.choose(item("a")));
  });
});

describe("heldValue and heldIndex", () => {
  const gone = item("g");
  const here = item("h");
  it("read the value of a Listed or Evicted choice, and nothing from Empty", () => {
    assert.isUndefined(heldValue({ _tag: "Empty" }));
    assert.strictEqual(heldValue({ _tag: "Listed", value: here, index: 3 }), here);
    assert.strictEqual(heldValue({ _tag: "Evicted", value: gone }), gone);
  });

  it("read an index only from a Listed choice", () => {
    assert.isUndefined(heldIndex({ _tag: "Empty" }));
    assert.strictEqual(heldIndex({ _tag: "Listed", value: here, index: 3 }), 3);
    assert.isUndefined(heldIndex({ _tag: "Evicted", value: gone }));
  });
});

describe("makeHeldChoiceStore", () => {
  const listed = (store: HeldChoiceStore<Item>) => store.getSnapshot().choice;

  it("pins the head at construction", () => {
    const store = makeHeldChoiceStore([item("a"), item("b")], sameKey);
    assert.deepStrictEqual(listed(store), { _tag: "Listed", value: item("a"), index: 0 });
  });

  it("is Empty over an empty list", () => {
    assert.deepStrictEqual(listed(makeHeldChoiceStore<Item>([], sameKey)), { _tag: "Empty" });
  });

  it("keeps the first value shown when a new head arrives", () => {
    const store = makeHeldChoiceStore([item("a")], sameKey);
    store.setList([item("z"), item("a")]);
    assert.deepStrictEqual(listed(store), { _tag: "Listed", value: item("a"), index: 1 });
  });

  it("pins the head once a list arrives for an empty store", () => {
    const store = makeHeldChoiceStore<Item>([], sameKey);
    store.setList([item("a"), item("b")]);
    store.setList([item("b"), item("a")]);
    assert.deepStrictEqual(listed(store), { _tag: "Listed", value: item("a"), index: 1 });
  });

  it("holds a chosen value by value through a reorder", () => {
    const store = makeHeldChoiceStore([item("a"), item("b")], sameKey);
    store.choose(item("b"));
    store.setList([item("b"), item("a")]);
    assert.deepStrictEqual(listed(store), { _tag: "Listed", value: item("b"), index: 0 });
  });

  it("keeps a value that left the list, as Evicted", () => {
    const store = makeHeldChoiceStore([item("a"), item("b")], sameKey);
    store.choose(item("b"));
    store.setList([item("a")]);
    assert.deepStrictEqual(listed(store), { _tag: "Evicted", value: item("b") });
    store.setList([]);
    assert.deepStrictEqual(listed(store), { _tag: "Evicted", value: item("b") });
  });

  it("publishes the list with the choice", () => {
    const next = [item("a"), item("c")];
    const store = makeHeldChoiceStore([item("a")], sameKey);
    store.setList(next);
    assert.strictEqual(store.getSnapshot().list, next);
  });

  it("notifies once per effective command, and not for a no-op", () => {
    const list = [item("a"), item("b")];
    const store = makeHeldChoiceStore(list, sameKey);
    let calls = 0;
    store.subscribe(() => (calls += 1));
    const before = store.getSnapshot();

    store.setList([...list]); // same elements: a no-op
    store.choose(item("a")); // already held
    assert.strictEqual(calls, 0);
    assert.strictEqual(store.getSnapshot(), before);

    store.choose(item("b"));
    assert.strictEqual(calls, 1);
    store.setList([item("b")]);
    assert.strictEqual(calls, 2);
  });
});
