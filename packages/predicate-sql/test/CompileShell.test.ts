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
import { compileSql, type CompileSqlOptions, type SqlDialect } from "../src/index.ts";

// Characterisation of `compileSql`'s shell, written on the phase base (D-08): the
// defaults, the refusals, the outputs, the counter and the span tree. Every
// expectation is a literal, never `toRenderable`'s answer, so it still means
// something after the shell moves into core.

const DIALECTS: ReadonlyArray<SqlDialect> = ["postgres", "mysql", "sqlite"];

const eq = (column: string, value: unknown): Predicate => ({ _tag: "Compare", column, op: "Eq", value });
const memberOf = (column: string, values: ReadonlyArray<unknown>): Predicate => ({
  _tag: "MemberOf",
  column,
  values,
});

interface RefusalRow {
  readonly name: string;
  readonly predicate: Predicate;
  readonly options: Omit<CompileSqlOptions, "dialect">;
  readonly refusal: RenderRefusal;
  readonly predicateTag: "Compare" | "MemberOf";
  readonly reason: string;
}

// RenderRefusal has six members; compileSql can reach four. `ReservedColumn`
// needs a non-empty `reservedColumns` and `NonFiniteColumn` needs
// `finiteExclusion: "Inexpressible"`, and SQL declares neither (see the rows below).
const REFUSALS: ReadonlyArray<RefusalRow> = [
  { name: "UnsafeColumn on a Compare", predicate: eq('x"y', 1), options: {}, refusal: "UnsafeColumn", predicateTag: "Compare", reason: `column 'x"y' is not a safe identifier` },
  { name: "UnsafeColumn on a MemberOf, non-ASCII under the default rule", predicate: memberOf("é", [1]), options: {}, refusal: "UnsafeColumn", predicateTag: "MemberOf", reason: "column 'é' is not a safe identifier" },
  { name: "UnsafeValue on a Compare", predicate: eq("x", { bad: 1 }), options: {}, refusal: "UnsafeValue", predicateTag: "Compare", reason: "value for column 'x' is not a safe query parameter" },
  { name: "UnsafeValue on a MemberOf", predicate: memberOf("x", [1, { bad: 1 }]), options: {}, refusal: "UnsafeValue", predicateTag: "MemberOf", reason: "a value for column 'x' is not a safe query parameter" },
  { name: "TooManyValues past an explicit maxInValues", predicate: memberOf("x", [1, 2, 3]), options: { maxInValues: 2 }, refusal: "TooManyValues", predicateTag: "MemberOf", reason: "3 values exceeds maxInValues (2)" },
  { name: "TooManyValues past the default maxInValues", predicate: memberOf("x", Array.from({ length: 1001 }, (_, i) => i)), options: {}, refusal: "TooManyValues", predicateTag: "MemberOf", reason: "1001 values exceeds maxInValues (1000)" },
  { name: "NullOnNonNullableColumn", predicate: eq("a", null), options: { nullable: new Set(["other"]) }, refusal: "NullOnNonNullableColumn", predicateTag: "Compare", reason: "column 'a' is declared NOT NULL; a null comparison is not renderable" },
  { name: "the leftmost refusal wins", predicate: { _tag: "And", predicates: [eq('x"y', 1), eq("x", { bad: 1 })] }, options: {}, refusal: "UnsafeColumn", predicateTag: "Compare", reason: `column 'x"y' is not a safe identifier` },
];

interface CompiledRow {
  readonly name: string;
  readonly predicate: Predicate;
  readonly options: Omit<CompileSqlOptions, "dialect">;
  readonly out: Readonly<Record<SqlDialect, { readonly text: string; readonly params: ReadonlyArray<unknown> }>>;
}

const COMPILED: ReadonlyArray<CompiledRow> = [
  {
    name: "a plain Compare",
    predicate: eq("tenantId", "t-1"),
    options: {},
    out: {
      postgres: { text: '"tenantId" = $1', params: ["t-1"] },
      mysql: { text: "`tenantId` = ?", params: ["t-1"] },
      sqlite: { text: '"tenantId" = ?', params: ["t-1"] },
    },
  },
  {
    name: "a Range carries the finite guard where the dialect needs it",
    predicate: { _tag: "Compare", column: "level", op: "Gte", value: 3 },
    options: {},
    out: {
      postgres: { text: '("level" >= $1 AND "level" - "level" = 0)', params: [3] },
      mysql: { text: "`level` >= ?", params: [3] },
      sqlite: { text: '("level" >= ? AND "level" - "level" = 0)', params: [3] },
    },
  },
  {
    name: "Negate over Neq on a nullable column: two-valued CASE WHEN, null admitted",
    predicate: { _tag: "Negate", predicate: { _tag: "Compare", column: "level", op: "Neq", value: 3 } },
    options: { nullable: new Set(["level"]) },
    out: {
      postgres: { text: 'CASE WHEN (("level" != $1 OR "level" IS NULL)) THEN FALSE ELSE TRUE END', params: [3] },
      mysql: { text: "CASE WHEN ((`level` != ? OR `level` IS NULL)) THEN FALSE ELSE TRUE END", params: [3] },
      sqlite: { text: 'CASE WHEN (("level" != ? OR "level" IS NULL)) THEN FALSE ELSE TRUE END', params: [3] },
    },
  },
  {
    name: "a column named like a Prisma reserved key is fine for SQL (ReservedColumn is unreachable here)",
    predicate: eq("AND", 1),
    options: {},
    out: {
      postgres: { text: '"AND" = $1', params: [1] },
      mysql: { text: "`AND` = ?", params: [1] },
      sqlite: { text: '"AND" = ?', params: [1] },
    },
  },
  {
    name: "identifiers: UnicodeBmp admits a non-ASCII column",
    predicate: eq("é", 1),
    options: { identifiers: "UnicodeBmp" },
    out: {
      postgres: { text: '"é" = $1', params: [1] },
      mysql: { text: "`é` = ?", params: [1] },
      sqlite: { text: '"é" = ?', params: [1] },
    },
  },
  {
    name: "exactly maxInValues (default 1000) members still compile",
    predicate: memberOf("x", Array.from({ length: 1000 }, (_, i) => i)),
    options: {},
    out: {
      postgres: { text: `"x" IN (${Array.from({ length: 1000 }, (_, i) => `$${i + 1}`).join(", ")})`, params: Array.from({ length: 1000 }, (_, i) => i) },
      mysql: { text: `\`x\` IN (${Array.from({ length: 1000 }, () => "?").join(", ")})`, params: Array.from({ length: 1000 }, (_, i) => i) },
      sqlite: { text: `"x" IN (${Array.from({ length: 1000 }, () => "?").join(", ")})`, params: Array.from({ length: 1000 }, (_, i) => i) },
    },
  },
];

const counts = Effect.gen(function* () {
  return {
    compiled: (yield* Metric.value(compiledTotal.compiled)).count,
    refused: (yield* Metric.value(compiledTotal.refused)).count,
  };
});

describe("compileSql — the compile shell (BEH-QD-596)", () => {
  for (const dialect of DIALECTS) {
    for (const row of REFUSALS) {
      it.effect(`${dialect}: ${row.name} refuses, moving refused once and compiled never`, () =>
        isolatedMetrics(
          Effect.gen(function* () {
            const result = yield* Effect.result(compileSql(row.predicate, { dialect, ...row.options }));
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
      it.effect(`${dialect}: ${row.name} compiles, moving compiled once and refused never`, () =>
        isolatedMetrics(
          Effect.gen(function* () {
            const out = yield* compileSql(row.predicate, { dialect, ...row.options });
            assert.deepStrictEqual(out, row.out[dialect]);
            assert.deepStrictEqual(yield* counts, { compiled: 1, refused: 0 });
          }),
        ));
    }
  }

  it.effect("one more than the default maxInValues refuses (the default is 1000, not looser)", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const failure = yield* Effect.flip(compileSql(memberOf("x", new Array(1001).fill(1)), { dialect: "postgres" }));
        assert.strictEqual(failure.refusal, "TooManyValues");
      }),
    ));

  it.effect("a defect inside classification counts neither outcome", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const hostile: Predicate = {
          _tag: "And",
          get predicates(): ReadonlyArray<Predicate> {
            throw new Error("boom");
          },
        };
        const exit = yield* Effect.exit(compileSql(hostile, { dialect: "postgres" }));
        assert.isTrue(Exit.isFailure(exit) && Cause.hasDies(exit.cause));
        assert.deepStrictEqual(yield* counts, { compiled: 0, refused: 0 });
      }),
    ));

  it.effect("each call moves the counter exactly once: 3 compiles and 2 refusals are 3 and 2", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        for (let i = 0; i < 3; i++) yield* compileSql(eq("a", i), { dialect: "mysql" });
        for (let i = 0; i < 2; i++) yield* Effect.flip(compileSql(eq("a", { bad: i }), { dialect: "mysql" }));
        assert.deepStrictEqual(yield* counts, { compiled: 3, refused: 2 });
      }),
    ));

  it.effect("the returned Effect is reusable: each run counts once and owns a fresh params array", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const program = compileSql(eq("a", 1), { dialect: "postgres" });
        const first = yield* program;
        const second = yield* program;
        assert.deepStrictEqual(first, { text: '"a" = $1', params: [1] });
        assert.deepStrictEqual(second, first);
        assert.notStrictEqual(second.params, first.params);
        assert.deepStrictEqual(yield* counts, { compiled: 2, refused: 0 });
      }),
    ));

  it.effect("the span tree is compileSql with toRenderable beneath it, and nothing else", () => {
    const spans: Array<Tracer.Span> = [];
    return Effect.gen(function* () {
      yield* compileSql(eq("a", 1), { dialect: "postgres" });
      yield* Effect.flip(compileSql(eq("a", { bad: 1 }), { dialect: "postgres" }));
      assert.deepStrictEqual(
        spans.map((s) => s.name),
        [
          "qadi.predicateSql.compileSql",
          "qadi.predicate.toRenderable",
          "qadi.predicateSql.compileSql",
          "qadi.predicate.toRenderable",
        ],
      );
      const [root, child] = spans;
      assert.isTrue(Option.isNone(root?.parent ?? Option.none()));
      assert.strictEqual(Option.getOrUndefined(child?.parent ?? Option.none())?.spanId, root?.spanId);
    }).pipe(Effect.provide(collectingTracer(spans)), isolatedMetrics);
  });
});
