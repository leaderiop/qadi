/**
 * Pins the full publish sequence of the diagnostics feed, transition by transition, and
 * which reading fields keep their references across each publish.
 *
 * Each row attaches a recorder to a feed built in the test's scope, drives one transition
 * under `TestClock`, and compares the whole tape a listener heard: every publish's status
 * tag, whether a stop had sampled, whether the reading is the previous publish's object,
 * and which of the four reading fields changed reference. The tape records identity only
 * (`same` or `new`), never a value, so it reads the same whatever fields the reading
 * carries beyond those four. The dock's own row pins what one `configure` that hands a
 * reading with questions publishes through the shown reading and the questions store.
 *
 * The rows `DiagnosticsFeed.test.ts` already pins are left there: F1 (a bare feed is `Off`),
 * F2, F19 (a sample equal to the last notifies nothing; `restart()` over an unchanged world
 * notifies twice), F31, F33 (a superseded run's sample is dropped) and the unrenderable
 * collector. What the dock model recomputes when an input moves is pinned in
 * `DockModel.characterisation.test.ts`.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as TestClock from "effect/testing/TestClock";
import {
  makeDiagnosticsFeed,
  type DiagnosticsReadout,
  type DiagnosticsSnapshot,
  type PortCallCollector,
  type PortCallLog,
} from "../../src/index.ts";
import { diagnosticsOff } from "../../src/model/DiagnosticsFeed.ts";
import { makeDockModel } from "../../src/model/DockModel.ts";
import { makeCollectorDouble } from "../collectorDouble.ts";
import { askingIds } from "../dockModelFixtures.ts";
import { heardOn, readPolicy, settleTurns } from "../helpers.ts";

const FIELDS = ["wiring", "activity", "hydration", "portCalls"] as const;

interface Publish {
  readonly status: string;
  readonly sampled?: boolean;
  readonly reading: "same" | "new";
  readonly moved: ReadonlyArray<(typeof FIELDS)[number]>;
}

/** Every notification of `feed`, as the status it published and what moved in its reading. */
const tape = (feed: DiagnosticsReadout) => {
  const seen: Array<Publish> = [];
  let last: DiagnosticsSnapshot = feed.getSnapshot();
  feed.subscribe(() => {
    const now = feed.getSnapshot();
    seen.push({
      status: now.status._tag,
      ...(now.status._tag === "Stopped" ? { sampled: now.status.sampled } : {}),
      reading: now.reading === last.reading ? "same" : "new",
      moved: FIELDS.filter((field) => now.reading[field] !== last.reading[field]),
    });
    last = now;
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

/** A log that has dropped `n` calls, so two of them differ when `n` does. */
const logOf = (n: number): PortCallLog => ({ calls: [], dropped: n, capacity: 10 });

describe("the diagnostics feed's publishes", () => {
  it.effect("FC1 a bare feed is Off by identity, and restart() publishes nothing", () =>
    Effect.gen(function* () {
      const feed = yield* makeDiagnosticsFeed();
      const seen = tape(feed);

      feed.restart();
      yield* step("4 seconds");

      assert.deepStrictEqual(seen, []);
      assert.strictEqual(feed.getSnapshot(), diagnosticsOff);
    }),
  );

  it.effect("FC2 configure with empty options publishes Starting over the empty reading, then Live with the first sample folded in", () =>
    Effect.gen(function* () {
      const feed = yield* makeDiagnosticsFeed();
      const seen = tape(feed);
      let starting: DiagnosticsSnapshot | undefined;
      feed.subscribe(() => {
        const now = feed.getSnapshot();
        if (starting === undefined && now.status._tag === "Starting") starting = now;
      });

      feed.configure({ collector: makeCollectorDouble().collector });
      yield* settleTurns;

      assert.deepStrictEqual(seen, [
        { status: "Starting", reading: "same", moved: [] },
        { status: "Live", reading: "new", moved: ["hydration", "portCalls"] },
      ]);
      assert.strictEqual(starting?.reading, diagnosticsOff.reading);
    }),
  );

  it.effect("FC3 identical samples after the first Live publish nothing", () =>
    Effect.gen(function* () {
      const feed = yield* makeDiagnosticsFeed();
      const seen = tape(feed);
      const probe = makeCollectorDouble(() => logOf(0));

      feed.configure({ collector: probe.collector });
      yield* settleTurns;
      const first = seen.length;
      yield* step("2 seconds");
      yield* step("2 seconds");
      yield* step("2 seconds");

      assert.strictEqual(probe.state.calls, 4);
      assert.deepStrictEqual(seen.slice(first), []);
      assert.deepStrictEqual(
        seen.map((one) => one.status),
        ["Starting", "Live"],
      );
    }),
  );

  it.effect("FC4 one field moving publishes once, and the other fields keep their references", () =>
    Effect.gen(function* () {
      const feed = yield* makeDiagnosticsFeed();
      const seen = tape(feed);
      const probe = makeCollectorDouble((call) => logOf(call === 1 ? 0 : 1));

      feed.configure({ collector: probe.collector });
      yield* settleTurns;
      const first = seen.length;
      yield* step("2 seconds");
      yield* step("2 seconds");

      assert.strictEqual(probe.state.calls, 3);
      assert.deepStrictEqual(seen.slice(first), [{ status: "Live", reading: "new", moved: ["portCalls"] }]);
    }),
  );

  it.effect("FC5 a stop after a sample is sampled and keeps the reading object", () =>
    Effect.gen(function* () {
      const feed = yield* makeDiagnosticsFeed();
      const seen = tape(feed);
      const probe = makeCollectorDouble((call) => {
        if (call === 2) throw new Error("boom");
        return logOf(0);
      });

      feed.configure({ collector: probe.collector });
      yield* settleTurns;
      const first = seen.length;
      yield* step("2 seconds");

      assert.deepStrictEqual(seen.slice(first), [{ status: "Stopped", sampled: true, reading: "same", moved: [] }]);
    }),
  );

  it.effect("FC6 a stop before any sample is unsampled and shows the empty reading itself", () =>
    Effect.gen(function* () {
      const feed = yield* makeDiagnosticsFeed();
      const seen = tape(feed);
      const probe = makeCollectorDouble(() => {
        throw new Error("boom");
      });

      feed.configure({ collector: probe.collector });
      yield* settleTurns;

      assert.deepStrictEqual(seen, [
        { status: "Starting", reading: "same", moved: [] },
        { status: "Stopped", sampled: false, reading: "same", moved: [] },
      ]);
      assert.strictEqual(feed.getSnapshot().reading, diagnosticsOff.reading);
    }),
  );

  it.effect("FC7 restart over an unchanged world publishes Starting then Live over the same reading object", () =>
    Effect.gen(function* () {
      const feed = yield* makeDiagnosticsFeed();
      const seen = tape(feed);
      const probe = makeCollectorDouble(() => logOf(0));

      feed.configure({ collector: probe.collector });
      yield* settleTurns;
      const first = seen.length;
      const reading = feed.getSnapshot().reading;
      feed.restart();
      yield* settleTurns;

      assert.deepStrictEqual(seen.slice(first), [
        { status: "Starting", reading: "same", moved: [] },
        { status: "Live", reading: "same", moved: [] },
      ]);
      assert.strictEqual(feed.getSnapshot().reading, reading);
    }),
  );

  it.effect("FC8 configure undefined publishes Off by identity, and a stop before the next run's first sample is unsampled", () =>
    Effect.gen(function* () {
      const feed = yield* makeDiagnosticsFeed();
      const seen = tape(feed);

      feed.configure({ collector: makeCollectorDouble(() => logOf(0)).collector });
      yield* settleTurns;
      const first = seen.length;
      feed.configure(undefined);
      const off = feed.getSnapshot();
      feed.configure({
        collector: makeCollectorDouble(() => {
          throw new Error("boom");
        }).collector,
      });
      yield* settleTurns;

      assert.strictEqual(off, diagnosticsOff);
      assert.deepStrictEqual(seen.slice(first), [
        { status: "Off", reading: "new", moved: ["hydration", "portCalls"] },
        { status: "Starting", reading: "same", moved: [] },
        { status: "Stopped", sampled: false, reading: "same", moved: [] },
      ]);
    }),
  );

  it.effect("FC9 a sample the superseded run takes is dropped, so the feed stays Starting until the newest run samples", () =>
    Effect.gen(function* () {
      const slow: PortCallCollector = {
        layer: Layer.empty,
        snapshot: Effect.sleep("1 second").pipe(Effect.as(logOf(2))),
      };
      const feed = yield* makeDiagnosticsFeed();
      const seen = tape(feed);
      const superseded = makeCollectorDouble((call) => {
        if (call === 1) feed.configure({ collector: slow });
        return logOf(1);
      });

      feed.configure({ collector: superseded.collector });
      yield* settleTurns;

      assert.strictEqual(superseded.state.calls, 1);
      assert.deepStrictEqual(seen, [{ status: "Starting", reading: "same", moved: [] }]);

      yield* step("1 second");

      assert.deepStrictEqual(seen, [
        { status: "Starting", reading: "same", moved: [] },
        { status: "Live", reading: "new", moved: ["hydration", "portCalls"] },
      ]);
    }),
  );

  it.effect("FC10 a start after Off folds into the empty reading, not the reading shown before Off", () =>
    Effect.gen(function* () {
      const feed = yield* makeDiagnosticsFeed();
      const seen = tape(feed);

      feed.configure({ collector: makeCollectorDouble(() => logOf(0)).collector });
      yield* settleTurns;
      const before = feed.getSnapshot().reading;
      feed.configure(undefined);
      const first = seen.length;
      feed.configure({ collector: makeCollectorDouble(() => logOf(0)).collector });
      yield* settleTurns;

      assert.deepStrictEqual(seen.slice(first), [
        { status: "Starting", reading: "same", moved: [] },
        { status: "Live", reading: "new", moved: ["hydration", "portCalls"] },
      ]);
      assert.notStrictEqual(feed.getSnapshot().reading, before);
    }),
  );
});

describe("the dock's supplied questions", () => {
  it.effect("FC11 one configure handing a reading with questions publishes the shown reading and the questions store once each, and lists the questions", () =>
    Effect.gen(function* () {
      const model = yield* makeDockModel();
      const shown = heardOn(model.diagnostics);
      const { questions } = model;
      const listed = heardOn(questions);

      model.configure({ reading: { questions: [{ policy: readPolicy }] } });
      yield* settleTurns;

      assert.strictEqual(shown.calls, 1);
      assert.strictEqual(listed.calls, 1);
      assert.strictEqual(questions.getSnapshot().questions._tag, "Rows");
      assert.strictEqual(askingIds(questions.getSnapshot()).length, 1);
    }),
  );
});
