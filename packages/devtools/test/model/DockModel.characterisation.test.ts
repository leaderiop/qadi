/**
 * Pins when the dock model's `diagnostics`, `questions` and `services` stores recompute
 * and notify, through `makeDockModel` alone.
 *
 * Each row builds a model with the existing doubles and reads what the three stores hold
 * and how often they notify: which input moves which store, which does not, the order in
 * which the stores and a host's listeners hear a change, how a listener that throws
 * travels through them, and that a model whose scope closed takes no more into
 * `questions` or `services`.
 *
 * The rows the model's own tests already pin are left there: M21 (no reading keeps one
 * snapshot; a quiet sample notifies nothing), M23 (a reading-only configure notifies
 * once; the same reading notifies nothing), M28 (no reading supplied: the feed's own
 * snapshot), M34 (a supplied list keeps the questions snapshot from `Starting` to
 * `Live`), M47 and J8 (one configure moving the registry and the reading publishes one
 * join), J1 (a host listener on the registry or the diagnostics store reads a joined
 * snapshot), M53 (the `Starting` to `Live` flip recomputes the services view), M54 (a
 * status change that leaves the sampled flag alone keeps it) and M26 (closing the scope
 * records no `Stopped`). What the diagnostics store does after its scope closed is
 * pinned in `DockModel.test.ts`.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Scope from "effect/Scope";
import { makeDockModel } from "../../src/model/DockModel.ts";
import type { DockModel } from "../../src/model/DockModel.ts";
import type { HydrationActivity } from "../../src/model/Hydration.ts";
import type { PortActivity } from "../../src/model/Wiring.ts";
import { makeCollectorDouble } from "../collectorDouble.ts";
import {
  activityOf,
  askingIds,
  guard,
  heardOf,
  logOf,
  rowOf,
  tick,
  wiringNamed,
} from "../dockModelFixtures.ts";
import { makeGateRegistryDouble } from "../gateRegistryDouble.ts";
import { readPolicy, settleTurns, thrownBy } from "../helpers.ts";

const suppliedActivity: ReadonlyArray<PortActivity> = [
  { port: "AttributeResolver", calls: 1, translationCalls: 0, retries: 0, timeouts: 0 },
];

/** A reading holding every field the services store reads. */
const oneReading = () => ({
  wiring: wiringNamed("one"),
  activity: activityOf(1),
  portCalls: logOf("tier"),
});

/** A counter of one store's notifications, subscribed from now on. */
const heardOn = (store: Pick<DockModel["questions"], "subscribe">) => {
  const heard = { calls: 0 };
  store.subscribe(() => {
    heard.calls += 1;
  });
  return heard;
};

describe("the diagnostics store", () => {
  it.effect("a collector answer that moves under a supplied activity notifies once", () =>
    Effect.gen(function* () {
      const logA = logOf("a");
      const logB = logOf("b");
      const { collector } = makeCollectorDouble((call) => (call === 1 ? logA : logB));
      const model = yield* makeDockModel({
        diagnostics: { collector },
        reading: { activity: suppliedActivity },
      });
      yield* settleTurns;
      const heard = heardOn(model.diagnostics);

      yield* tick;

      assert.strictEqual(heard.calls, 1);
      const { reading } = model.diagnostics.getSnapshot();
      assert.deepStrictEqual(reading.portCalls, logB);
      assert.strictEqual(reading.activity, suppliedActivity);
    }));

  it.effect(
    "a fresh reading literal with the same activity reference notifies once",
    () =>
      Effect.gen(function* () {
        const diagnostics = {};
        const model = yield* makeDockModel({
          diagnostics,
          reading: { activity: suppliedActivity },
        });
        const before = model.diagnostics.getSnapshot();
        const heard = heardOn(model.diagnostics);

        model.configure({ diagnostics, reading: { activity: suppliedActivity } });

        assert.strictEqual(heard.calls, 1);
        assert.notStrictEqual(model.diagnostics.getSnapshot(), before);
        assert.deepStrictEqual(model.diagnostics.getSnapshot(), before);
      }),
  );
});

describe("the questions store", () => {
  it.effect("a guard added to the registry notifies the questions store once", () =>
    Effect.gen(function* () {
      const double = makeGateRegistryDouble();
      const model = yield* makeDockModel({
        gates: double.registry,
        reading: { questions: [{ policy: readPolicy }] },
      });
      const heard = heardOn(model.questions);

      double.add(guard("a", readPolicy));

      assert.strictEqual(heard.calls, 1);
      assert.deepStrictEqual(askingIds(model.questions.getSnapshot()), [["a"]]);
    }));

  it.effect(
    "a configure changing only the supplied questions notifies questions once",
    () =>
      Effect.gen(function* () {
        const model = yield* makeDockModel({ reading: { questions: [] } });
        const heard = heardOn(model.questions);

        model.configure({ reading: { questions: [{ policy: readPolicy }] } });

        assert.strictEqual(heard.calls, 1);
        assert.strictEqual(model.questions.getSnapshot().questions._tag, "Rows");
      }),
  );

  it.effect(
    "new gates and a new reading after the scope closed leave questions unchanged",
    () =>
      Effect.gen(function* () {
        const a = makeGateRegistryDouble([guard("a", readPolicy)]);
        const b = makeGateRegistryDouble([guard("b", readPolicy)]);
        const scope = yield* Scope.make();
        const model = yield* Scope.provide(
          makeDockModel({ gates: a.registry, reading: { questions: [] } }),
          scope,
        );
        yield* Scope.close(scope, Exit.void);
        const before = model.questions.getSnapshot();
        const heard = heardOn(model.questions);

        model.configure({
          gates: b.registry,
          reading: { questions: [{ policy: readPolicy }] },
        });

        assert.strictEqual(model.questions.getSnapshot(), before);
        assert.strictEqual(heard.calls, 0);
      }),
  );
});

describe("the services store", () => {
  it.effect(
    "a configure changing only the wiring recomputes the services view once",
    () =>
      Effect.gen(function* () {
        const diagnostics = {};
        const reading = oneReading();
        const model = yield* makeDockModel({ diagnostics, reading });
        const before = model.services.getSnapshot();
        const heard = heardOf(model);

        model.configure({
          diagnostics,
          reading: { ...reading, wiring: wiringNamed("two") },
        });

        assert.notStrictEqual(model.services.getSnapshot(), before);
        assert.strictEqual(heard.calls, 1);
        assert.strictEqual(rowOf(model).state, "two");
      }),
  );

  it.effect(
    "a configure changing only the activity recomputes the services view once",
    () =>
      Effect.gen(function* () {
        const diagnostics = {};
        const reading = oneReading();
        const model = yield* makeDockModel({ diagnostics, reading });
        const before = model.services.getSnapshot();
        const heard = heardOf(model);

        model.configure({
          diagnostics,
          reading: { ...reading, activity: activityOf(7) },
        });

        assert.notStrictEqual(model.services.getSnapshot(), before);
        assert.strictEqual(heard.calls, 1);
        assert.strictEqual(rowOf(model).activity, "7 calls");
      }),
  );

  it.effect(
    "a configure changing only the call log recomputes the services view once",
    () =>
      Effect.gen(function* () {
        const diagnostics = {};
        const reading = { ...oneReading(), portCalls: logOf() };
        const model = yield* makeDockModel({ diagnostics, reading });
        const before = model.services.getSnapshot();
        const heard = heardOf(model);

        model.configure({
          diagnostics,
          reading: { ...reading, portCalls: logOf("riskScore") },
        });

        assert.notStrictEqual(model.services.getSnapshot(), before);
        assert.strictEqual(heard.calls, 1);
        const { calls } = rowOf(model);
        if (calls._tag !== "Listed") {
          return assert.fail(`expected Listed, got ${calls._tag}`);
        }
        assert.include(calls.calls[0]?.text ?? "", "riskScore");
      }),
  );

  it.effect(
    "a configure changing only the supplied hydration keeps the services view",
    () =>
      Effect.gen(function* () {
        const diagnostics = {};
        const reading = oneReading();
        const hydration: HydrationActivity = {
          dehydrated: 2,
          seeded: 1,
          rechecked: 0,
          mismatched: 0,
          drops: [],
        };
        const model = yield* makeDockModel({ diagnostics, reading });
        const before = model.services.getSnapshot();
        const heard = heardOf(model);

        model.configure({ diagnostics, reading: { ...reading, hydration } });

        assert.strictEqual(model.services.getSnapshot(), before);
        assert.strictEqual(heard.calls, 0);
      }),
  );

  it.effect(
    "a configure changing only the supplied questions keeps the services view",
    () =>
      Effect.gen(function* () {
        const diagnostics = {};
        const reading = oneReading();
        const model = yield* makeDockModel({ diagnostics, reading });
        const before = model.services.getSnapshot();
        const heard = heardOf(model);

        model.configure({
          diagnostics,
          reading: { ...reading, questions: [{ policy: readPolicy }] },
        });

        assert.strictEqual(model.services.getSnapshot(), before);
        assert.strictEqual(heard.calls, 0);
      }),
  );

  it.effect(
    "a new wiring after the scope closed leaves the services view unchanged",
    () =>
      Effect.gen(function* () {
        const reading = oneReading();
        const scope = yield* Scope.make();
        const model = yield* Scope.provide(makeDockModel({ reading }), scope);
        yield* Scope.close(scope, Exit.void);
        const before = model.services.getSnapshot();
        const heard = heardOf(model);

        model.configure({ reading: { ...reading, wiring: wiringNamed("two") } });

        assert.strictEqual(model.services.getSnapshot(), before);
        assert.strictEqual(heard.calls, 0);
      }),
  );
});

describe("the order of the stores and their listeners", () => {
  it.effect(
    "a diagnostics listener reads the services view of the reading it was told",
    () =>
      Effect.gen(function* () {
        const diagnostics = {};
        const reading = oneReading();
        const model = yield* makeDockModel({ diagnostics, reading });
        const told: Array<string> = [];
        model.diagnostics.subscribe(() => {
          told.push(rowOf(model).state);
        });

        model.configure({
          diagnostics,
          reading: { ...reading, wiring: wiringNamed("two") },
        });

        assert.deepStrictEqual(told, ["two"]);
      }),
  );

  it.effect(
    "a throwing questions listener lets services and diagnostics move, then escapes",
    () =>
      Effect.gen(function* () {
        const reading = { ...oneReading(), questions: [] };
        const model = yield* makeDockModel({ reading });
        const boom = new Error("questions listener");
        model.questions.subscribe(() => {
          throw boom;
        });
        const services = heardOf(model);
        const diagnostics = heardOn(model.diagnostics);

        const { threw, thrown } = thrownBy(() =>
          model.configure({
            reading: {
              ...reading,
              wiring: wiringNamed("two"),
              questions: [{ policy: readPolicy }],
            },
          }),
        );

        assert.isTrue(threw);
        assert.strictEqual(thrown, boom);
        assert.strictEqual(services.calls, 1);
        assert.strictEqual(rowOf(model).state, "two");
        assert.strictEqual(diagnostics.calls, 1);
      }),
  );

  it.effect(
    "a guard and three reading configures notify the stores in one fixed order",
    () =>
      Effect.gen(function* () {
        const double = makeGateRegistryDouble();
        const first = { ...oneReading(), questions: [{ policy: readPolicy }] };
        const model = yield* makeDockModel({ gates: double.registry, reading: first });
        const heard: Array<string> = [];
        model.diagnostics.subscribe(() => heard.push("diagnostics"));
        model.questions.subscribe(() => heard.push("questions"));
        model.services.subscribe(() => heard.push("services"));

        double.add(guard("a", readPolicy));
        const second = { ...first, activity: activityOf(2) };
        model.configure({ gates: double.registry, reading: second });
        const third = { ...second, questions: [{ policy: readPolicy }] };
        model.configure({ gates: double.registry, reading: third });
        model.configure({ gates: double.registry, reading: third });

        assert.deepStrictEqual(heard, [
          "questions",
          "services",
          "diagnostics",
          "questions",
          "diagnostics",
        ]);
      }),
  );
});

describe("closing the scope", () => {
  it.effect(
    "closing the scope notifies none of the diagnostics, questions or services",
    () =>
      Effect.gen(function* () {
        const double = makeGateRegistryDouble([guard("a", readPolicy)]);
        const scope = yield* Scope.make();
        const model = yield* Scope.provide(
          makeDockModel({
            diagnostics: {},
            gates: double.registry,
            questions: () => [{ policy: readPolicy }],
            reading: oneReading(),
          }),
          scope,
        );
        yield* settleTurns;
        const heard = { calls: 0 };
        const hear = () => {
          heard.calls += 1;
        };
        model.diagnostics.subscribe(hear);
        model.questions.subscribe(hear);
        model.services.subscribe(hear);

        yield* Scope.close(scope, Exit.void);

        assert.strictEqual(heard.calls, 0);
      }),
  );
});
