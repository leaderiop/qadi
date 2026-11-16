import { assert, describe, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Metric from "effect/Metric";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import type * as Tracer from "effect/Tracer";
import type { Predicate, RenderRefusal } from "@qadi/core";
import { collectingTracer, isolatedMetrics } from "@qadi/testing";
import { compiledTotal } from "../src/CompileMetrics.ts";
import { compilePrismaWhere, type CompilePrismaWhereOptions } from "../src/index.ts";
import { FIXTURE_FLOATING, FIXTURE_NULLABLE } from "./fixture.ts";

// Characterisation of `compilePrismaWhere`'s shell, written on the phase base
// (D-08). Every expectation is a literal, never `toRenderable`'s answer.

const eq = (column: string, value: unknown): Predicate => ({ _tag: "Compare", column, op: "Eq", value });
const memberOf = (column: string, values: ReadonlyArray<unknown>): Predicate => ({
  _tag: "MemberOf",
  column,
  values,
});

const compile = (predicate: Predicate, options: Partial<CompilePrismaWhereOptions> = {}) =>
  compilePrismaWhere(predicate, { nullable: FIXTURE_NULLABLE, floating: FIXTURE_FLOATING, ...options });

interface RefusalRow {
  readonly name: string;
  readonly predicate: Predicate;
  readonly options: Partial<CompilePrismaWhereOptions>;
  readonly refusal: RenderRefusal;
  readonly predicateTag: "Compare" | "MemberOf";
  readonly reason: string;
}

// All six `RenderRefusal` members are reachable through this dialect.
const REFUSALS: ReadonlyArray<RefusalRow> = [
  { name: "UnsafeColumn", predicate: eq('x"y', 1), options: {}, refusal: "UnsafeColumn", predicateTag: "Compare", reason: `column 'x"y' is not a safe identifier` },
  { name: "ReservedColumn on a Compare", predicate: eq("AND", 1), options: {}, refusal: "ReservedColumn", predicateTag: "Compare", reason: "column 'AND' is not a safe identifier" },
  { name: "ReservedColumn on a MemberOf", predicate: memberOf("not", [1]), options: {}, refusal: "ReservedColumn", predicateTag: "MemberOf", reason: "column 'not' is not a safe identifier" },
  { name: "UnsafeValue on a Compare", predicate: eq("x", { bad: 1 }), options: {}, refusal: "UnsafeValue", predicateTag: "Compare", reason: "value for column 'x' is not a safe query parameter" },
  { name: "UnsafeValue on a MemberOf", predicate: memberOf("x", [1, { bad: 1 }]), options: {}, refusal: "UnsafeValue", predicateTag: "MemberOf", reason: "a value for column 'x' is not a safe query parameter" },
  { name: "TooManyValues past an explicit maxInValues", predicate: memberOf("x", [1, 2, 3]), options: { maxInValues: 2 }, refusal: "TooManyValues", predicateTag: "MemberOf", reason: "3 values exceeds maxInValues (2)" },
  { name: "TooManyValues past the default maxInValues", predicate: memberOf("x", Array.from({ length: 1001 }, (_, i) => i)), options: {}, refusal: "TooManyValues", predicateTag: "MemberOf", reason: "1001 values exceeds maxInValues (1000)" },
  { name: "NullOnNonNullableColumn", predicate: eq("tenantId", null), options: {}, refusal: "NullOnNonNullableColumn", predicateTag: "Compare", reason: "column 'tenantId' is declared NOT NULL; a null comparison is not renderable" },
  { name: "NonFiniteColumn", predicate: { _tag: "Compare", column: "score", op: "Gte", value: 3 }, options: {}, refusal: "NonFiniteColumn", predicateTag: "Compare", reason: "column 'score' may hold a non-finite number, and this target cannot exclude one from a range" },
  { name: "the leftmost refusal wins", predicate: { _tag: "And", predicates: [eq('x"y', 1), eq("AND", 1)] }, options: {}, refusal: "UnsafeColumn", predicateTag: "Compare", reason: `column 'x"y' is not a safe identifier` },
];

interface CompiledRow {
  readonly name: string;
  readonly predicate: Predicate;
  readonly options: Partial<CompilePrismaWhereOptions>;
  readonly out: Record<string, unknown>;
}

const COMPILED: ReadonlyArray<CompiledRow> = [
  { name: "a plain Compare", predicate: eq("tenantId", "t-1"), options: {}, out: { tenantId: "t-1" } },
  { name: "a Range on a non-floating column", predicate: { _tag: "Compare", column: "level", op: "Gte", value: 3 }, options: {}, out: { level: { gte: 3 } } },
  {
    name: "Negate over Neq on a nullable column: three-valued NOT, null guarded",
    predicate: { _tag: "Negate", predicate: { _tag: "Compare", column: "level", op: "Neq", value: 3 } },
    options: {},
    out: { NOT: { OR: [{ level: { not: 3 } }, { level: null }] } },
  },
  { name: "identifiers: UnicodeBmp admits a non-ASCII column", predicate: eq("é", 1), options: { identifiers: "UnicodeBmp" }, out: { é: 1 } },
  { name: "True is Prisma's vacuous identity", predicate: { _tag: "True" }, options: {}, out: { AND: [] } },
  {
    name: "a vacuous And member is folded away (the renderer's own rule, not the shell's)",
    predicate: { _tag: "And", predicates: [{ _tag: "True" }, eq("tenantId", "t")] },
    options: {},
    out: { AND: [{ tenantId: "t" }] },
  },
  {
    name: "exactly maxInValues (default 1000) members still compile",
    predicate: memberOf("x", Array.from({ length: 1000 }, (_, i) => i)),
    options: {},
    out: { x: { in: Array.from({ length: 1000 }, (_, i) => i) } },
  },
];

const counts = Effect.gen(function* () {
  return {
    compiled: (yield* Metric.value(compiledTotal.compiled)).count,
    refused: (yield* Metric.value(compiledTotal.refused)).count,
  };
});

describe("compilePrismaWhere — the compile shell (BEH-QD-596)", () => {
  for (const row of REFUSALS) {
    it.effect(`${row.name} refuses, moving refused once and compiled never`, () =>
      isolatedMetrics(
        Effect.gen(function* () {
          const result = yield* Effect.result(compile(row.predicate, row.options));
          assert.isTrue(Result.isFailure(result));
          if (Result.isSuccess(result)) return;
          assert.strictEqual(result.failure._tag, "PredicateNotRenderable");
          assert.strictEqual(result.failure.refusal, row.refusal);
          assert.strictEqual(result.failure.predicateTag, row.predicateTag);
          assert.strictEqual(result.failure.reason, row.reason);
          assert.deepStrictEqual(yield* counts, { compiled: 0, refused: 1 });
        }),
      ));
  }
  for (const row of COMPILED) {
    it.effect(`${row.name} compiles, moving compiled once and refused never`, () =>
      isolatedMetrics(
        Effect.gen(function* () {
          assert.deepStrictEqual(yield* compile(row.predicate, row.options), row.out);
          assert.deepStrictEqual(yield* counts, { compiled: 1, refused: 0 });
        }),
      ));
  }

  it.effect("a defect inside classification counts neither outcome", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const hostile: Predicate = {
          _tag: "And",
          get predicates(): ReadonlyArray<Predicate> {
            throw new Error("boom");
          },
        };
        const exit = yield* Effect.exit(compile(hostile));
        assert.isTrue(Exit.isFailure(exit) && Cause.hasDies(exit.cause));
        assert.deepStrictEqual(yield* counts, { compiled: 0, refused: 0 });
      }),
    ));

  it.effect("each call moves the counter exactly once: 3 compiles and 2 refusals are 3 and 2", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        for (let i = 0; i < 3; i++) yield* compile(eq("tenantId", i));
        for (let i = 0; i < 2; i++) yield* Effect.flip(compile(eq("tenantId", { bad: i })));
        assert.deepStrictEqual(yield* counts, { compiled: 3, refused: 2 });
      }),
    ));

  it.effect("the returned Effect is reusable: each run counts once", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const program = compile(eq("tenantId", 1));
        assert.deepStrictEqual(yield* program, { tenantId: 1 });
        assert.deepStrictEqual(yield* program, { tenantId: 1 });
        assert.deepStrictEqual(yield* counts, { compiled: 2, refused: 0 });
      }),
    ));

  it.effect("the span tree is compilePrismaWhere with toRenderable beneath it, and nothing else", () => {
    const spans: Array<Tracer.Span> = [];
    return Effect.gen(function* () {
      yield* compile(eq("tenantId", 1));
      yield* Effect.flip(compile(eq("tenantId", { bad: 1 })));
      assert.deepStrictEqual(
        spans.map((s) => s.name),
        [
          "qadi.predicatePrisma.compilePrismaWhere",
          "qadi.predicate.toRenderable",
          "qadi.predicatePrisma.compilePrismaWhere",
          "qadi.predicate.toRenderable",
        ],
      );
      const [root, child] = spans;
      assert.isTrue(Option.isNone(root?.parent ?? Option.none()));
      assert.strictEqual(Option.getOrUndefined(child?.parent ?? Option.none())?.spanId, root?.spanId);
    }).pipe(Effect.provide(collectingTracer(spans)), isolatedMetrics);
  });
});
