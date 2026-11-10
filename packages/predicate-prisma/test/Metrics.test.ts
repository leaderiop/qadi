import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Metric from "effect/Metric";
import type { Predicate } from "@qadi/core";
import { isolatedMetrics } from "@qadi/testing";
import { compiledTotal } from "../src/CompileMetrics.ts";
import { compile } from "./fixture.ts";

describe("qadi_predicate_prisma_compiled_total", () => {
  it.effect("is declared with its documented id, type and description", () =>
    Effect.gen(function* () {
      // The registry key is `type:id:description:attributes` (ADR-QD-052), so
      // these are pinned: Stryker never mutates a module-scope declaration.
      for (const series of [compiledTotal.compiled, compiledTotal.refused]) {
        assert.strictEqual(series.id, "qadi_predicate_prisma_compiled_total");
        assert.strictEqual(series.type, "Counter");
        assert.strictEqual(
          series.description,
          "Predicates compiled by @qadi/predicate-prisma's compilePrismaWhere, tagged by outcome.",
        );
      }
      // The attributes are visible only on a snapshot, which is what an exporter reads.
      const eq: Predicate = { _tag: "Compare", column: "tenantId", op: "Eq", value: "t-1" };
      const snapshots = yield* isolatedMetrics(
        Effect.gen(function* () {
          yield* compile(eq);
          return yield* Metric.snapshot;
        }),
      );
      assert.deepStrictEqual(
        snapshots
          .filter((s) => s.id === "qadi_predicate_prisma_compiled_total")
          .map((s) => s.attributes),
        [{ outcome: "compiled" }],
      );
    }));

  it.effect("counts a successful compile, tagged 'compiled'", () =>
    Effect.gen(function* () {
      const eq: Predicate = { _tag: "Compare", column: "tenantId", op: "Eq", value: "t-1" };
      const { compiled, refused } = yield* isolatedMetrics(
        Effect.gen(function* () {
          yield* compile(eq);
          return {
            compiled: yield* Metric.value(compiledTotal.compiled),
            refused: yield* Metric.value(compiledTotal.refused),
          };
        }),
      );

      assert.strictEqual(compiled.count, 1);
      assert.strictEqual(refused.count, 0);
    }));

  it.effect("counts a refusal, tagged 'refused' — a distinct entry from 'compiled'", () =>
    Effect.gen(function* () {
      const unsafe: Predicate = { _tag: "Compare", column: "x", op: "Eq", value: { bad: 1 } };
      const { compiled, refused } = yield* isolatedMetrics(
        Effect.gen(function* () {
          const failed = yield* Effect.result(compile(unsafe));
          assert.isTrue(failed._tag === "Failure");
          return {
            compiled: yield* Metric.value(compiledTotal.compiled),
            refused: yield* Metric.value(compiledTotal.refused),
          };
        }),
      );

      assert.strictEqual(refused.count, 1);
      assert.strictEqual(compiled.count, 0);
    }));
});
