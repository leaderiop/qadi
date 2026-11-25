/**
 * What stops a timeline read, and what never does, pinned through the feed's interface.
 *
 * A read whose own work interrupts itself has ended without anyone asking it to, so the feed
 * states it as a stop with the interruption as its reason. An interruption from outside is a
 * different thing: a new source, no source, a capacity change, a restart and the scope closing
 * all end the read on purpose, and none of them may read as a stop, even when the release of
 * the read they ended dies on the way out.
 *
 * These rows were written before the timeline's read moved into one module shared with the
 * other feeds, and the file is held byte for byte from the commit that adds it.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";
import * as TestClock from "effect/testing/TestClock";
import type { StoredRecord } from "@qadi/core";
import type { Source } from "../../src/model/Source.ts";
import { makeTimelineFeed } from "../../src/model/TimelineFeed.ts";
import type { TimelineFeed } from "../../src/model/TimelineFeed.ts";
import { decisionRecord } from "../helpers.ts";

const flush = Effect.andThen(Effect.yieldNow, TestClock.adjust("10 millis"));

const record = (evaluationId: string, at: number): StoredRecord => decisionRecord({ evaluationId, at });

/** The tag of every status a feed publishes from now on, in order. */
const heardStatus = (feed: TimelineFeed): Array<string> => {
  const heard: Array<string> = [];
  feed.status.subscribe(() => {
    heard.push(feed.status.getSnapshot()._tag);
  });
  return heard;
};

/** A source whose read stays open and whose release dies, so any stop an interruption states is one it caused. */
const dyingRelease = (): Source => ({
  read: Effect.gen(function* () {
    yield* Effect.addFinalizer(() => Effect.die(new Error("release died")));
    return { backlog: [record("x", 100)], live: Stream.never };
  }),
});

/** A feed whose first read is live on `source`, and every status it publishes after that. */
const liveOn = (source: Source) =>
  Effect.gen(function* () {
    const feed = yield* makeTimelineFeed();
    feed.configure({ source, capacity: 5 });
    yield* flush;
    return { feed, heard: heardStatus(feed) };
  });

/** What an interruption from outside leaves: no stop published, and the feed still reading. */
const statesNoStop = (feed: TimelineFeed, heard: ReadonlyArray<string>): void => {
  assert.notInclude(heard, "Stopped");
  assert.strictEqual(feed.status.getSnapshot()._tag, "Reading");
};

describe("a timeline read that interrupts itself", () => {
  it.effect("TX1 a read that interrupts itself reads Stopped with the interruption as its reason", () =>
    Effect.gen(function* () {
      const feed = yield* makeTimelineFeed();
      const heard = heardStatus(feed);

      feed.configure({ source: { read: Effect.interrupt } });
      yield* flush;

      const status = feed.status.getSnapshot();
      assert.strictEqual(status._tag, "Stopped", `tape=${JSON.stringify(heard)}`);
      assert.include(status._tag === "Stopped" ? status.reason : "", "InterruptError");
    }));

  it.effect("TX2 a live stream that interrupts itself reads Stopped", () =>
    Effect.gen(function* () {
      const feed = yield* makeTimelineFeed();
      const heard = heardStatus(feed);

      feed.configure({ source: { read: Effect.succeed({ backlog: [], live: Stream.fromEffect(Effect.interrupt) }) } });
      yield* flush;

      assert.strictEqual(feed.status.getSnapshot()._tag, "Stopped", `tape=${JSON.stringify(heard)}`);
    }));
});

describe("a timeline read that is interrupted from outside", () => {
  it.effect("TX3 a new source interrupts the read and states no stop, even when the replaced release dies", () =>
    Effect.gen(function* () {
      const { feed, heard } = yield* liveOn(dyingRelease());

      feed.configure({ source: dyingRelease(), capacity: 5 });
      yield* flush;

      statesNoStop(feed, heard);
    }));

  it.effect("TX4 configuring no source interrupts the read and states no stop, even when the release dies", () =>
    Effect.gen(function* () {
      const { feed, heard } = yield* liveOn(dyingRelease());

      feed.configure({ capacity: 5 });
      yield* flush;

      statesNoStop(feed, heard);
    }));

  it.effect("TX5 a capacity change interrupts the read and states no stop, even when the release dies", () =>
    Effect.gen(function* () {
      const source = dyingRelease();
      const { feed, heard } = yield* liveOn(source);

      feed.configure({ source, capacity: 2 });
      yield* flush;

      statesNoStop(feed, heard);
    }));

  it.effect("TX6 a restart interrupts the read and states no stop, even when the release dies", () =>
    Effect.gen(function* () {
      const { feed, heard } = yield* liveOn(dyingRelease());

      feed.status.restart();
      yield* flush;

      statesNoStop(feed, heard);
    }));

  it.effect("TX7 closing the scope interrupts the read and states no stop, even when the release dies", () =>
    Effect.gen(function* () {
      const scope = yield* Scope.make();
      const { feed, heard } = yield* Scope.provide(liveOn(dyingRelease()), scope);

      yield* Scope.close(scope, Exit.void);
      yield* flush;

      statesNoStop(feed, heard);
    }));
});
