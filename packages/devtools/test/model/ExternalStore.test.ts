import { assert, describe, it } from "@effect/vitest";
import { makeExternalStore } from "../../src/model/ExternalStore.ts";

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
});
