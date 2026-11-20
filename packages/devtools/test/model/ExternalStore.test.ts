import { assert, describe, it } from "@effect/vitest";
import { makeExternalStore } from "../../src/model/ExternalStore.ts";
import { thrownBy } from "../helpers.ts";

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
});
