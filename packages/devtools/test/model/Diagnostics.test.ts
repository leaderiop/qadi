/**
 * The diagnostics store and the loop that feeds it, under `TestClock`.
 *
 * Cadence, identity and the layer's lifetime are properties of the model, so
 * they are proved here without a timer or a component; `test/react/
 * useDiagnostics.test.tsx` proves only what React can get wrong.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as TestClock from "effect/testing/TestClock";
import * as Tracer from "effect/Tracer";
import {
  AttributeResolver,
  decisionCacheLayer,
  hasRole,
} from "@qadi/core";
import {
  DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS,
  foldReading,
  makeDiagnosticsStore,
  mergeReading,
  noDiagnostics,
  runDiagnostics,
  WiringRead,
  type Diagnostics,
  type DiagnosticsOptions,
  type DiagnosticsStore,
} from "../../src/model/Diagnostics.ts";
import type { HydrationActivity } from "../../src/model/Hydration.ts";
import type { PortCallCollector, PortCallLog } from "../../src/model/PortCalls.ts";
import type { PortActivity } from "../../src/model/Wiring.ts";
import { hostile, hostileError } from "../helpers.ts";

const emptyLog: PortCallLog = { calls: [], dropped: 0, capacity: 10 };

/** A collector whose snapshot is whatever the test last set, counting every read. */
const scriptedCollector = () => {
  const state = { reads: 0, log: emptyLog };
  const collector: PortCallCollector = {
    layer: Layer.empty,
    snapshot: Effect.sync(() => {
      state.reads += 1;
      return state.log;
    }),
  };
  return { state, collector };
};

const counted = (store: { readonly subscribe: (l: () => void) => () => void }) => {
  const seen = { notified: 0 };
  store.subscribe(() => {
    seen.notified += 1;
  });
  return seen;
};

const start = (store: DiagnosticsStore, options?: DiagnosticsOptions) =>
  Effect.forkChild(runDiagnostics(store, options), { startImmediately: true });

describe("foldReading", () => {
  const activityOf = (calls: number): ReadonlyArray<PortActivity> => [
    { port: "AttributeResolver", calls, translationCalls: 0, retries: 0, timeouts: 0 },
  ];
  const hydrationOf = (seeded: number): HydrationActivity => ({
    dehydrated: 0,
    seeded,
    rechecked: 0,
    mismatched: 0,
    drops: [],
  });
  const logOf = (dropped: number): PortCallLog => ({ calls: [], dropped, capacity: 10 });

  /** A reading, built fresh on every call, so no two share a reference. */
  const first = (): Diagnostics => ({
    wiring: WiringRead.NotHanded(),
    activity: activityOf(1),
    hydration: hydrationOf(0),
    portCalls: logOf(0),
  });
  /** Every field unlike `first`'s: a field added to `Diagnostics` is a compile error here. */
  const moved: Diagnostics = {
    wiring: WiringRead.Failed({ reason: "x" }),
    activity: activityOf(2),
    hydration: hydrationOf(1),
    portCalls: logOf(3),
  };
  const rows: ReadonlyArray<readonly [keyof Diagnostics, Diagnostics]> = [
    ["wiring", { ...first(), wiring: moved.wiring }],
    ["activity", { ...first(), activity: moved.activity }],
    ["hydration", { ...first(), hydration: moved.hydration }],
    ["portCalls", { ...first(), portCalls: moved.portCalls }],
  ];

  it("returns the previous reading itself for a structurally equal fresh sample", () => {
    const previous = first();
    assert.strictEqual(foldReading(previous, first()), previous);
  });

  it("has a row for every field of the reading", () => {
    assert.deepStrictEqual(rows.map(([field]) => field).sort(), Object.keys(moved).sort());
  });

  it("gives only the field that moved a new reference, for each field", () => {
    const previous = first();
    for (const [field, sample] of rows) {
      const folded = foldReading(previous, sample);
      assert.notStrictEqual(folded, previous, field);
      for (const [other] of rows) {
        assert.strictEqual(
          folded[other],
          other === field ? sample[other] : previous[other],
          `${field} moved, ${other} read`,
        );
      }
    }
  });

  it("changes identity once however many identical samples are folded in", () => {
    let reading = noDiagnostics;
    const identities = new Set<Diagnostics>();
    for (let i = 0; i < 5; i += 1) {
      reading = foldReading(reading, first());
      identities.add(reading);
    }
    assert.strictEqual(identities.size, 1);
    assert.notStrictEqual(reading, noDiagnostics);
  });

  it("keeps the empty reading's fields for a first sample that equals them", () => {
    const folded = foldReading(noDiagnostics, { ...first(), wiring: WiringRead.NotHanded(), activity: [] });
    assert.strictEqual(folded.wiring, noDiagnostics.wiring);
    assert.strictEqual(folded.activity, noDiagnostics.activity);
    assert.notStrictEqual(folded.hydration, noDiagnostics.hydration);
  });

  it("decides each field by structural equality, not by reference", () => {
    const previous = first();
    const sample = first();
    assert.notStrictEqual(sample.wiring, previous.wiring);
    assert.notStrictEqual(sample.activity, previous.activity);
    assert.notStrictEqual(sample.portCalls, previous.portCalls);
    const folded = foldReading(previous, sample);
    assert.strictEqual(folded.wiring, previous.wiring);
    assert.strictEqual(folded.activity, previous.activity);
    assert.strictEqual(folded.hydration, previous.hydration);
    assert.strictEqual(folded.portCalls, previous.portCalls);
  });
});

describe("runDiagnostics", () => {
  it.effect("samples once at start and once per interval", () =>
    Effect.gen(function* () {
      const { state, collector } = scriptedCollector();
      const fiber = yield* start(makeDiagnosticsStore(), { collector });
      assert.strictEqual(state.reads, 1);
      yield* TestClock.adjust("1999 millis");
      assert.strictEqual(state.reads, 1);
      yield* TestClock.adjust("1 millis");
      assert.strictEqual(state.reads, 2);
      yield* TestClock.adjust(`${DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS} millis`);
      assert.strictEqual(state.reads, 3);
      yield* Fiber.interrupt(fiber);
    }),
  );

  it.effect("opens the poll's two spans", () =>
    Effect.gen(function* () {
      const names: Array<string> = [];
      const tracer = Tracer.make({
        span: (options) => {
          names.push(options.name);
          return new Tracer.NativeSpan(options);
        },
      });
      const fiber = yield* start(makeDiagnosticsStore()).pipe(
        Effect.provideService(Tracer.Tracer, tracer),
      );
      yield* Fiber.interrupt(fiber);
      assert.include(names, "qadi.devtools.runDiagnostics");
      assert.include(names, "qadi.devtools.wiringReader");
    }),
  );

  it.effect("honours an interval override", () =>
    Effect.gen(function* () {
      const { state, collector } = scriptedCollector();
      const fiber = yield* start(makeDiagnosticsStore(), {
        collector,
        intervalMillis: 500,
      });
      yield* TestClock.adjust("1 second");
      assert.strictEqual(state.reads, 3);
      yield* Fiber.interrupt(fiber);
    }),
  );

  it.effect("builds the layer once, and releases it when interrupted", () =>
    Effect.gen(function* () {
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
      const fiber = yield* start(makeDiagnosticsStore(), { layer });
      yield* TestClock.adjust("20 seconds");
      assert.strictEqual(counts.builds, 1);
      assert.strictEqual(counts.releases, 0);
      yield* Fiber.interrupt(fiber);
      assert.strictEqual(counts.releases, 1);
    }),
  );

  it.effect("a sample that changed nothing changes nothing", () =>
    Effect.gen(function* () {
      const { collector } = scriptedCollector();
      const store = makeDiagnosticsStore();
      const fiber = yield* start(store, { layer: decisionCacheLayer(), collector });
      const seen = counted(store);
      const first = store.getSnapshot();
      yield* TestClock.adjust("10 seconds");
      assert.strictEqual(store.getSnapshot(), first);
      assert.strictEqual(seen.notified, 0);
      yield* Fiber.interrupt(fiber);
    }),
  );

  it.effect("only the field that changed gets a new reference", () =>
    Effect.gen(function* () {
      const { state, collector } = scriptedCollector();
      const store = makeDiagnosticsStore();
      const fiber = yield* start(store, { layer: decisionCacheLayer(), collector });
      const before = store.getSnapshot();
      state.log = { calls: [], dropped: 7, capacity: 10 };
      yield* TestClock.adjust("2 seconds");
      const after = store.getSnapshot();
      assert.notStrictEqual(after.portCalls, before.portCalls);
      assert.strictEqual(after.wiring, before.wiring);
      assert.strictEqual(after.activity, before.activity);
      assert.strictEqual(after.hydration, before.hydration);
      yield* Fiber.interrupt(fiber);
    }),
  );

  it.effect("reads NotHanded without a layer, and the metrics still sample", () =>
    Effect.gen(function* () {
      const store = makeDiagnosticsStore();
      const fiber = yield* start(store);
      const reading = store.getSnapshot();
      assert.strictEqual(reading.wiring._tag, "NotHanded");
      assert.isDefined(reading.hydration);
      assert.isUndefined(reading.portCalls);
      yield* Fiber.interrupt(fiber);
    }),
  );

  it.effect("a sample carries exactly the four fields the poll reads", () =>
    Effect.gen(function* () {
      const store = makeDiagnosticsStore();
      const fiber = yield* start(store);
      assert.deepStrictEqual(Object.keys(store.getSnapshot()).sort(), [
        "activity",
        "hydration",
        "portCalls",
        "wiring",
      ]);
      yield* Fiber.interrupt(fiber);
    }),
  );

  it.effect("a layer that fails to build reads Failed, and the other reads keep sampling", () =>
    Effect.gen(function* () {
      const { state, collector } = scriptedCollector();
      const store = makeDiagnosticsStore();
      const layer = Layer.effect(AttributeResolver, Effect.fail("boom"));
      const fiber = yield* start(store, { layer, collector });
      const reading = store.getSnapshot().wiring;
      assert.strictEqual(reading._tag, "Failed");
      assert.isTrue(reading._tag === "Failed" && reading.reason.includes("boom"));
      yield* TestClock.adjust("4 seconds");
      assert.strictEqual(state.reads, 3);
      assert.isDefined(store.getSnapshot().hydration);
      yield* Fiber.interrupt(fiber);
    }),
  );

  it.effect("a layer that fails to build with a value that cannot be rendered reads Failed with the placeholder", () =>
    Effect.gen(function* () {
      for (const value of [hostile, hostileError]) {
        const { collector } = scriptedCollector();
        const store = makeDiagnosticsStore();
        const layer = Layer.effect(AttributeResolver, Effect.fail(value));
        const fiber = yield* start(store, { layer, collector });
        const reading = store.getSnapshot().wiring;
        if (reading._tag !== "Failed") return assert.fail("expected Failed");
        assert.strictEqual(reading.reason, "a value that could not be described");
        yield* Fiber.interrupt(fiber);
      }
    }),
  );

  it.effect("the wiring read sees the services the layer built", () =>
    Effect.gen(function* () {
      const store = makeDiagnosticsStore();
      const layer = Layer.succeed(AttributeResolver, {
        name: "my-resolver",
        resolve: () => Effect.succeed(undefined),
      });
      const fiber = yield* start(store, { layer });
      const reading = store.getSnapshot().wiring;
      assert.strictEqual(reading._tag, "Read");
      const row =
        reading._tag === "Read"
          ? reading.report.ports.find((port) => port.port === "AttributeResolver")
          : undefined;
      assert.strictEqual(row?.name, "my-resolver");
      assert.strictEqual(row?.present, true);
      yield* Fiber.interrupt(fiber);
    }),
  );
});

describe("mergeReading", () => {
  const sampledWiring = WiringRead.Read({ report: { ports: [], cache: { present: true, size: 1 } } });
  const sampledActivity = [
    { port: "AttributeResolver", calls: 1, retries: 0, timeouts: 0, translationCalls: 0 },
  ] as const;
  const sampledHydration = { dehydrated: 0, seeded: 1, rechecked: 0, mismatched: 0, drops: [] };
  const sampledCalls: PortCallLog = { calls: [], dropped: 0, capacity: 1 };

  const sampled: Diagnostics = {
    wiring: sampledWiring,
    activity: sampledActivity,
    hydration: sampledHydration,
    portCalls: sampledCalls,
  };

  const suppliedWiring = WiringRead.Failed({ reason: "from the server" });
  const suppliedActivity = [
    { port: "AttributeResolver", calls: 42, retries: 0, timeouts: 0, translationCalls: 0 },
  ] as const;
  const suppliedHydration = { dehydrated: 0, seeded: 7, rechecked: 0, mismatched: 0, drops: [] };
  const suppliedCalls: PortCallLog = { calls: [], dropped: 3, capacity: 9 };
  const suppliedQuestions = [{ policy: hasRole("Editor") }];

  it("returns the sampled reading itself when nothing is supplied", () => {
    assert.strictEqual(mergeReading(sampled, undefined), sampled);
  });

  it("an empty reading changes nothing, field by field", () => {
    assert.deepStrictEqual(mergeReading(sampled, {}), sampled);
  });

  it("a supplied wiring wins, and can state a failed read", () => {
    assert.strictEqual(mergeReading(sampled, { wiring: suppliedWiring }).wiring, suppliedWiring);
  });
  it("an absent wiring falls through to the sample", () => {
    assert.strictEqual(mergeReading(sampled, { activity: suppliedActivity }).wiring, sampledWiring);
  });

  it("a supplied activity wins, an explicit empty list included", () => {
    assert.strictEqual(
      mergeReading(sampled, { activity: suppliedActivity }).activity,
      suppliedActivity,
    );
    assert.deepStrictEqual(mergeReading(sampled, { activity: [] }).activity, []);
  });
  it("an absent activity falls through to the sample", () => {
    assert.strictEqual(mergeReading(sampled, { wiring: suppliedWiring }).activity, sampledActivity);
  });

  it("supplied hydration wins", () => {
    assert.strictEqual(
      mergeReading(sampled, { hydration: suppliedHydration }).hydration,
      suppliedHydration,
    );
  });
  it("absent hydration falls through to the sample", () => {
    assert.strictEqual(mergeReading(sampled, { wiring: suppliedWiring }).hydration, sampledHydration);
  });

  it("supplied port calls win", () => {
    assert.strictEqual(
      mergeReading(sampled, { portCalls: suppliedCalls }).portCalls,
      suppliedCalls,
    );
  });
  it("absent port calls fall through to the sample", () => {
    assert.strictEqual(mergeReading(sampled, { wiring: suppliedWiring }).portCalls, sampledCalls);
  });

  it("a supplied reading's questions are not part of the merged reading", () => {
    assert.isFalse("questions" in mergeReading(sampled, { questions: suppliedQuestions }));
  });

  it("supplies a field before the first sample has anything", () => {
    const merged = mergeReading(noDiagnostics, { hydration: suppliedHydration });
    assert.strictEqual(merged.hydration, suppliedHydration);
    assert.strictEqual(merged.wiring, noDiagnostics.wiring);
  });
});
