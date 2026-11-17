import { assert, describe, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Metric from "effect/Metric";
import type * as Tracer from "effect/Tracer";
import type { Predicate } from "../src/Predicate.ts";
import { compilePredicate } from "../src/RenderablePredicate.ts";
import type {
  CompileOutcomes,
  CompilePredicateOptions,
  FiniteGuard,
  NullGuard,
  RenderableNode,
} from "../src/RenderablePredicate.ts";
import { collectingTracer, isolatedMetrics } from "./helpers.ts";

// `compilePredicate` is core's compile shell (BEH-QD-596). The dialect packages pin
// it through their own public entry points; these tests pin it where Stryker scores
// it, with a stand-in renderer and two scratch counters. The ids are not `qadi_*`: a
// test never declares one (`[metric-declaration]`, ADR-QD-123).
const outcomes: CompileOutcomes = {
  compiled: Metric.counter("test_compile_shell_compiled"),
  refused: Metric.counter("test_compile_shell_refused"),
};
const counts = Effect.gen(function* () {
  return {
    compiled: (yield* Metric.value(outcomes.compiled)).count,
    refused: (yield* Metric.value(outcomes.refused)).count,
  };
});

const RULES = {
  reservedColumns: new Set<string>(),
  nullability: { _tag: "Unknown" },
  negation: "TwoValued",
  finiteness: { _tag: "Unknown" },
  finiteExclusion: "Expressible",
} as const;

const eq = (column: string, value: unknown): Predicate => ({ _tag: "Compare", column, op: "Eq", value });
const memberOf = (column: string, values: ReadonlyArray<unknown>): Predicate => ({ _tag: "MemberOf", column, values });

describe("compilePredicate — the compile shell (BEH-QD-596)", () => {
  it.effect("hands the classified tree to render and returns what render returns, counting compiled once", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const seen: Array<RenderableNode> = [];
        const marker = { rendered: true };
        const out = yield* compilePredicate(eq("a", 1), {
          rules: RULES,
          outcomes,
          render: (node) => {
            seen.push(node);
            return marker;
          },
        });
        assert.strictEqual(out, marker);
        assert.deepStrictEqual(seen, [{ _tag: "Equals", column: "a", negated: false, value: 1, nullGuard: "None" }]);
        assert.deepStrictEqual(yield* counts, { compiled: 1, refused: 0 });
      }),
    ));

  it.effect("a refusal counts refused once, never calls render and never counts compiled", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        let rendered = 0;
        const failure = yield* Effect.flip(
          compilePredicate(eq("a", { bad: 1 }), { rules: RULES, outcomes, render: () => (rendered += 1) }),
        );
        assert.strictEqual(failure._tag, "PredicateNotRenderable");
        assert.strictEqual(failure.refusal, "UnsafeValue");
        assert.strictEqual(rendered, 0);
        assert.deepStrictEqual(yield* counts, { compiled: 0, refused: 1 });
      }),
    ));

  it.effect("identifiers defaults to Ascii and is overridable", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const render = () => "ok";
        const refusal = yield* Effect.flip(compilePredicate(eq("é", 1), { rules: RULES, outcomes, render }));
        assert.strictEqual(refusal.refusal, "UnsafeColumn");
        assert.strictEqual(
          yield* compilePredicate(eq("é", 1), { rules: RULES, outcomes, render, identifiers: "UnicodeBmp" }),
          "ok",
        );
        // an explicit `undefined` is the default, not a hole (exactOptionalPropertyTypes' `| undefined`)
        const again = yield* Effect.flip(
          compilePredicate(eq("é", 1), { rules: RULES, outcomes, render, identifiers: undefined }),
        );
        assert.strictEqual(again.refusal, "UnsafeColumn");
      }),
    ));

  it.effect("maxInValues defaults to 1000 and is overridable", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const render = () => "ok";
        const members = (n: number) => memberOf("a", Array.from({ length: n }, (_, i) => i));
        assert.strictEqual(yield* compilePredicate(members(1000), { rules: RULES, outcomes, render }), "ok");
        const refusal = yield* Effect.flip(compilePredicate(members(1001), { rules: RULES, outcomes, render }));
        assert.strictEqual(refusal.reason, "1001 values exceeds maxInValues (1000)");
        assert.strictEqual(
          yield* compilePredicate(members(1001), { rules: RULES, outcomes, render, maxInValues: 1001 }),
          "ok",
        );
        const tight = yield* Effect.flip(compilePredicate(members(3), { rules: RULES, outcomes, render, maxInValues: 2 }));
        assert.strictEqual(tight.reason, "3 values exceeds maxInValues (2)");
        const again = yield* Effect.flip(
          compilePredicate(members(1001), { rules: RULES, outcomes, render, maxInValues: undefined }),
        );
        assert.strictEqual(again.refusal, "TooManyValues");
      }),
    ));

  // Each field is flipped from `RULES` to a value that changes what `toRenderable`
  // makes of the probe, so a field the shell dropped or replaced would fail its row.
  it.effect("each of the dialect's five rules reaches toRenderable unchanged", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const node = (predicate: Predicate, rules: CompilePredicateOptions<RenderableNode>["rules"]) =>
          compilePredicate(predicate, { rules, outcomes, render: (n) => n });
        const refusalOf = (predicate: Predicate, rules: CompilePredicateOptions<RenderableNode>["rules"]) =>
          Effect.map(Effect.flip(node(predicate, rules)), (e) => e.refusal);
        const gte = (column: string, value: number): Predicate => ({ _tag: "Compare", column, op: "Gte", value });

        // reservedColumns
        assert.strictEqual(yield* refusalOf(eq("not", 1), { ...RULES, reservedColumns: new Set(["not"]) }), "ReservedColumn");
        // nullability: `Unknown` renders a null comparison, a declared NOT NULL column refuses it
        assert.deepStrictEqual(yield* node(eq("a", null), RULES), { _tag: "IsNull", column: "a", negated: false });
        assert.strictEqual(
          yield* refusalOf(eq("a", null), { ...RULES, nullability: { _tag: "Declared", nullable: new Set() } }),
          "NullOnNonNullableColumn",
        );
        // negation: under one `Negate`, a three-valued target must exclude the NULL row itself
        const negated: Predicate = { _tag: "Negate", predicate: eq("a", 1) };
        const inner = (nullGuard: NullGuard): RenderableNode => ({
          _tag: "Not",
          inner: { _tag: "Equals", column: "a", negated: false, value: 1, nullGuard },
        });
        assert.deepStrictEqual(yield* node(negated, RULES), inner("None"));
        assert.deepStrictEqual(yield* node(negated, { ...RULES, negation: "ThreeValued" }), inner("ExcludeNull"));
        // finiteness: `Unknown` guards a range, a column declared not floating needs no guard
        const range = (finiteGuard: FiniteGuard): RenderableNode => ({
          _tag: "Range",
          column: "a",
          op: "Gte",
          bound: 3,
          nullGuard: "None",
          finiteGuard,
        });
        assert.deepStrictEqual(yield* node(gte("a", 3), RULES), range("ExcludeNonFinite"));
        assert.deepStrictEqual(
          yield* node(gte("a", 3), { ...RULES, finiteness: { _tag: "Declared", floating: new Set() } }),
          range("None"),
        );
        // finiteExclusion: a range that needs the guard refuses where the target cannot express it
        assert.strictEqual(
          yield* refusalOf(gte("a", 3), { ...RULES, finiteExclusion: "Inexpressible" }),
          "NonFiniteColumn",
        );
      }),
    ));

  it.effect("a defect in classification or in render counts neither outcome", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const hostile: Predicate = {
          _tag: "And",
          get predicates(): ReadonlyArray<Predicate> {
            throw new Error("boom");
          },
        };
        const inClassify = yield* Effect.exit(compilePredicate(hostile, { rules: RULES, outcomes, render: () => "ok" }));
        assert.isTrue(Exit.isFailure(inClassify) && Cause.hasDies(inClassify.cause));
        const inRender = yield* Effect.exit(
          compilePredicate(eq("a", 1), {
            rules: RULES,
            outcomes,
            render: () => {
              throw new Error("boom");
            },
          }),
        );
        assert.isTrue(Exit.isFailure(inRender) && Cause.hasDies(inRender.cause));
        assert.deepStrictEqual(yield* counts, { compiled: 0, refused: 0 });
      }),
    ));

  it.effect("adds no span: only toRenderable's, under the caller's", () => {
    const spans: Array<Tracer.Span> = [];
    return Effect.gen(function* () {
      yield* compilePredicate(eq("a", 1), { rules: RULES, outcomes, render: () => "ok" });
      assert.deepStrictEqual(
        spans.map((s) => s.name),
        ["qadi.predicate.toRenderable"],
      );
    }).pipe(Effect.provide(collectingTracer(spans)), isolatedMetrics);
  });

  it.effect("each run of the returned Effect counts once and calls render once", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        let rendered = 0;
        const program = compilePredicate(eq("a", 1), { rules: RULES, outcomes, render: () => (rendered += 1) });
        assert.strictEqual(rendered, 0);
        assert.strictEqual(yield* program, 1);
        assert.strictEqual(yield* program, 2);
        assert.deepStrictEqual(yield* counts, { compiled: 2, refused: 0 });
      }),
    ));
});
