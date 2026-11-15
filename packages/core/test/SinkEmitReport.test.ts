/**
 * Pins that a decision sink's failure is contained and reported once, through the public entry points.
 *
 * On the phase base `sinkEmitter` contained every cause and reported none, so a
 * user-written sink that died, threw or interrupted itself lost records with no
 * log at all, and one whose `record` threw before it returned an effect was not
 * contained at all (ARCH-93, INV-QD-035). Each row drives one record kind
 * through `evaluate` (a `Decision` record) or `enforce`'s obligation discharge
 * (an `Obligations` record), the emitter's only two callers, and counts the
 * lines with `collectingLogger`, never `console`.
 *
 * The named sinks are built as a `const` before they reach `Layer.succeed`, so
 * this file compiles on the base, where `DecisionSinkShape` has no `name`, and
 * its RED is the behaviour's rather than the compiler's.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import { attributeResolverPort } from "../src/AttributeResolver.ts";
import { isAllowed } from "../src/Decision.ts";
import type { SinkRecord } from "../src/DecisionRecord.ts";
import { DecisionSink } from "../src/DecisionSink.ts";
import { evaluate } from "../src/Evaluate.ts";
import * as M from "../src/Matcher.ts";
import { obligation } from "../src/Obligation.ts";
import { permission } from "../src/Permission.ts";
import { PortReply } from "../src/PortDescription.ts";
import { scriptedPort } from "../src/PortDoubles.ts";
import * as P from "../src/Policy.ts";
import { enforce } from "../src/Qadi.ts";
import { collectingLogger, subjectWith, testLayer } from "./helpers.ts";
import type { CapturedLog } from "./helpers.ts";

const REPORT = "qadi: a decision sink failed; the record was not delivered";

/** What a report must never carry: the question's own content, not just the sink's. */
const WITHHELD = ["subjectid", "resource", "resourceid", "policy", "action"];

const read = permission("doc", "read");
const allowed = subjectWith({ permissions: ["doc:read"] });
const brokenAttributes = scriptedPort(attributeResolverPort, () => PortReply.fail("store offline")).layer;

/** The verdict reached with no sink at all: the baseline every row must match. */
const baseline = evaluate(P.hasPermission(read));
const obliged = P.obliged(obligation("audit.log"), P.hasPermission(read));
const discharged = enforce(obliged, { onObligations: () => Effect.void })(Effect.succeed("ran"));

/**
 * A sink that remembers every record it is handed and then runs `fail`, for the
 * records tagged `only` when given, and succeeds for the rest.
 */
const failingSink = (fail: Effect.Effect<void>, only?: SinkRecord["_tag"]) => {
  const handed: Array<SinkRecord> = [];
  const layer = Layer.succeed(DecisionSink, {
    record: (record) =>
      Effect.sync(() => {
        handed.push(record);
      }).pipe(
        Effect.andThen(only === undefined || record._tag === only ? fail : Effect.void),
      ),
  });
  return { handed, layer };
};

/**
 * A typed failure that gets past the `never` error channel through a type
 * predicate (D-14a). The predicate reads its parameter, so it is neither an
 * unused parameter nor a type assertion, and it is true at runtime.
 */
const isNever = (value: unknown): value is never => Object.is(value, value);
const leak = new Error("typed failure leaked");
const escaped: Effect.Effect<void> = isNever(leak) ? Effect.fail(leak) : Effect.void;

interface ExpectedReport {
  readonly sink: string;
  readonly recordTag: string;
  readonly evaluationId: string | undefined;
  readonly cause: string;
}

const assertReport = (line: CapturedLog | undefined, expected: ExpectedReport): void => {
  assert.isDefined(line);
  if (line === undefined) return;
  assert.strictEqual(line.level, "Warn");
  assert.strictEqual(String(line.message), REPORT);
  assert.strictEqual(line.annotations["qadi.sink"], expected.sink);
  assert.strictEqual(line.annotations["qadi.record_tag"], expected.recordTag);
  assert.isDefined(expected.evaluationId);
  assert.strictEqual(line.annotations["evaluationId"], expected.evaluationId);
  assert.include(String(line.annotations["qadi.cause"]), expected.cause);
  for (const key of Object.keys(line.annotations)) {
    assert.isFalse(
      WITHHELD.some((word) => key.toLowerCase().includes(word)),
      `the report carries an annotation named ${key}`,
    );
  }
};

const assertOneReport = (lines: ReadonlyArray<CapturedLog>, expected: ExpectedReport): void => {
  assert.strictEqual(lines.length, 1);
  assertReport(lines[0], expected);
};

/** Evaluates under `sink` and returns what was logged; the allow must equal the baseline's. */
const decideUnder = (sink: Layer.Layer<DecisionSink>) =>
  Effect.gen(function* () {
    const logs = collectingLogger();
    const expected = yield* baseline;
    const actual = yield* baseline.pipe(Effect.provide(Layer.merge(sink, logs.layer)));
    assert.isTrue(isAllowed(actual));
    assert.deepStrictEqual(actual.trace, expected.trace);
    return logs.lines;
  });

/** Runs a discharged obliged allow under `sink` and returns what was logged. */
const dischargeUnder = (sink: Layer.Layer<DecisionSink>) =>
  Effect.gen(function* () {
    const logs = collectingLogger();
    const out = yield* discharged.pipe(Effect.provide(Layer.merge(sink, logs.layer)));
    assert.strictEqual(out, "ran");
    return logs.lines;
  });

const firstTagged = (handed: ReadonlyArray<SinkRecord>, tag: SinkRecord["_tag"]): string | undefined =>
  handed.find((record) => record._tag === tag)?.evaluationId;

describe("a sink that fails is reported once, through evaluate (EMIT-01, EMIT-02)", () => {
  it.effect("E1: a sink that dies is reported once, as unnamed, and the allow is unchanged", () =>
    Effect.gen(function* () {
      const sink = failingSink(Effect.die(new Error("sink defect")));
      const lines = yield* decideUnder(sink.layer);
      assertOneReport(lines, {
        sink: "unnamed",
        recordTag: "Decision",
        evaluationId: sink.handed[0]?.evaluationId,
        cause: "sink defect",
      });
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("E2: a sink that throws inside Effect.sync is reported once, and the allow is unchanged", () =>
    Effect.gen(function* () {
      const sink = failingSink(
        Effect.sync(() => {
          throw new Error("sink threw");
        }),
      );
      const lines = yield* decideUnder(sink.layer);
      assertOneReport(lines, {
        sink: "unnamed",
        recordTag: "Decision",
        evaluationId: sink.handed[0]?.evaluationId,
        cause: "sink threw",
      });
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("E3: a sink that interrupts itself is reported once, and the allow is unchanged", () =>
    Effect.gen(function* () {
      const sink = failingSink(Effect.interrupt);
      const lines = yield* decideUnder(sink.layer);
      assertOneReport(lines, {
        sink: "unnamed",
        recordTag: "Decision",
        evaluationId: sink.handed[0]?.evaluationId,
        cause: "Interrupt",
      });
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("E4: a typed failure leaked through a type escape is reported once, and the allow is unchanged", () =>
    Effect.gen(function* () {
      const sink = failingSink(escaped);
      const lines = yield* decideUnder(sink.layer);
      assertOneReport(lines, {
        sink: "unnamed",
        recordTag: "Decision",
        evaluationId: sink.handed[0]?.evaluationId,
        cause: "typed failure leaked",
      });
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("E5: a sink whose record throws before returning an effect is reported once, and the allow is unchanged", () =>
    Effect.gen(function* () {
      const handed: Array<SinkRecord> = [];
      const logs = collectingLogger();
      const layer = Layer.succeed(DecisionSink, {
        record: (record) => {
          handed.push(record);
          throw new Error("thrown before an effect");
        },
      });

      const expected = yield* baseline;
      // `Effect.exit`, so the base's death is an assertion failure below, not a defect in the row.
      const exit = yield* Effect.exit(baseline.pipe(Effect.provide(Layer.merge(layer, logs.layer))));

      assert.isTrue(Exit.isSuccess(exit));
      if (Exit.isSuccess(exit)) {
        assert.isTrue(isAllowed(exit.value));
        assert.deepStrictEqual(exit.value.trace, expected.trace);
      }
      assertOneReport(logs.lines, {
        sink: "unnamed",
        recordTag: "Decision",
        evaluationId: handed[0]?.evaluationId,
        cause: "thrown before an effect",
      });
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("E6: a named sink is reported with its name", () =>
    Effect.gen(function* () {
      const handed: Array<SinkRecord> = [];
      const named = {
        name: "billing-audit",
        record: (record: SinkRecord) => {
          handed.push(record);
          return Effect.die(new Error("sink defect"));
        },
      };
      const lines = yield* decideUnder(Layer.succeed(DecisionSink, named));
      assertOneReport(lines, {
        sink: "billing-audit",
        recordTag: "Decision",
        evaluationId: handed[0]?.evaluationId,
        cause: "sink defect",
      });
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("E7: a sink whose name getter throws is reported once, as unnamed, and the allow is unchanged", () =>
    Effect.gen(function* () {
      const handed: Array<SinkRecord> = [];
      const unreadable = {
        get name(): string {
          throw new Error("name getter exploded");
        },
        record: (record: SinkRecord) => {
          handed.push(record);
          return Effect.die(new Error("sink defect"));
        },
      };
      // A name that cannot be read is no name, and the record is still reported.
      const lines = yield* decideUnder(Layer.succeed(DecisionSink, unreadable));
      assertOneReport(lines, {
        sink: "unnamed",
        recordTag: "Decision",
        evaluationId: handed[0]?.evaluationId,
        cause: "sink defect",
      });
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("E8: a sink that dies on the failure path is reported once, and the typed error survives", () =>
    Effect.gen(function* () {
      const sink = failingSink(Effect.die(new Error("sink defect")));
      const logs = collectingLogger();

      const result = yield* Effect.result(
        evaluate(P.hasAttribute("clearance", M.gte(3))).pipe(
          Effect.provide(Layer.merge(sink.layer, logs.layer)),
        ),
      );

      // The original error must survive, not be replaced by the sink's defect.
      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") assert.strictEqual(result.failure._tag, "AttributeResolveError");
      assertOneReport(logs.lines, {
        sink: "unnamed",
        recordTag: "Decision",
        evaluationId: sink.handed[0]?.evaluationId,
        cause: "sink defect",
      });
    }).pipe(Effect.provide(testLayer(subjectWith({}), { AttributeResolver: brokenAttributes }))));

  it.effect("E9: a logger that throws while a failure is reported cannot change the allow", () =>
    Effect.gen(function* () {
      const throwingLogger = Logger.layer([
        Logger.make(() => {
          throw new Error("logger exploded");
        }),
      ]);
      const sink = failingSink(Effect.die(new Error("sink defect")));

      const expected = yield* baseline;
      const exit = yield* Effect.exit(baseline.pipe(Effect.provide(Layer.merge(sink.layer, throwingLogger))));

      assert.isTrue(Exit.isSuccess(exit));
      if (Exit.isSuccess(exit)) {
        assert.isTrue(isAllowed(exit.value));
        assert.deepStrictEqual(exit.value.trace, expected.trace);
      }
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("E10: a sink that records and no sink at all each produce no warning", () =>
    Effect.gen(function* () {
      const recording = failingSink(Effect.void);
      assert.strictEqual((yield* decideUnder(recording.layer)).length, 0);
      assert.strictEqual(recording.handed.length, 1);

      const logs = collectingLogger();
      const actual = yield* baseline.pipe(Effect.provide(logs.layer));
      assert.isTrue(isAllowed(actual));
      assert.strictEqual(logs.lines.length, 0);
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("E11: a sink named with the empty string is reported with the empty string, never as unnamed", () =>
    Effect.gen(function* () {
      const handed: Array<SinkRecord> = [];
      const emptyNamed = {
        name: "",
        record: (record: SinkRecord) => {
          handed.push(record);
          return Effect.die(new Error("sink defect"));
        },
      };
      // An empty name is one the sink chose: annotated as given, never normalised.
      const lines = yield* decideUnder(Layer.succeed(DecisionSink, emptyNamed));
      assertOneReport(lines, {
        sink: "",
        recordTag: "Decision",
        evaluationId: handed[0]?.evaluationId,
        cause: "sink defect",
      });
    }).pipe(Effect.provide(testLayer(allowed))));
});

describe("an interrupted evaluation is not a sink failure (EMIT-01)", () => {
  it.effect("E12: interrupting the evaluation while the sink runs ends as an interrupt and reports nothing", () =>
    Effect.gen(function* () {
      const entered = yield* Deferred.make<void>();
      const logs = collectingLogger();
      const blocked = Layer.succeed(DecisionSink, {
        record: () => Deferred.succeed(entered, undefined).pipe(Effect.andThen(Effect.never)),
      });

      const fiber = yield* Effect.forkChild(baseline.pipe(Effect.provide(Layer.merge(blocked, logs.layer))));
      yield* Deferred.await(entered);
      const exit = yield* Fiber.interrupt(fiber).pipe(Effect.andThen(Fiber.await(fiber)));

      assert.isTrue(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause));
      assert.strictEqual(logs.lines.length, 0);
    }).pipe(Effect.provide(testLayer(allowed))));
});

describe("a sink that fails at the obligation gate is reported once, through enforce (EMIT-01)", () => {
  it.effect("O1: a sink that dies on the Obligations record is reported once, and the discharged allow proceeds", () =>
    Effect.gen(function* () {
      const sink = failingSink(Effect.die(new Error("sink defect")), "Obligations");
      const lines = yield* dischargeUnder(sink.layer);
      assertOneReport(lines, {
        sink: "unnamed",
        recordTag: "Obligations",
        evaluationId: firstTagged(sink.handed, "Obligations"),
        cause: "sink defect",
      });
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("O2: a sink that throws inside Effect.sync on the Obligations record is reported once, and the discharged allow proceeds", () =>
    Effect.gen(function* () {
      const sink = failingSink(
        Effect.sync(() => {
          throw new Error("sink threw");
        }),
        "Obligations",
      );
      const lines = yield* dischargeUnder(sink.layer);
      assertOneReport(lines, {
        sink: "unnamed",
        recordTag: "Obligations",
        evaluationId: firstTagged(sink.handed, "Obligations"),
        cause: "sink threw",
      });
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("O3: a sink that interrupts itself on the Obligations record is reported once, and the discharged allow proceeds", () =>
    Effect.gen(function* () {
      const sink = failingSink(Effect.interrupt, "Obligations");
      const lines = yield* dischargeUnder(sink.layer);
      assertOneReport(lines, {
        sink: "unnamed",
        recordTag: "Obligations",
        evaluationId: firstTagged(sink.handed, "Obligations"),
        cause: "Interrupt",
      });
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("O4: a sink that dies on a Refused obligation record is reported once, and the refusal is unchanged", () =>
    Effect.gen(function* () {
      const sink = failingSink(Effect.die(new Error("sink defect")), "Obligations");
      const logs = collectingLogger();

      const result = yield* Effect.result(
        enforce(obliged)(Effect.succeed(1)).pipe(Effect.provide(Layer.merge(sink.layer, logs.layer))),
      );

      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") assert.strictEqual(result.failure._tag, "UndischargedObligation");
      assertOneReport(logs.lines, {
        sink: "unnamed",
        recordTag: "Obligations",
        evaluationId: firstTagged(sink.handed, "Obligations"),
        cause: "sink defect",
      });
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("O5: a sink that dies on every record of an obliged allow is reported once per record, the Decision record first", () =>
    Effect.gen(function* () {
      const sink = failingSink(Effect.die(new Error("sink defect")));
      const lines = yield* dischargeUnder(sink.layer);

      assert.deepStrictEqual(
        sink.handed.map((record) => record._tag),
        ["Decision", "Obligations"],
      );
      assert.strictEqual(lines.length, 2);
      assertReport(lines[0], {
        sink: "unnamed",
        recordTag: "Decision",
        evaluationId: sink.handed[0]?.evaluationId,
        cause: "sink defect",
      });
      assertReport(lines[1], {
        sink: "unnamed",
        recordTag: "Obligations",
        evaluationId: sink.handed[1]?.evaluationId,
        cause: "sink defect",
      });
    }).pipe(Effect.provide(testLayer(allowed))));
});
