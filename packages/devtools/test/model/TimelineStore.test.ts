/**
 * The store, and the loop that feeds it — tested without React.
 *
 * Subscribing, pausing, clearing and snapshot identity are all properties of
 * plain objects, and proving them through a rendered component would only make
 * the test slower and vaguer (AGENTS.md §13). What `test/react/` proves is the
 * two things only React can get wrong: subscribing on mount and stopping on
 * unmount.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import { sourceFromRecords } from "../../src/model/Source.ts";
import { DEFAULT_TIMELINE_CAPACITY } from "../../src/model/Timeline.ts";
import { makeTimelineStore, runSource } from "../../src/model/TimelineStore.ts";
import { decisionRecord, heardOn, obligationRecord, thrownBy } from "../helpers.ts";

describe("makeTimelineStore", () => {
  it("notifies a subscriber when a record lands", () => {
    const store = makeTimelineStore();
    let notified = 0;
    store.subscribe(() => {
      notified += 1;
    });

    store.accept(decisionRecord({ evaluationId: "a", at: 100 }));
    assert.strictEqual(notified, 1);
    assert.strictEqual(store.getSnapshot().entries.length, 1);
  });

  it("notifies every subscriber, and stops after unsubscribing", () => {
    const store = makeTimelineStore();
    let one = 0;
    let two = 0;
    const off = store.subscribe(() => {
      one += 1;
    });
    store.subscribe(() => {
      two += 1;
    });

    store.accept(decisionRecord({ evaluationId: "a", at: 100 }));
    off();
    store.accept(decisionRecord({ evaluationId: "b", at: 200 }));

    assert.strictEqual(one, 1);
    assert.strictEqual(two, 2);
  });

  /**
   * The property `useSyncExternalStore` actually depends on. It compares
   * snapshots by identity, so a store handing back a fresh object for a record
   * it already had would re-render the whole panel on every replayed frame —
   * and an SSE feed with `replay` set replays on every reconnect.
   */
  it("a duplicate changes neither the snapshot nor the subscriber", () => {
    const store = makeTimelineStore();
    const record = decisionRecord({ evaluationId: "a", at: 100 });
    let notified = 0;
    store.subscribe(() => {
      notified += 1;
    });

    store.accept(record);
    const first = store.getSnapshot();
    store.accept(record);

    assert.strictEqual(store.getSnapshot(), first);
    assert.strictEqual(notified, 1);
  });

  describe("pausing", () => {
    // E6.2 — the whole point of the button.
    it("freezes the view but keeps recording", () => {
      const store = makeTimelineStore();
      store.accept(decisionRecord({ evaluationId: "before", at: 100 }));

      store.setPaused(true);
      const frozen = store.getSnapshot();
      store.accept(decisionRecord({ evaluationId: "during", at: 200 }));

      // Resuming and finding a gap where the interesting decision was is the
      // one outcome that makes pausing worse than useless.
      assert.strictEqual(store.getSnapshot(), frozen);
      assert.strictEqual(store.getSnapshot().entries.length, 1);

      store.setPaused(false);
      assert.strictEqual(store.getSnapshot().entries.length, 2);
    });

    it("does not notify while paused", () => {
      const store = makeTimelineStore();
      let notified = 0;
      store.subscribe(() => {
        notified += 1;
      });

      store.setPaused(true);
      const afterPause = notified;
      store.accept(decisionRecord({ evaluationId: "during", at: 200 }));

      assert.strictEqual(notified, afterPause);
    });

    it("notifies on the transition, in both directions", () => {
      const store = makeTimelineStore();
      let notified = 0;
      store.subscribe(() => {
        notified += 1;
      });

      store.setPaused(true);
      store.setPaused(false);
      assert.strictEqual(notified, 2);
    });

    it("pausing twice is not a second transition", () => {
      const store = makeTimelineStore();
      let notified = 0;
      store.subscribe(() => {
        notified += 1;
      });

      store.setPaused(true);
      store.setPaused(true);
      store.setPaused(false);
      store.setPaused(false);

      assert.strictEqual(notified, 2);
    });

    it("reports its own state", () => {
      const store = makeTimelineStore();
      assert.isFalse(store.isPaused());
      store.setPaused(true);
      assert.isTrue(store.isPaused());
      store.setPaused(false);
      assert.isFalse(store.isPaused());
    });
  });

  describe("clearing", () => {
    // E6.3 — the view, and nothing else.
    it("empties the view and notifies", () => {
      const store = makeTimelineStore();
      let notified = 0;
      store.subscribe(() => {
        notified += 1;
      });

      store.accept(decisionRecord({ evaluationId: "a", at: 100 }));
      store.clear();

      assert.deepStrictEqual(store.getSnapshot().entries, []);
      assert.strictEqual(notified, 2);
    });

    it("clearing while paused also resumes, rather than freezing an empty view", () => {
      const store = makeTimelineStore();
      store.accept(decisionRecord({ evaluationId: "a", at: 100 }));
      store.setPaused(true);
      store.clear();

      assert.isFalse(store.isPaused());
      assert.deepStrictEqual(store.getSnapshot().entries, []);
    });

    it("keeps the capacity it was built with", () => {
      const store = makeTimelineStore({ capacity: 1 });
      store.accept(decisionRecord({ evaluationId: "a", at: 100 }));
      store.clear();
      store.accept(decisionRecord({ evaluationId: "b", at: 200 }));
      store.accept(decisionRecord({ evaluationId: "c", at: 300 }));

      assert.strictEqual(store.getSnapshot().entries.length, 1);
    });

    it("a clear after a resize keeps the capacity it was resized to", () => {
      const store = makeTimelineStore({ capacity: 5 });
      store.resize(3);
      for (const id of ["a", "b", "c", "d"]) {
        store.accept(decisionRecord({ evaluationId: id, at: 100 }));
      }
      store.clear();

      assert.strictEqual(store.getSnapshot().capacity, 3);
      assert.deepStrictEqual(store.getSnapshot().entries, []);

      for (const id of ["e", "f", "g", "h"]) {
        store.accept(decisionRecord({ evaluationId: id, at: 200 }));
      }
      assert.strictEqual(store.getSnapshot().entries.length, 3);
    });
  });

  describe("resizing", () => {
    const refused = (value: unknown) =>
      `emptyTimeline: capacity must be a non-negative integer, got ${value}`;

    it("a new capacity empties the timeline at the new bound, publishes once and answers true", () => {
      const store = makeTimelineStore({ capacity: 5 });
      store.accept(decisionRecord({ evaluationId: "old", at: 50 }));
      const heard = heardOn(store);

      const answer = store.resize(2);

      assert.isTrue(answer);
      assert.strictEqual(heard.calls, 1);
      assert.strictEqual(store.getSnapshot().capacity, 2);
      assert.deepStrictEqual(store.getSnapshot().entries, []);
      for (const [index, id] of ["a", "b", "c"].entries()) {
        store.accept(decisionRecord({ evaluationId: id, at: 100 + index }));
      }
      assert.strictEqual(store.getSnapshot().entries.length, 2);
    });

    it("the capacity it already has answers false, publishes nothing and keeps the entries", () => {
      const store = makeTimelineStore({ capacity: 5 });
      store.accept(decisionRecord({ evaluationId: "kept", at: 100 }));
      const snapshot = store.getSnapshot();
      const heard = heardOn(store);

      const answer = store.resize(5);

      assert.isFalse(answer);
      assert.strictEqual(heard.calls, 0);
      assert.strictEqual(store.getSnapshot(), snapshot);
      assert.strictEqual(store.getSnapshot().entries.length, 1);
    });

    it("a new capacity while paused releases the pause and shows the emptied live timeline", () => {
      const store = makeTimelineStore({ capacity: 5 });
      store.accept(decisionRecord({ evaluationId: "before", at: 100 }));
      store.setPaused(true);
      store.accept(decisionRecord({ evaluationId: "during", at: 200 }));

      const answer = store.resize(3);

      assert.isTrue(answer);
      assert.isFalse(store.isPaused());
      assert.strictEqual(store.getSnapshot().capacity, 3);
      assert.deepStrictEqual(store.getSnapshot().entries, []);
      store.accept(decisionRecord({ evaluationId: "after", at: 300 }));
      assert.deepStrictEqual(
        store.getSnapshot().entries.map((e) => e.evaluationId),
        ["after"],
      );
    });

    it("the capacity it already has while paused keeps the pause and the frozen view, and publishes nothing", () => {
      const store = makeTimelineStore({ capacity: 5 });
      store.accept(decisionRecord({ evaluationId: "before", at: 100 }));
      store.setPaused(true);
      const frozen = store.getSnapshot();
      store.accept(decisionRecord({ evaluationId: "during", at: 200 }));
      const heard = heardOn(store);

      const answer = store.resize(5);

      assert.isFalse(answer);
      assert.isTrue(store.isPaused());
      assert.strictEqual(store.getSnapshot(), frozen);
      assert.strictEqual(heard.calls, 0);
      store.setPaused(false);
      assert.strictEqual(store.getSnapshot().entries.length, 2);
    });

    it("a capacity it refuses throws, and keeps the entries, the pause and the frozen view", () => {
      const store = makeTimelineStore({ capacity: 5 });
      store.accept(decisionRecord({ evaluationId: "before", at: 100 }));
      store.setPaused(true);
      const frozen = store.getSnapshot();
      store.accept(decisionRecord({ evaluationId: "during", at: 200 }));
      const heard = heardOn(store);

      for (const value of [-1, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
        const { threw, thrown } = thrownBy(() => {
          store.resize(value);
        });

        assert.isTrue(threw);
        assert.instanceOf(thrown, Error);
        assert.strictEqual(thrown instanceof Error ? thrown.message : "", refused(value));
        assert.strictEqual(heard.calls, 0);
        assert.strictEqual(store.getSnapshot(), frozen);
        assert.isTrue(store.isPaused());
      }
      store.setPaused(false);
      assert.strictEqual(store.getSnapshot().capacity, 5);
      assert.strictEqual(store.getSnapshot().entries.length, 2);
    });

    it("zero is a capacity it keeps, and negative zero is the same bound", () => {
      const store = makeTimelineStore({ capacity: 5 });
      const heard = heardOn(store);

      const toZero = store.resize(0);
      const toNegativeZero = store.resize(-0);

      assert.isTrue(toZero);
      assert.isFalse(toNegativeZero);
      assert.strictEqual(heard.calls, 1);
      assert.strictEqual(store.getSnapshot().capacity, 0);
      assert.deepStrictEqual(store.getSnapshot().entries, []);
    });

    it("what a listener throws on the resize is rethrown after the resize is made", () => {
      const one = makeTimelineStore({ capacity: 5 });
      const failure = new Error("one listener");
      const heardByOne = heardOn(one);
      one.subscribe(() => {
        throw failure;
      });

      const rethrown = thrownBy(() => {
        one.resize(2);
      });

      assert.isTrue(rethrown.threw);
      assert.strictEqual(rethrown.thrown, failure);
      assert.strictEqual(heardByOne.calls, 1);
      assert.strictEqual(one.getSnapshot().capacity, 2);
      assert.deepStrictEqual(one.getSnapshot().entries, []);
      assert.isFalse(one.resize(2));

      const two = makeTimelineStore({ capacity: 5 });
      const first = new Error("first listener");
      const second = new Error("second listener");
      two.subscribe(() => {
        throw first;
      });
      two.subscribe(() => {
        throw second;
      });

      const collected = thrownBy(() => {
        two.resize(3);
      });

      assert.isTrue(collected.threw);
      assert.instanceOf(collected.thrown, AggregateError);
      assert.deepStrictEqual(
        collected.thrown instanceof AggregateError ? collected.thrown.errors : [],
        [first, second],
      );
      assert.strictEqual(two.getSnapshot().capacity, 3);
      assert.isFalse(two.resize(3));
    });

    it("a listener that resizes to the same capacity from inside the publish is answered false", () => {
      const store = makeTimelineStore({ capacity: 5 });
      const inner: Array<boolean> = [];
      const heard = { calls: 0 };
      store.subscribe(() => {
        heard.calls += 1;
        if (heard.calls === 1) inner.push(store.resize(3));
      });

      const outer = store.resize(3);

      assert.isTrue(outer);
      assert.deepStrictEqual(inner, [false]);
      assert.strictEqual(heard.calls, 1);
      assert.strictEqual(store.getSnapshot().capacity, 3);
    });

    it("a caller outside the type: no capacity and null read as the default, a string or a bigint throws", () => {
      const store = makeTimelineStore({ capacity: 5 });
      const heard = heardOn(store);

      const omitted: unknown = Reflect.apply(store.resize, store, [undefined]);
      assert.strictEqual(omitted, true);
      assert.strictEqual(store.getSnapshot().capacity, DEFAULT_TIMELINE_CAPACITY);
      assert.strictEqual(heard.calls, 1);

      const empty: unknown = Reflect.apply(store.resize, store, [null]);
      assert.strictEqual(empty, false);
      assert.strictEqual(heard.calls, 1);

      for (const value of ["5", 5n]) {
        const { threw, thrown } = thrownBy(() => {
          Reflect.apply(store.resize, store, [value]);
        });

        assert.isTrue(threw);
        assert.instanceOf(thrown, Error);
        assert.strictEqual(thrown instanceof Error ? thrown.message : "", refused(5));
      }
      assert.strictEqual(store.getSnapshot().capacity, DEFAULT_TIMELINE_CAPACITY);
      assert.strictEqual(heard.calls, 1);
    });
  });

  it("a record at a capacity of zero notifies no subscriber and keeps the snapshot", () => {
    const store = makeTimelineStore({ capacity: 0 });
    const snapshot = store.getSnapshot();
    const heard = { calls: 0 };
    store.subscribe(() => {
      heard.calls += 1;
    });

    store.accept(decisionRecord({ evaluationId: "a", at: 100 }));
    store.accept(decisionRecord({ evaluationId: "b", at: 200 }));

    assert.strictEqual(heard.calls, 0);
    assert.strictEqual(store.getSnapshot(), snapshot);
  });

  it("passes its capacity to the timeline", () => {
    const store = makeTimelineStore({ capacity: 2 });
    for (const [index, id] of ["a", "b", "c"].entries()) {
      store.accept(decisionRecord({ evaluationId: id, at: 100 + index }));
    }
    assert.strictEqual(store.getSnapshot().entries.length, 2);
  });
});

describe("runSource", () => {
  it.effect("drains a backlog into the store", () =>
    Effect.gen(function* () {
      const store = makeTimelineStore();
      const records = [
        decisionRecord({ evaluationId: "a", at: 100 }),
        decisionRecord({ evaluationId: "b", at: 200 }),
      ];

      yield* runSource(store, sourceFromRecords(records));

      assert.deepStrictEqual(
        store.getSnapshot().entries.map((e) => e.evaluationId),
        ["a", "b"],
      );
    }));

  // E1.5 seen from the store's side: a live-only source has no past to read.
  it.effect("a source with no backlog still drains the live stream", () =>
    Effect.gen(function* () {
      const store = makeTimelineStore();
      const source = {
        read: Effect.succeed({ live: Stream.fromArray([decisionRecord({ evaluationId: "live" })]) }),
      };

      yield* runSource(store, source);

      assert.strictEqual(store.getSnapshot().entries[0]?.evaluationId, "live");
    }));

  it.effect("the backlog is read before the live stream", () =>
    Effect.gen(function* () {
      const store = makeTimelineStore();
      const seen: Array<string> = [];
      store.subscribe(() => {
        seen.push(store.getSnapshot().entries.map((e) => e.evaluationId).join(","));
      });

      yield* runSource(store, {
        read: Effect.succeed({
          backlog: [decisionRecord({ evaluationId: "old", at: 100 })],
          live: Stream.fromArray([decisionRecord({ evaluationId: "new", at: 200 })]),
        }),
      });

      // A backlog arriving after a few live records would still land in the
      // right place, but the rows would visibly rearrange under the cursor.
      assert.deepStrictEqual(seen, ["old", "old,new"]);
    }));

  it.effect("an obligation outcome reaching the store joins its decision", () =>
    Effect.gen(function* () {
      const store = makeTimelineStore();

      yield* runSource(
        store,
        sourceFromRecords([
          decisionRecord({ evaluationId: "ev-7", at: 100 }),
          obligationRecord({ evaluationId: "ev-7", at: 101 }),
        ]),
      );

      assert.strictEqual(store.getSnapshot().entries.length, 1);
    }));

  it.effect("an empty source leaves an empty timeline", () =>
    Effect.gen(function* () {
      const store = makeTimelineStore();
      yield* runSource(store, sourceFromRecords([]));
      assert.deepStrictEqual(store.getSnapshot().entries, []);
    }));

  /**
   * E1.6 — the ordinary shape of a reconnecting reader.
   *
   * One decision log never hands a reader the same record twice, but a reader
   * merging sources, or an `EventSource` that reconnects and re-reads the
   * server's backlog, can see one again. The timeline's identity rule is what
   * keeps that from doubling every row on screen.
   */
  it.effect("a record in both the backlog and the live stream is one row", () =>
    Effect.gen(function* () {
      const store = makeTimelineStore();
      const shared = decisionRecord({ evaluationId: "replayed", at: 100 });

      yield* runSource(store, {
        read: Effect.succeed({
          backlog: [shared],
          live: Stream.fromArray([shared, decisionRecord({ evaluationId: "fresh", at: 200 })]),
        }),
      });

      assert.deepStrictEqual(
        store.getSnapshot().entries.map((e) => e.evaluationId),
        ["replayed", "fresh"],
      );
    }));
});
