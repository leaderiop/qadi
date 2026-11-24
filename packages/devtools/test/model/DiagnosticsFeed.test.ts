/**
 * The diagnostics feed's status, stop, restart and lifetime under `TestClock`, with no render.
 *
 * A poll is a discrete-event system, so each case records its transitions through
 * `subscribe` (two of them can happen in one synchronous tick, and reading only the
 * end state would miss that) and steps the clock at the boundary it distinguishes.
 * What React can get wrong about the same poll is proved in `test/react`.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Scope from "effect/Scope";
import * as TestClock from "effect/testing/TestClock";
import {
  DiagnosticsStatus,
  makeDiagnosticsFeed,
  type DiagnosticsOptions,
  type DiagnosticsReadout,
} from "../../src/index.ts";
import {
  diagnosticsOff,
  diagnosticsStarting,
  idleDiagnostics,
  isUnsampled,
} from "../../src/model/DiagnosticsFeed.ts";
import { noDiagnostics } from "../../src/model/DiagnosticsStore.ts";
import type { PortCallCollector, PortCallLog } from "../../src/model/PortCalls.ts";
import { diagnosticsFeedOf } from "../builtFeeds.ts";
import { makeCollectorDouble } from "../collectorDouble.ts";
import { hostile, hostileError, settleTurns, thrownBy } from "../helpers.ts";

/** A layer that counts its builds and releases. */
const counted = () => {
  const counts = { builds: 0, releases: 0 };
  const layer = Layer.effectDiscard(
    Effect.acquireRelease(
      Effect.sync(() => {
        counts.builds += 1;
      }),
      () =>
        Effect.sync(() => {
          counts.releases += 1;
        }),
    ),
  );
  return { counts, layer };
};

/** A layer whose acquire takes one second on the clock. */
const slowLayer = () => {
  const counts = { builds: 0, releases: 0 };
  const layer = Layer.effectDiscard(
    Effect.acquireRelease(
      Effect.sleep("1 second").pipe(
        Effect.tap(() =>
          Effect.sync(() => {
            counts.builds += 1;
          }),
        ),
      ),
      () =>
        Effect.sync(() => {
          counts.releases += 1;
        }),
    ),
  );
  return { counts, layer };
};

/** A log that has dropped `n` calls, so two of them differ when `n` does. */
const logOf = (n: number): PortCallLog => ({ calls: [], dropped: n, capacity: 10 });

const collectorOf = (): PortCallCollector => ({
  layer: Layer.empty,
  snapshot: Effect.succeed({ calls: [], dropped: 0, capacity: 10 }),
});

/** The status tag of every notification, in order. */
const recording = (feed: DiagnosticsReadout) => {
  const seen: Array<string> = [];
  feed.subscribe(() => {
    seen.push(feed.getSnapshot().status._tag);
  });
  return seen;
};

/** Settles every fiber, then steps the clock. */
const step = (duration: Duration.Input) =>
  Effect.gen(function* () {
    yield* settleTurns;
    yield* TestClock.adjust(duration);
    yield* settleTurns;
  });

describe("the diagnostics feed", () => {
  it.effect("F1 built with no options reads Off by identity, and restart() changes and notifies nothing", () =>
    Effect.gen(function* () {
      const feed = yield* makeDiagnosticsFeed();
      assert.strictEqual(feed.getSnapshot(), diagnosticsOff);
      const seen = recording(feed);

      feed.restart();

      assert.deepStrictEqual(seen, []);
      assert.strictEqual(feed.getSnapshot(), diagnosticsOff);
    }),
  );

  it.effect("F2 an empty options object samples the metric reads only and is Live once built", () =>
    Effect.gen(function* () {
      const feed = yield* diagnosticsFeedOf({});
      const { status, reading } = feed.getSnapshot();
      assert.isTrue(DiagnosticsStatus.$is("Live")(status));
      assert.strictEqual(reading.wiring._tag, "NotHanded");
      assert.isUndefined(reading.portCalls);
      assert.isUndefined(reading.questions);
      assert.isDefined(reading.hydration);
    }),
  );

  it.effect("F3 an asynchronous layer leaves Starting with nothing sampled after the build, then Live", () =>
    Effect.gen(function* () {
      const { layer } = slowLayer();
      const feed = yield* diagnosticsFeedOf({ layer });
      const early = feed.getSnapshot();
      assert.isTrue(DiagnosticsStatus.$is("Starting")(early.status));
      assert.strictEqual(early.reading, noDiagnostics);

      yield* step("1 second");

      const late = feed.getSnapshot();
      assert.isTrue(DiagnosticsStatus.$is("Live")(late.status));
      assert.strictEqual(late.reading.wiring._tag, "Read");
    }),
  );

  it.effect("F4 a collector that throws on its first call is Stopped with nothing sampled, and is not called again", () =>
    Effect.gen(function* () {
      const { state, collector } = makeCollectorDouble(() => {
        throw new Error("first call blew up");
      });
      const feed = yield* diagnosticsFeedOf({ collector });

      const { status, reading } = feed.getSnapshot();
      if (!DiagnosticsStatus.$is("Stopped")(status)) return assert.fail("expected Stopped");
      assert.isFalse(status.sampled);
      assert.include(status.reason, "first call blew up");
      assert.strictEqual(reading, noDiagnostics);

      yield* step("6 seconds");
      assert.strictEqual(state.calls, 1);
    }),
  );

  it.effect("a collector that throws a value that cannot be rendered is Stopped with the placeholder", () =>
    Effect.gen(function* () {
      for (const value of [hostile, hostileError]) {
        const { collector } = makeCollectorDouble(() => {
          throw value;
        });
        const feed = yield* diagnosticsFeedOf({ collector });

        const { status } = feed.getSnapshot();
        if (!DiagnosticsStatus.$is("Stopped")(status)) return assert.fail("expected Stopped");
        assert.isFalse(status.sampled);
        assert.strictEqual(status.reason, "a value that could not be described");
      }
    }),
  );

  it.effect("F5 a collector that throws on its second call is Stopped with the earlier reading kept, and is not called again", () =>
    Effect.gen(function* () {
      const { state, collector } = makeCollectorDouble((call) => {
        if (call === 2) throw new Error("second call blew up");
        return logOf(0);
      });
      const feed = yield* diagnosticsFeedOf({ collector });
      const kept = feed.getSnapshot().reading;
      assert.isTrue(DiagnosticsStatus.$is("Live")(feed.getSnapshot().status));

      yield* step("2 seconds");

      const { status, reading } = feed.getSnapshot();
      if (!DiagnosticsStatus.$is("Stopped")(status)) return assert.fail("expected Stopped");
      assert.isTrue(status.sampled);
      assert.include(status.reason, "second call blew up");
      assert.strictEqual(reading, kept);

      yield* step("6 seconds");
      assert.strictEqual(state.calls, 2);
    }),
  );

  it.effect("F6 a new collector after a stop records Starting then Live, and its reads resume", () =>
    Effect.gen(function* () {
      const broken = makeCollectorDouble(() => {
        throw new Error("blew up");
      });
      const feed = yield* diagnosticsFeedOf({ collector: broken.collector });
      assert.isTrue(DiagnosticsStatus.$is("Stopped")(feed.getSnapshot().status));
      const seen = recording(feed);
      const fixed = makeCollectorDouble();

      feed.configure({ collector: fixed.collector });
      assert.deepStrictEqual(seen, ["Starting", "Live"]);

      yield* step("2 seconds");
      assert.strictEqual(fixed.state.calls, 2);
    }),
  );

  it.effect("F7 restart() after a stop records Starting then Live, and its reads resume", () =>
    Effect.gen(function* () {
      const { state, collector } = makeCollectorDouble((call) => {
        if (call === 2) throw new Error("blew up once");
        return logOf(0);
      });
      const feed = yield* diagnosticsFeedOf({ collector });
      yield* step("2 seconds");
      assert.isTrue(DiagnosticsStatus.$is("Stopped")(feed.getSnapshot().status));
      const seen = recording(feed);

      feed.restart();
      assert.deepStrictEqual(seen, ["Starting", "Live"]);

      yield* step("2 seconds");
      assert.strictEqual(state.calls, 4);
    }),
  );

  it.effect("F8 replacing the layer of a Live feed records Starting then Live, never Stopped", () =>
    Effect.gen(function* () {
      const first = counted();
      const second = counted();
      const feed = yield* diagnosticsFeedOf({ layer: first.layer });
      const seen = recording(feed);

      feed.configure({ layer: second.layer });
      yield* step("2 seconds");

      assert.deepStrictEqual(seen, ["Starting", "Live"]);
      assert.strictEqual(first.counts.releases, 1);
      assert.strictEqual(second.counts.builds, 1);
    }),
  );

  it.effect("F9 replacing a layer whose release dies records no Stopped", () =>
    Effect.gen(function* () {
      const dying = Layer.effectDiscard(
        Effect.acquireRelease(Effect.void, () => Effect.die(new Error("release blew up"))),
      );
      const feed = yield* diagnosticsFeedOf({ layer: dying });
      const seen = recording(feed);

      feed.configure({ layer: counted().layer });
      yield* step("4 seconds");

      assert.deepStrictEqual(seen, ["Starting", "Live"]);
      assert.isTrue(DiagnosticsStatus.$is("Live")(feed.getSnapshot().status));
    }),
  );

  it.effect("F10 configure(undefined) from Live reads Off by identity, releases the layer, and samples nothing more", () =>
    Effect.gen(function* () {
      const { counts, layer } = counted();
      const { state, collector } = makeCollectorDouble();
      const feed = yield* diagnosticsFeedOf({ layer, collector });
      assert.strictEqual(state.calls, 1);

      feed.configure(undefined);

      assert.strictEqual(feed.getSnapshot(), diagnosticsOff);
      assert.strictEqual(counts.releases, 1);
      yield* step("6 seconds");
      assert.strictEqual(state.calls, 1);
    }),
  );

  it.effect("F11 handing options again after Off records Starting then Live with a fresh reading", () =>
    Effect.gen(function* () {
      const feed = yield* diagnosticsFeedOf({});
      const before = feed.getSnapshot().reading;
      feed.configure(undefined);
      const seen = recording(feed);

      feed.configure({});

      assert.deepStrictEqual(seen, ["Starting", "Live"]);
      const { reading } = feed.getSnapshot();
      assert.notStrictEqual(reading, before);
      assert.isDefined(reading.hydration);
    }),
  );

  it.effect("F12 a fresh literal holding the same field references restarts nothing and notifies nothing", () =>
    Effect.gen(function* () {
      const { counts, layer } = counted();
      const { collector } = makeCollectorDouble();
      const feed = yield* diagnosticsFeedOf({ layer, collector, intervalMillis: 5_000 });
      const seen = recording(feed);

      feed.configure({ layer, collector, intervalMillis: 5_000 });
      yield* step("1 second");

      assert.deepStrictEqual(seen, []);
      assert.strictEqual(counts.builds, 1);
      assert.strictEqual(counts.releases, 0);
    }),
  );

  it.effect("F13 a changed layer, collector or intervalMillis each restarts exactly once", () =>
    Effect.gen(function* () {
      const layer = counted().layer;
      const collector = collectorOf();
      const base: DiagnosticsOptions = { layer, collector, intervalMillis: 5_000 };
      const changes: ReadonlyArray<readonly [string, DiagnosticsOptions]> = [
        ["layer", { ...base, layer: counted().layer }],
        ["collector", { ...base, collector: collectorOf() }],
        ["intervalMillis", { ...base, intervalMillis: 5_001 }],
      ];
      for (const [field, changed] of changes) {
        const feed = yield* diagnosticsFeedOf(base);
        const seen = recording(feed);

        feed.configure(changed);

        assert.deepStrictEqual(seen, ["Starting", "Live"], field);
      }
    }),
  );

  it.effect("F14 the default cadence takes one sample at 1999 ms and two at 2000 ms", () =>
    Effect.gen(function* () {
      const { state, collector } = makeCollectorDouble();
      yield* diagnosticsFeedOf({ collector });
      assert.strictEqual(state.calls, 1);

      yield* step("1999 millis");
      assert.strictEqual(state.calls, 1);

      yield* step("1 millis");
      assert.strictEqual(state.calls, 2);
    }),
  );

  it.effect("F15 an interval of 500 takes one sample at 499 ms and two at 500 ms", () =>
    Effect.gen(function* () {
      const { state, collector } = makeCollectorDouble();
      yield* diagnosticsFeedOf({ collector, intervalMillis: 500 });
      assert.strictEqual(state.calls, 1);

      yield* step("499 millis");
      assert.strictEqual(state.calls, 1);

      yield* step("1 millis");
      assert.strictEqual(state.calls, 2);
    }),
  );

  it.effect("F16 a collector that restarts the feed while it is sampled leaves the new run's reading, Live", () =>
    Effect.gen(function* () {
      const a = logOf(1);
      const b = logOf(2);
      const feedRef: { current: DiagnosticsReadout | undefined } = { current: undefined };
      const restarting = makeCollectorDouble((call) => {
        if (call === 2) {
          feedRef.current?.restart();
          return a;
        }
        return call === 1 ? logOf(0) : b;
      });
      const feed = yield* diagnosticsFeedOf({ collector: restarting.collector });
      feedRef.current = feed;

      yield* step("2 seconds");

      const { status, reading } = feed.getSnapshot();
      assert.isTrue(DiagnosticsStatus.$is("Live")(status));
      assert.deepStrictEqual(reading.portCalls, b);
    }),
  );

  it.effect("F17 closing the feed's own scope records no Stopped, releases the layer, and samples nothing more", () =>
    Effect.gen(function* () {
      const { counts, layer } = counted();
      const { state, collector } = makeCollectorDouble();
      const scope = yield* Scope.make();
      const feed = yield* Scope.provide(diagnosticsFeedOf({ layer, collector }), scope);
      const seen = recording(feed);

      yield* Scope.close(scope, Exit.void);

      assert.deepStrictEqual(seen, []);
      assert.strictEqual(counts.releases, 1);
      yield* step("6 seconds");
      assert.strictEqual(state.calls, 1);
    }),
  );

  it.effect("F24 closing the scope over a layer whose release dies records no Stopped", () =>
    Effect.gen(function* () {
      const dying = Layer.effectDiscard(
        Effect.acquireRelease(Effect.void, () => Effect.die(new Error("release blew up"))),
      );
      const scope = yield* Scope.make();
      const feed = yield* Scope.provide(diagnosticsFeedOf({ layer: dying }), scope);
      const before = feed.getSnapshot();
      const seen = recording(feed);

      yield* Scope.close(scope, Exit.void);
      yield* settleTurns;

      assert.deepStrictEqual(seen, []);
      assert.strictEqual(feed.getSnapshot(), before);
    }),
  );

  it.effect("F25 a closed feed ignores restart() and configure(), which publish nothing", () =>
    Effect.gen(function* () {
      const { state, collector } = makeCollectorDouble();
      const scope = yield* Scope.make();
      const feed = yield* Scope.provide(diagnosticsFeedOf({ collector }), scope);
      const before = feed.getSnapshot();
      const seen = recording(feed);
      yield* Scope.close(scope, Exit.void);

      feed.restart();
      feed.configure({ collector: makeCollectorDouble().collector });
      feed.configure(undefined);
      feed.restart();
      yield* step("6 seconds");

      assert.deepStrictEqual(seen, []);
      assert.strictEqual(feed.getSnapshot(), before);
      assert.strictEqual(state.calls, 1);
    }),
  );

  it.effect("F26 configure(undefined) over a feed that is already off changes and notifies nothing", () =>
    Effect.gen(function* () {
      const never = yield* makeDiagnosticsFeed();
      const live = yield* diagnosticsFeedOf({});
      live.configure(undefined);
      for (const feed of [never, live]) {
        const seen = recording(feed);

        feed.configure(undefined);
        feed.configure(undefined);

        assert.deepStrictEqual(seen, []);
        assert.strictEqual(feed.getSnapshot(), diagnosticsOff);
      }
      live.configure({});
      assert.isTrue(DiagnosticsStatus.$is("Live")(live.getSnapshot().status));
    }),
  );

  it.effect("F27 restarting a feed that is still Starting publishes nothing, and the run's first sample is still Live", () =>
    Effect.gen(function* () {
      const { layer } = slowLayer();
      const feed = yield* diagnosticsFeedOf({ layer });
      const early = feed.getSnapshot();
      assert.isTrue(DiagnosticsStatus.$is("Starting")(early.status));
      const seen = recording(feed);

      feed.restart();
      feed.configure({ layer, intervalMillis: 5_000 });

      assert.deepStrictEqual(seen, []);
      assert.strictEqual(feed.getSnapshot(), early);
      yield* step("1 second");
      assert.deepStrictEqual(seen, ["Live"]);
    }),
  );

  it.effect("F18 a layer that fails to build reads wiring Failed in a Live feed, which samples again", () =>
    Effect.gen(function* () {
      const { state, collector } = makeCollectorDouble();
      const feed = yield* diagnosticsFeedOf({ layer: Layer.effectDiscard(Effect.fail("boom")), collector });

      const { status, reading } = feed.getSnapshot();
      assert.isTrue(DiagnosticsStatus.$is("Live")(status));
      assert.strictEqual(reading.wiring._tag, "Failed");

      yield* step("2 seconds");
      assert.strictEqual(state.calls, 2);
      assert.isTrue(DiagnosticsStatus.$is("Live")(feed.getSnapshot().status));
    }),
  );

  it.effect("F19 a sample equal to the last notifies nothing, and restart() over an unchanged world notifies twice", () =>
    Effect.gen(function* () {
      const feed = yield* diagnosticsFeedOf({});
      const seen = recording(feed);
      const first = feed.getSnapshot();

      yield* step("10 seconds");
      assert.deepStrictEqual(seen, []);
      assert.strictEqual(feed.getSnapshot(), first);

      feed.restart();

      assert.deepStrictEqual(seen, ["Starting", "Live"]);
      assert.strictEqual(feed.getSnapshot().reading, first.reading);
    }),
  );

  it.effect("F20 isUnsampled is true for Starting and an unsampled stop only, and the idle readouts are constants", () =>
    Effect.sync(() => {
      assert.isFalse(isUnsampled(DiagnosticsStatus.Off()));
      assert.isTrue(isUnsampled(DiagnosticsStatus.Starting()));
      assert.isFalse(isUnsampled(DiagnosticsStatus.Live()));
      assert.isTrue(isUnsampled(DiagnosticsStatus.Stopped({ reason: "x", sampled: false })));
      assert.isFalse(isUnsampled(DiagnosticsStatus.Stopped({ reason: "x", sampled: true })));

      const off = idleDiagnostics(undefined);
      assert.strictEqual(off.getSnapshot(), diagnosticsOff);
      const starting = idleDiagnostics({});
      assert.strictEqual(starting, idleDiagnostics({ intervalMillis: 5 }));
      assert.strictEqual(starting.getSnapshot(), diagnosticsStarting);
      for (const readout of [off, starting]) {
        let heard = 0;
        const unsubscribe = readout.subscribe(() => {
          heard += 1;
        });
        const before = readout.getSnapshot();
        readout.restart();
        unsubscribe();
        assert.strictEqual(readout.getSnapshot(), before);
        assert.strictEqual(heard, 0);
      }
    }),
  );

  it.effect("F21 a Live feed whose sample changed the reading notifies once, still Live", () =>
    Effect.gen(function* () {
      const answer = logOf(1);
      const { collector } = makeCollectorDouble((call) => (call === 1 ? logOf(0) : answer));
      const feed = yield* diagnosticsFeedOf({ collector });
      const seen = recording(feed);
      const before = feed.getSnapshot();

      yield* step("2 seconds");

      assert.deepStrictEqual(seen, ["Live"]);
      const after = feed.getSnapshot();
      assert.strictEqual(after.status, before.status);
      assert.deepStrictEqual(after.reading.portCalls, answer);
    }),
  );

  it.effect("F22 a handed collector is read into portCalls", () =>
    Effect.gen(function* () {
      const feed = yield* diagnosticsFeedOf({ collector: collectorOf() });
      assert.deepStrictEqual(feed.getSnapshot().reading.portCalls, { calls: [], dropped: 0, capacity: 10 });
    }),
  );

  it.effect("F23 a stop after Off and a new start is unsampled, whatever the run before had sampled", () =>
    Effect.gen(function* () {
      const feed = yield* diagnosticsFeedOf({});
      feed.configure(undefined);

      feed.configure({
        collector: makeCollectorDouble(() => {
          throw new Error("blew up again");
        }).collector,
      });

      const { status, reading } = feed.getSnapshot();
      if (!DiagnosticsStatus.$is("Stopped")(status)) return assert.fail("expected Stopped");
      assert.isFalse(status.sampled);
      assert.strictEqual(reading, noDiagnostics);
    }),
  );

  it.effect("F28 a subscriber that reconfigures the feed inside its Starting notification leaves the newest run sampling", () =>
    Effect.gen(function* () {
      const a = makeCollectorDouble(() => logOf(1));
      const b = makeCollectorDouble(logOf);
      const feed = yield* makeDiagnosticsFeed();
      let reentered = false;
      feed.subscribe(() => {
        if (reentered || !DiagnosticsStatus.$is("Starting")(feed.getSnapshot().status)) return;
        reentered = true;
        feed.configure({ collector: b.collector });
      });

      feed.configure({ collector: a.collector });
      yield* step("4 seconds");

      assert.strictEqual(a.state.calls, 0);
      assert.isAtLeast(b.state.calls, 2);
      assert.isTrue(DiagnosticsStatus.$is("Live")(feed.getSnapshot().status));
    }),
  );

  it.effect("F29 a collector that reconfigures the feed on its first sample leaves the newest run sampling", () =>
    Effect.gen(function* () {
      const b = makeCollectorDouble(logOf);
      const feed = yield* makeDiagnosticsFeed();
      const a = makeCollectorDouble((call) => {
        if (call === 1) feed.configure({ collector: b.collector });
        return logOf(1);
      });

      feed.configure({ collector: a.collector });
      yield* step("4 seconds");

      assert.strictEqual(a.state.calls, 1);
      assert.isAtLeast(b.state.calls, 2);
      assert.isTrue(DiagnosticsStatus.$is("Live")(feed.getSnapshot().status));
    }),
  );

  it.effect("F30 a listener that throws does not silence the next one, and configure rethrows what it threw", () =>
    Effect.gen(function* () {
      const feed = yield* diagnosticsFeedOf({});
      yield* settleTurns;
      const boom = new Error("boom");
      const seen: Array<string> = [];
      feed.subscribe(() => {
        throw boom;
      });
      feed.subscribe(() => {
        seen.push(feed.getSnapshot().status._tag);
      });

      const outcome = thrownBy(() => feed.configure(undefined));

      assert.deepStrictEqual(seen, ["Off"]);
      assert.isTrue(outcome.threw);
      assert.strictEqual(outcome.thrown, boom);
      assert.strictEqual(feed.getSnapshot().status._tag, "Off");
    }),
  );

  it.effect("F31 a listener that throws on the Starting a configure publishes leaves the feed Starting, and no new poll starts", () =>
    Effect.gen(function* () {
      const a = makeCollectorDouble();
      const b = makeCollectorDouble();
      const feed = yield* diagnosticsFeedOf({ collector: a.collector });
      yield* step("4 seconds");
      assert.isTrue(DiagnosticsStatus.$is("Live")(feed.getSnapshot().status));
      const boom = new Error("boom");
      let throws = 1;
      feed.subscribe(() => {
        if (throws === 0) return;
        throws -= 1;
        throw boom;
      });

      const outcome = thrownBy(() => feed.configure({ collector: b.collector }));
      yield* step("4 seconds");

      assert.isTrue(outcome.threw);
      assert.strictEqual(outcome.thrown, boom);
      assert.strictEqual(b.state.calls, 0);
      assert.strictEqual(feed.getSnapshot().status._tag, "Starting");
    }),
  );

  it.effect("F32 a listener that throws on the Live and the Stopped publishes: the poll ends on the first, and the Stopped is held although it threw", () =>
    Effect.gen(function* () {
      const a = makeCollectorDouble();
      const feed = yield* makeDiagnosticsFeed();
      const boom = new Error("boom");
      const heard: Array<string> = [];
      feed.subscribe(() => {
        const tag = feed.getSnapshot().status._tag;
        heard.push(tag);
        if (tag !== "Starting") throw boom;
      });

      feed.configure({ collector: a.collector });
      yield* step("4 seconds");

      assert.deepStrictEqual(heard, ["Starting", "Live", "Stopped"]);
      assert.strictEqual(a.state.calls, 1);
      const status = feed.getSnapshot().status;
      assert.strictEqual(status._tag, "Stopped");
      assert.isTrue(DiagnosticsStatus.$is("Stopped")(status) && status.sampled);
    }),
  );
});
