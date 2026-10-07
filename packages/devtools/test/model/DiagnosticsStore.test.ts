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
import * as Schedule from "effect/Schedule";
import * as TestClock from "effect/testing/TestClock";
import {
  AttributeResolver,
  decisionCacheLayer,
  hasRole,
  type Policy,
} from "@qadi/core";
import {
  DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS,
  makeDiagnosticsStore,
  noDiagnostics,
  runDiagnostics,
  WiringRead,
  type Diagnostics,
  type DiagnosticsOptions,
  type DiagnosticsStore,
} from "../../src/model/DiagnosticsStore.ts";
import type { PortCallCollector, PortCallLog } from "../../src/model/PortCalls.ts";

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

const start = <ROut, E>(store: DiagnosticsStore, options?: DiagnosticsOptions<ROut, E>) =>
  Effect.forkChild(runDiagnostics(store, options), { startImmediately: true });

describe("makeDiagnosticsStore", () => {
  it("starts at the empty reading", () => {
    assert.strictEqual(makeDiagnosticsStore().getSnapshot(), noDiagnostics);
  });

  it("notifies when a reading differs, and says so with a new snapshot", () => {
    const store = makeDiagnosticsStore();
    const seen = counted(store);
    store.accept({ ...noDiagnostics, portCalls: emptyLog });
    assert.strictEqual(seen.notified, 1);
    assert.strictEqual(store.getSnapshot().portCalls, emptyLog);
  });

  it("does not notify for a structurally equal reading, and keeps the snapshot", () => {
    const store = makeDiagnosticsStore();
    store.accept({ ...noDiagnostics, portCalls: emptyLog });
    const before = store.getSnapshot();
    const seen = counted(store);
    store.accept({
      ...noDiagnostics,
      activity: [],
      portCalls: { calls: [], dropped: 0, capacity: 10 },
    });
    assert.strictEqual(seen.notified, 0);
    assert.strictEqual(store.getSnapshot(), before);
  });

  it("gives only the field that changed a new reference", () => {
    const store = makeDiagnosticsStore();
    const asked = [{ policy: hasRole("Editor") }];
    store.accept({ ...noDiagnostics, portCalls: emptyLog, questions: asked });
    const before = store.getSnapshot();
    store.accept({
      ...noDiagnostics,
      portCalls: { calls: [], dropped: 1, capacity: 10 },
      questions: [{ policy: hasRole("Editor") }],
    });
    const after = store.getSnapshot();
    assert.notStrictEqual(after, before);
    assert.notStrictEqual(after.portCalls, before.portCalls);
    assert.strictEqual(after.questions, before.questions);
    assert.strictEqual(after.wiring, before.wiring);
    assert.strictEqual(after.activity, before.activity);
    assert.strictEqual(after.hydration, before.hydration);
  });

  it("moves each field on its own", () => {
    const first: Diagnostics = {
      wiring: WiringRead.NotHanded(),
      activity: [],
      hydration: {
        dehydrated: 0,
        seeded: 0,
        rechecked: 0,
        mismatched: 0,
        drops: [],
      },
      portCalls: emptyLog,
      questions: [],
    };
    const variants: ReadonlyArray<[string, Diagnostics]> = [
      ["wiring", { ...first, wiring: WiringRead.Failed({ reason: "x" }) }],
      [
        "activity",
        {
          ...first,
          activity: [{ port: "AttributeResolver", calls: 1, translationCalls: 0, retries: 0, timeouts: 0 }],
        },
      ],
      ["hydration", { ...first, hydration: first.hydration && { ...first.hydration, seeded: 1 } }],
      ["portCalls", { ...first, portCalls: { ...emptyLog, dropped: 3 } }],
      ["questions", { ...first, questions: [{ policy: hasRole("Editor") }] }],
    ];
    for (const [field, next] of variants) {
      const store = makeDiagnosticsStore();
      store.accept(first);
      const seen = counted(store);
      store.accept(next);
      assert.strictEqual(seen.notified, 1, field);
    }
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

  it.effect("honours a schedule override", () =>
    Effect.gen(function* () {
      const { state, collector } = scriptedCollector();
      const fiber = yield* start(makeDiagnosticsStore(), {
        collector,
        schedule: Schedule.spaced("500 millis"),
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
      assert.isUndefined(reading.questions);
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

  it.effect("questions are re-read every tick and keep their identity while equal", () =>
    Effect.gen(function* () {
      const asked: Array<{ readonly policy: Policy }> = [];
      const store = makeDiagnosticsStore();
      const fiber = yield* start(store, {
        // A fresh array of fresh, structurally built policies on every read,
        // the way `atoms.asked()` answers.
        questions: () => asked.map((question) => ({ policy: question.policy })),
      });
      const first = store.getSnapshot().questions;
      assert.deepStrictEqual(first, []);
      yield* TestClock.adjust("2 seconds");
      assert.strictEqual(store.getSnapshot().questions, first);

      asked.push({ policy: hasRole("Editor") });
      yield* TestClock.adjust("2 seconds");
      const second = store.getSnapshot().questions;
      assert.notStrictEqual(second, first);
      assert.strictEqual(second?.length, 1);

      asked[0] = { policy: hasRole("Editor") };
      yield* TestClock.adjust("2 seconds");
      assert.strictEqual(store.getSnapshot().questions, second);
      yield* Fiber.interrupt(fiber);
    }),
  );
});
