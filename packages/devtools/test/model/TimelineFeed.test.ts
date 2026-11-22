/**
 * The timeline feed's read, capacity and lifetime, with no render.
 *
 * The feed is the one place a source is read into a timeline, for the dock model
 * and for `useTimeline` alike, so its rules are stated against `makeTimelineFeed`
 * and nothing is rendered. It is built in a scope (ADR-QD-137): `it.effect`
 * provides one, and a test that needs to end it mid-test makes its own.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Queue from "effect/Queue";
import * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";
import * as TestClock from "effect/testing/TestClock";
import type { StoredRecord } from "@qadi/core";
import { sourceFromRecords, type Source, type SourceRead } from "../../src/model/Source.ts";
import { makeTimelineFeed, type TimelineFeed } from "../../src/index.ts";
import { idleTimeline } from "../../src/model/TimelineFeed.ts";
import { decisionRecord, settleTurns, thrownBy } from "../helpers.ts";

const flush = Effect.andThen(Effect.yieldNow, TestClock.adjust("10 millis"));

const record = (evaluationId: string, at: number): StoredRecord => decisionRecord({ evaluationId, at });

const idsOf = (feed: TimelineFeed): ReadonlyArray<string> =>
  feed.timeline.getSnapshot().entries.map((entry) => entry.evaluationId);

/** A source whose read starts after one turn, so the fiber is installed in the handle before its backlog runs. */
const delayed = (backlog: ReadonlyArray<StoredRecord>): Source => ({
  read: Effect.as(Effect.yieldNow, { backlog, live: Stream.empty }),
});

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

/** A source that counts its reads, handing over `backlog` and `live` each time. */
const counting = (backlog: ReadonlyArray<StoredRecord>, live: Stream.Stream<StoredRecord>) => {
  const tally = { reads: 0 };
  const source: Source = {
    read: Effect.sync(() => {
      tally.reads += 1;
      return { backlog, live };
    }),
  };
  return { source, tally };
};

/** A source whose first read ends on a defect after `x`, and whose later reads hand over `x` and `y` and end. */
const flaky = () => {
  const tally = { reads: 0 };
  const source: Source = {
    read: Effect.sync(() => {
      tally.reads += 1;
      return tally.reads === 1
        ? { backlog: [record("x", 100)], live: Stream.die(new Error("live boom")) }
        : { backlog: [record("x", 100), record("y", 200)], live: Stream.empty };
    }),
  };
  return { source, tally };
};

/** The tag of every status a feed published, in order. */
const heardStatus = (feed: TimelineFeed): Array<string> => {
  const heard: Array<string> = [];
  feed.status.subscribe(() => {
    heard.push(feed.status.getSnapshot()._tag);
  });
  return heard;
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

  it.effect("TF9 a read replaced while it is delivering its backlog writes nothing more", () =>
    Effect.gen(function* () {
      const feed = yield* makeTimelineFeed();
      let swapped = false;
      feed.timeline.subscribe(() => {
        if (swapped) return;
        swapped = true;
        feed.configure({ source: delayed([record("b", 1000)]) });
      });
      feed.configure({ source: delayed([record("a1", 100), record("a2", 200), record("a3", 300)]) });
      yield* flush;

      assert.deepStrictEqual(idsOf(feed), ["a1", "b"]);
    }));

  it.effect("TF10 a read that dies is Stopped with its reason, at once", () =>
    Effect.gen(function* () {
      const feed = yield* makeTimelineFeed({ source: { read: Effect.die(new Error("boom")) } });

      const status = feed.status.getSnapshot();
      assert.strictEqual(status._tag, "Stopped");
      assert.isTrue(status._tag === "Stopped" && status.reason.includes("boom"));
    }));

  it.effect("TF11 a live stream that dies after its backlog is Stopped and keeps the entries; a new source reads again", () =>
    Effect.gen(function* () {
      const feed = yield* makeTimelineFeed({
        source: { read: Effect.succeed({ backlog: [record("x", 100)], live: Stream.die(new Error("live boom")) }) },
      });
      yield* flush;

      const status = feed.status.getSnapshot();
      assert.strictEqual(status._tag, "Stopped");
      assert.isTrue(status._tag === "Stopped" && status.reason.includes("live boom"));
      assert.deepStrictEqual(idsOf(feed), ["x"]);

      feed.configure({ source: delayed([record("y", 200)]) });
      yield* flush;

      assert.strictEqual(feed.status.getSnapshot()._tag, "Reading");
      assert.deepStrictEqual(idsOf(feed), ["x", "y"]);
    }));

  it.effect(
    "TF12 replacing the source, configuring no source and closing the scope never publish Stopped, even when a replaced read's release dies",
    () =>
      Effect.gen(function* () {
        const scope = yield* Scope.make();
        const dying = watched(
          [record("x", 100)],
          Stream.never.pipe(Stream.ensuring(Effect.die(new Error("release boom")))),
        );
        const feed = yield* Scope.provide(makeTimelineFeed({ source: dying.source }), scope);
        const heard = heardStatus(feed);
        yield* flush;

        feed.configure({ source: watched([], Stream.never).source });
        yield* flush;
        feed.configure({});
        yield* flush;
        yield* Scope.close(scope, Exit.void);
        yield* settleTurns;

        assert.deepStrictEqual(heard, []);
        assert.strictEqual(feed.status.getSnapshot()._tag, "Reading");
      }));

  it.effect("TF13 a source that ends by itself is not a stop", () =>
    Effect.gen(function* () {
      const ended = yield* makeTimelineFeed({ source: sourceFromRecords([record("z", 1)]) });
      const endedHeard = heardStatus(ended);
      const none = yield* makeTimelineFeed();
      const noneHeard = heardStatus(none);
      yield* flush;

      assert.deepStrictEqual(idsOf(ended), ["z"]);
      assert.strictEqual(ended.status.getSnapshot()._tag, "Reading");
      assert.strictEqual(none.status.getSnapshot()._tag, "Reading");
      assert.deepStrictEqual(endedHeard, []);
      assert.deepStrictEqual(noneHeard, []);
    }));

  it.effect("TF14 a capacity change while Stopped starts a new read and returns to Reading", () =>
    Effect.gen(function* () {
      const a = flaky();
      const feed = yield* makeTimelineFeed({ source: a.source });
      yield* flush;
      assert.strictEqual(feed.status.getSnapshot()._tag, "Stopped");

      feed.configure({ source: a.source, capacity: 2 });
      yield* flush;

      assert.strictEqual(feed.status.getSnapshot()._tag, "Reading");
      assert.deepStrictEqual(idsOf(feed), ["x", "y"]);
      assert.strictEqual(feed.timeline.getSnapshot().capacity, 2);
    }));

  it.effect("TF15 a restart after a stop reads the current source again, keeps what was delivered and shows nothing twice", () =>
    Effect.gen(function* () {
      const a = flaky();
      const feed = yield* makeTimelineFeed({ source: a.source });
      yield* flush;
      assert.strictEqual(feed.status.getSnapshot()._tag, "Stopped");
      assert.deepStrictEqual(idsOf(feed), ["x"]);

      feed.status.restart();
      yield* flush;

      assert.strictEqual(feed.status.getSnapshot()._tag, "Reading");
      assert.deepStrictEqual(idsOf(feed), ["x", "y"]);
      assert.strictEqual(a.tally.reads, 2);
    }));

  it.effect("TF16 a restart while Reading replaces the read, publishes no Stopped and shows nothing twice", () =>
    Effect.gen(function* () {
      const a = counting([record("a", 100)], Stream.never);
      const feed = yield* makeTimelineFeed({ source: a.source });
      const heard = heardStatus(feed);
      yield* flush;

      feed.status.restart();
      yield* flush;

      assert.strictEqual(a.tally.reads, 2);
      assert.deepStrictEqual(idsOf(feed), ["a"]);
      assert.deepStrictEqual(heard, []);
    }));

  it.effect("TF17 a restart after the scope closed reads nothing and publishes nothing", () =>
    Effect.gen(function* () {
      const a = counting([record("a", 100)], Stream.never);
      const scope = yield* Scope.make();
      const feed = yield* Scope.provide(makeTimelineFeed({ source: a.source }), scope);
      const heard = heardStatus(feed);
      yield* flush;
      yield* Scope.close(scope, Exit.void);
      yield* settleTurns;

      feed.status.restart();
      yield* flush;

      assert.strictEqual(a.tally.reads, 1);
      assert.deepStrictEqual(heard, []);
    }));

  it.effect("TF18 a restart after the scope closed leaves a Stopped feed Stopped", () =>
    Effect.gen(function* () {
      const a = flaky();
      const scope = yield* Scope.make();
      const feed = yield* Scope.provide(makeTimelineFeed({ source: a.source }), scope);
      yield* flush;
      assert.strictEqual(feed.status.getSnapshot()._tag, "Stopped");
      const heard = heardStatus(feed);
      yield* Scope.close(scope, Exit.void);
      yield* settleTurns;

      feed.status.restart();
      yield* flush;

      assert.strictEqual(feed.status.getSnapshot()._tag, "Stopped");
      assert.strictEqual(a.tally.reads, 1);
      assert.deepStrictEqual(heard, []);
    }));

  it.effect("TF24 a configure after the scope closed reads nothing, publishes nothing and leaves a Stopped feed Stopped", () =>
    Effect.gen(function* () {
      const a = flaky();
      const b = counting([record("b", 300)], Stream.never);
      const scope = yield* Scope.make();
      const feed = yield* Scope.provide(makeTimelineFeed({ source: a.source }), scope);
      yield* flush;
      assert.strictEqual(feed.status.getSnapshot()._tag, "Stopped");
      const before = feed.timeline.getSnapshot();
      const heard = heardStatus(feed);
      let timelineHeard = 0;
      feed.timeline.subscribe(() => {
        timelineHeard += 1;
      });
      yield* Scope.close(scope, Exit.void);
      yield* settleTurns;

      feed.configure({ capacity: 5, source: b.source });
      yield* flush;

      assert.strictEqual(feed.status.getSnapshot()._tag, "Stopped");
      assert.strictEqual(feed.timeline.getSnapshot(), before);
      assert.strictEqual(b.tally.reads, 0);
      assert.deepStrictEqual(heard, []);
      assert.strictEqual(timelineHeard, 0);
    }));

  it.effect("TF19 a replaced read whose release dies while the scope closes never publishes Stopped", () =>
    Effect.gen(function* () {
      const latch = yield* Deferred.make<void>();
      const slow = watched(
        [record("x", 100)],
        Stream.never.pipe(
          Stream.ensuring(Effect.andThen(Deferred.await(latch), Effect.die(new Error("late release")))),
        ),
      );
      const scope = yield* Scope.make();
      const feed = yield* Scope.provide(makeTimelineFeed({ source: slow.source }), scope);
      const heard = heardStatus(feed);
      yield* flush;
      feed.configure({ source: watched([], Stream.never).source });
      yield* flush;
      const closing = yield* Effect.forkChild(Scope.close(scope, Exit.void));
      yield* settleTurns;

      yield* Deferred.succeed(latch, undefined);
      yield* Fiber.join(closing);
      yield* flush;

      assert.deepStrictEqual(heard, []);
      assert.strictEqual(feed.status.getSnapshot()._tag, "Reading");
    }));

  it.effect("TF20 a restart from Stopped publishes Reading before a read that dies at once publishes Stopped", () =>
    Effect.gen(function* () {
      const feed = yield* makeTimelineFeed({ source: { read: Effect.die(new Error("gone")) } });
      yield* flush;
      assert.strictEqual(feed.status.getSnapshot()._tag, "Stopped");
      const heard = heardStatus(feed);

      feed.status.restart();
      yield* flush;

      assert.deepStrictEqual(heard, ["Reading", "Stopped"]);
      assert.strictEqual(feed.status.getSnapshot()._tag, "Stopped");
    }));

  it.effect("TF21 a subscriber that reconfigures the feed inside its Reading notification leaves the newest read live", () =>
    Effect.gen(function* () {
      const feed = yield* makeTimelineFeed({
        source: { read: Effect.succeed({ backlog: [], live: Stream.die(new Error("boom")) }) },
      });
      yield* flush;
      assert.strictEqual(feed.status.getSnapshot()._tag, "Stopped");
      const once = { done: false };
      feed.status.subscribe(() => {
        if (once.done || feed.status.getSnapshot()._tag !== "Reading") return;
        once.done = true;
        feed.configure({ source: delayed([record("from-B", 200)]) });
      });

      feed.configure({ source: delayed([record("from-A", 100)]) });
      yield* flush;

      assert.deepStrictEqual(idsOf(feed), ["from-B"]);
    }));

  it.effect("TF22 a read whose first step reconfigures the feed leaves the newest read live", () =>
    Effect.gen(function* () {
      const feed = yield* makeTimelineFeed();
      const outer: Source = {
        read: Effect.sync(() => {
          feed.configure({ source: delayed([record("from-B", 200)]) });
          return { backlog: [record("from-A", 100)], live: Stream.never };
        }),
      };

      feed.configure({ source: outer });
      yield* flush;

      assert.deepStrictEqual(idsOf(feed), ["from-B"]);
      assert.strictEqual(feed.status.getSnapshot()._tag, "Reading");
    }));

  it.effect("TF23 a subscriber that restarts the feed inside the Stopped of a read that died in its first step leaves the retry live", () =>
    Effect.gen(function* () {
      const feed = yield* makeTimelineFeed();
      const tally = { reads: 0 };
      const source: Source = {
        read: Effect.suspend((): Effect.Effect<SourceRead> => {
          tally.reads += 1;
          return tally.reads === 1
            ? Effect.die(new Error("first"))
            : Effect.as(Effect.yieldNow, { backlog: [record("retry", 1)], live: Stream.never });
        }),
      };
      const once = { done: false };
      feed.status.subscribe(() => {
        if (once.done || feed.status.getSnapshot()._tag !== "Stopped") return;
        once.done = true;
        feed.status.restart();
      });

      feed.configure({ source });
      yield* flush;

      assert.deepStrictEqual(idsOf(feed), ["retry"]);
      assert.strictEqual(tally.reads, 2);
      assert.strictEqual(feed.status.getSnapshot()._tag, "Reading");
    }));

  it.effect("TF25 a timeline listener that throws does not silence the next one, and accept rethrows what it threw", () =>
    Effect.gen(function* () {
      const feed = yield* makeTimelineFeed();
      yield* settleTurns;
      const boom = new Error("boom");
      const seen: Array<ReadonlyArray<string>> = [];
      feed.timeline.subscribe(() => {
        throw boom;
      });
      feed.timeline.subscribe(() => {
        seen.push(idsOf(feed));
      });

      const outcome = thrownBy(() => feed.timeline.accept(record("x", 100)));

      assert.deepStrictEqual(seen, [["x"]]);
      assert.isTrue(outcome.threw);
      assert.strictEqual(outcome.thrown, boom);
    }));

  it.effect("TF26 a listener that throws on the emptied timeline a capacity change publishes stops no read: configure rethrows, and the new source is read", () =>
    Effect.gen(function* () {
      const a = watched([], Stream.never);
      const feed = yield* makeTimelineFeed({ source: a.source, capacity: 5 });
      yield* flush;
      const b = counting([record("from-b", 100)], Stream.never);
      const boom = new Error("boom");
      let throws = 1;
      feed.timeline.subscribe(() => {
        if (throws === 0) return;
        throws -= 1;
        throw boom;
      });

      const outcome = thrownBy(() => feed.configure({ source: b.source, capacity: 2 }));
      yield* flush;

      assert.isTrue(outcome.threw);
      assert.strictEqual(outcome.thrown, boom);
      assert.deepStrictEqual(a.tally, { started: 1, finalized: 1 });
      assert.deepStrictEqual(b.tally, { reads: 1 });
      assert.deepStrictEqual(idsOf(feed), ["from-b"]);
      assert.strictEqual(feed.status.getSnapshot()._tag, "Reading");
    }));

  it.effect("TF27 a listener that throws on a capacity-only change stops no read: the emptied timeline is refilled from the same source", () =>
    Effect.gen(function* () {
      const a = counting([record("x", 100)], Stream.never);
      const feed = yield* makeTimelineFeed({ source: a.source, capacity: 5 });
      yield* flush;
      assert.deepStrictEqual(idsOf(feed), ["x"]);
      const boom = new Error("boom");
      let throws = 1;
      feed.timeline.subscribe(() => {
        if (throws === 0) return;
        throws -= 1;
        throw boom;
      });

      const outcome = thrownBy(() => feed.configure({ source: a.source, capacity: 2 }));
      yield* flush;

      assert.isTrue(outcome.threw);
      assert.strictEqual(outcome.thrown, boom);
      assert.deepStrictEqual(a.tally, { reads: 2 });
      assert.deepStrictEqual(idsOf(feed), ["x"]);
      assert.strictEqual(feed.timeline.getSnapshot().capacity, 2);
    }));

  it.effect("TF28 a listener that throws on the Reading a restart publishes over a Stopped leaves the status Reading with no read started", () =>
    Effect.gen(function* () {
      const { source, tally } = flaky();
      const feed = yield* makeTimelineFeed({ source });
      yield* flush;
      assert.strictEqual(feed.status.getSnapshot()._tag, "Stopped");
      const boom = new Error("boom");
      let throws = 1;
      feed.status.subscribe(() => {
        if (throws === 0) return;
        throws -= 1;
        throw boom;
      });

      const outcome = thrownBy(() => feed.status.restart());
      yield* flush;

      assert.isTrue(outcome.threw);
      assert.strictEqual(outcome.thrown, boom);
      assert.strictEqual(feed.status.getSnapshot()._tag, "Reading");
      assert.strictEqual(tally.reads, 1);
      assert.deepStrictEqual(idsOf(feed), ["x"]);
    }));

  it.effect("TF29 a status listener that throws on the Reading a capacity change publishes over a Stopped replaces the timeline listener's throw, and no read is started", () =>
    Effect.gen(function* () {
      const { source, tally } = flaky();
      const feed = yield* makeTimelineFeed({ source, capacity: 5 });
      yield* flush;
      assert.strictEqual(feed.status.getSnapshot()._tag, "Stopped");
      const timelineBoom = new Error("timeline boom");
      const statusBoom = new Error("status boom");
      let timelineThrows = 1;
      feed.timeline.subscribe(() => {
        if (timelineThrows === 0) return;
        timelineThrows -= 1;
        throw timelineBoom;
      });
      let statusThrows = 1;
      feed.status.subscribe(() => {
        if (statusThrows === 0) return;
        statusThrows -= 1;
        throw statusBoom;
      });

      const outcome = thrownBy(() => feed.configure({ source, capacity: 2 }));
      yield* flush;

      assert.isTrue(outcome.threw);
      assert.strictEqual(outcome.thrown, statusBoom);
      assert.strictEqual(feed.status.getSnapshot()._tag, "Reading");
      assert.strictEqual(tally.reads, 1);
      assert.deepStrictEqual(idsOf(feed), []);
      assert.strictEqual(feed.timeline.getSnapshot().capacity, 2);
    }));
});
