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
import { hasRole } from "@qadi/core";
import {
  DiagnosticsStatus,
  diagnosticsOff,
  diagnosticsStarting,
  idleDiagnostics,
  isUnsampled,
  makeDiagnosticsFeed,
  type DiagnosticsDockOptions,
  type DiagnosticsReadout,
} from "../../src/model/DiagnosticsFeed.ts";
import { noDiagnostics } from "../../src/model/DiagnosticsStore.ts";
import type { AskedQuestionLike } from "../../src/model/Gates.ts";
import type { PortCallCollector } from "../../src/model/PortCalls.ts";
import { settleTurns } from "../helpers.ts";

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

/** A question source that counts its calls and answers by call number. */
const source = (script: (call: number) => ReadonlyArray<AskedQuestionLike>) => {
  const state = { calls: 0 };
  const questions = () => {
    state.calls += 1;
    return script(state.calls);
  };
  return { state, questions };
};

const asking = (name: string): ReadonlyArray<AskedQuestionLike> => [{ policy: hasRole(name) }];

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
      const feed = yield* makeDiagnosticsFeed({});
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
      const feed = yield* makeDiagnosticsFeed({ layer });
      const early = feed.getSnapshot();
      assert.isTrue(DiagnosticsStatus.$is("Starting")(early.status));
      assert.strictEqual(early.reading, noDiagnostics);

      yield* step("1 second");

      const late = feed.getSnapshot();
      assert.isTrue(DiagnosticsStatus.$is("Live")(late.status));
      assert.strictEqual(late.reading.wiring._tag, "Read");
    }),
  );

  it.effect("F4 a source that throws on its first call is Stopped with nothing sampled, and is not called again", () =>
    Effect.gen(function* () {
      const { state, questions } = source(() => {
        throw new Error("first call blew up");
      });
      const feed = yield* makeDiagnosticsFeed({ questions });

      const { status, reading } = feed.getSnapshot();
      if (!DiagnosticsStatus.$is("Stopped")(status)) return assert.fail("expected Stopped");
      assert.isFalse(status.sampled);
      assert.include(status.reason, "first call blew up");
      assert.strictEqual(reading, noDiagnostics);

      yield* step("6 seconds");
      assert.strictEqual(state.calls, 1);
    }),
  );

  it.effect("F5 a source that throws on its second call is Stopped with the earlier reading kept, and is not called again", () =>
    Effect.gen(function* () {
      const { state, questions } = source((call) => {
        if (call === 2) throw new Error("second call blew up");
        return [];
      });
      const feed = yield* makeDiagnosticsFeed({ questions });
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

  it.effect("F6 a new source after a stop records Starting then Live, and its reads resume", () =>
    Effect.gen(function* () {
      const broken = source(() => {
        throw new Error("blew up");
      });
      const feed = yield* makeDiagnosticsFeed({ questions: broken.questions });
      assert.isTrue(DiagnosticsStatus.$is("Stopped")(feed.getSnapshot().status));
      const seen = recording(feed);
      const fixed = source(() => []);

      feed.configure({ questions: fixed.questions });
      assert.deepStrictEqual(seen, ["Starting", "Live"]);

      yield* step("2 seconds");
      assert.strictEqual(fixed.state.calls, 2);
    }),
  );

  it.effect("F7 restart() after a stop records Starting then Live, and its reads resume", () =>
    Effect.gen(function* () {
      const { state, questions } = source((call) => {
        if (call === 2) throw new Error("blew up once");
        return [];
      });
      const feed = yield* makeDiagnosticsFeed({ questions });
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
      const feed = yield* makeDiagnosticsFeed({ layer: first.layer });
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
      const feed = yield* makeDiagnosticsFeed({ layer: dying });
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
      const { state, questions } = source(() => []);
      const feed = yield* makeDiagnosticsFeed({ layer, questions });
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
      const feed = yield* makeDiagnosticsFeed({});
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
      const { questions } = source(() => []);
      const collector = collectorOf();
      const feed = yield* makeDiagnosticsFeed({ layer, collector, questions, intervalMillis: 5_000 });
      const seen = recording(feed);

      feed.configure({ layer, collector, questions, intervalMillis: 5_000 });
      yield* step("1 second");

      assert.deepStrictEqual(seen, []);
      assert.strictEqual(counts.builds, 1);
      assert.strictEqual(counts.releases, 0);
    }),
  );

  it.effect("F13 a changed layer, collector, questions or intervalMillis each restarts exactly once", () =>
    Effect.gen(function* () {
      const layer = counted().layer;
      const collector = collectorOf();
      const questions = source(() => []).questions;
      const base: DiagnosticsDockOptions = { layer, collector, questions, intervalMillis: 5_000 };
      const changes: ReadonlyArray<readonly [string, DiagnosticsDockOptions]> = [
        ["layer", { ...base, layer: counted().layer }],
        ["collector", { ...base, collector: collectorOf() }],
        ["questions", { ...base, questions: source(() => []).questions }],
        ["intervalMillis", { ...base, intervalMillis: 5_001 }],
      ];
      for (const [field, changed] of changes) {
        const feed = yield* makeDiagnosticsFeed(base);
        const seen = recording(feed);

        feed.configure(changed);

        assert.deepStrictEqual(seen, ["Starting", "Live"], field);
      }
    }),
  );

  it.effect("F14 the default cadence takes one sample at 1999 ms and two at 2000 ms", () =>
    Effect.gen(function* () {
      const { state, questions } = source(() => []);
      yield* makeDiagnosticsFeed({ questions });
      assert.strictEqual(state.calls, 1);

      yield* step("1999 millis");
      assert.strictEqual(state.calls, 1);

      yield* step("1 millis");
      assert.strictEqual(state.calls, 2);
    }),
  );

  it.effect("F15 an interval of 500 takes one sample at 499 ms and two at 500 ms", () =>
    Effect.gen(function* () {
      const { state, questions } = source(() => []);
      yield* makeDiagnosticsFeed({ questions, intervalMillis: 500 });
      assert.strictEqual(state.calls, 1);

      yield* step("499 millis");
      assert.strictEqual(state.calls, 1);

      yield* step("1 millis");
      assert.strictEqual(state.calls, 2);
    }),
  );

  it.effect("F16 a source that restarts the feed while it is sampled leaves the new run's reading, Live", () =>
    Effect.gen(function* () {
      const a = asking("a");
      const b = asking("b");
      const feedRef: { current: DiagnosticsReadout | undefined } = { current: undefined };
      const restarting = source((call) => {
        if (call === 2) {
          feedRef.current?.restart();
          return a;
        }
        return call === 1 ? [] : b;
      });
      const feed = yield* makeDiagnosticsFeed({ questions: restarting.questions });
      feedRef.current = feed;

      yield* step("2 seconds");

      const { status, reading } = feed.getSnapshot();
      assert.isTrue(DiagnosticsStatus.$is("Live")(status));
      assert.deepStrictEqual(reading.questions, b);
    }),
  );

  it.effect("F17 closing the feed's own scope records no Stopped, releases the layer, and samples nothing more", () =>
    Effect.gen(function* () {
      const { counts, layer } = counted();
      const { state, questions } = source(() => []);
      const scope = yield* Scope.make();
      const feed = yield* Scope.provide(makeDiagnosticsFeed({ layer, questions }), scope);
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
      const feed = yield* Scope.provide(makeDiagnosticsFeed({ layer: dying }), scope);
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
      const { state, questions } = source(() => []);
      const scope = yield* Scope.make();
      const feed = yield* Scope.provide(makeDiagnosticsFeed({ questions }), scope);
      const before = feed.getSnapshot();
      const seen = recording(feed);
      yield* Scope.close(scope, Exit.void);

      feed.restart();
      feed.configure({ questions: source(() => []).questions });
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
      const live = yield* makeDiagnosticsFeed({});
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

  it.effect("F18 a layer that fails to build reads wiring Failed in a Live feed, which samples again", () =>
    Effect.gen(function* () {
      const { state, questions } = source(() => []);
      const feed = yield* makeDiagnosticsFeed({ layer: Layer.effectDiscard(Effect.fail("boom")), questions });

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
      const feed = yield* makeDiagnosticsFeed({});
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
      const answer = asking("a");
      const { questions } = source((call) => (call === 1 ? [] : answer));
      const feed = yield* makeDiagnosticsFeed({ questions });
      const seen = recording(feed);
      const before = feed.getSnapshot();

      yield* step("2 seconds");

      assert.deepStrictEqual(seen, ["Live"]);
      const after = feed.getSnapshot();
      assert.strictEqual(after.status, before.status);
      assert.deepStrictEqual(after.reading.questions, answer);
    }),
  );

  it.effect("F22 a handed collector is read into portCalls", () =>
    Effect.gen(function* () {
      const feed = yield* makeDiagnosticsFeed({ collector: collectorOf() });
      assert.deepStrictEqual(feed.getSnapshot().reading.portCalls, { calls: [], dropped: 0, capacity: 10 });
    }),
  );

  it.effect("F23 a stop after Off and a new start is unsampled, whatever the run before had sampled", () =>
    Effect.gen(function* () {
      const feed = yield* makeDiagnosticsFeed({});
      feed.configure(undefined);

      feed.configure({
        questions: () => {
          throw new Error("blew up again");
        },
      });

      const { status, reading } = feed.getSnapshot();
      if (!DiagnosticsStatus.$is("Stopped")(status)) return assert.fail("expected Stopped");
      assert.isFalse(status.sampled);
      assert.strictEqual(reading, noDiagnostics);
    }),
  );
});
