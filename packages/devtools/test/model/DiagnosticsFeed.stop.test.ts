/**
 * What stops the diagnostics poll, and what never does, pinned through the feed's interface.
 *
 * A collector whose snapshot interrupts itself has ended the poll without anyone asking it to,
 * so the feed states a stop, with or without a sample taken first. An interruption from outside
 * is a different thing: changed options, absent options, a restart and the scope closing all end
 * the poll on purpose, and none of them may read as a stop, even when the release of the layer
 * they ended dies on the way out. A layer whose build interrupts itself is read by the wiring
 * read, which states it as a failed reading and not as a stop of the poll.
 *
 * These rows were written before the poll moved into one module shared with the other feeds, and
 * the file is held byte for byte from the commit that adds it.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Scope from "effect/Scope";
import * as TestClock from "effect/testing/TestClock";
import { DiagnosticsStatus, makeDiagnosticsFeed } from "../../src/model/DiagnosticsFeed.ts";
import type { DiagnosticsFeed } from "../../src/model/DiagnosticsFeed.ts";
import type { PortCallCollector, PortCallLog } from "../../src/model/PortCalls.ts";
import { diagnosticsFeedOf } from "../builtFeeds.ts";
import { settleTurns } from "../helpers.ts";

/** Settles every fiber, then steps the clock. */
const step = (duration: Duration.Input) =>
  Effect.gen(function* () {
    yield* settleTurns;
    yield* TestClock.adjust(duration);
    yield* settleTurns;
  });

/** The status tag of every notification a feed publishes from now on, in order. */
const recording = (feed: DiagnosticsFeed): Array<string> => {
  const seen: Array<string> = [];
  feed.subscribe(() => {
    seen.push(feed.getSnapshot().status._tag);
  });
  return seen;
};

const logOf = (n: number): PortCallLog => ({ calls: [], dropped: n, capacity: 10 });

/** A layer whose release dies, so any stop an interruption states is one it caused. */
const dyingRelease = () =>
  Layer.effectDiscard(Effect.acquireRelease(Effect.void, () => Effect.die(new Error("release blew up"))));

/** A feed live on a layer whose release dies, and every status it publishes after that. */
const liveOnDying = Effect.gen(function* () {
  const feed = yield* diagnosticsFeedOf({ layer: dyingRelease() });
  yield* step("4 seconds");
  assert.strictEqual(feed.getSnapshot().status._tag, "Live");
  return { feed, seen: recording(feed) };
});

describe("a diagnostics poll that interrupts itself", () => {
  it.effect("DX1 a collector whose snapshot interrupts itself before any sample reads Stopped and not sampled", () =>
    Effect.gen(function* () {
      const feed = yield* makeDiagnosticsFeed();
      const seen = recording(feed);
      const collector: PortCallCollector = { layer: Layer.empty, snapshot: Effect.interrupt };

      feed.configure({ collector });
      yield* step("4 seconds");

      const status = feed.getSnapshot().status;
      assert.strictEqual(status._tag, "Stopped", `tape=${JSON.stringify(seen)}`);
      assert.isTrue(DiagnosticsStatus.$is("Stopped")(status) && !status.sampled);
    }));

  it.effect("DX2 a collector whose snapshot interrupts itself after a sample reads Stopped and sampled", () =>
    Effect.gen(function* () {
      const feed = yield* makeDiagnosticsFeed();
      const seen = recording(feed);
      const tally = { calls: 0 };
      const collector: PortCallCollector = {
        layer: Layer.empty,
        snapshot: Effect.suspend(() => {
          tally.calls += 1;
          return tally.calls === 1 ? Effect.succeed(logOf(1)) : Effect.interrupt;
        }),
      };

      feed.configure({ collector });
      yield* step("4 seconds");

      const status = feed.getSnapshot().status;
      assert.strictEqual(status._tag, "Stopped", `tape=${JSON.stringify(seen)}`);
      assert.isTrue(DiagnosticsStatus.$is("Stopped")(status) && status.sampled);
    }));
});

describe("a diagnostics poll that is interrupted from outside", () => {
  it.effect("DX3 changed options interrupt the poll and state no stop, even when the replaced layer release dies", () =>
    Effect.gen(function* () {
      const { feed, seen } = yield* liveOnDying;

      feed.configure({ layer: Layer.empty });
      yield* step("4 seconds");

      assert.notInclude(seen, "Stopped");
      assert.strictEqual(feed.getSnapshot().status._tag, "Live");
    }));

  it.effect("DX4 absent options turn the poll Off and state no stop, even when the release dies", () =>
    Effect.gen(function* () {
      const { feed, seen } = yield* liveOnDying;

      feed.configure(undefined);
      yield* step("4 seconds");

      assert.notInclude(seen, "Stopped");
      assert.strictEqual(feed.getSnapshot().status._tag, "Off");
    }));

  it.effect("DX5 a restart interrupts the poll and states no stop, even when the release dies", () =>
    Effect.gen(function* () {
      const { feed, seen } = yield* liveOnDying;

      feed.restart();
      yield* step("4 seconds");

      assert.notInclude(seen, "Stopped");
      assert.strictEqual(feed.getSnapshot().status._tag, "Live");
    }));

  it.effect("DX6 closing the scope interrupts the poll and states no stop, even when the release dies", () =>
    Effect.gen(function* () {
      const scope = yield* Scope.make();
      const { feed, seen } = yield* Scope.provide(liveOnDying, scope);

      yield* Scope.close(scope, Exit.void);
      yield* step("4 seconds");

      assert.notInclude(seen, "Stopped");
      assert.strictEqual(feed.getSnapshot().status._tag, "Live");
    }));

  it.effect("DX7 a layer whose build interrupts itself is a failed wiring read inside a Live feed, not a stop", () =>
    Effect.gen(function* () {
      const feed = yield* makeDiagnosticsFeed();
      const seen = recording(feed);

      feed.configure({ layer: Layer.effectDiscard(Effect.interrupt) });
      yield* step("4 seconds");

      const { status, reading } = feed.getSnapshot();
      assert.notInclude(seen, "Stopped");
      assert.strictEqual(status._tag, "Live");
      assert.strictEqual(reading.wiring._tag, "Failed");
    }));
});
