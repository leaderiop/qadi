/**
 * The timeline feed's read, capacity and lifetime, with no render.
 *
 * The feed is the one place a source is read into a timeline, for the dock model
 * and for `useTimeline` alike, so its rules are stated against `makeTimelineFeed`
 * and nothing is rendered. It is built in a scope (ADR-QD-137): `it.effect`
 * provides one, and a test that needs to end it mid-test makes its own.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Queue from "effect/Queue";
import * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";
import * as TestClock from "effect/testing/TestClock";
import type { StoredRecord } from "@qadi/core";
import { sourceFromRecords, type Source } from "../../src/model/Source.ts";
import { idleTimeline, makeTimelineFeed, type TimelineFeed } from "../../src/model/TimelineFeed.ts";
import { decisionRecord } from "../helpers.ts";

const flush = Effect.andThen(Effect.yieldNow, TestClock.adjust("10 millis"));

const record = (evaluationId: string, at: number): StoredRecord => decisionRecord({ evaluationId, at });

const idsOf = (feed: TimelineFeed): ReadonlyArray<string> =>
  feed.timeline.getSnapshot().entries.map((entry) => entry.evaluationId);

/** A source that counts its reads and releases, then hands over `backlog` and `live`. */
const watched = (backlog: ReadonlyArray<StoredRecord>, live: Stream.Stream<StoredRecord>) => {
  const tally = { started: 0, finalized: 0 };
  const source: Source = {
    read: Effect.gen(function* () {
      tally.started += 1;
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          tally.finalized += 1;
        }),
      );
      return { backlog, live };
    }),
  };
  return { source, tally };
};

describe("the timeline feed", () => {
  it.effect("TF1 a source's records show in the timeline once the feed is built", () =>
    Effect.gen(function* () {
      const feed = yield* makeTimelineFeed({ source: sourceFromRecords([record("a", 100), record("b", 200)]) });
      yield* flush;

      assert.deepStrictEqual(idsOf(feed), ["a", "b"]);
    }));

  it.effect("TF2 configuring the same source and capacity reads nothing again and notifies nothing", () =>
    Effect.gen(function* () {
      const a = watched([record("x", 100)], Stream.never);
      const feed = yield* makeTimelineFeed({ source: a.source, capacity: 5 });
      yield* flush;
      const heard = { calls: 0 };
      feed.timeline.subscribe(() => {
        heard.calls += 1;
      });

      feed.configure({ source: a.source, capacity: 5 });
      yield* flush;

      assert.deepStrictEqual(a.tally, { started: 1, finalized: 0 });
      assert.strictEqual(heard.calls, 0);
    }));

  it.effect("TF3 a new source releases the previous read and fills the timeline from the new one", () =>
    Effect.gen(function* () {
      const a = watched([], Stream.never);
      const b = watched([record("from-b", 100)], Stream.never);
      const feed = yield* makeTimelineFeed({ source: a.source });
      yield* flush;
      assert.deepStrictEqual(a.tally, { started: 1, finalized: 0 });

      feed.configure({ source: b.source });
      yield* flush;

      assert.deepStrictEqual(a.tally, { started: 1, finalized: 1 });
      assert.deepStrictEqual(b.tally, { started: 1, finalized: 0 });
      assert.deepStrictEqual(idsOf(feed), ["from-b"]);
    }));

  it.effect("TF4 a capacity change keeps the timeline object, empties it, bounds the new buffer and reads again", () =>
    Effect.gen(function* () {
      const a = watched([], Stream.never);
      const feed = yield* makeTimelineFeed({ source: a.source, capacity: 5 });
      yield* flush;
      const timeline = feed.timeline;
      timeline.accept(record("manual", 100));
      assert.deepStrictEqual(idsOf(feed), ["manual"]);

      feed.configure({ source: a.source, capacity: 2 });
      yield* flush;

      assert.strictEqual(feed.timeline, timeline);
      assert.deepStrictEqual(idsOf(feed), []);
      assert.deepStrictEqual(a.tally, { started: 2, finalized: 1 });
      for (let i = 1; i <= 3; i++) timeline.accept(record(`n${i}`, i * 100));
      assert.strictEqual(timeline.getSnapshot().capacity, 2);
      assert.strictEqual(idsOf(feed).length, 2);
    }));

  it.effect("TF5 configuring with no source releases the read and keeps the entries it delivered", () =>
    Effect.gen(function* () {
      const a = watched([record("x", 100)], Stream.never);
      const feed = yield* makeTimelineFeed({ source: a.source });
      yield* flush;

      feed.configure({});
      yield* flush;

      assert.deepStrictEqual(a.tally, { started: 1, finalized: 1 });
      assert.deepStrictEqual(idsOf(feed), ["x"]);
    }));

  it.effect("TF6 closing the feed's scope releases the read, and a record offered afterwards never lands", () =>
    Effect.gen(function* () {
      const queue = yield* Queue.unbounded<StoredRecord>();
      const a = watched([], Stream.fromQueue(queue));
      const scope = yield* Scope.make();
      const feed = yield* Scope.provide(makeTimelineFeed({ source: a.source }), scope);
      yield* flush;
      Queue.offerUnsafe(queue, record("before", 100));
      yield* flush;
      assert.deepStrictEqual(idsOf(feed), ["before"]);

      yield* Scope.close(scope, Exit.void);
      assert.deepStrictEqual(a.tally, { started: 1, finalized: 1 });

      Queue.offerUnsafe(queue, record("after", 200));
      yield* flush;
      assert.deepStrictEqual(idsOf(feed), ["before"]);
    }));

  it.effect("TF7 pausing tells the timeline's listeners with the snapshot it already held", () =>
    Effect.gen(function* () {
      const feed = yield* makeTimelineFeed();
      feed.timeline.accept(record("a", 100));
      const before = feed.timeline.getSnapshot();
      const heard: Array<boolean> = [];
      feed.timeline.subscribe(() => {
        heard.push(feed.timeline.getSnapshot() === before);
      });

      feed.timeline.setPaused(true);

      assert.deepStrictEqual(heard, [true]);
      assert.isTrue(feed.timeline.isPaused());
    }));

  it("TF8 the idle timeline is one empty snapshot that nothing can change", () => {
    const first = idleTimeline.getSnapshot();
    assert.strictEqual(idleTimeline.getSnapshot(), first);
    assert.deepStrictEqual(first.entries, []);

    const heard = { calls: 0 };
    const off = idleTimeline.subscribe(() => {
      heard.calls += 1;
    });
    idleTimeline.accept(record("a", 100));
    idleTimeline.clear();
    idleTimeline.setPaused(true);
    off();

    assert.strictEqual(idleTimeline.getSnapshot(), first);
    assert.isFalse(idleTimeline.isPaused());
    assert.strictEqual(heard.calls, 0);
  });
});
