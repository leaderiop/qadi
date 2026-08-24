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
import type { SinkRecord } from "@qadi/core";
import { sourceFromFeed, sourceFromRecords } from "../../src/model/Source.ts";
import { makeTimelineStore, runSource } from "../../src/model/TimelineStore.ts";
import { decisionRecord, obligationRecord } from "../helpers.ts";

const bare = (record: ReturnType<typeof decisionRecord>): SinkRecord => {
  const { environment: _stamped, ...rest } = record;
  return rest;
};

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

  // E1.5 seen from the store's side: a bare feed has no past to read.
  it.effect("a source with no backlog still drains the live stream", () =>
    Effect.gen(function* () {
      const store = makeTimelineStore();
      const source = sourceFromFeed({
        stream: Stream.fromArray<SinkRecord>([bare(decisionRecord({ evaluationId: "live" }))]),
        environment: "Server",
      });

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
        backlog: Effect.succeed([decisionRecord({ evaluationId: "old", at: 100 })]),
        live: Stream.fromArray([decisionRecord({ evaluationId: "new", at: 200 })]),
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
   * A feed built with `replay` hands a joining subscriber recent records, and a
   * ring paired through `decisionSinkAll` holds the same ones. So the backlog
   * and the live stream overlap by construction, and the timeline's identity
   * rule is what keeps that from doubling every row on screen.
   */
  it.effect("a record in both the backlog and the live stream is one row", () =>
    Effect.gen(function* () {
      const store = makeTimelineStore();
      const shared = decisionRecord({ evaluationId: "replayed", at: 100 });

      yield* runSource(store, {
        backlog: Effect.succeed([shared]),
        live: Stream.fromArray([shared, decisionRecord({ evaluationId: "fresh", at: 200 })]),
      });

      assert.deepStrictEqual(
        store.getSnapshot().entries.map((e) => e.evaluationId),
        ["replayed", "fresh"],
      );
    }));
});
