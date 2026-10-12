import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Metric from "effect/Metric";
import { collectingLogger } from "../src/CollectingLogger.ts";
import { isolatedMetrics } from "../src/IsolatedMetrics.ts";

describe("isolatedMetrics", () => {
  it.effect("a metric updated inside is untouched outside, and starts at zero inside", () =>
    Effect.gen(function* () {
      const counter = Metric.counter("observation_isolated_total");
      yield* Metric.update(counter, 4);

      const inside = yield* isolatedMetrics(
        Effect.gen(function* () {
          const before = (yield* Metric.value(counter)).count;
          yield* Metric.update(counter, 1);
          return { before, after: (yield* Metric.value(counter)).count };
        }),
      );

      assert.deepStrictEqual(inside, { before: 0, after: 1 });
      assert.strictEqual((yield* Metric.value(counter)).count, 4);
    }));

  it.effect("isolates an attributed view of a metric already touched elsewhere", () =>
    Effect.gen(function* () {
      const view = Metric.withAttributes(Metric.counter("observation_view_total"), {
        outcome: "x",
      });
      yield* Metric.update(view, 2);

      const inside = yield* isolatedMetrics(
        Effect.gen(function* () {
          yield* Metric.update(view, 1);
          return (yield* Metric.value(view)).count;
        }),
      );

      assert.strictEqual(inside, 1);
      assert.strictEqual((yield* Metric.value(view)).count, 2);
    }));
});

describe("collectingLogger", () => {
  it.effect("captures the message, the level and the annotations of each line, in order", () =>
    Effect.gen(function* () {
      const { lines, layer } = collectingLogger();

      yield* Effect.logWarning("first").pipe(
        Effect.annotateLogs({ requestId: "r1" }),
        Effect.andThen(Effect.logInfo("second")),
        Effect.provide(layer),
      );

      assert.deepStrictEqual(
        lines.map((l) => [l.message, l.level, l.annotations]),
        [
          [["first"], "Warn", { requestId: "r1" }],
          [["second"], "Info", {}],
        ],
      );
    }));

  it.effect("a second call collects independently", () =>
    Effect.gen(function* () {
      const a = collectingLogger();
      const b = collectingLogger();

      yield* Effect.logInfo("a").pipe(Effect.provide(a.layer));
      yield* Effect.logInfo("b").pipe(Effect.provide(b.layer));

      assert.deepStrictEqual(
        a.lines.map((l) => l.message),
        [["a"]],
      );
      assert.deepStrictEqual(
        b.lines.map((l) => l.message),
        [["b"]],
      );
    }));
});
