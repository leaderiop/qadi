/**
 * A host listener that throws leaves every input of the dock applied, and its throw reaches the caller once.
 *
 * Every store of the dock model publishes to host code, and a listener may throw anything. A
 * `configure` that stopped at the first throw left later inputs unapplied (roles empty,
 * diagnostics off, the simulation behind the explorer), and an identical second `configure`
 * did not mend it, because the inputs it compared against were already recorded. So each row
 * here throws on one store's first notification, moves all eight inputs at once over a model
 * whose source has died, and reads every input back after the poll has sampled.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import * as Stream from "effect/Stream";
import {
  attributeResolverPort,
  hasPermission,
  PortReply,
  permission,
  portsLayer,
  role,
  scriptedPort,
} from "@qadi/core";
import type { Policy, StoredRecord } from "@qadi/core";
import { dockModelOf } from "../builtFeeds.ts";
import { makeCollectorDouble } from "../collectorDouble.ts";
import { activityOf, askingIds, logOf, oneReading, rowOf, wiringNamed } from "../dockModelFixtures.ts";
import { makeGateRegistryDouble } from "../gateRegistryDouble.ts";
import { decisionRecord, guard, heardOn, read, readPolicy, settleTurns, thrownBy, tick } from "../helpers.ts";
import type { Catalogue } from "../../src/model/Catalogue.ts";
import { DiagnosticsStatus } from "../../src/model/DiagnosticsFeed.ts";
import { makeDockModel, type DockModel, type DockModelInputs } from "../../src/model/DockModel.ts";
import type { ReadableStore } from "../../src/model/ExternalStore.ts";
import type { AskedQuestionLike } from "../../src/model/Gates.ts";
import type { Source } from "../../src/model/Source.ts";

const write = permission("doc", "write");
const writePolicy: Policy = hasPermission(write);
const editor = role({ name: "editor", permissions: [read] });
const writer = role({ name: "writer", permissions: [write] });

/** Two declared policies, so the rail holds one that ran and one that has not. */
const catalogue: Catalogue = { policies: { canRead: readPolicy, canWrite: writePolicy }, roles: [editor] };
const otherCatalogue: Catalogue = { policies: { canRead: readPolicy }, roles: [writer] };

const heldPorts = portsLayer({
  AttributeResolver: scriptedPort(attributeResolverPort, () => PortReply.fail("the store is down"), "broken").layer,
});

const record = (evaluationId: string, at: number, policy: Policy = readPolicy): StoredRecord =>
  decisionRecord({ evaluationId, at, policy });

/** A source whose one record is followed by a live stream that dies, so the timeline status is `Stopped`. */
const dying: Source = {
  read: Effect.succeed({ backlog: [record("x", 50)], live: Stream.die(new Error("the live stream died")) }),
};

/** A questions thunk that asks `policy` and counts its reads. */
const asking = (calls: { count: number }, policy: Policy) => (): ReadonlyArray<AskedQuestionLike> => {
  calls.count += 1;
  return [{ policy }];
};

/** The ten stores of a dock, by the names the model gives them. */
const storesOf = (model: DockModel): Record<StoreName, ReadableStore<unknown>> => ({
  timeline: model.timeline,
  dock: model.dock,
  explorer: model.explorer,
  roles: model.roles,
  simulation: model.simulation,
  diagnostics: model.diagnostics,
  timelineStatus: model.timelineStatus,
  questions: model.questions,
  services: model.services,
  lens: model.lens,
});

const storeNames = [
  "timeline",
  "dock",
  "explorer",
  "roles",
  "simulation",
  "diagnostics",
  "timelineStatus",
  "questions",
  "services",
  "lens",
] as const;
type StoreName = (typeof storeNames)[number];

const snapshotsOf = (model: DockModel): ReadonlyArray<unknown> => {
  const stores = storesOf(model);
  return storeNames.map((name) => stores[name].getSnapshot());
};

/** The stores whose snapshot is another object than it was. */
const movedBetween = (before: ReadonlyArray<unknown>, after: ReadonlyArray<unknown>): ReadonlyArray<StoreName> =>
  storeNames.filter((_, index) => before[index] !== after[index]);

/** One listener on each of the ten stores, counting what each hears. */
const heardOnEach = (model: DockModel) => {
  const stores = storesOf(model);
  const heard = storeNames.map((name) => [name, heardOn(stores[name])] as const);
  return () => Object.fromEntries(heard.map(([name, counter]) => [name, counter.calls]));
};

const silent = Object.fromEntries(storeNames.map((name) => [name, 0]));

/** A listener on `store` that throws `thrown` on its first notification only, and says whether it was called. */
const throwOnce = (store: ReadableStore<unknown>, thrown: unknown) => {
  const state = { called: false };
  store.subscribe(() => {
    if (state.called) return;
    state.called = true;
    throw thrown;
  });
  return state;
};

/** A listener on `store` that runs `run` on its first notification only. */
const throwOnceThen = (store: ReadableStore<unknown>, run: () => void) => {
  const state = { called: false };
  store.subscribe(() => {
    if (state.called) return;
    state.called = true;
    run();
  });
};

/** What each of the ten stores holds that an input sets, as plain values two models can be compared by. */
const stateOf = (model: DockModel) => {
  const timeline = model.timeline.getSnapshot();
  const simulation = model.simulation.getSnapshot();
  const asked = model.questions.getSnapshot();
  const shown = model.diagnostics.getSnapshot();
  return {
    capacity: timeline.capacity,
    entries: timeline.entries.map((entry) => entry.evaluationId),
    status: model.timelineStatus.getSnapshot()._tag,
    rows: model.dock.getSnapshot().rows.map((row) => row.entry.evaluationId),
    roles: model.roles.getSnapshot().list.map((held) => held.name),
    explorer: model.explorer.getSnapshot().sightings.map((sighting) => sighting.label),
    simulation: simulation.sightings.map((sighting) => sighting.label),
    live: simulation.options.find((option) => option.id === "Live")?.enabled,
    guards: asked.instances.map((instance) => instance.id),
    asking: askingIds(asked),
    poll: shown.status._tag,
    reading: { wiring: shown.reading.wiring, activity: shown.reading.activity, portCalls: shown.reading.portCalls },
    services: rowOf(model),
    lens: model.lens.getSnapshot(),
  };
};

/** Every host input of one `configure`, fresh each call, with what reads them. */
const fixtures = () => {
  const tally = { reads: 0 };
  // Yields before it answers, so its records arrive after `configure` has returned.
  const source: Source = {
    read: Effect.gen(function* () {
      yield* Effect.yieldNow;
      tally.reads += 1;
      return { backlog: [record("a", 100), record("b", 200)], live: Stream.empty };
    }),
  };
  const registry = makeGateRegistryDouble([guard("g1", readPolicy)]);
  const thunk = { count: 0 };
  const questions = asking(thunk, readPolicy);
  const collector = makeCollectorDouble();
  const supplied = oneReading();
  const wanted = (): DockModelInputs => ({
    capacity: 3,
    catalogue,
    diagnostics: { collector: collector.collector },
    gates: registry.registry,
    questions,
    reading: supplied,
    ports: heldPorts,
    source,
  });
  return { tally, thunk, collector, supplied, wanted };
};
type Fixtures = ReturnType<typeof fixtures>;

/** A model configured at `capacity` on a source that dies, settled until the timeline status says so. */
const setUp = (capacity: number) =>
  Effect.gen(function* () {
    const model = yield* dockModelOf({ capacity, source: dying });
    yield* settleTurns;
    assert.strictEqual(model.timelineStatus.getSnapshot()._tag, "Stopped");
    return model;
  });

/**
 * Lets the poll sample, then asserts every one of the eight inputs of `fx.wanted()` reached the model.
 *
 * `entries` is what the timeline holds: the new source's two records, after the dying source's own
 * when the capacity did not move, because only a moved capacity empties the timeline.
 */
const applied = (model: DockModel, fx: Fixtures, entries: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    yield* tick;

    const timeline = model.timeline.getSnapshot();
    assert.strictEqual(timeline.capacity, 3);
    assert.deepStrictEqual(
      timeline.entries.map((entry) => entry.evaluationId),
      entries,
    );
    assert.isAtLeast(fx.tally.reads, 1);
    assert.strictEqual(model.timelineStatus.getSnapshot()._tag, "Reading");
    assert.deepStrictEqual(
      model.roles.getSnapshot().list.map((held) => held.name),
      ["editor"],
    );

    const rail = model.sightings();
    assert.deepStrictEqual(
      rail.map((sighting) => sighting.label),
      ["canRead", "canWrite"],
    );
    assert.strictEqual(model.explorer.getSnapshot().sightings, rail);
    assert.strictEqual(model.simulation.getSnapshot().sightings, rail);
    assert.deepStrictEqual(
      model.dock.getSnapshot().rows.map((row) => row.entry.evaluationId),
      entries,
    );

    const live = model.simulation.getSnapshot().options.find((option) => option.id === "Live");
    assert.strictEqual(live?.enabled, true);

    const asked = model.questions.getSnapshot();
    assert.deepStrictEqual(
      asked.instances.map((instance) => instance.id),
      ["g1"],
    );
    assert.deepStrictEqual(askingIds(asked), [["g1"]]);
    assert.isAtLeast(fx.thunk.count, 1);

    const shown = model.diagnostics.getSnapshot();
    assert.isTrue(DiagnosticsStatus.$is("Live")(shown.status));
    assert.isAtLeast(fx.collector.state.calls, 1);
    assert.strictEqual(shown.reading.wiring, fx.supplied.wiring);
    assert.strictEqual(shown.reading.activity, fx.supplied.activity);
    assert.strictEqual(rowOf(model).port, "AttributeResolver");
  });

/** What the timeline holds once `fx.wanted()` is applied to a model that began at `capacity`. */
const entriesFrom = (capacity: number): ReadonlyArray<string> => (capacity === 3 ? ["x", "a", "b"] : ["a", "b"]);

/**
 * One store's row: its listener throws once, one `configure` moves every input, and then the same
 * inputs again as a fresh literal change nothing.
 *
 * Each row states whether `configure` notifies its store's listener (`heard`) and the row asserts
 * it, so a row cannot pass without the throw being exercised, and a store `configure` never
 * touches states that it is not called. It runs from each capacity in `starts`: 5 moves the
 * capacity to 3, and 3 leaves it where it was. A moved capacity makes the dock's own timeline
 * listener hand the sightings to the explorer and the simulation first, so a throw there is
 * mended by the catalogue step that follows; the unmoved capacity is the run in which that step
 * is the one that delivers them. The timeline and the dock hear their first notification only
 * from a moved capacity, so they run from 5 alone.
 */
const throwingRow = (
  name: StoreName,
  { heard, starts = [5, 3] }: { readonly heard: boolean; readonly starts?: ReadonlyArray<number> },
) =>
  Effect.gen(function* () {
    for (const capacity of starts) {
      const fx = fixtures();
      const model = yield* setUp(capacity);
      const boom = new Error(`a ${name} listener threw`);
      const listener = throwOnce(storesOf(model)[name], boom);

      const run = thrownBy(() => model.configure(fx.wanted()));
      assert.strictEqual(listener.called, heard, `from capacity ${capacity}`);
      yield* applied(model, fx, entriesFrom(capacity));

      assert.strictEqual(run.threw, heard, `from capacity ${capacity}`);
      if (heard) assert.strictEqual(run.thrown, boom, `from capacity ${capacity}`);

      const before = snapshotsOf(model);
      const heardAgain = heardOnEach(model);
      const reads = fx.tally.reads;

      const again = thrownBy(() => model.configure(fx.wanted()));
      yield* settleTurns;

      assert.isFalse(again.threw, `from capacity ${capacity}`);
      assert.deepStrictEqual(heardAgain(), silent);
      assert.deepStrictEqual(movedBetween(before, snapshotsOf(model)), []);
      assert.strictEqual(fx.tally.reads, reads);
    }
  });

describe("a dock whose host listener throws", () => {
  it.effect("DL1 with a throwing timeline listener, a configure applies every input, rethrows what it threw, and an identical configure changes nothing", () =>
    throwingRow("timeline", { heard: true, starts: [5] }),
  );

  it.effect("DL2 with a throwing dock listener, a configure applies every input, rethrows what it threw, and an identical configure changes nothing", () =>
    throwingRow("dock", { heard: true, starts: [5] }),
  );

  it.effect("DL3 with a throwing roles listener, a configure applies every input, rethrows what it threw, and an identical configure changes nothing", () =>
    throwingRow("roles", { heard: true }),
  );

  it.effect("DL4 with a throwing explorer listener, a configure applies every input, rethrows what it threw, and an identical configure changes nothing", () =>
    throwingRow("explorer", { heard: true }),
  );

  it.effect("DL5 with a throwing simulation listener, a configure applies every input, rethrows what it threw, and an identical configure changes nothing", () =>
    throwingRow("simulation", { heard: true }),
  );

  it.effect("DL6 with a throwing diagnostics listener, a configure applies every input, rethrows what it threw, and an identical configure changes nothing", () =>
    throwingRow("diagnostics", { heard: true }),
  );

  it.effect("DL7 with a throwing timelineStatus listener, a configure applies every input, rethrows what it threw, and an identical configure changes nothing", () =>
    throwingRow("timelineStatus", { heard: true }),
  );

  it.effect("DL8 with a throwing questions listener, a configure applies every input, rethrows what it threw, and an identical configure changes nothing", () =>
    throwingRow("questions", { heard: true }),
  );

  it.effect("DL9 with a throwing services listener, a configure applies every input, rethrows what it threw, and an identical configure changes nothing", () =>
    throwingRow("services", { heard: true }),
  );

  it.effect("DL10 a lens listener is not called by a configure, so one that throws changes nothing about it, and every input is applied", () =>
    throwingRow("lens", { heard: false }),
  );

  it.effect("DL11 the rows above cover every store a built model exposes", () =>
    Effect.gen(function* () {
      const model = yield* makeDockModel();
      const members: ReadonlyArray<readonly [string, unknown]> = Object.entries(model);

      const stores = members
        .filter(
          ([, member]) => Predicate.hasProperty(member, "subscribe") && Predicate.hasProperty(member, "getSnapshot"),
        )
        .map(([name]) => name);

      assert.sameMembers(stores, [...storeNames]);
    }),
  );

  it.effect("DL12 a timeline listener and a roles listener that both throw are rethrown as one AggregateError in step order, with the message naming the configure", () =>
    Effect.gen(function* () {
      const fx = fixtures();
      const model = yield* setUp(5);
      const timelineBoom = new Error("a timeline listener threw");
      const rolesBoom = new Error("a roles listener threw");
      throwOnce(model.timeline, timelineBoom);
      throwOnce(model.roles, rolesBoom);

      const run = thrownBy(() => model.configure(fx.wanted()));
      yield* applied(model, fx, entriesFrom(5));

      const { thrown } = run;
      if (!(thrown instanceof AggregateError)) return assert.fail("expected an AggregateError");
      assert.strictEqual(thrown.errors.length, 2);
      assert.strictEqual(thrown.errors[0], timelineBoom);
      assert.strictEqual(thrown.errors[1], rolesBoom);
      assert.strictEqual(thrown.message, "More than one step of the dock's configure threw.");
    }),
  );

  it.effect("DL13 a listener that throws undefined is rethrown as undefined once every input is applied", () =>
    Effect.gen(function* () {
      const fx = fixtures();
      const model = yield* setUp(5);
      throwOnce(model.roles, undefined);

      const run = thrownBy(() => model.configure(fx.wanted()));
      yield* applied(model, fx, entriesFrom(5));

      assert.isTrue(run.threw);
      assert.strictEqual(run.thrown, undefined);
    }),
  );

  it.effect("DL14 a listener that throws null is rethrown as null once every input is applied", () =>
    Effect.gen(function* () {
      const fx = fixtures();
      const model = yield* setUp(3);
      throwOnce(model.explorer, null);

      const run = thrownBy(() => model.configure(fx.wanted()));
      yield* applied(model, fx, entriesFrom(3));

      assert.isTrue(run.threw);
      assert.strictEqual(run.thrown, null);
    }),
  );
  it.effect("DL15 an explorer listener that always throws leaves the simulation and the dock on every record the timeline accepts, and each accept rethrows it", () =>
    Effect.gen(function* () {
      const model = yield* dockModelOf({ capacity: 5, catalogue });
      const boom = new Error("an explorer listener threw");
      model.explorer.subscribe(() => {
        throw boom;
      });

      const first = thrownBy(() => model.timeline.accept(record("r1", 100)));
      const second = thrownBy(() => model.timeline.accept(record("r2", 200, writePolicy)));

      assert.isTrue(first.threw);
      assert.strictEqual(first.thrown, boom);
      assert.isTrue(second.threw);
      assert.strictEqual(second.thrown, boom);

      const ids = ["r1", "r2"];
      assert.deepStrictEqual(
        model.timeline.getSnapshot().entries.map((entry) => entry.evaluationId),
        ids,
      );
      assert.deepStrictEqual(
        model.dock.getSnapshot().rows.map((row) => row.entry.evaluationId),
        ids,
      );
      const rail = model.sightings();
      assert.deepStrictEqual(
        rail.map((sighting) => [sighting.label, sighting.count]),
        [
          ["canWrite", 1],
          ["canRead", 1],
        ],
      );
      assert.strictEqual(model.explorer.getSnapshot().sightings, rail);
      assert.strictEqual(model.simulation.getSnapshot().sightings, rail);
    }),
  );

  it.effect("DL16 a configure that moves the capacity and the catalogue publishes the sightings once to the explorer and once to the simulation", () =>
    Effect.gen(function* () {
      const model = yield* dockModelOf({ capacity: 5, catalogue });
      yield* settleTurns;
      const heard = heardOnEach(model);

      model.configure({ capacity: 3, catalogue: otherCatalogue });
      yield* settleTurns;

      assert.deepStrictEqual(heard(), {
        timeline: 1,
        dock: 1,
        explorer: 1,
        roles: 1,
        simulation: 1,
        diagnostics: 0,
        timelineStatus: 0,
        questions: 0,
        services: 0,
        lens: 0,
      });
    }),
  );

  it.effect("DL17 a listener that configures the dock again from inside a step leaves the model where a plain configure with those inputs leaves a fresh one", () =>
    Effect.gen(function* () {
      const records: Source = { read: Effect.succeed({ backlog: [record("a", 100), record("b", 200)], live: Stream.empty }) };
      const firstCollector = makeCollectorDouble(() => logOf("a"));
      const secondCollector = makeCollectorDouble(() => logOf("b", "c"));
      const first: DockModelInputs = {
        capacity: 5,
        catalogue,
        diagnostics: { collector: firstCollector.collector },
        gates: makeGateRegistryDouble([guard("g1", readPolicy)]).registry,
        questions: asking({ count: 0 }, readPolicy),
        reading: { wiring: wiringNamed("one"), activity: activityOf(1) },
        ports: heldPorts,
        source: records,
      };
      const second: DockModelInputs = {
        capacity: 3,
        catalogue: otherCatalogue,
        diagnostics: { collector: secondCollector.collector },
        gates: makeGateRegistryDouble([guard("g2", writePolicy)]).registry,
        questions: asking({ count: 0 }, writePolicy),
        reading: { wiring: wiringNamed("two"), activity: activityOf(2) },
        ports: undefined,
        source: records,
      };

      const nested = yield* makeDockModel();
      throwOnceThen(nested.roles, () => nested.configure(second));
      nested.configure(first);
      const plain = yield* makeDockModel();
      plain.configure(second);
      yield* tick;

      assert.deepStrictEqual(stateOf(nested), stateOf(plain));
    }),
  );
});
