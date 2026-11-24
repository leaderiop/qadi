/**
 * What a listener's throw does to a timeline feed built with no dock model.
 *
 * A shell that builds `makeTimelineFeed` itself reads these off the feed's own stores:
 * a listener on `timeline` that throws on a record ends the read and the status says so,
 * and several listeners on one store that throw in one configure step are one nested
 * `AggregateError` inside the feed's own. The dock-level pins are `DockModel.listeners.test.ts`.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import * as TestClock from "effect/testing/TestClock";
import type { StoredRecord } from "@qadi/core";
import { sourceFromRecords, type Source, type SourceRead } from "../../src/model/Source.ts";
import type { TimelineFeed } from "../../src/index.ts";
import { timelineFeedOf } from "../builtFeeds.ts";
import { decisionRecord, thrownBy } from "../helpers.ts";

const flush = Effect.andThen(Effect.yieldNow, TestClock.adjust("10 millis"));

const record = (evaluationId: string, at: number): StoredRecord => decisionRecord({ evaluationId, at });

const idsOf = (feed: TimelineFeed): ReadonlyArray<string> =>
  feed.timeline.getSnapshot().entries.map((entry) => entry.evaluationId);

/** A source that answers after one turn, so a listener subscribed on the build's turn hears every record. */
const answering = (read: SourceRead): Source => ({ read: Effect.as(Effect.yieldNow, read) });

/** The one listener that throws `boom` on every notification. */
const alwaysThrow = (store: { readonly subscribe: (listener: () => void) => () => void }, boom: unknown) =>
  store.subscribe(() => {
    throw boom;
  });

describe("a timeline feed's listeners", () => {
  it.effect("LF1 a timeline listener that throws on a backlog record ends the read, and the status says it stopped", () =>
    Effect.gen(function* () {
      const boom = new Error("a backlog listener threw");
      const feed = yield* timelineFeedOf({
        source: answering({ backlog: [record("r1", 100), record("r2", 200)], live: Stream.never }),
      });
      alwaysThrow(feed.timeline, boom);

      yield* flush;

      const status = feed.status.getSnapshot();
      if (status._tag !== "Stopped") return assert.fail("expected the status to say Stopped");
      assert.include(status.reason, boom.message);
      assert.deepStrictEqual(idsOf(feed), ["r1"]);
    }),
  );

  it.effect("LF2 a timeline listener that throws on a live record ends the read, and the status says it stopped", () =>
    Effect.gen(function* () {
      const boom = new Error("a live listener threw");
      const feed = yield* timelineFeedOf({
        source: answering({ backlog: [], live: Stream.make(record("r1", 100), record("r2", 200)) }),
      });
      alwaysThrow(feed.timeline, boom);

      yield* flush;

      const status = feed.status.getSnapshot();
      if (status._tag !== "Stopped") return assert.fail("expected the status to say Stopped");
      assert.include(status.reason, boom.message);
      assert.deepStrictEqual(idsOf(feed), ["r1"]);
    }),
  );

  it.effect("LF3 two timeline listeners that throw on a resize are one nested AggregateError beside the read's own throw", () =>
    Effect.gen(function* () {
      const feed = yield* timelineFeedOf({
        source: answering({ backlog: [], live: Stream.die(new Error("the live stream died")) }),
        capacity: 5,
      });
      yield* flush;
      assert.strictEqual(feed.status.getSnapshot()._tag, "Stopped");
      const first = new Error("a first timeline listener threw");
      const second = new Error("a second timeline listener threw");
      const reading = new Error("a status listener threw on the new read");
      alwaysThrow(feed.timeline, first);
      alwaysThrow(feed.timeline, second);
      alwaysThrow(feed.status, reading);

      const run = thrownBy(() => feed.configure({ source: sourceFromRecords([]), capacity: 7 }));
      yield* flush;

      const { thrown } = run;
      if (!(thrown instanceof AggregateError)) return assert.fail("expected an AggregateError");
      assert.strictEqual(thrown.message, "More than one step of the timeline feed's configure threw.");
      assert.strictEqual(thrown.errors.length, 2);
      const nested = thrown.errors[0];
      if (!(nested instanceof AggregateError)) return assert.fail("expected a nested AggregateError");
      assert.deepStrictEqual(nested.errors, [first, second]);
      assert.strictEqual(nested.message, "More than one of the store's listeners threw.");
      assert.strictEqual(thrown.errors[1], reading);
      assert.strictEqual(feed.status.getSnapshot()._tag, "Reading");
    }),
  );
});
