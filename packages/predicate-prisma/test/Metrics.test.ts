import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Metric from "effect/Metric";
import type { Predicate } from "@qadi/core";
import { compilePrismaWhere } from "../src/index.ts";

/** Isolates one test's counts from the process-wide registry every other test shares. */
const isolatedMetrics = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.provideService(Metric.MetricRegistry, new Map()),
    Effect.provideService(Metric.CurrentMetricAttributes, { test: "isolated" }),
  );

type CounterSnapshot = Extract<Metric.Metric.Snapshot, { type: "Counter" }>;
const isCounter = (s: Metric.Metric.Snapshot): s is CounterSnapshot =>
  s.type === "Counter" && s.id === "qadi_predicate_prisma_compiled_total";

describe("qadi_predicate_prisma_compiled_total", () => {
  it.effect("counts a successful compile, tagged 'compiled'", () =>
    Effect.gen(function* () {
      const eq: Predicate = { _tag: "Compare", column: "tenantId", op: "Eq", value: "t-1" };
      const snapshots = yield* isolatedMetrics(
        Effect.gen(function* () {
          yield* compilePrismaWhere(eq);
          return yield* Metric.snapshot;
        }),
      );

      const counter = snapshots.find(isCounter);
      assert.isDefined(counter);
      assert.strictEqual(
        counter?.description,
        "Predicates compiled by @qadi/predicate-prisma's compilePrismaWhere, tagged by outcome.",
      );
      assert.strictEqual(counter?.attributes?.outcome, "compiled");
      assert.strictEqual(counter?.state.count, 1);
    }));

  it.effect("counts a refusal, tagged 'refused' — a distinct entry from 'compiled'", () =>
    Effect.gen(function* () {
      const unsafe: Predicate = { _tag: "Compare", column: "x", op: "Eq", value: { bad: 1 } };
      const snapshots = yield* isolatedMetrics(
        Effect.gen(function* () {
          yield* Effect.result(compilePrismaWhere(unsafe));
          return yield* Metric.snapshot;
        }),
      );

      const counters = snapshots.filter(isCounter);
      const refused = counters.find((c) => c.attributes?.outcome === "refused");
      const compiled = counters.find((c) => c.attributes?.outcome === "compiled");
      assert.isDefined(refused);
      assert.strictEqual(refused?.state.count, 1);
      assert.isUndefined(compiled);
    }));
});
