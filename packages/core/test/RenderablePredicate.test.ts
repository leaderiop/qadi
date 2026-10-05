import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as Result from "effect/Result";
import * as FastCheck from "fast-check";
import { errorCode, PredicateNotRenderable } from "../src/Errors.ts";
import { evaluatePredicate } from "../src/Predicate.ts";
import type { CompareOp, Predicate } from "../src/Predicate.ts";
import { DEFAULT_MAX_IN_VALUES, toRenderable } from "../src/RenderablePredicate.ts";
import type {
  ColumnFiniteness,
  FiniteGuard,
  NullGuard,
  RenderableNode,
  RenderRules,
} from "../src/RenderablePredicate.ts";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const RULES: RenderRules = {
  identifiers: "Ascii",
  reservedColumns: new Set(),
  maxInValues: DEFAULT_MAX_IN_VALUES,
  nullability: { _tag: "Unknown" },
  negation: "TwoValued",
  finiteness: { _tag: "Unknown" },
  finiteExclusion: "Expressible",
};

const declared = (...columns: ReadonlyArray<string>): RenderRules["nullability"] => ({
  _tag: "Declared",
  nullable: new Set(columns),
});

const render = (predicate: Predicate, rules: Partial<RenderRules> = {}) =>
  toRenderable(predicate, { ...RULES, ...rules });

const refusalOf = (predicate: Predicate, rules: Partial<RenderRules> = {}) =>
  Effect.map(Effect.result(render(predicate, rules)), (result) =>
    Result.isFailure(result) ? result.failure : undefined,
  );

const compare = (column: string, op: CompareOp, value: unknown): Predicate => ({
  _tag: "Compare",
  column,
  op,
  value,
});
const memberOf = (column: string, values: ReadonlyArray<unknown>): Predicate => ({
  _tag: "MemberOf",
  column,
  values,
});
const negate = (predicate: Predicate): Predicate => ({ _tag: "Negate", predicate });
const and = (...predicates: ReadonlyArray<Predicate>): Predicate => ({ _tag: "And", predicates });
const or = (...predicates: ReadonlyArray<Predicate>): Predicate => ({ _tag: "Or", predicates });

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

type Row = Readonly<Record<string, unknown>>;

const COLUMNS = ["a", "n", "b"] as const;

/**
 * Every value a table cell could hold, including ones of the wrong type for the
 * column, and the non-finite numbers a float column can hold (CCR-QD-172).
 */
const cell: FastCheck.Arbitrary<unknown> = FastCheck.oneof(
  FastCheck.constantFrom("x", "y", "3", ""),
  FastCheck.constantFrom(0, 1, 3, 5, -2),
  FastCheck.constantFrom(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN),
  FastCheck.boolean(),
  FastCheck.constant(null),
);

const rows: FastCheck.Arbitrary<Row> = FastCheck.record({ a: cell, n: cell, b: cell });

const column: FastCheck.Arbitrary<string> = FastCheck.constantFrom(...COLUMNS);

/** Safe values only: an unsafe one is a refusal, covered by R4. */
const literal: FastCheck.Arbitrary<unknown> = FastCheck.oneof(
  FastCheck.constantFrom("x", "y", "3", ""),
  FastCheck.constantFrom(0, 1, 3, 5, -2, 2.5),
  FastCheck.boolean(),
  FastCheck.constant(null),
);

const safeLeaf: FastCheck.Arbitrary<Predicate> = FastCheck.oneof(
  FastCheck.constant<Predicate>({ _tag: "True" }),
  FastCheck.constant<Predicate>({ _tag: "False" }),
  FastCheck.tuple(column, FastCheck.constantFrom<CompareOp>("Eq", "Neq", "Gte", "Lt"), literal).map(
    ([c, op, value]): Predicate => compare(c, op, value),
  ),
  FastCheck.tuple(column, FastCheck.array(literal, { maxLength: 4 })).map(
    ([c, values]): Predicate => memberOf(c, values),
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

const safeTree = treeOf(safeLeaf);
const predicates = FastCheck.sample(safeTree, { numRuns: 400, seed: 1024 });
const sampleRows = FastCheck.sample(rows, { numRuns: 25, seed: 1024 });

// ---------------------------------------------------------------------------
// A test-only two-valued interpreter of a RenderableNode (R2, R3)
// ---------------------------------------------------------------------------

/**
 * Evaluates a `RenderableNode` in two-valued logic, applying every `NullGuard`
 * and `FiniteGuard` literally. A null guard is a no-op here (R3): it only
 * matters to a target whose comparisons can be UNKNOWN, which
 * `EngineAgreement.test.ts` in each renderer package checks against a real
 * engine.
 *
 * A `Range` compares the way a target's plain `>=`/`<` does — any number,
 * non-finite ones included (PostgreSQL also orders `NaN` above every number) —
 * and only its `finiteGuard` keeps a non-finite cell out. That is the belief the
 * guard exists to correct, so it is modelled rather than assumed away.
 *
 * Rows hold every column (a table has no absent columns), so `undefined` is out
 * of scope here; `Predicate.test.ts` keeps covering it.
 */
const guarded = (guard: NullGuard, cell: unknown, inner: boolean): boolean =>
  Match.value(guard).pipe(
    Match.when("None", () => inner),
    Match.when("AdmitNull", () => inner || cell === null),
    Match.when("ExcludeNull", () => inner && cell !== null),
    Match.exhaustive,
  );

/** What `ExcludeNonFinite` conjoins: the cell is a finite number. */
const finitePasses = (guard: FiniteGuard, cell: number): boolean =>
  Match.value(guard).pipe(
    Match.when("None", () => true),
    Match.when("ExcludeNonFinite", () => Number.isFinite(cell)),
    Match.exhaustive,
  );

/** A target's `>=`, which (like PostgreSQL's) orders `NaN` above every number. */
const targetAtLeast = (cell: number, bound: number): boolean => Number.isNaN(cell) || cell >= bound;

const evaluateRenderable: (node: RenderableNode, row: Row) => boolean = (node, row) =>
  Match.value(node).pipe(
    Match.tagsExhaustive({
      Constant: (n) => n.value,
      IsNull: (n) => (row[n.column] === null) !== n.negated,
      Equals: (n) =>
        guarded(
          n.nullGuard,
          row[n.column],
          n.negated ? row[n.column] !== n.value : row[n.column] === n.value,
        ),
      Range: (n) => {
        const cellValue = row[n.column];
        const inner =
          typeof cellValue === "number" &&
          finitePasses(n.finiteGuard, cellValue) &&
          (n.op === "Gte" ? targetAtLeast(cellValue, n.bound) : !targetAtLeast(cellValue, n.bound));
        return guarded(n.nullGuard, cellValue, inner);
      },
      OneOf: (n) => guarded(n.nullGuard, row[n.column], n.values.some((v) => v === row[n.column])),
      All: (n) => n.parts.every((part) => evaluateRenderable(part, row)),
      Any: (n) => n.parts.some((part) => evaluateRenderable(part, row)),
      Not: (n) => !evaluateRenderable(n.inner, row),
    }),
  );

// ---------------------------------------------------------------------------
// R1-R3: the renderable tree means what the predicate means
// ---------------------------------------------------------------------------

describe("toRenderable preserves evaluatePredicate's meaning (INV-QD-018 one layer down)", () => {
  const variants: ReadonlyArray<readonly [string, Partial<RenderRules>]> = [
    ["Unknown / TwoValued", {}],
    ["Unknown / ThreeValued", { negation: "ThreeValued" }],
  ];

  for (const [name, rules] of variants) {
    it.effect(`R2/R3: the guarded renderable equals the reference on every row, ${name}`, () =>
      Effect.gen(function* () {
        for (const predicate of predicates) {
          const node = yield* render(predicate, rules);
          for (const row of sampleRows) {
            assert.strictEqual(
              evaluateRenderable(node, row),
              evaluatePredicate(predicate, row),
              JSON.stringify({ predicate, row, node }),
            );
          }
        }
      }));
  }

  it.effect("R2: a declaration changes nothing for rows that respect it", () =>
    Effect.gen(function* () {
      // `a` and `b` are declared NOT NULL, so only rows with no NULL there are in scope.
      const nullability = declared("n");
      const conforming = sampleRows.filter((row) => row.a !== null && row.b !== null);
      assert.isAbove(conforming.length, 3);
      let compiled = 0;
      for (const predicate of predicates) {
        for (const negation of ["TwoValued", "ThreeValued"] as const) {
          const result = yield* Effect.result(render(predicate, { nullability, negation }));
          // A null comparison on a NOT NULL column refuses (R7): not in scope here.
          if (Result.isFailure(result)) continue;
          compiled += 1;
          for (const row of conforming) {
            assert.strictEqual(
              evaluateRenderable(result.success, row),
              evaluatePredicate(predicate, row),
              JSON.stringify({ predicate, row, node: result.success }),
            );
          }
        }
      }
      assert.isAbove(compiled, 200);
    }));

  it.effect("R1: a leaf's guard is AdmitNull exactly when the reference admits NULL on it", () =>
    Effect.gen(function* () {
      const leaves = FastCheck.sample(
        FastCheck.oneof(
          FastCheck.tuple(
            column,
            FastCheck.constantFrom<CompareOp>("Eq", "Neq", "Gte", "Lt"),
            literal,
          ).map(([c, op, value]): Predicate => compare(c, op, value)),
          FastCheck.tuple(column, FastCheck.array(literal, { minLength: 1, maxLength: 4 })).map(
            ([c, values]): Predicate => memberOf(c, values),
          ),
        ),
        { numRuns: 300, seed: 31 },
      );
      let admits = 0;
      let denies = 0;
      for (const leaf of leaves) {
        const node = yield* render(leaf);
        if (node._tag !== "Equals" && node._tag !== "Range" && node._tag !== "OneOf") continue;
        const colName = leaf._tag === "Compare" || leaf._tag === "MemberOf" ? leaf.column : "";
        const admitsNull = evaluatePredicate(leaf, { [colName]: null });
        assert.strictEqual(node.nullGuard === "AdmitNull", admitsNull, JSON.stringify({ leaf, node }));
        if (admitsNull) admits += 1;
        else denies += 1;
      }
      assert.isAbove(admits, 0);
      assert.isAbove(denies, 0);
    }));
});

// ---------------------------------------------------------------------------
// Classification, node by node
// ---------------------------------------------------------------------------

describe("toRenderable classifies each predicate tag", () => {
  it.effect("True and False are constants; And/Or/Negate keep their structure with no folding", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(yield* render({ _tag: "True" }), { _tag: "Constant", value: true });
      assert.deepStrictEqual(yield* render({ _tag: "False" }), { _tag: "Constant", value: false });
      assert.deepStrictEqual(yield* render(and()), { _tag: "All", parts: [] });
      assert.deepStrictEqual(yield* render(or()), { _tag: "Any", parts: [] });
      assert.deepStrictEqual(yield* render(and({ _tag: "True" }, { _tag: "False" })), {
        _tag: "All",
        parts: [
          { _tag: "Constant", value: true },
          { _tag: "Constant", value: false },
        ],
      });
      assert.deepStrictEqual(yield* render(negate(negate({ _tag: "True" }))), {
        _tag: "Not",
        inner: { _tag: "Not", inner: { _tag: "Constant", value: true } },
      });
      assert.deepStrictEqual(yield* render(or({ _tag: "False" })), {
        _tag: "Any",
        parts: [{ _tag: "Constant", value: false }],
      });
    }));

  it.effect("Eq and Neq against a non-null literal are Equals, negated for Neq", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(yield* render(compare("a", "Eq", "x")), {
        _tag: "Equals",
        column: "a",
        negated: false,
        value: "x",
        nullGuard: "None",
      });
      assert.deepStrictEqual(yield* render(compare("a", "Neq", 3)), {
        _tag: "Equals",
        column: "a",
        negated: true,
        value: 3,
        nullGuard: "AdmitNull",
      });
      assert.deepStrictEqual(yield* render(compare("a", "Eq", false)), {
        _tag: "Equals",
        column: "a",
        negated: false,
        value: false,
        nullGuard: "None",
      });
    }));

  it.effect("Eq and Neq against null are IsNull", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(yield* render(compare("a", "Eq", null)), {
        _tag: "IsNull",
        column: "a",
        negated: false,
      });
      assert.deepStrictEqual(yield* render(compare("a", "Neq", null)), {
        _tag: "IsNull",
        column: "a",
        negated: true,
      });
    }));

  it.effect("Gte and Lt against a finite number are a Range; against anything else a constant false", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(yield* render(compare("n", "Gte", 3)), {
        _tag: "Range",
        column: "n",
        op: "Gte",
        bound: 3,
        nullGuard: "None",
        finiteGuard: "ExcludeNonFinite",
      });
      assert.deepStrictEqual(yield* render(compare("n", "Lt", -1.5)), {
        _tag: "Range",
        column: "n",
        op: "Lt",
        bound: -1.5,
        nullGuard: "None",
        finiteGuard: "ExcludeNonFinite",
      });
      for (const value of ["10", true, false, null]) {
        for (const op of ["Gte", "Lt"] as const) {
          assert.deepStrictEqual(
            yield* render(compare("n", op, value)),
            { _tag: "Constant", value: false },
            `${op} ${String(value)}`,
          );
        }
      }
    }));

  it.effect("MemberOf is OneOf over its non-null members; a null member is carried by AdmitNull", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(yield* render(memberOf("a", ["x", "y"])), {
        _tag: "OneOf",
        column: "a",
        values: ["x", "y"],
        nullGuard: "None",
      });
      assert.deepStrictEqual(yield* render(memberOf("a", [null, "x", 3])), {
        _tag: "OneOf",
        column: "a",
        values: ["x", 3],
        nullGuard: "AdmitNull",
      });
      assert.deepStrictEqual(yield* render(memberOf("a", [])), { _tag: "Constant", value: false });
      assert.deepStrictEqual(yield* render(memberOf("a", [null])), {
        _tag: "IsNull",
        column: "a",
        negated: false,
      });
      assert.deepStrictEqual(yield* render(memberOf("a", [null, null])), {
        _tag: "IsNull",
        column: "a",
        negated: false,
      });
    }));
});

// ---------------------------------------------------------------------------
// Null guards under negation
// ---------------------------------------------------------------------------

describe("toRenderable's null guards follow negation and polarity", () => {
  const guardOf = (node: RenderableNode): NullGuard | undefined =>
    node._tag === "Equals" || node._tag === "Range" || node._tag === "OneOf"
      ? node.nullGuard
      : undefined;
  const innermost = (node: RenderableNode): RenderableNode =>
    node._tag === "Not" ? innermost(node.inner) : node;

  it.effect("TwoValued needs no help under a Negate", () =>
    Effect.gen(function* () {
      const node = yield* render(negate(compare("n", "Gte", 3)));
      assert.strictEqual(guardOf(innermost(node)), "None");
    }));

  it.effect("ThreeValued guards a leaf the reference denies on NULL under an odd number of Negates", () =>
    Effect.gen(function* () {
      const rules: Partial<RenderRules> = { negation: "ThreeValued" };
      for (const leaf of [compare("n", "Gte", 3), compare("a", "Eq", "x"), memberOf("a", ["x"])]) {
        assert.strictEqual(guardOf(yield* render(leaf, rules)), "None", "positive");
        assert.strictEqual(
          guardOf(innermost(yield* render(negate(leaf), rules))),
          "ExcludeNull",
          "one Negate",
        );
        assert.strictEqual(
          guardOf(innermost(yield* render(negate(negate(leaf)), rules))),
          "None",
          "two Negates",
        );
        assert.strictEqual(
          guardOf(innermost(yield* render(negate(negate(negate(leaf))), rules))),
          "ExcludeNull",
          "three Negates",
        );
      }
    }));

  it.effect("polarity passes through And and Or unchanged", () =>
    Effect.gen(function* () {
      const rules: Partial<RenderRules> = { negation: "ThreeValued" };
      const node = yield* render(
        negate(or(compare("n", "Gte", 3), and(compare("a", "Eq", "x"), negate(compare("b", "Eq", true))))),
        rules,
      );
      assert.deepStrictEqual(node, {
        _tag: "Not",
        inner: {
          _tag: "Any",
          parts: [
            {
              _tag: "Range",
              column: "n",
              op: "Gte",
              bound: 3,
              nullGuard: "ExcludeNull",
              finiteGuard: "ExcludeNonFinite",
            },
            {
              _tag: "All",
              parts: [
                { _tag: "Equals", column: "a", negated: false, value: "x", nullGuard: "ExcludeNull" },
                {
                  _tag: "Not",
                  inner: {
                    _tag: "Equals",
                    column: "b",
                    negated: false,
                    value: true,
                    nullGuard: "None",
                  },
                },
              ],
            },
          ],
        },
      });
    }));

  it.effect("a leaf the reference admits on NULL is AdmitNull at either polarity and either negation", () =>
    Effect.gen(function* () {
      for (const negation of ["TwoValued", "ThreeValued"] as const) {
        for (const leaf of [compare("a", "Neq", "x"), memberOf("a", ["x", null])]) {
          assert.strictEqual(guardOf(yield* render(leaf, { negation })), "AdmitNull");
          assert.strictEqual(
            guardOf(innermost(yield* render(negate(leaf), { negation }))),
            "AdmitNull",
          );
        }
      }
    }));
});

// ---------------------------------------------------------------------------
// R4: refusals
// ---------------------------------------------------------------------------

describe("toRenderable refuses rather than approximates", () => {
  /** An operand no renderer may bind. Stated independently of `isSafeLiteral`. */
  const unsafeValue: FastCheck.Arbitrary<unknown> = FastCheck.oneof(
    FastCheck.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
    FastCheck.constant(new Date("2026-01-01T00:00:00.000Z")),
    FastCheck.constant(undefined),
    FastCheck.constant({ foo: 1 }),
    FastCheck.constant(["a"]),
    FastCheck.constant(() => 1),
  );

  const isUnsafe = (value: unknown): boolean =>
    value === undefined ||
    (typeof value === "number" && !Number.isFinite(value)) ||
    (typeof value === "object" && value !== null) ||
    typeof value === "function";

  const hasUnsafeOperand: (self: Predicate) => boolean = Match.type<Predicate>().pipe(
    Match.tagsExhaustive({
      True: () => false,
      False: () => false,
      Compare: (p) => isUnsafe(p.value),
      MemberOf: (p) => p.values.some(isUnsafe),
      And: (p) => p.predicates.some(hasUnsafeOperand),
      Or: (p) => p.predicates.some(hasUnsafeOperand),
      Negate: (p) => hasUnsafeOperand(p.predicate),
    }),
  );

  const mixedLeaf: FastCheck.Arbitrary<Predicate> = FastCheck.oneof(
    safeLeaf,
    FastCheck.tuple(column, FastCheck.constantFrom<CompareOp>("Eq", "Neq", "Gte", "Lt"), unsafeValue).map(
      ([c, op, value]): Predicate => compare(c, op, value),
    ),
    FastCheck.tuple(column, unsafeValue).map(
      ([c, value]): Predicate => memberOf(c, [1, value]),
    ),
  );

  it.effect("R4: a refusal points at an operand that earned it, and every such operand refuses", () =>
    Effect.gen(function* () {
      const trees = FastCheck.sample(treeOf(mixedLeaf), { numRuns: 400, seed: 55 });
      let refusals = 0;
      let compiled = 0;
      for (const predicate of trees) {
        const result = yield* Effect.result(render(predicate));
        if (Result.isFailure(result)) {
          refusals += 1;
          assert.strictEqual(result.failure.refusal, "UnsafeValue");
          assert.isTrue(hasUnsafeOperand(predicate), JSON.stringify(predicate));
        } else {
          compiled += 1;
          assert.isFalse(hasUnsafeOperand(predicate), JSON.stringify(predicate));
        }
      }
      assert.isAbove(refusals, 0);
      assert.isAbove(compiled, 0);
    }));

  it.effect("an unsafe value refuses with the exact reason text, per tag", () =>
    Effect.gen(function* () {
      const compareRefusal = yield* refusalOf(compare("x", "Eq", { foo: 1 }));
      assert.strictEqual(compareRefusal?.predicateTag, "Compare");
      assert.strictEqual(compareRefusal?.refusal, "UnsafeValue");
      assert.strictEqual(compareRefusal?.reason, "value for column 'x' is not a safe query parameter");

      const memberRefusal = yield* refusalOf(memberOf("x", ["ok", { bad: true }]));
      assert.strictEqual(memberRefusal?.predicateTag, "MemberOf");
      assert.strictEqual(memberRefusal?.refusal, "UnsafeValue");
      assert.strictEqual(memberRefusal?.reason, "a value for column 'x' is not a safe query parameter");
    }));

  it.effect("a non-finite number refuses on every operator, including Gte/Lt", () =>
    Effect.gen(function* () {
      for (const op of ["Eq", "Neq", "Gte", "Lt"] as const) {
        for (const value of [Number.NaN, Infinity, -Infinity]) {
          const failure = yield* refusalOf(compare("n", op, value));
          assert.strictEqual(failure?.refusal, "UnsafeValue", `${op} ${value}`);
        }
      }
    }));

  it.effect("the first refusal in left-to-right order wins", () =>
    Effect.gen(function* () {
      const failure = yield* refusalOf(
        and(
          compare("a", "Eq", "x"),
          or(compare("b b", "Eq", 1), compare("n", "Eq", { bad: 1 })),
          compare("c c", "Eq", 2),
        ),
      );
      assert.strictEqual(failure?.refusal, "UnsafeColumn");
      assert.strictEqual(failure?.reason, "column 'b b' is not a safe identifier");

      const negated = yield* refusalOf(negate(and(compare("n", "Eq", { a: 1 }), compare("b b", "Eq", 1))));
      assert.strictEqual(negated?.refusal, "UnsafeValue");
    }));

  it.effect("a refusal deep in the tree fails the whole classification", () =>
    Effect.gen(function* () {
      const failure = yield* refusalOf(
        and(compare("a", "Eq", "x"), negate(or(memberOf("n", [{ bad: 1 }])))),
      );
      assert.strictEqual(failure?._tag, "PredicateNotRenderable");
    }));
});

// ---------------------------------------------------------------------------
// R5: identifiers and reserved columns
// ---------------------------------------------------------------------------

describe("toRenderable's column rules", () => {
  it.effect("R5: Ascii refuses a non-ASCII or hostile column, naming it", () =>
    Effect.gen(function* () {
      for (const col of ["", "1a", "a b", "a.b", 'a"b', "a`b", "é", "名前", "😀x"]) {
        for (const predicate of [compare(col, "Eq", 1), memberOf(col, [1])]) {
          const failure = yield* refusalOf(predicate);
          assert.strictEqual(failure?.refusal, "UnsafeColumn", JSON.stringify(col));
          assert.strictEqual(failure?.reason, `column '${col}' is not a safe identifier`);
          assert.strictEqual(failure?.predicateTag, predicate._tag === "Compare" ? "Compare" : "MemberOf");
        }
      }
    }));

  it.effect("R5: UnicodeBmp accepts é and 名前 but still refuses a quote, a space and a supplementary-plane character", () =>
    Effect.gen(function* () {
      for (const col of ["é", "名前", "_é1"]) {
        const node = yield* render(compare(col, "Eq", 1), { identifiers: "UnicodeBmp" });
        assert.strictEqual(node._tag, "Equals", col);
      }
      for (const col of ['a"b', "a`b", "a b", "😀x", "\u{10400}"]) {
        const failure = yield* refusalOf(compare(col, "Eq", 1), { identifiers: "UnicodeBmp" });
        assert.strictEqual(failure?.refusal, "UnsafeColumn", JSON.stringify(col));
      }
    }));

  it.effect("R5: a reserved column is its own refusal, with the same reason text", () =>
    Effect.gen(function* () {
      const reservedColumns = new Set(["NOT", "gte"]);
      for (const col of ["NOT", "gte"]) {
        const failure = yield* refusalOf(compare(col, "Eq", 1), { reservedColumns });
        assert.strictEqual(failure?.refusal, "ReservedColumn", col);
        assert.strictEqual(failure?.reason, `column '${col}' is not a safe identifier`);
        const member = yield* refusalOf(memberOf(col, [1]), { reservedColumns });
        assert.strictEqual(member?.refusal, "ReservedColumn", col);
        assert.strictEqual(member?.predicateTag, "MemberOf");
      }
      // Matching is exact-case, and a name outside the set is unaffected.
      assert.strictEqual((yield* render(compare("Gte", "Eq", 1), { reservedColumns }))._tag, "Equals");
      assert.strictEqual((yield* render(compare("NOT", "Eq", 1)))._tag, "Equals");
    }));

  it.effect("an unsafe column is reported before an unsafe value, and before a reserved one", () =>
    Effect.gen(function* () {
      const reservedColumns = new Set(["a b"]);
      const both = yield* refusalOf(compare("a b", "Eq", { bad: 1 }), { reservedColumns });
      assert.strictEqual(both?.refusal, "UnsafeColumn");
      const reservedFirst = yield* refusalOf(compare("NOT", "Eq", { bad: 1 }), {
        reservedColumns: new Set(["NOT"]),
      });
      assert.strictEqual(reservedFirst?.refusal, "ReservedColumn");
    }));
});

// ---------------------------------------------------------------------------
// R6: maxInValues
// ---------------------------------------------------------------------------

describe("toRenderable bounds a MemberOf", () => {
  const values = (n: number): ReadonlyArray<number> => Array.from({ length: n }, (_, i) => i);

  it("the default bound is 1000", () => {
    assert.strictEqual(DEFAULT_MAX_IN_VALUES, 1000);
  });

  it.effect("R6: exactly at the bound renders, one over refuses with the exact text", () =>
    Effect.gen(function* () {
      const atBound = yield* render(memberOf("a", values(1000)));
      assert.strictEqual(atBound._tag, "OneOf");
      const over = yield* refusalOf(memberOf("a", values(1001)));
      assert.strictEqual(over?.refusal, "TooManyValues");
      assert.strictEqual(over?.predicateTag, "MemberOf");
      assert.strictEqual(over?.reason, "1001 values exceeds maxInValues (1000)");
    }));

  it.effect("R6: the bound is a rule, not the constant", () =>
    Effect.gen(function* () {
      const three = yield* render(memberOf("a", values(3)), { maxInValues: 3 });
      assert.strictEqual(three._tag, "OneOf");
      const four = yield* refusalOf(memberOf("a", values(4)), { maxInValues: 3 });
      assert.strictEqual(four?.reason, "4 values exceeds maxInValues (3)");
    }));

  it.effect("R6: the bound is checked before value safety, and an empty list is never over the bound", () =>
    Effect.gen(function* () {
      const tooMany = yield* refusalOf(memberOf("a", [...values(5), { bad: 1 }]), { maxInValues: 3 });
      assert.strictEqual(tooMany?.refusal, "TooManyValues");
      assert.deepStrictEqual(yield* render(memberOf("a", []), { maxInValues: 0 }), {
        _tag: "Constant",
        value: false,
      });
    }));

  it.effect("the bound counts members, not distinct or non-null ones", () =>
    Effect.gen(function* () {
      const failure = yield* refusalOf(memberOf("a", [null, null, null, null]), { maxInValues: 3 });
      assert.strictEqual(failure?.refusal, "TooManyValues");
    }));
});

// ---------------------------------------------------------------------------
// R7: declared nullability
// ---------------------------------------------------------------------------

describe("toRenderable with a declared nullability", () => {
  const nullability = declared("n");
  const notNullReason = "column 'a' is declared NOT NULL; a null comparison is not renderable";

  it.effect("R7: a null comparison on a NOT NULL column refuses, for Eq and Neq", () =>
    Effect.gen(function* () {
      for (const op of ["Eq", "Neq"] as const) {
        const failure = yield* refusalOf(compare("a", op, null), { nullability });
        assert.strictEqual(failure?.refusal, "NullOnNonNullableColumn", op);
        assert.strictEqual(failure?.predicateTag, "Compare");
        assert.strictEqual(failure?.reason, notNullReason);
      }
    }));

  it.effect("R7: an all-null MemberOf on a NOT NULL column refuses like a null Eq", () =>
    Effect.gen(function* () {
      for (const members of [[null], [null, null]]) {
        const failure = yield* refusalOf(memberOf("a", members), { nullability });
        assert.strictEqual(failure?.refusal, "NullOnNonNullableColumn");
        assert.strictEqual(failure?.predicateTag, "MemberOf");
        assert.strictEqual(failure?.reason, notNullReason);
      }
    }));

  it.effect("R7: a null member of a NOT NULL column's MemberOf is dropped, and the guard is None", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(yield* render(memberOf("a", ["x", null, "y"]), { nullability }), {
        _tag: "OneOf",
        column: "a",
        values: ["x", "y"],
        nullGuard: "None",
      });
    }));

  it.effect("R7: a NOT NULL column never gets a guard, whatever the polarity or negation", () =>
    Effect.gen(function* () {
      const node = yield* render(negate(compare("a", "Neq", "x")), {
        nullability,
        negation: "ThreeValued",
      });
      assert.deepStrictEqual(node, {
        _tag: "Not",
        inner: { _tag: "Equals", column: "a", negated: true, value: "x", nullGuard: "None" },
      });
      assert.deepStrictEqual(
        yield* render(negate(compare("a", "Gte", 3)), { nullability, negation: "ThreeValued" }),
        {
          _tag: "Not",
          inner: {
            _tag: "Range",
            column: "a",
            op: "Gte",
            bound: 3,
            nullGuard: "None",
            finiteGuard: "ExcludeNonFinite",
          },
        },
      );
    }));

  // The lie-safety finding (CCR-QD-158). A `TwoValued` renderer's `NOT` collapses
  // UNKNOWN to FALSE, so an unguarded leaf the reference admits on NULL, under an
  // odd number of Negates, on a column that turns out to hold NULL, flips to TRUE
  // where the reference says FALSE: an over-admission, not an under-admission.
  // Found by `EngineAgreement.test.ts` (S3) against real PostgreSQL and SQLite:
  // `Negate(...MemberOf tag [red, blue, null]...)` with `tag` declared NOT NULL.
  it.effect("R7: TwoValued keeps AdmitNull under an odd number of Negates even on a NOT NULL column", () =>
    Effect.gen(function* () {
      for (const leaf of [compare("a", "Neq", "x"), memberOf("a", ["x", null])]) {
        const positive = yield* render(leaf, { nullability });
        assert.strictEqual(positive._tag === "Equals" || positive._tag === "OneOf" ? positive.nullGuard : "?", "None");
        const once = yield* render(negate(leaf), { nullability });
        assert.strictEqual(
          once._tag === "Not" && (once.inner._tag === "Equals" || once.inner._tag === "OneOf")
            ? once.inner.nullGuard
            : "?",
          "AdmitNull",
        );
        const twice = yield* render(negate(negate(leaf)), { nullability });
        assert.strictEqual(
          twice._tag === "Not" &&
            twice.inner._tag === "Not" &&
            (twice.inner.inner._tag === "Equals" || twice.inner.inner._tag === "OneOf")
            ? twice.inner.inner.nullGuard
            : "?",
          "None",
        );
      }
      // A leaf the reference denies on NULL needs nothing at either polarity.
      const eq = yield* render(negate(compare("a", "Eq", "x")), { nullability });
      assert.deepStrictEqual(eq, {
        _tag: "Not",
        inner: { _tag: "Equals", column: "a", negated: false, value: "x", nullGuard: "None" },
      });
    }));

  it.effect("R7: a nullable column keeps its null shapes and its guards", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(yield* render(compare("n", "Eq", null), { nullability }), {
        _tag: "IsNull",
        column: "n",
        negated: false,
      });
      assert.deepStrictEqual(yield* render(memberOf("n", [null]), { nullability }), {
        _tag: "IsNull",
        column: "n",
        negated: false,
      });
      assert.deepStrictEqual(yield* render(compare("n", "Neq", "x"), { nullability }), {
        _tag: "Equals",
        column: "n",
        negated: true,
        value: "x",
        nullGuard: "AdmitNull",
      });
      assert.deepStrictEqual(yield* render(memberOf("n", ["x", null]), { nullability }), {
        _tag: "OneOf",
        column: "n",
        values: ["x"],
        nullGuard: "AdmitNull",
      });
    }));

  it.effect("R7: declaring nothing nullable makes every column NOT NULL; declaring `Unknown` declares nothing", () =>
    Effect.gen(function* () {
      const none = yield* refusalOf(compare("n", "Eq", null), { nullability: declared() });
      assert.strictEqual(none?.refusal, "NullOnNonNullableColumn");
      const unknown = yield* render(compare("n", "Eq", null), { nullability: { _tag: "Unknown" } });
      assert.strictEqual(unknown._tag, "IsNull");
    }));

  it.effect("R7: Gte/Lt against null is a constant false, not a refusal, even on a NOT NULL column", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(yield* render(compare("a", "Gte", null), { nullability }), {
        _tag: "Constant",
        value: false,
      });
    }));

  it.effect("core never emits a guard on a column declared NOT NULL, whatever the tree", () =>
    Effect.gen(function* () {
      // Only `n` is declared nullable, so `a` and `b` are NOT NULL: a guard there
      // would be core acting on a column it was told cannot hold NULL, and a wrong
      // declaration could then turn into an over-admission. (What a wrong
      // declaration does to a *target* is proved against real engines, in each
      // renderer package's `EngineAgreement.test.ts`.)
      const columnsWithGuards = (node: RenderableNode): ReadonlyArray<readonly [string, NullGuard]> =>
        Match.value(node).pipe(
          Match.tagsExhaustive({
            Constant: () => [],
            IsNull: () => [],
            Equals: (n) => [[n.column, n.nullGuard] as const],
            Range: (n) => [[n.column, n.nullGuard] as const],
            OneOf: (n) => [[n.column, n.nullGuard] as const],
            All: (n) => n.parts.flatMap(columnsWithGuards),
            Any: (n) => n.parts.flatMap(columnsWithGuards),
            Not: (n) => columnsWithGuards(n.inner),
          }),
        );
      let compiled = 0;
      let guardedNullable = 0;
      for (const predicate of predicates) {
        const result = yield* Effect.result(
          render(predicate, { nullability: declared("n"), negation: "ThreeValued" }),
        );
        if (Result.isFailure(result)) continue;
        compiled += 1;
        for (const [col, guard] of columnsWithGuards(result.success)) {
          if (col === "n" && guard !== "None") guardedNullable += 1;
          if (col === "a" || col === "b") assert.strictEqual(guard, "None", col);
        }
      }
      assert.isAbove(compiled, 50);
      // Not vacuous: the nullable column does get guards from the same trees.
      assert.isAbove(guardedNullable, 0);
    }));
});

// ---------------------------------------------------------------------------
// The bound rule is shared with the reference evaluator
// ---------------------------------------------------------------------------

describe("Gte/Lt: the evaluator and the classifier share one bound rule", () => {
  it.effect("a bound is a Range exactly when the evaluator can compare against it", () =>
    Effect.gen(function* () {
      const bounds: ReadonlyArray<unknown> = [
        0, 3, -2.5, Number.NaN, Infinity, -Infinity, "3", true, null, undefined, {}, 10n,
      ];
      for (const op of ["Gte", "Lt"] as const) {
        for (const bound of bounds) {
          const predicate = compare("n", op, bound);
          // Every numeric row value the evaluator could be asked about.
          const admitsSome = [-Infinity, -3, 0, 3, 5, Infinity].some((n) =>
            evaluatePredicate(predicate, { n }),
          );
          const result = yield* Effect.result(render(predicate));
          if (Result.isFailure(result)) {
            // An unsafe bound refuses; the evaluator is not asked.
            assert.strictEqual(result.failure.refusal, "UnsafeValue");
            continue;
          }
          const node = result.success;
          if (node._tag === "Range") {
            assert.isTrue(typeof bound === "number" && Number.isFinite(bound), String(bound));
          } else {
            // Not comparable: a constant false, and the evaluator admits nothing.
            assert.deepStrictEqual(node, { _tag: "Constant", value: false }, String(bound));
            assert.isFalse(admitsSome, String(bound));
          }
        }
      }
    }));
});

// ---------------------------------------------------------------------------
// R9: the finite guard (CCR-QD-172)
// ---------------------------------------------------------------------------

describe("R9: a Range excludes non-finite rows exactly where the target can hold them", () => {
  const FINITENESS: ReadonlyArray<readonly [string, ColumnFiniteness]> = [
    ["Unrepresentable", { _tag: "Unrepresentable" }],
    ["Unknown", { _tag: "Unknown" }],
    ["Declared n", { _tag: "Declared", floating: new Set(["n"]) }],
  ];

  /** Every `Range` in a tree, with its column. */
  const rangesOf = (node: RenderableNode): ReadonlyArray<Extract<RenderableNode, { _tag: "Range" }>> =>
    Match.value(node).pipe(
      Match.tagsExhaustive({
        Constant: () => [],
        IsNull: () => [],
        Equals: () => [],
        Range: (n) => [n],
        OneOf: () => [],
        All: (n) => n.parts.flatMap(rangesOf),
        Any: (n) => n.parts.flatMap(rangesOf),
        Not: (n) => rangesOf(n.inner),
      }),
    );

  const mayHold = (finiteness: ColumnFiniteness, col: string): boolean =>
    finiteness._tag === "Unknown" || (finiteness._tag === "Declared" && finiteness.floating.has(col));

  it.effect(
    "R9: a Range's finiteGuard is ExcludeNonFinite exactly when the target may hold a non-finite value and the reference denies one",
    () =>
      Effect.gen(function* () {
        let guardedRanges = 0;
        let unguardedRanges = 0;
        for (const [name, finiteness] of FINITENESS) {
          for (const predicate of predicates) {
            const node = yield* render(predicate, { finiteness });
            for (const range of rangesOf(node)) {
              const leaf = compare(range.column, range.op, range.bound);
              const deniesOne = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN].some(
                (value) => !evaluatePredicate(leaf, { [range.column]: value }),
              );
              const expected = mayHold(finiteness, range.column) && deniesOne ? "ExcludeNonFinite" : "None";
              assert.strictEqual(range.finiteGuard, expected, JSON.stringify({ name, range }));
              if (range.finiteGuard === "ExcludeNonFinite") guardedRanges += 1;
              else unguardedRanges += 1;
            }
          }
        }
        // Not vacuous: both answers occur.
        assert.isAbove(guardedRanges, 0);
        assert.isAbove(unguardedRanges, 0);
      }),
  );

  it.effect("R9: under every declaration, the guarded renderable equals the reference on the rows the target can hold", () =>
    Effect.gen(function* () {
      for (const [name, finiteness] of FINITENESS) {
        // A row with a non-finite cell in a column the target cannot hold one in
        // is not a row that target can return, so it is out of scope.
        const representable = sampleRows.filter((row) =>
          COLUMNS.every((col) => {
            const value = row[col];
            return typeof value !== "number" || Number.isFinite(value) || mayHold(finiteness, col);
          }),
        );
        assert.isAbove(representable.length, 3, name);
        for (const predicate of predicates) {
          const node = yield* render(predicate, { finiteness });
          for (const row of representable) {
            assert.strictEqual(
              evaluateRenderable(node, row),
              evaluatePredicate(predicate, row),
              JSON.stringify({ name, predicate, row, node }),
            );
          }
        }
      }
    }));

  it.effect("R9: a target that cannot express the guard refuses exactly the ranges that need it", () =>
    Effect.gen(function* () {
      const finiteness: ColumnFiniteness = { _tag: "Declared", floating: new Set(["n"]) };
      let refused = 0;
      let rendered = 0;
      for (const predicate of predicates) {
        const expressible = yield* render(predicate, { finiteness });
        const inexpressible = yield* Effect.result(
          render(predicate, { finiteness, finiteExclusion: "Inexpressible" }),
        );
        const needsGuard = rangesOf(expressible).some((range) => range.finiteGuard === "ExcludeNonFinite");
        if (Result.isFailure(inexpressible)) {
          refused += 1;
          assert.isTrue(needsGuard, JSON.stringify(predicate));
          assert.strictEqual(inexpressible.failure.refusal, "NonFiniteColumn");
          assert.strictEqual(inexpressible.failure.predicateTag, "Compare");
        } else {
          rendered += 1;
          // Nothing refused means nothing needed the guard, so the two trees are one.
          assert.isFalse(needsGuard, JSON.stringify(predicate));
          assert.deepStrictEqual(inexpressible.success, expressible);
        }
      }
      assert.isAbove(refused, 0);
      assert.isAbove(rendered, 0);
      const failure = yield* refusalOf(compare("n", "Lt", 3), { finiteness, finiteExclusion: "Inexpressible" });
      assert.strictEqual(
        failure?.reason,
        "column 'n' may hold a non-finite number, and this target cannot exclude one from a range",
      );
    }));

  it.effect("R9: without the guard a plain range admits the non-finite rows the reference denies", () =>
    Effect.gen(function* () {
      // The defect the guard closes, stated against the test interpreter: the
      // same leaf, classified as if the target could not hold the values, admits
      // `Infinity` under `Gte` and `-Infinity` under `Lt`.
      const unguarded = yield* render(compare("n", "Gte", 3), { finiteness: { _tag: "Unrepresentable" } });
      assert.isTrue(evaluateRenderable(unguarded, { n: Number.POSITIVE_INFINITY }));
      assert.isFalse(evaluatePredicate(compare("n", "Gte", 3), { n: Number.POSITIVE_INFINITY }));
      const lt = yield* render(compare("n", "Lt", 3), { finiteness: { _tag: "Unrepresentable" } });
      assert.isTrue(evaluateRenderable(lt, { n: Number.NEGATIVE_INFINITY }));
      const guarded = yield* render(compare("n", "Lt", 3));
      assert.isFalse(evaluateRenderable(guarded, { n: Number.NEGATIVE_INFINITY }));
    }));
});

// ---------------------------------------------------------------------------
// R8: the error
// ---------------------------------------------------------------------------

describe("PredicateNotRenderable", () => {
  it.effect("R8: carries predicateTag, refusal and reason, and has the stable code ACL018", () =>
    Effect.gen(function* () {
      const failure = yield* Effect.flip(render(compare("a b", "Eq", 1)));
      assert.instanceOf(failure, PredicateNotRenderable);
      assert.strictEqual(failure._tag, "PredicateNotRenderable");
      assert.strictEqual(failure.predicateTag, "Compare");
      assert.strictEqual(failure.refusal, "UnsafeColumn");
      assert.strictEqual(failure.reason, "column 'a b' is not a safe identifier");
      assert.strictEqual(errorCode(failure), "ACL018");
    }));

  it.effect("is catchable by its tag, and it is the one class both renderers re-export", () =>
    Effect.gen(function* () {
      const caught = yield* render(compare("a b", "Eq", 1)).pipe(
        Effect.map(() => "rendered"),
        Effect.catchTag("PredicateNotRenderable", (error) => Effect.succeed(error.refusal)),
      );
      assert.strictEqual(caught, "UnsafeColumn");
    }));
});

