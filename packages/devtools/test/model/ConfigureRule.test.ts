/**
 * Pins the one rule every feed and the dock model apply to their inputs: a configure in which no field moved changes nothing.
 *
 * A field omitted and one holding `undefined` are one input, so a configure that hands either
 * publishes nothing, restarts nothing and reads no host code. A field added to an input type must
 * be compared, and each moved-alone table below is keyed by a complete record of that type, so a
 * new field fails to compile until it has a row. The cells that build with inputs exist only while
 * the constructors take them; the rest hold for the bare build a host's hook makes.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Stream from "effect/Stream";
import * as TestClock from "effect/testing/TestClock";
import type { StoredRecord } from "@qadi/core";
import { PortReply, attributeResolverPort, hasPermission, permission, portsLayer, role, scriptedPort } from "@qadi/core";
import { DiagnosticsStatus } from "../../src/index.ts";
import { diagnosticsOff, makeDiagnosticsFeed, type DiagnosticsFeed } from "../../src/model/DiagnosticsFeed.ts";
import type { DiagnosticsOptions } from "../../src/model/DiagnosticsStore.ts";
import { makeDockModel, type DockModel, type DockModelInputs } from "../../src/model/DockModel.ts";
import {
  AskedRead,
  RegistryRead,
  makeGatesFeed,
  type GatesFeed,
  type GatesFeedInputs,
} from "../../src/model/GatesFeed.ts";
import type { AskedQuestionLike } from "../../src/model/Gates.ts";
import type { PortCallCollector, PortCallLog } from "../../src/model/PortCalls.ts";
import type { Source } from "../../src/model/Source.ts";
import { DEFAULT_TIMELINE_CAPACITY } from "../../src/model/Timeline.ts";
import {
  TimelineStatus,
  makeTimelineFeed,
  type TimelineFeed,
  type TimelineFeedInputs,
} from "../../src/model/TimelineFeed.ts";
import { diagnosticsFeedOf, gatesFeedOf, timelineFeedOf } from "../builtFeeds.ts";
import { dockModelOf } from "../builtFeeds.ts";
import { activityOf, askingIds } from "../dockModelFixtures.ts";
import { makeGateRegistryDouble } from "../gateRegistryDouble.ts";
import { decisionRecord, guard, heardOn, readPolicy, settleTurns } from "../helpers.ts";

/**
 * One input moved alone, as a pair of inputs the feed is built on and then moved between.
 *
 * `pair` builds its fixtures fresh on each call, so no two cells share a count. `read` turns a
 * feed into a plain value two feeds can be compared by, and `reacted` says whether the move
 * between two such values is the feed reacting to it.
 */
interface Mover<I, F, O> {
  readonly pair: () => { readonly held: I; readonly moved: I; readonly read: (feed: F) => O };
  readonly reacted: (before: O, after: O) => boolean;
}

const record = (evaluationId: string, at: number): StoredRecord => decisionRecord({ evaluationId, at });

/** A source that counts its reads and hands over `backlog`, then nothing live. */
const counted = (backlog: ReadonlyArray<StoredRecord>) => {
  const tally = { reads: 0 };
  const source: Source = {
    read: Effect.sync(() => {
      tally.reads += 1;
      return { backlog, live: Stream.never };
    }),
  };
  return { source, tally };
};

const idsOf = (feed: TimelineFeed): ReadonlyArray<string> =>
  feed.timeline.getSnapshot().entries.map((entry) => entry.evaluationId);

describe("the timeline feed", () => {
  it.effect("CR1 a fresh literal holding the same source and capacity publishes nothing and starts no read", () =>
    Effect.gen(function* () {
      const a = counted([record("a", 100)]);
      const feed = yield* timelineFeedOf({ source: a.source, capacity: 50 });
      yield* settleTurns;
      const timelineHeard = heardOn(feed.timeline);
      const statusHeard = heardOn(feed.status);
      const snapshot = feed.timeline.getSnapshot();
      const status = feed.status.getSnapshot();
      const reads = a.tally.reads;

      feed.configure({ source: a.source, capacity: 50 });
      yield* settleTurns;

      assert.strictEqual(timelineHeard.calls, 0);
      assert.strictEqual(statusHeard.calls, 0);
      assert.strictEqual(feed.timeline.getSnapshot(), snapshot);
      assert.strictEqual(feed.status.getSnapshot(), status);
      assert.strictEqual(a.tally.reads, reads);
    }),
  );

  it.effect("CR2 an omitted capacity, an undefined one and the default are one bound, and an omitted source and an undefined one are one input", () =>
    Effect.gen(function* () {
      const a = counted([record("a", 100)]);
      const held = yield* timelineFeedOf({ source: a.source });
      yield* settleTurns;
      const heldHeard = heardOn(held.timeline);
      const heldSnapshot = held.timeline.getSnapshot();
      const reads = a.tally.reads;

      held.configure({ source: a.source, capacity: undefined });
      held.configure({ source: a.source, capacity: DEFAULT_TIMELINE_CAPACITY });
      held.configure({ source: a.source });
      yield* settleTurns;

      assert.strictEqual(held.timeline.getSnapshot(), heldSnapshot);
      assert.strictEqual(heldHeard.calls, 0);
      assert.strictEqual(a.tally.reads, reads);

      const bare = yield* timelineFeedOf({});
      yield* settleTurns;
      const bareHeard = heardOn(bare.timeline);
      const statusHeard = heardOn(bare.status);
      const bareSnapshot = bare.timeline.getSnapshot();

      bare.configure({ source: undefined, capacity: undefined });
      yield* settleTurns;

      assert.strictEqual(bare.timeline.getSnapshot(), bareSnapshot);
      assert.strictEqual(bareHeard.calls, 0);
      assert.strictEqual(statusHeard.calls, 0);
    }),
  );

  it.effect("CR3 a bare build reads what an empty input read, and configuring an empty input right after it publishes nothing", () =>
    Effect.gen(function* () {
      const bare = yield* makeTimelineFeed();
      const empty = yield* makeTimelineFeed({});
      const built = yield* timelineFeedOf({});
      yield* settleTurns;

      for (const feed of [bare, empty, built]) {
        assert.strictEqual(feed.timeline.getSnapshot().capacity, DEFAULT_TIMELINE_CAPACITY);
        assert.deepStrictEqual(idsOf(feed), []);
        assert.deepStrictEqual(feed.status.getSnapshot(), TimelineStatus.Reading());
      }

      const timelineHeard = heardOn(bare.timeline);
      const statusHeard = heardOn(bare.status);
      const snapshot = bare.timeline.getSnapshot();
      const status = bare.status.getSnapshot();

      bare.configure({});
      yield* settleTurns;

      assert.strictEqual(timelineHeard.calls, 0);
      assert.strictEqual(statusHeard.calls, 0);
      assert.strictEqual(bare.timeline.getSnapshot(), snapshot);
      assert.strictEqual(bare.status.getSnapshot(), status);
    }),
  );

  interface TimelineObserved {
    readonly capacity: number;
    readonly ids: ReadonlyArray<string>;
    readonly status: string;
    readonly reads: ReadonlyArray<number>;
  }
  type TimelineMover = Mover<TimelineFeedInputs, TimelineFeed, TimelineObserved>;

  const timelineMovers: Record<keyof Required<TimelineFeedInputs>, TimelineMover> = {
    capacity: {
      pair: () => {
        const a = counted([record("a", 100), record("b", 200), record("c", 300)]);
        return {
          held: { source: a.source, capacity: 5 },
          moved: { source: a.source, capacity: 2 },
          read: (feed) => ({
            capacity: feed.timeline.getSnapshot().capacity,
            ids: idsOf(feed),
            status: feed.status.getSnapshot()._tag,
            reads: [a.tally.reads],
          }),
        };
      },
      reacted: (before, after) => after.capacity === 2 && after.reads[0] === (before.reads[0] ?? 0) + 1,
    },
    source: {
      pair: () => {
        const a = counted([record("a", 100)]);
        const b = counted([record("b", 200)]);
        return {
          held: { source: a.source, capacity: 5 },
          moved: { source: b.source, capacity: 5 },
          read: (feed) => ({
            capacity: feed.timeline.getSnapshot().capacity,
            ids: idsOf(feed),
            status: feed.status.getSnapshot()._tag,
            reads: [a.tally.reads, b.tally.reads],
          }),
        };
      },
      reacted: (before, after) =>
        before.reads[1] === 0 && after.reads[1] === 1 && after.ids.includes("b") && !before.ids.includes("b"),
    },
  };

  it.effect("CR4 each input moved alone makes the feed react", () =>
    Effect.gen(function* () {
      for (const [field, row] of Object.entries(timelineMovers)) {
        const { held, moved, read } = row.pair();
        const feed = yield* timelineFeedOf(held);
        yield* settleTurns;
        const before = read(feed);

        feed.configure(moved);
        yield* settleTurns;

        assert.isTrue(row.reacted(before, read(feed)), field);
      }
    }),
  );

  it.effect("CR5 each input given at build and given through configure reaches the same state, while the constructor takes inputs", () =>
    Effect.gen(function* () {
      for (const [field, row] of Object.entries(timelineMovers)) {
        const built = row.pair();
        const configured = row.pair();
        const withInputs = yield* makeTimelineFeed(built.moved);
        const withConfigure = yield* timelineFeedOf(configured.moved);
        yield* settleTurns;

        assert.deepStrictEqual(configured.read(withConfigure), built.read(withInputs), field);
      }
    }),
  );
});

const emptyLog: PortCallLog = { calls: [], dropped: 0, capacity: 10 };

/** The counts a diagnostics probe keeps, and layers and collectors that add to them. */
const diagnosticsProbe = () => {
  const counts = { samples: 0, builds: 0, releases: 0 };
  const layer = () =>
    Layer.effectDiscard(
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
  const collector = (): PortCallCollector => ({
    layer: Layer.empty,
    snapshot: Effect.sync(() => {
      counts.samples += 1;
      return emptyLog;
    }),
  });
  return { counts, layer, collector };
};

/** The status tag of every notification, in order. */
const recording = (feed: DiagnosticsFeed) => {
  const seen: Array<string> = [];
  feed.subscribe(() => {
    seen.push(feed.getSnapshot().status._tag);
  });
  return seen;
};

/** Settles every fiber, then steps the clock, then settles again. */
const step = (duration: Parameters<typeof TestClock.adjust>[0]) =>
  Effect.gen(function* () {
    yield* settleTurns;
    yield* TestClock.adjust(duration);
    yield* settleTurns;
  });

describe("the diagnostics feed", () => {
  it.effect("CR6 a fresh literal holding the same layer, collector and interval restarts nothing and publishes nothing", () =>
    Effect.gen(function* () {
      const probe = diagnosticsProbe();
      const layer = probe.layer();
      const collector = probe.collector();
      const feed = yield* diagnosticsFeedOf({ layer, collector, intervalMillis: 5_000 });
      yield* settleTurns;
      const seen = recording(feed);
      const held = { ...probe.counts };
      const snapshot = feed.getSnapshot();
      assert.isTrue(DiagnosticsStatus.$is("Live")(snapshot.status));

      feed.configure({ layer, collector, intervalMillis: 5_000 });
      yield* step("1 second");

      assert.deepStrictEqual(seen, []);
      assert.deepStrictEqual({ ...probe.counts }, held);
      assert.strictEqual(feed.getSnapshot(), snapshot);
    }),
  );

  it.effect("CR7 on a bare feed undefined publishes nothing, an empty object turns it on, a fresh empty object publishes nothing, and undefined turns it Off once", () =>
    Effect.gen(function* () {
      const feed = yield* makeDiagnosticsFeed();
      const seen = recording(feed);

      feed.configure(undefined);
      assert.deepStrictEqual(seen, []);
      assert.strictEqual(feed.getSnapshot(), diagnosticsOff);

      feed.configure({});
      assert.deepStrictEqual(seen, ["Starting", "Live"]);

      feed.configure({});
      yield* settleTurns;
      assert.deepStrictEqual(seen, ["Starting", "Live"]);

      feed.configure(undefined);
      assert.deepStrictEqual(seen, ["Starting", "Live", "Off"]);
      assert.strictEqual(feed.getSnapshot(), diagnosticsOff);

      feed.configure(undefined);
      yield* settleTurns;
      assert.deepStrictEqual(seen, ["Starting", "Live", "Off"]);
    }),
  );

  it.effect("CR8 a bare build reads Off by identity, as a build handed undefined does, and configuring undefined right after it publishes nothing", () =>
    Effect.gen(function* () {
      const bare = yield* makeDiagnosticsFeed();
      const handed = yield* makeDiagnosticsFeed(undefined);
      const built = yield* diagnosticsFeedOf(undefined);

      for (const feed of [bare, handed, built]) assert.strictEqual(feed.getSnapshot(), diagnosticsOff);

      const seen = recording(bare);
      bare.configure(undefined);
      yield* settleTurns;

      assert.deepStrictEqual(seen, []);
      assert.strictEqual(bare.getSnapshot(), diagnosticsOff);
    }),
  );

  interface DiagnosticsObserved {
    readonly status: string;
    readonly samples: number;
    readonly builds: number;
    readonly releases: number;
  }
  type DiagnosticsMover = Mover<DiagnosticsOptions, DiagnosticsFeed, DiagnosticsObserved>;

  /** One move of any field restarts the poll: one more sample, and the layer released and built again. */
  const restarted = (before: DiagnosticsObserved, after: DiagnosticsObserved): boolean =>
    after.samples === before.samples + 1 &&
    after.builds === before.builds + 1 &&
    after.releases === before.releases + 1;

  const diagnosticsPair = (move: (probe: ReturnType<typeof diagnosticsProbe>) => DiagnosticsOptions) => () => {
    const probe = diagnosticsProbe();
    const held: DiagnosticsOptions = {
      layer: probe.layer(),
      collector: probe.collector(),
      intervalMillis: 5_000,
    };
    return {
      held,
      moved: { ...held, ...move(probe) },
      read: (feed: DiagnosticsFeed): DiagnosticsObserved => ({
        status: feed.getSnapshot().status._tag,
        ...probe.counts,
      }),
    };
  };

  const diagnosticsMovers: Record<keyof Required<DiagnosticsOptions>, DiagnosticsMover> = {
    layer: { pair: diagnosticsPair((probe) => ({ layer: probe.layer() })), reacted: restarted },
    collector: { pair: diagnosticsPair((probe) => ({ collector: probe.collector() })), reacted: restarted },
    intervalMillis: { pair: diagnosticsPair(() => ({ intervalMillis: 5_001 })), reacted: restarted },
  };

  it.effect("CR9 each input moved alone restarts the poll once", () =>
    Effect.gen(function* () {
      for (const [field, row] of Object.entries(diagnosticsMovers)) {
        const { held, moved, read } = row.pair();
        const feed = yield* diagnosticsFeedOf(held);
        yield* settleTurns;
        const before = read(feed);

        feed.configure(moved);
        yield* settleTurns;

        assert.isTrue(row.reacted(before, read(feed)), field);
      }
    }),
  );

  it.effect("CR10 each input given at build and given through configure reaches the same state, while the constructor takes inputs", () =>
    Effect.gen(function* () {
      for (const [field, row] of Object.entries(diagnosticsMovers)) {
        const built = row.pair();
        const configured = row.pair();
        const withInputs = yield* makeDiagnosticsFeed(built.moved);
        const withConfigure = yield* diagnosticsFeedOf(configured.moved);
        yield* settleTurns;

        assert.deepStrictEqual(configured.read(withConfigure), built.read(withInputs), field);
      }
    }),
  );

  it.effect("CR23 an omitted option and one holding undefined are one option: nothing restarts and nothing is published", () =>
    Effect.gen(function* () {
      const probe = diagnosticsProbe();
      const layer = probe.layer();
      const feed = yield* diagnosticsFeedOf({ layer });
      yield* settleTurns;
      const seen = recording(feed);
      const held = { ...probe.counts };
      const snapshot = feed.getSnapshot();
      assert.isTrue(DiagnosticsStatus.$is("Live")(snapshot.status));

      feed.configure({ layer, collector: undefined, intervalMillis: undefined });
      yield* step("1 second");

      assert.deepStrictEqual(seen, []);
      assert.deepStrictEqual({ ...probe.counts }, held);
      assert.strictEqual(feed.getSnapshot(), snapshot);

      const empty = yield* diagnosticsFeedOf({});
      yield* settleTurns;
      const emptySeen = recording(empty);
      const emptySnapshot = empty.getSnapshot();

      empty.configure({ layer: undefined });
      yield* settleTurns;

      assert.deepStrictEqual(emptySeen, []);
      assert.strictEqual(empty.getSnapshot(), emptySnapshot);
    }),
  );
});

const noQuestions = (): ReadonlyArray<AskedQuestionLike> => [];

/** A questions thunk that adds one to `calls` each time it is read. */
const counting = (calls: { count: number }) => (): ReadonlyArray<AskedQuestionLike> => {
  calls.count += 1;
  return noQuestions();
};

/** Two registries and a thunk factory whose reads add to one count. */
const gatesProbe = () => {
  const calls = { count: 0 };
  return {
    first: makeGateRegistryDouble([guard("a", readPolicy)]),
    second: makeGateRegistryDouble([guard("b", readPolicy)]),
    calls,
    questions: () => counting(calls),
  };
};
type GatesProbe = ReturnType<typeof gatesProbe>;

describe("the gates feed", () => {
  it.effect("CR11 a fresh literal holding the same registry, thunk and interval reads the registry no more, calls the thunk no more and publishes nothing", () =>
    Effect.gen(function* () {
      const double = makeGateRegistryDouble([guard("a", readPolicy)]);
      const calls = { count: 0 };
      const questions = counting(calls);
      const feed = yield* gatesFeedOf({ gates: double.registry, questions, intervalMillis: 5_000 });
      yield* settleTurns;
      const heard = heardOn(feed);
      const snapshot = feed.getSnapshot();
      const reads = double.reads();
      const asked = calls.count;

      feed.configure({ gates: double.registry, questions, intervalMillis: 5_000 });
      yield* settleTurns;

      assert.strictEqual(double.reads(), reads);
      assert.strictEqual(calls.count, asked);
      assert.strictEqual(heard.calls, 0);
      assert.strictEqual(feed.getSnapshot(), snapshot);
      assert.strictEqual(double.subscriptions(), 1);
    }),
  );

  it.effect("CR12 an omitted questions thunk and interval and ones holding undefined are one input: nothing is read and nothing is published", () =>
    Effect.gen(function* () {
      const double = makeGateRegistryDouble([guard("a", readPolicy)]);
      const feed = yield* gatesFeedOf({ gates: double.registry });
      yield* settleTurns;
      const heard = heardOn(feed);
      const snapshot = feed.getSnapshot();
      const reads = double.reads();

      feed.configure({ gates: double.registry, questions: undefined, intervalMillis: undefined });
      yield* settleTurns;

      assert.strictEqual(double.reads(), reads);
      assert.strictEqual(heard.calls, 0);
      assert.strictEqual(feed.getSnapshot(), snapshot);
      assert.strictEqual(double.subscriptions(), 1);
    }),
  );

  it.effect("CR13 a bare build reads unwatched and unhanded, as an empty input does, and nothing runs until it is handed something", () =>
    Effect.gen(function* () {
      const bare = yield* makeGatesFeed();
      const empty = yield* makeGatesFeed({});
      const built = yield* gatesFeedOf({});
      yield* settleTurns;

      for (const feed of [bare, empty, built]) {
        const { registry, asked } = feed.getSnapshot();
        assert.isTrue(RegistryRead.$is("Unwatched")(registry));
        assert.isTrue(AskedRead.$is("Unhanded")(asked));
      }
      assert.deepStrictEqual(bare.getSnapshot(), built.getSnapshot());

      const heard = heardOn(bare);
      const snapshot = bare.getSnapshot();

      bare.configure({});
      yield* step("10 seconds");

      assert.strictEqual(heard.calls, 0);
      assert.strictEqual(bare.getSnapshot(), snapshot);
    }),
  );

  interface GatesObserved {
    readonly subscriptions: number;
    readonly reads: number;
    readonly thunk: number;
    readonly asked: string;
    readonly registry: string;
  }
  type GatesMover = Mover<GatesFeedInputs, GatesFeed, GatesObserved>;

  const gatesPair =
    (move: (probe: GatesProbe) => GatesFeedInputs) => () => {
      const probe = gatesProbe();
      const held: GatesFeedInputs = {
        gates: probe.first.registry,
        questions: probe.questions(),
        intervalMillis: 5_000,
      };
      return {
        held,
        moved: { ...held, ...move(probe) },
        read: (feed: GatesFeed): GatesObserved => ({
          subscriptions: probe.first.subscriptions() + probe.second.subscriptions(),
          reads: probe.first.reads() + probe.second.reads(),
          thunk: probe.calls.count,
          asked: feed.getSnapshot().asked._tag,
          registry: feed.getSnapshot().registry._tag,
        }),
      };
    };

  const gatesMovers: Record<keyof Required<GatesFeedInputs>, GatesMover> = {
    gates: {
      pair: gatesPair((probe) => ({ gates: probe.second.registry })),
      reacted: (before, after) => after.subscriptions === before.subscriptions + 1 && after.reads > before.reads,
    },
    questions: {
      pair: gatesPair((probe) => ({ questions: probe.questions() })),
      reacted: (before, after) => after.thunk === before.thunk + 1,
    },
    intervalMillis: {
      pair: gatesPair(() => ({ intervalMillis: 7_000 })),
      reacted: (before, after) => after.thunk === before.thunk + 1,
    },
  };

  it.effect("CR14 each input moved alone makes the feed react", () =>
    Effect.gen(function* () {
      for (const [field, row] of Object.entries(gatesMovers)) {
        const { held, moved, read } = row.pair();
        const feed = yield* gatesFeedOf(held);
        yield* settleTurns;
        const before = read(feed);

        feed.configure(moved);
        yield* settleTurns;

        assert.isTrue(row.reacted(before, read(feed)), field);
      }
    }),
  );

  it.effect("CR15 each input given at build and given through configure reaches the same state, while the constructor takes inputs", () =>
    Effect.gen(function* () {
      for (const [field, row] of Object.entries(gatesMovers)) {
        const built = row.pair();
        const configured = row.pair();
        const withInputs = yield* makeGatesFeed(built.moved);
        const withConfigure = yield* gatesFeedOf(configured.moved);
        yield* settleTurns;

        assert.deepStrictEqual(configured.read(withConfigure), built.read(withInputs), field);
      }
    }),
  );
});

const reader = role({ name: "reader", permissions: [permission("doc", "read")] });
const writePolicy = hasPermission(permission("doc", "write"));
const writer = role({ name: "writer", permissions: [permission("doc", "write")] });

/** A questions thunk that asks `policy` and adds one to `calls` each time it is read. */
const asking = (calls: { count: number }, policy: AskedQuestionLike["policy"]) => (): ReadonlyArray<AskedQuestionLike> => {
  calls.count += 1;
  return [{ policy }];
};

/** Two ports layers, each one value: a snapshot holds its layer, so two models handed the same one read alike. */
const heldPorts = portsLayer({
  AttributeResolver: scriptedPort(attributeResolverPort, () => PortReply.fail("the store is down"), "broken").layer,
});
const otherPorts = portsLayer({
  AttributeResolver: scriptedPort(attributeResolverPort, () => PortReply.fail("also down"), "broken").layer,
});

/** The nine stores of a dock, by the names the model gives them. */
const storesOf = (model: DockModel) => ({
  timeline: model.timeline,
  dock: model.dock,
  explorer: model.explorer,
  roles: model.roles,
  simulation: model.simulation,
  diagnostics: model.diagnostics,
  timelineStatus: model.timelineStatus,
  questions: model.questions,
  services: model.services,
});
type StoreName = keyof ReturnType<typeof storesOf>;
const storeNames: ReadonlyArray<StoreName> = [
  "timeline",
  "dock",
  "explorer",
  "roles",
  "simulation",
  "diagnostics",
  "timelineStatus",
  "questions",
  "services",
];

const snapshotsOf = (model: DockModel) => {
  const stores = storesOf(model);
  return {
    timeline: stores.timeline.getSnapshot(),
    dock: stores.dock.getSnapshot(),
    explorer: stores.explorer.getSnapshot(),
    roles: stores.roles.getSnapshot(),
    simulation: stores.simulation.getSnapshot(),
    diagnostics: stores.diagnostics.getSnapshot(),
    timelineStatus: stores.timelineStatus.getSnapshot(),
    questions: stores.questions.getSnapshot(),
    services: stores.services.getSnapshot(),
  };
};
type Snapshots = ReturnType<typeof snapshotsOf>;

/** What two models are compared by: the simulation's `plan` is built anew with each model and compares by identity. */
const comparable = (observed: DockObserved): DockObserved => ({
  ...observed,
  snapshots: { ...observed.snapshots, simulation: { ...observed.snapshots.simulation, plan: undefined } },
});

/** The stores whose snapshot is another object than it was. */
const moved = (before: Snapshots, after: Snapshots): ReadonlyArray<StoreName> =>
  storeNames.filter((name) => before[name] !== after[name]);

/** One listener on each of the nine stores, counting what each hears. */
const heardOnEach = (model: DockModel) => {
  const stores = storesOf(model);
  const heard = {
    timeline: heardOn(stores.timeline),
    dock: heardOn(stores.dock),
    explorer: heardOn(stores.explorer),
    roles: heardOn(stores.roles),
    simulation: heardOn(stores.simulation),
    diagnostics: heardOn(stores.diagnostics),
    timelineStatus: heardOn(stores.timelineStatus),
    questions: heardOn(stores.questions),
    services: heardOn(stores.services),
  };
  return () => ({
    timeline: heard.timeline.calls,
    dock: heard.dock.calls,
    explorer: heard.explorer.calls,
    roles: heard.roles.calls,
    simulation: heard.simulation.calls,
    diagnostics: heard.diagnostics.calls,
    timelineStatus: heard.timelineStatus.calls,
    questions: heard.questions.calls,
    services: heard.services.calls,
  });
};

const silent = {
  timeline: 0,
  dock: 0,
  explorer: 0,
  roles: 0,
  simulation: 0,
  diagnostics: 0,
  timelineStatus: 0,
  questions: 0,
  services: 0,
};

/** Every host-supplied input of a dock, fresh, with the counts of what reads them. */
const dockProbe = () => {
  const first = counted([record("a", 100), record("b", 200), record("c", 300)]);
  const second = counted([record("d", 400)]);
  const diagnostics = diagnosticsProbe();
  const firstGates = makeGateRegistryDouble([guard("g1", readPolicy)]);
  const secondGates = makeGateRegistryDouble([guard("g2", readPolicy)]);
  const calls = { count: 0 };
  const held: DockModelInputs = {
    capacity: 5,
    catalogue: { policies: { canRead: readPolicy }, roles: [reader] },
    diagnostics: { layer: diagnostics.layer(), collector: diagnostics.collector(), intervalMillis: 5_000 },
    gates: firstGates.registry,
    questions: asking(calls, readPolicy),
    reading: { activity: activityOf(1) },
    ports: heldPorts,
    source: first.source,
  };
  const tally = () => ({
    firstSource: first.tally.reads,
    secondSource: second.tally.reads,
    firstRegistry: firstGates.reads(),
    secondRegistry: secondGates.reads(),
    firstSubscriptions: firstGates.subscriptions(),
    secondSubscriptions: secondGates.subscriptions(),
    thunk: calls.count,
    samples: diagnostics.counts.samples,
    builds: diagnostics.counts.builds,
    releases: diagnostics.counts.releases,
  });
  return { held, first, second, diagnostics, secondGates, calls, tally };
};
type DockProbe = ReturnType<typeof dockProbe>;

interface DockObserved {
  readonly snapshots: Snapshots;
  readonly ids: ReadonlyArray<string>;
  readonly sightings: ReadonlyArray<string>;
  readonly asking: ReadonlyArray<ReadonlyArray<string>>;
  readonly tally: ReturnType<DockProbe["tally"]>;
}

const observe = (probe: DockProbe, model: DockModel): DockObserved => {
  const snapshots = snapshotsOf(model);
  return {
    snapshots,
    ids: snapshots.timeline.entries.map((entry) => entry.evaluationId),
    sightings: model.sightings().map((sighting) => sighting.label),
    asking: askingIds(snapshots.questions),
    tally: probe.tally(),
  };
};

describe("the dock model", () => {
  it.effect("CR16 a fresh literal holding the eight inputs notifies no store and reads no registry, thunk or source", () =>
    Effect.gen(function* () {
      const probe = dockProbe();
      const model = yield* dockModelOf(probe.held);
      yield* settleTurns;
      const calls = heardOnEach(model);
      const before = observe(probe, model);

      model.configure({ ...probe.held });
      yield* settleTurns;
      const after = observe(probe, model);

      assert.deepStrictEqual(calls(), silent);
      assert.deepStrictEqual(moved(before.snapshots, after.snapshots), []);
      assert.deepStrictEqual(after.tally, before.tally);
    }),
  );

  it.effect("CR17 an omitted input and one holding undefined are one input: nothing is notified and nothing is read", () =>
    Effect.gen(function* () {
      const probe = dockProbe();
      const model = yield* dockModelOf({ gates: probe.held.gates, source: probe.held.source });
      yield* settleTurns;
      const calls = heardOnEach(model);
      const before = observe(probe, model);

      model.configure({
        gates: probe.held.gates,
        source: probe.held.source,
        capacity: undefined,
        catalogue: undefined,
        diagnostics: undefined,
        questions: undefined,
        reading: undefined,
        ports: undefined,
      });
      yield* settleTurns;
      const after = observe(probe, model);

      assert.deepStrictEqual(calls(), silent);
      assert.deepStrictEqual(moved(before.snapshots, after.snapshots), []);
      assert.deepStrictEqual(after.tally, before.tally);
    }),
  );

  it.effect("CR18 an omitted capacity, an undefined one and the default are one bound: the timeline snapshot stays and no read starts", () =>
    Effect.gen(function* () {
      const probe = dockProbe();
      const model = yield* dockModelOf({ source: probe.held.source });
      yield* settleTurns;
      const calls = heardOnEach(model);
      const timeline = model.timeline.getSnapshot();
      const before = probe.tally();

      model.configure({ source: probe.held.source, capacity: DEFAULT_TIMELINE_CAPACITY });
      model.configure({ source: probe.held.source, capacity: undefined });
      model.configure({ source: probe.held.source });
      yield* settleTurns;

      assert.strictEqual(model.timeline.getSnapshot(), timeline);
      assert.deepStrictEqual(calls(), silent);
      assert.deepStrictEqual(probe.tally(), before);
    }),
  );

  it.effect("CR19 a bare build reads what an empty input read in every store, and configuring an empty input right after it notifies none", () =>
    Effect.gen(function* () {
      const bare = yield* makeDockModel();
      const built = yield* dockModelOf({});
      yield* settleTurns;

      assert.deepStrictEqual(snapshotsOf(bare), snapshotsOf(built));
      assert.deepStrictEqual(bare.sightings(), built.sightings());

      const calls = heardOnEach(bare);
      const before = snapshotsOf(bare);

      bare.configure({});
      yield* settleTurns;

      assert.deepStrictEqual(calls(), silent);
      assert.deepStrictEqual(moved(before, snapshotsOf(bare)), []);
    }),
  );

  type DockMover = Mover<DockModelInputs, DockModel, DockObserved>;

  const dockPair = (move: (probe: DockProbe) => DockModelInputs) => () => {
    const probe = dockProbe();
    return {
      held: probe.held,
      moved: { ...probe.held, ...move(probe) },
      read: (model: DockModel): DockObserved => observe(probe, model),
    };
  };

  const dockMovers: Record<keyof Required<DockModelInputs>, DockMover> = {
    capacity: {
      pair: dockPair(() => ({ capacity: 2 })),
      reacted: (before, after) => before.snapshots.timeline.capacity === 5 && after.snapshots.timeline.capacity === 2,
    },
    catalogue: {
      pair: dockPair(() => ({
        catalogue: { policies: { canRead: readPolicy, canWrite: writePolicy }, roles: [writer] },
      })),
      reacted: (before, after) =>
        before.snapshots.roles !== after.snapshots.roles && after.sightings.length > before.sightings.length,
    },
    diagnostics: {
      pair: dockPair((probe) => ({ diagnostics: { ...probe.held.diagnostics, layer: probe.diagnostics.layer() } })),
      reacted: (before, after) =>
        after.tally.builds === before.tally.builds + 1 && after.tally.releases === before.tally.releases + 1,
    },
    gates: {
      pair: dockPair((probe) => ({ gates: probe.secondGates.registry })),
      reacted: (before, after) =>
        after.tally.secondSubscriptions === before.tally.secondSubscriptions + 1 &&
        before.asking.flat().join() === "g1" &&
        after.asking.flat().join() === "g2",
    },
    questions: {
      pair: dockPair((probe) => ({ questions: asking(probe.calls, writePolicy) })),
      reacted: (before, after) => after.tally.thunk > before.tally.thunk && before.snapshots.questions !== after.snapshots.questions,
    },
    reading: {
      pair: dockPair(() => ({ reading: { activity: activityOf(2) } })),
      reacted: (before, after) =>
        before.snapshots.diagnostics !== after.snapshots.diagnostics && after.tally.builds === before.tally.builds,
    },
    ports: {
      pair: dockPair(() => ({ ports: otherPorts })),
      reacted: (before, after) => before.snapshots.simulation !== after.snapshots.simulation,
    },
    source: {
      pair: dockPair((probe) => ({ source: probe.second.source })),
      reacted: (before, after) =>
        before.tally.secondSource === 0 && after.tally.secondSource === 1 && after.ids.includes("d") && !before.ids.includes("d"),
    },
  };

  it.effect("CR20 each input moved alone makes the store it reaches react", () =>
    Effect.gen(function* () {
      for (const [field, row] of Object.entries(dockMovers)) {
        const { held, moved: next, read } = row.pair();
        const model = yield* dockModelOf(held);
        yield* settleTurns;
        const before = read(model);

        model.configure(next);
        yield* settleTurns;

        assert.isTrue(row.reacted(before, read(model)), field);
      }
    }),
  );

  it.effect("CR21 each input given at build and given through configure reaches the same state, while the constructor takes inputs", () =>
    Effect.gen(function* () {
      for (const [field, row] of Object.entries(dockMovers)) {
        const built = row.pair();
        const configured = row.pair();
        const withInputs = yield* makeDockModel(built.moved);
        const withConfigure = yield* dockModelOf(configured.moved);
        yield* settleTurns;

        assert.deepStrictEqual(comparable(configured.read(withConfigure)), comparable(built.read(withInputs)), field);
      }
    }),
  );

  /** A configure of every input a host's dock holds, a layer for the poll and nothing else moved. */
  const firstConfigure = (model: DockModel, layer: Layer.Layer<never>) => {
    model.configure({
      capacity: 50,
      source: counted([record("a", 100)]).source,
      catalogue: { policies: { canRead: readPolicy } },
      diagnostics: { layer },
      gates: makeGateRegistryDouble([guard("g1", readPolicy)]).registry,
      questions: asking({ count: 0 }, readPolicy),
    });
  };

  it.effect("CR22 a reader subscribed to every store of a bare dock before its first configure hears 2, 2, 3, 3, 0, 1, 0, 2 and 1 notifications while the poll layer is still building, and one more on three stores once it has built", () =>
    Effect.gen(function* () {
      const building = yield* makeDockModel();
      const buildingCalls = heardOnEach(building);
      firstConfigure(building, Layer.effectDiscard(Effect.never));
      yield* settleTurns;

      assert.deepStrictEqual(buildingCalls(), {
        timeline: 2,
        dock: 2,
        explorer: 3,
        roles: 0,
        simulation: 3,
        diagnostics: 1,
        timelineStatus: 0,
        questions: 2,
        services: 1,
      });

      const built = yield* makeDockModel();
      const builtCalls = heardOnEach(built);
      firstConfigure(built, diagnosticsProbe().layer());
      yield* settleTurns;

      assert.deepStrictEqual(builtCalls(), {
        timeline: 2,
        dock: 2,
        explorer: 3,
        roles: 0,
        simulation: 3,
        diagnostics: 2,
        timelineStatus: 0,
        questions: 3,
        services: 2,
      });
    }),
  );
});
