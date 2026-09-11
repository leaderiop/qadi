import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as FastCheck from "fast-check";
import { evaluatePredicate, type Predicate } from "@qadi/core";
import { compilePrismaWhere } from "../src/index.ts";
import { matchesPrismaWhere } from "./matchesPrismaWhere.ts";
import { matchesPrismaWhereEngine } from "./matchesPrismaWhereEngine.ts";

type Row = Record<string, unknown>;

const rows: FastCheck.Arbitrary<Row> = FastCheck.record({
  tenantId: FastCheck.constantFrom("t-1", "t-2"),
  level: FastCheck.oneof(
    FastCheck.integer({ min: 0, max: 5 }),
    FastCheck.constantFrom("3", "0"),
    FastCheck.constant(null),
  ),
  tag: FastCheck.constantFrom("red", "blue", "green"),
  sealed: FastCheck.boolean(),
});

/** Only safe-value shapes: an unsafe value is `compilePrismaWhere`'s refusal path, tested separately. */
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
  FastCheck.constant<Predicate>({ _tag: "Compare", column: "missing", op: "Eq", value: "x" }),
  FastCheck.subarray(["red", "blue", "green"]).map(
    (vs): Predicate => ({ _tag: "MemberOf", column: "tag", values: vs }),
  ),
  FastCheck.constant<Predicate>({ _tag: "MemberOf", column: "tag", values: [] }),
  // `level` can be `null` in a generated row (above) — these leaves are what
  // caught INV-QD-048's original NULL-handling defect. Neither `matchesPrismaWhere`
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
);

/**
 * The non-finite operands `leaf` deliberately does not produce (CCR-QD-115).
 *
 * `isSafeValue` here has excluded `NaN`/`±Infinity` since ticket 138, so these
 * are `compilePrismaWhere`'s refusal path and cannot live in `leaf` — the two
 * agreement properties below need a `WhereInput` to interpret. What this
 * package gains from fuzzing them is the same thing `@qadi/predicate-sql`
 * gained by adopting the guard (issue #65): the refusal is now a *property*
 * over whole trees rather than three hand-written examples in
 * `CompilePrismaWhere.test.ts`, so a widening of `isSafeValue` cannot pass
 * unnoticed here either.
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
const mixedTree: FastCheck.Arbitrary<Predicate> = treeOf(FastCheck.oneof(leaf, nonFiniteLeaf));

const isNonFinite = (value: unknown): boolean =>
  typeof value === "number" && !Number.isFinite(value);

/**
 * Whether any operand anywhere in the tree is a non-finite number.
 *
 * The justification half of the refusal property: a compiler that refused
 * every predicate would satisfy "never emits a non-finite filter value" and
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

/**
 * Whether a compiled `WhereInput` carries a non-finite number anywhere.
 *
 * Unlike `@qadi/predicate-sql`, whose values all arrive in one flat `params`
 * array, a Prisma filter nests its operands inside the object it emits — so
 * this walks the emitted structure rather than reading a list.
 */
const emitsNonFinite = (value: unknown): boolean => {
  if (isNonFinite(value)) return true;
  if (Array.isArray(value)) return value.some(emitsNonFinite);
  if (typeof value === "object" && value !== null) {
    return Object.values(value).some(emitsNonFinite);
  }
  return false;
};

describe("INV-QD-048: a compiled Prisma WhereInput admits exactly the rows the predicate admits", () => {
  it.effect("PROPERTY: matchesPrismaWhere(compilePrismaWhere(P), R) equals evaluatePredicate(P, R)", () =>
    Effect.gen(function* () {
      const predicates = FastCheck.sample(tree, { numRuns: 150, seed: 4096 });
      const sample = FastCheck.sample(rows, { numRuns: 12, seed: 4096 });

      for (const predicate of predicates) {
        const where = yield* compilePrismaWhere(predicate);
        for (const row of sample) {
          assert.strictEqual(
            matchesPrismaWhere(where, row),
            evaluatePredicate(predicate, row),
            JSON.stringify({ predicate, row, where }),
          );
        }
      }
    }));

  // C1 (issue 34, CCR-QD-111): `matchesPrismaWhere` above implements JS
  // `.every`/`.some` at every depth — the same semantics `renderNode`
  // wrongly assumed before this fix, so it cannot see the difference
  // between a correct render and one that nests a vacuous identity where
  // Prisma's real engine silently drops or fails to negate it. The `tree`
  // generator already produces `And`/`Or`/`Negate` nodes containing `True`/
  // `False`/empty-`MemberOf` leaves at every depth — exactly the shapes C1
  // was about — so this is the same sample, checked against
  // `matchesPrismaWhereEngine` (`./matchesPrismaWhereEngine.ts`), which
  // models Prisma's actual nested-empty-array stripping instead. This
  // property fails against the pre-fix `renderNode` (nested `parts`
  // verbatim) for exactly the predicates C1 describes, and passes here only
  // because `renderNode` now guarantees no vacuous identity is ever nested
  // in what it emits.
  //
  // Trust level of the `Or`-nested case specifically: `matchesPrismaWhereEngine`'s
  // own module doc says plainly that neither Prisma issue #17367 nor #21856
  // exercises a vacuous identity nested inside an `Or` array — both linked
  // repros are `And`-array and `Not` cases. This property's `tree` generator
  // does produce `Or`-nested vacuous shapes (the same `treeOf` builds `And`,
  // `Or`, and `Negate` uniformly), and it passes against those too, but that
  // is a pass against `matchesPrismaWhereEngine`'s *extrapolation* of the
  // `And`/`Not` stripping rule to `Or` — not a pass against a confirmed
  // live-engine repro of the `Or` case, since no live Prisma engine runs in
  // CI. A future reader relying on this property to mean "verified against a
  // real engine" for the `Or` branch specifically would be trusting more
  // than this test, or its interpreter, actually establishes.
  it.effect(
    "PROPERTY: matchesPrismaWhereEngine(compilePrismaWhere(P), R) equals evaluatePredicate(P, R)",
    () =>
      Effect.gen(function* () {
        const predicates = FastCheck.sample(tree, { numRuns: 150, seed: 4096 });
        const sample = FastCheck.sample(rows, { numRuns: 12, seed: 4096 });

        for (const predicate of predicates) {
          const where = yield* compilePrismaWhere(predicate);
          for (const row of sample) {
            assert.strictEqual(
              matchesPrismaWhereEngine(where, row),
              evaluatePredicate(predicate, row),
              JSON.stringify({ predicate, row, where }),
            );
          }
        }
      }),
  );

  // CCR-QD-115, issue #65. Neither property above can state this one: a
  // non-finite operand has no `WhereInput` to interpret, because `isSafeValue`
  // refuses it. Nor could either have *found* the defect it guards, even had
  // the value been compiled — `matchesPrismaWhere` re-derives `===` from
  // `row`, so a `{level: NaN}` filter reads back exactly as
  // `evaluatePredicate` does and the two agree; it is a real engine that
  // disagrees. So what has to hold is that a non-finite value is refused
  // rather than emitted, asserted in both directions so it cannot pass by
  // refusing everything.
  it.effect("PROPERTY: a non-finite operand is refused, never emitted into a filter", () =>
    Effect.gen(function* () {
      const predicates = FastCheck.sample(mixedTree, { numRuns: 200, seed: 4096 });
      const sample = FastCheck.sample(rows, { numRuns: 12, seed: 4096 });

      let refusals = 0;
      let compiled = 0;
      for (const predicate of predicates) {
        const result = yield* Effect.result(compilePrismaWhere(predicate));
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
        const where = result.success;
        assert.isFalse(
          emitsNonFinite(where),
          `emitted a non-finite filter value: ${JSON.stringify({ predicate, where })}`,
        );
        // A predicate that survives the gate must still agree row by row —
        // the mixed tree is not a licence to stop checking the invariant
        // this file exists for.
        for (const row of sample) {
          assert.strictEqual(
            matchesPrismaWhereEngine(where, row),
            evaluatePredicate(predicate, row),
            JSON.stringify({ predicate, row, where }),
          );
        }
      }
      // Neither branch may be vacuous: the sample must exercise both.
      assert.isAbove(refusals, 0);
      assert.isAbove(compiled, 0);
    }));
});
