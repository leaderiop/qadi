import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as FastCheck from "effect/testing/FastCheck";
import { evaluatePredicate, type Predicate } from "@qadi/core";
import { compileSql, type SqlDialect } from "../src/index.ts";
import { interpretSqlFragment } from "./sqlInterpreter.ts";

type Row = Record<string, unknown>;

const rows: FastCheck.Arbitrary<Row> = FastCheck.record({
  tenantId: FastCheck.constantFrom("t-1", "t-2"),
  // Not just integers: a well-typed column never reaches the place two
  // interpreters diverge (ADR-QD-024's own lesson). A numeric string is the
  // discriminator between coercing and non-coercing comparisons.
  level: FastCheck.oneof(
    FastCheck.integer({ min: 0, max: 5 }),
    FastCheck.constantFrom("3", "0"),
    FastCheck.constant(null),
  ),
  tag: FastCheck.constantFrom("red", "blue", "green"),
  sealed: FastCheck.boolean(),
});

/** Only safe-value shapes: an unsafe value is `compileSql`'s refusal path, tested separately. */
const leaf: FastCheck.Arbitrary<Predicate> = FastCheck.oneof(
  FastCheck.constant<Predicate>({ _tag: "True" }),
  FastCheck.constant<Predicate>({ _tag: "False" }),
  FastCheck.constantFrom("t-1", "t-2").map(
    (v): Predicate => ({ _tag: "Compare", column: "tenantId", op: "Eq", value: v }),
  ),
  FastCheck.constantFrom("t-1", "t-2").map(
    (v): Predicate => ({ _tag: "Compare", column: "tenantId", op: "Neq", value: v }),
  ),
  FastCheck.integer({ min: 0, max: 5 }).map(
    (n): Predicate => ({ _tag: "Compare", column: "level", op: "Gte", value: n }),
  ),
  FastCheck.integer({ min: 0, max: 5 }).map(
    (n): Predicate => ({ _tag: "Compare", column: "level", op: "Lt", value: n }),
  ),
  FastCheck.constant<Predicate>({ _tag: "Compare", column: "sealed", op: "Eq", value: true }),
  // Absent column: both sides must read `undefined` the same way.
  FastCheck.constant<Predicate>({ _tag: "Compare", column: "missing", op: "Eq", value: "x" }),
  FastCheck.subarray(["red", "blue", "green"]).map(
    (vs): Predicate => ({ _tag: "MemberOf", column: "tag", values: vs }),
  ),
  FastCheck.constant<Predicate>({ _tag: "MemberOf", column: "tag", values: [] }),
  // `level` can be `null` in a generated row (above) — these leaves are what
  // caught INV-QD-047's original NULL-handling defect. Neither `interpretSqlFragment`
  // nor the reference interpreter can find that class of bug without a
  // predicate whose OWN value is null, or whose column can be, compared with
  // Eq/Neq/MemberOf specifically.
  FastCheck.constant<Predicate>({ _tag: "Compare", column: "level", op: "Eq", value: null }),
  FastCheck.constant<Predicate>({ _tag: "Compare", column: "level", op: "Neq", value: null }),
  FastCheck.integer({ min: 0, max: 5 }).map(
    (n): Predicate => ({ _tag: "Compare", column: "level", op: "Eq", value: n }),
  ),
  FastCheck.integer({ min: 0, max: 5 }).map(
    (n): Predicate => ({ _tag: "Compare", column: "level", op: "Neq", value: n }),
  ),
  FastCheck.subarray([0, 1, 2, null]).map(
    (vs): Predicate => ({ _tag: "MemberOf", column: "level", values: vs }),
  ),
  // A non-number Gte/Lt operand: `level` is sometimes the numeric string
  // "3"/"0" (see `rows` above). Both interpreters must agree it's always
  // False, matching this refusal doctrine — this alone would not have caught
  // the pre-fix bug (a real engine coerces the string; this interpreter
  // re-derives via the same typeof check `evaluatePredicate` uses), but it
  // does pin that the fixed rendering ("FALSE", never a real comparison)
  // keeps agreeing going forward.
  FastCheck.constantFrom("3", "0", true, false).map(
    (v): Predicate => ({ _tag: "Compare", column: "level", op: "Gte", value: v }),
  ),
  FastCheck.constantFrom("3", "0", true, false).map(
    (v): Predicate => ({ _tag: "Compare", column: "level", op: "Lt", value: v }),
  ),
);

/**
 * The non-finite operands `leaf` deliberately does not produce (CCR-QD-115).
 *
 * These are `compileSql`'s refusal path now, so they cannot live in `leaf` —
 * the agreement property below needs a fragment to interpret. They are fuzzed
 * separately, by the structural property that no non-finite value ever
 * reaches `params`.
 *
 * Nothing this JS interpreter does could have caught the defect they close:
 * `interpretSqlFragment` re-derives `===` from `row`, so a compiled
 * `"level" = ?` with `NaN` bound reads back exactly as `evaluatePredicate`
 * does and the two agree. It is a real *engine* that disagrees — PostgreSQL
 * documents `NaN = NaN` as TRUE — which is why the property that matters here
 * is about what is bound, not about what this interpreter answers.
 */
const nonFiniteLeaf: FastCheck.Arbitrary<Predicate> = FastCheck.oneof(
  FastCheck.tuple(
    FastCheck.constantFrom("Eq" as const, "Neq" as const, "Gte" as const, "Lt" as const),
    FastCheck.constantFrom(
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ),
  ).map(([op, value]): Predicate => ({ _tag: "Compare", column: "level", op, value })),
  FastCheck.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY).map(
    (v): Predicate => ({ _tag: "MemberOf", column: "level", values: [0, v] }),
  ),
);

const treeOf = (node: FastCheck.Arbitrary<Predicate>): FastCheck.Arbitrary<Predicate> =>
  FastCheck.letrec<{ node: Predicate }>((tie) => ({
    node: FastCheck.oneof(
      { maxDepth: 4, withCrossShrink: true },
      node,
      FastCheck.array(tie("node"), { maxLength: 3 }).map(
        (predicates): Predicate => ({ _tag: "And", predicates }),
      ),
      FastCheck.array(tie("node"), { maxLength: 3 }).map(
        (predicates): Predicate => ({ _tag: "Or", predicates }),
      ),
      tie("node").map((predicate): Predicate => ({ _tag: "Negate", predicate })),
    ),
  })).node;

const tree: FastCheck.Arbitrary<Predicate> = treeOf(leaf);

/** The same shapes, with non-finite operands mixed in at every depth. */
const mixedTree: FastCheck.Arbitrary<Predicate> = treeOf(
  FastCheck.oneof(leaf, nonFiniteLeaf),
);

/** Every number bound as a parameter, however deep the fragment nested. */
const boundNumbers = (params: ReadonlyArray<unknown>): ReadonlyArray<number> =>
  params.filter((p): p is number => typeof p === "number");

const isNonFinite = (value: unknown): boolean =>
  typeof value === "number" && !Number.isFinite(value);

/**
 * Whether any operand anywhere in the tree is a non-finite number.
 *
 * The justification half of the refusal property: a compiler that refused
 * every predicate would satisfy "never binds a non-finite parameter" and
 * nothing else, so a refusal has to point at a value that earned it.
 */
const hasNonFiniteOperand: (self: Predicate) => boolean = Match.type<Predicate>().pipe(
  Match.tagsExhaustive({
    True: () => false,
    False: () => false,
    Compare: (p) => isNonFinite(p.value),
    MemberOf: (p) => p.values.some(isNonFinite),
    And: (p) => p.predicates.some(hasNonFiniteOperand),
    Or: (p) => p.predicates.some(hasNonFiniteOperand),
    Negate: (p) => hasNonFiniteOperand(p.predicate),
  }),
);

const DIALECTS: ReadonlyArray<SqlDialect> = ["postgres", "mysql", "sqlite"];

describe("INV-QD-047: a compiled SQL fragment admits exactly the rows the predicate admits", () => {
  for (const dialect of DIALECTS) {
    it.effect(`PROPERTY: interpretSqlFragment(compileSql(P), R) equals evaluatePredicate(P, R) — ${dialect}`, () =>
      Effect.gen(function* () {
        const predicates = FastCheck.sample(tree, { numRuns: 150, seed: 2048 });
        const sample = FastCheck.sample(rows, { numRuns: 12, seed: 2048 });

        for (const predicate of predicates) {
          const fragment = yield* compileSql(predicate, { dialect });
          for (const row of sample) {
            assert.strictEqual(
              interpretSqlFragment(fragment, row),
              evaluatePredicate(predicate, row),
              JSON.stringify({ dialect, predicate, row, fragment }),
            );
          }
        }
      }),
    );
  }

  // CCR-QD-115, issue #65. The property above cannot state this one: a
  // non-finite operand has no fragment to interpret, because `isSafeValue`
  // refuses it. What has to hold instead is that it is refused *rather than
  // bound* — the pre-fix compiler pushed `NaN` into `params` for `Eq`/`Neq`/
  // `MemberOf` (only `Gte`/`Lt` had a guard, and it folded to `FALSE` rather
  // than refusing), and PostgreSQL documents `NaN = NaN` as TRUE where
  // `evaluatePredicate`'s `===` is false for every row.
  //
  // Stated over the whole tree rather than over bare leaves so a non-finite
  // value nested under And/Or/Negate is covered too, and asserted in both
  // directions: a refusal must be *justified* by an actually non-finite
  // operand, so this cannot pass by refusing everything.
  for (const dialect of DIALECTS) {
    it.effect(`PROPERTY: a non-finite operand is refused, never bound — ${dialect}`, () =>
      Effect.gen(function* () {
        const predicates = FastCheck.sample(mixedTree, { numRuns: 200, seed: 2048 });
        const sample = FastCheck.sample(rows, { numRuns: 12, seed: 2048 });

        let refusals = 0;
        let compiled = 0;
        for (const predicate of predicates) {
          const result = yield* Effect.result(compileSql(predicate, { dialect }));
          if (result._tag === "Failure") {
            refusals += 1;
            assert.strictEqual(result.failure._tag, "PredicateNotRenderable");
            assert.isTrue(
              hasNonFiniteOperand(predicate),
              `refused a predicate with no non-finite operand: ${JSON.stringify(predicate)}`,
            );
            continue;
          }
          compiled += 1;
          const fragment = result.success;
          for (const bound of boundNumbers(fragment.params)) {
            assert.isTrue(
              Number.isFinite(bound),
              `bound a non-finite parameter: ${JSON.stringify({ dialect, predicate, fragment })}`,
            );
          }
          // A predicate that survives the gate must still agree row by row —
          // the mixed tree is not a licence to stop checking the invariant
          // this file exists for.
          for (const row of sample) {
            assert.strictEqual(
              interpretSqlFragment(fragment, row),
              evaluatePredicate(predicate, row),
              JSON.stringify({ dialect, predicate, row, fragment }),
            );
          }
        }
        // Neither branch may be vacuous: the sample must exercise both.
        assert.isAbove(refusals, 0);
        assert.isAbove(compiled, 0);
      }),
    );
  }
});
