import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import * as FastCheck from "fast-check";
import { DEFAULT_MAX_IN_VALUES, toRenderable } from "@qadi/core";
import { PredicateNotRenderable as CorePredicateNotRenderable } from "@qadi/core";
import type { Predicate, RenderRules } from "@qadi/core";
import { compileSql, PredicateNotRenderable, type SqlDialect } from "../src/index.ts";

const DIALECTS: ReadonlyArray<SqlDialect> = ["postgres", "mysql", "sqlite"];

const render = (predicate: Predicate, dialect: SqlDialect, maxInValues?: number) =>
  compileSql(predicate, { dialect, ...(maxInValues !== undefined ? { maxInValues } : {}) });

const refusalOf = (predicate: Predicate, dialect: SqlDialect, maxInValues?: number) =>
  Effect.map(Effect.result(render(predicate, dialect, maxInValues)), (r) =>
    Result.isFailure(r) ? r.failure : undefined,
  );

// ADR-QD-079. A declaration of which columns accept NULL lets a renderer drop the
// `OR col IS NULL` a NOT NULL column never needs — at positive polarity only (see
// `RenderablePredicate.ts`'s table: a two-valued `NOT` keeps the guard under an odd
// number of negations, which a real engine showed is what makes a wrong declaration
// safe).
describe("compileSql — a nullability declaration (ADR-QD-079)", () => {
  const nullable: ReadonlySet<string> = new Set(["level"]);
  const neq = (column: string): Predicate => ({ _tag: "Compare", column, op: "Neq", value: 1 });

  it.effect("absent declares nothing: the output is exactly what it was", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(yield* compileSql(neq("tenantId"), { dialect: "postgres" }), {
        text: '("tenantId" != $1 OR "tenantId" IS NULL)',
        params: [1],
      });
    }));

  it.effect("a column declared NOT NULL drops the NULL guard on Neq", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(
        yield* compileSql(neq("tenantId"), { dialect: "postgres", nullable }),
        { text: '"tenantId" != $1', params: [1] },
      );
      assert.deepStrictEqual(yield* compileSql(neq("level"), { dialect: "postgres", nullable }), {
        text: '("level" != $1 OR "level" IS NULL)',
        params: [1],
      });
    }));

  it.effect("...but keeps it under a Negate, which is what makes a wrong declaration safe", () =>
    Effect.gen(function* () {
      const fragment = yield* compileSql(
        { _tag: "Negate", predicate: neq("tenantId") },
        { dialect: "postgres", nullable },
      );
      assert.strictEqual(
        fragment.text,
        'CASE WHEN (("tenantId" != $1 OR "tenantId" IS NULL)) THEN FALSE ELSE TRUE END',
      );
    }));

  it.effect("a MemberOf null member is dropped on a NOT NULL column at positive polarity", () =>
    Effect.gen(function* () {
      const fragment = yield* compileSql(
        { _tag: "MemberOf", column: "tenantId", values: ["t-1", null] },
        { dialect: "postgres", nullable },
      );
      assert.deepStrictEqual(fragment, { text: '"tenantId" IN ($1)', params: ["t-1"] });
    }));

  it.effect("a null comparison on a NOT NULL column refuses", () =>
    Effect.gen(function* () {
      const failure = yield* refusalOf(
        { _tag: "Compare", column: "tenantId", op: "Eq", value: null },
        "postgres",
      );
      // With nothing declared it is the ordinary `IS NULL`...
      assert.isUndefined(failure);
      const declared = yield* Effect.flip(
        compileSql(
          { _tag: "Compare", column: "tenantId", op: "Eq", value: null },
          { dialect: "postgres", nullable },
        ),
      );
      // ...declared NOT NULL it is a refusal, never a folded constant.
      assert.strictEqual(declared.refusal, "NullOnNonNullableColumn");
      assert.strictEqual(
        declared.reason,
        "column 'tenantId' is declared NOT NULL; a null comparison is not renderable",
      );
    }));
});

// ADR-QD-079: one `PredicateNotRenderable`, declared in `@qadi/core`.
describe("compileSql — the refusal is @qadi/core's PredicateNotRenderable", () => {
  const unsafe: Predicate = { _tag: "Compare", column: "x", op: "Eq", value: { foo: 1 } };

  it.effect("is an instance of the class @qadi/core exports, and the package re-exports that class", () =>
    Effect.gen(function* () {
      const failure = yield* Effect.flip(compileSql(unsafe, { dialect: "postgres" }));
      assert.instanceOf(failure, CorePredicateNotRenderable);
      assert.strictEqual(PredicateNotRenderable, CorePredicateNotRenderable);
      assert.strictEqual(failure.refusal, "UnsafeValue");
    }));

  it.effect("Effect.catchTag(\"PredicateNotRenderable\") catches it", () =>
    Effect.gen(function* () {
      const caught = yield* compileSql(unsafe, { dialect: "postgres" }).pipe(
        Effect.map(() => "compiled"),
        Effect.catchTag("PredicateNotRenderable", (error) => Effect.succeed(error.refusal)),
      );
      assert.strictEqual(caught, "UnsafeValue");
    }));
});

// ADR-QD-079: the compiler decides nothing about what is renderable. It refuses
// exactly when `toRenderable` does, under the rules it declares.
describe("compileSql — refusal parity with toRenderable", () => {
  const sqlRules = (options: {
    readonly maxInValues?: number;
    readonly identifiers?: "Ascii" | "UnicodeBmp";
    readonly nullable?: ReadonlySet<string>;
  }): RenderRules => ({
    identifiers: options.identifiers ?? "Ascii",
    reservedColumns: new Set(),
    maxInValues: options.maxInValues ?? DEFAULT_MAX_IN_VALUES,
    nullability:
      options.nullable === undefined
        ? { _tag: "Unknown" }
        : { _tag: "Declared", nullable: options.nullable },
    negation: "TwoValued",
    // The postgres dialect's: any column may hold a non-finite number.
    finiteness: { _tag: "Unknown" },
  });

  const columnArb = FastCheck.constantFrom("tenantId", "level", "a b", 'x"y', "é", "gte", "NOT");
  const valueArb: FastCheck.Arbitrary<unknown> = FastCheck.oneof(
    FastCheck.constantFrom("t-1", 3, true, null),
    FastCheck.constantFrom(Number.NaN, Infinity, { bad: 1 }, undefined),
  );
  const leafArb: FastCheck.Arbitrary<Predicate> = FastCheck.oneof(
    FastCheck.tuple(columnArb, FastCheck.constantFrom("Eq", "Neq", "Gte", "Lt"), valueArb).map(
      ([column, op, value]): Predicate => ({ _tag: "Compare", column, op, value }),
    ),
    FastCheck.tuple(columnArb, FastCheck.array(valueArb, { maxLength: 6 })).map(
      ([column, values]): Predicate => ({ _tag: "MemberOf", column, values }),
    ),
  );
  const treeArb: FastCheck.Arbitrary<Predicate> = FastCheck.letrec<{ node: Predicate }>((tie) => ({
    node: FastCheck.oneof(
      { maxDepth: 3, withCrossShrink: true },
      leafArb,
      FastCheck.array(tie("node"), { maxLength: 3 }).map(
        (predicates): Predicate => ({ _tag: "And", predicates }),
      ),
      FastCheck.array(tie("node"), { maxLength: 3 }).map(
        (predicates): Predicate => ({ _tag: "Or", predicates }),
      ),
      tie("node").map((predicate): Predicate => ({ _tag: "Negate", predicate })),
    ),
  })).node;

  const optionSets: ReadonlyArray<{
    readonly maxInValues?: number;
    readonly identifiers?: "Ascii" | "UnicodeBmp";
    readonly nullable?: ReadonlySet<string>;
  }> = [
    {},
    { maxInValues: 2 },
    { identifiers: "UnicodeBmp" },
    { nullable: new Set(["level"]) },
    { maxInValues: 3, identifiers: "UnicodeBmp", nullable: new Set(["tenantId", "level"]) },
  ];

  it.effect("PROPERTY: compileSql fails exactly when toRenderable fails, with an equal refusal", () =>
    Effect.gen(function* () {
      const predicates = FastCheck.sample(treeArb, { numRuns: 300, seed: 99 });
      let refusals = 0;
      let compiled = 0;
      for (const options of optionSets) {
        for (const predicate of predicates) {
          const sql = yield* Effect.result(compileSql(predicate, { dialect: "postgres", ...options }));
          const core = yield* Effect.result(toRenderable(predicate, sqlRules(options)));
          assert.strictEqual(Result.isFailure(sql), Result.isFailure(core), JSON.stringify({ predicate, options }));
          if (Result.isFailure(sql) && Result.isFailure(core)) {
            refusals += 1;
            assert.strictEqual(sql.failure.refusal, core.failure.refusal);
            assert.strictEqual(sql.failure.reason, core.failure.reason);
            assert.strictEqual(sql.failure.predicateTag, core.failure.predicateTag);
          } else {
            compiled += 1;
          }
        }
      }
      assert.isAbove(refusals, 100);
      assert.isAbove(compiled, 100);
    }));

  it.effect("the options reach toRenderable: maxInValues, identifiers and nullable each change the outcome", () =>
    Effect.gen(function* () {
      const three: Predicate = { _tag: "MemberOf", column: "a", values: [1, 2, 3] };
      assert.strictEqual((yield* Effect.flip(compileSql(three, { dialect: "postgres", maxInValues: 2 }))).refusal, "TooManyValues");
      const accented: Predicate = { _tag: "Compare", column: "é", op: "Eq", value: 1 };
      assert.strictEqual((yield* Effect.flip(compileSql(accented, { dialect: "postgres" }))).refusal, "UnsafeColumn");
      assert.deepStrictEqual(
        yield* compileSql(accented, { dialect: "postgres", identifiers: "UnicodeBmp" }),
        { text: '"é" = $1', params: [1] },
      );
    }));
});

// ADR-QD-079 (ARCH-03 N3). `SqlSafeValue` includes `boolean`, but `node:sqlite`
// throws "Provided value cannot be bound to SQLite parameter" and better-sqlite3
// throws "SQLite3 can only bind numbers, strings, bigints, buffers, and null" for
// one. SQLite stores a boolean as 1/0, so `sealed = 1` is the faithful rendering;
// it is a dialect syntax-table entry, the same kind as `quote`/`placeholder`.
describe("compileSql — sqlite binds booleans as 1/0 (D-03-h)", () => {
  const sealed = (value: boolean): Predicate => ({
    _tag: "Compare",
    column: "sealed",
    op: "Eq",
    value,
  });

  it.effect("a boolean Compare value binds as 1 or 0 on sqlite", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(yield* render(sealed(true), "sqlite"), {
        text: '"sealed" = ?',
        params: [1],
      });
      assert.deepStrictEqual(yield* render(sealed(false), "sqlite"), {
        text: '"sealed" = ?',
        params: [0],
      });
    }));

  it.effect("a boolean MemberOf member binds as 1 or 0 on sqlite", () =>
    Effect.gen(function* () {
      const fragment = yield* render(
        { _tag: "MemberOf", column: "sealed", values: [true, false] },
        "sqlite",
      );
      assert.deepStrictEqual(fragment, { text: '"sealed" IN (?, ?)', params: [1, 0] });
    }));

  it.effect("postgres and mysql still bind the boolean itself, and other values are untouched", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual((yield* render(sealed(true), "postgres")).params, [true]);
      assert.deepStrictEqual((yield* render(sealed(false), "mysql")).params, [false]);
      const mixed: Predicate = { _tag: "MemberOf", column: "c", values: ["a", 2, true, null] };
      assert.deepStrictEqual((yield* render(mixed, "sqlite")).params, ["a", 2, 1]);
    }));
});

describe("compileSql — golden fragments, one row per dialect", () => {
  const eq: Predicate = { _tag: "Compare", column: "tenantId", op: "Eq", value: "t-1" };

  it.effect("a single Compare quotes and binds per dialect", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(yield* render(eq, "postgres"), {
        text: '"tenantId" = $1',
        params: ["t-1"],
      });
      assert.deepStrictEqual(yield* render(eq, "mysql"), {
        text: "`tenantId` = ?",
        params: ["t-1"],
      });
      assert.deepStrictEqual(yield* render(eq, "sqlite"), {
        text: '"tenantId" = ?',
        params: ["t-1"],
      });
    }));

  it.effect("every CompareOp renders its own operator", () =>
    Effect.gen(function* () {
      // Neq is not `"c" != $1` alone — see the dedicated NULL-handling
      // describe block below for why.
      const ops: ReadonlyArray<readonly [Predicate, string]> = [
        [{ _tag: "Compare", column: "c", op: "Eq", value: 1 }, '"c" = $1'],
        [{ _tag: "Compare", column: "c", op: "Gte", value: 1 }, '("c" >= $1 AND "c" - "c" = 0)'],
        [{ _tag: "Compare", column: "c", op: "Lt", value: 1 }, '("c" < $1 AND "c" - "c" = 0)'],
      ];
      for (const [predicate, text] of ops) {
        const fragment = yield* render(predicate, "postgres");
        assert.strictEqual(fragment.text, text);
      }
    }));

  it.effect("MemberOf renders IN with one placeholder per value, per dialect", () =>
    Effect.gen(function* () {
      const inTag: Predicate = { _tag: "MemberOf", column: "tag", values: ["red", "blue"] };
      assert.deepStrictEqual(yield* render(inTag, "postgres"), {
        text: '"tag" IN ($1, $2)',
        params: ["red", "blue"],
      });
      assert.deepStrictEqual(yield* render(inTag, "mysql"), {
        text: "`tag` IN (?, ?)",
        params: ["red", "blue"],
      });
      assert.deepStrictEqual(yield* render(inTag, "sqlite"), {
        text: '"tag" IN (?, ?)',
        params: ["red", "blue"],
      });
    }));

  it.effect("an empty MemberOf is FALSE, never IN ()", () =>
    Effect.gen(function* () {
      const empty: Predicate = { _tag: "MemberOf", column: "tag", values: [] };
      for (const dialect of DIALECTS) {
        assert.deepStrictEqual(yield* render(empty, dialect), { text: "FALSE", params: [] });
      }
    }));

  it.effect("And/Or/Negate compose, placeholders numbering across the whole fragment", () =>
    Effect.gen(function* () {
      const compound: Predicate = {
        _tag: "And",
        predicates: [
          { _tag: "Compare", column: "tenantId", op: "Eq", value: "t-1" },
          { _tag: "MemberOf", column: "tag", values: ["red", "blue"] },
          { _tag: "Negate", predicate: { _tag: "Compare", column: "sealed", op: "Eq", value: true } },
        ],
      };
      assert.deepStrictEqual(yield* render(compound, "postgres"), {
        text: '("tenantId" = $1 AND "tag" IN ($2, $3) AND CASE WHEN ("sealed" = $4) THEN FALSE ELSE TRUE END)',
        params: ["t-1", "red", "blue", true],
      });
      // sqlite binds a boolean as 1 (ADR-QD-079): neither Node driver can bind a JS boolean.
      assert.deepStrictEqual(yield* render(compound, "sqlite"), {
        text: '("tenantId" = ? AND "tag" IN (?, ?) AND CASE WHEN ("sealed" = ?) THEN FALSE ELSE TRUE END)',
        params: ["t-1", "red", "blue", 1],
      });

      const anyOf: Predicate = { _tag: "Or", predicates: [eq, eq] };
      const orFragment = yield* render(anyOf, "postgres");
      assert.strictEqual(orFragment.text, '("tenantId" = $1 OR "tenantId" = $2)');
    }));

  it.effect("nested Negate renders exactly what the AST says, no elimination", () =>
    Effect.gen(function* () {
      // Reachable since Predicate.ts's negate() only inverts constants, not
      // arbitrary sub-trees. Simplify.ts never runs on a Predicate. The
      // rendered shape is the NULL-safe CASE form (see the dedicated
      // NULL-handling describe block below), not a bare "NOT (NOT (...))" —
      // but the nesting itself is still preserved rather than cancelled.
      const doubled: Predicate = {
        _tag: "Negate",
        predicate: { _tag: "Negate", predicate: eq },
      };
      const fragment = yield* render(doubled, "postgres");
      assert.strictEqual(
        fragment.text,
        'CASE WHEN (CASE WHEN ("tenantId" = $1) THEN FALSE ELSE TRUE END) THEN FALSE ELSE TRUE END',
      );
    }));

  it.effect("a null value is on the safe allowlist and compiles as IS NULL, not '= NULL'", () =>
    Effect.gen(function* () {
      // `col = NULL` is never true in SQL for any row, not even one where
      // `col IS NULL` — SQL's three-valued logic treats a NULL-valued side
      // of `=` as unknown, and WHERE excludes unknown. Caught by running the
      // compiled SQL against a real SQLite engine, not designed in from the
      // start (see the describe block below).
      const predicate: Predicate = { _tag: "Compare", column: "deletedAt", op: "Eq", value: null };
      const fragment = yield* render(predicate, "postgres");
      assert.deepStrictEqual(fragment, { text: '"deletedAt" IS NULL', params: [] });
    }));

  it.effect("True/False render to their own keyword with no params", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(yield* render({ _tag: "True" }, "postgres"), {
        text: "TRUE",
        params: [],
      });
      assert.deepStrictEqual(yield* render({ _tag: "False" }, "postgres"), {
        text: "FALSE",
        params: [],
      });
    }));

  it.effect("a hand-constructed empty And/Or degrades to the vacuous identity", () =>
    Effect.gen(function* () {
      // Unreachable through toPredicate (and()/or() simplify before building a
      // node), but Predicate is directly constructible — "TRUE"/"FALSE" match
      // evaluatePredicate's own .every/.some on an empty array.
      assert.deepStrictEqual(yield* render({ _tag: "And", predicates: [] }, "postgres"), {
        text: "TRUE",
        params: [],
      });
      assert.deepStrictEqual(yield* render({ _tag: "Or", predicates: [] }, "postgres"), {
        text: "FALSE",
        params: [],
      });
    }));
});

// SQL's `=`/`!=` are never true when either side is NULL — three-valued
// logic, and WHERE excludes "unknown" the same as it excludes "false". A
// column comparison and a JS `===`/`!==` comparison therefore disagree on
// exactly the rows where the column is NULL, unless the SQL is built to
// account for it. This was found by running compiled SQL against a real
// SQLite engine and comparing its result set to `evaluatePredicate`'s — the
// property test's own interpreter re-implements `===`/`!==` in JS and so
// agreed with the original, wrong translation rather than catching it.
describe("compileSql — NULL handling agrees with evaluatePredicate's ===/!==", () => {
  it.effect("Eq against null renders IS NULL, not '= NULL'", () =>
    Effect.gen(function* () {
      const fragment = yield* render({ _tag: "Compare", column: "c", op: "Eq", value: null }, "postgres");
      assert.deepStrictEqual(fragment, { text: '"c" IS NULL', params: [] });
    }));

  it.effect("Neq against null renders IS NOT NULL, not '!= NULL'", () =>
    Effect.gen(function* () {
      const fragment = yield* render({ _tag: "Compare", column: "c", op: "Neq", value: null }, "postgres");
      assert.deepStrictEqual(fragment, { text: '"c" IS NOT NULL', params: [] });
    }));

  it.effect("Gte/Lt against null render FALSE — evaluatePredicate never admits a non-number literal", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(yield* render({ _tag: "Compare", column: "c", op: "Gte", value: null }, "postgres"), {
        text: "FALSE",
        params: [],
      });
      assert.deepStrictEqual(yield* render({ _tag: "Compare", column: "c", op: "Lt", value: null }, "postgres"), {
        text: "FALSE",
        params: [],
      });
    }));

  // evaluatePredicate's compare requires typeof === "number" on BOTH sides
  // for Gte/Lt and is always False otherwise — a real DB coerces a string
  // (PostgreSQL: `int_col >= '10'` → 10) rather than refusing, admitting rows
  // the reference evaluator denies for every row regardless of column type.
  // Rendering FALSE — never binding the value into a real comparison — is
  // what keeps the compiled SQL from ever running that coercing comparison at
  // all.
  //
  // `Number.NaN` was in this list until CCR-QD-115, when `isSafeValue` took
  // over every non-finite number for every operator; it now *refuses* rather
  // than folding to FALSE, and is asserted in the refusals block below.
  it.effect("Gte/Lt with a non-number, non-null value renders FALSE, never a real comparison", () =>
    Effect.gen(function* () {
      const nonNumberValues: ReadonlyArray<unknown> = ["10", true, false];
      for (const value of nonNumberValues) {
        assert.deepStrictEqual(yield* render({ _tag: "Compare", column: "c", op: "Gte", value }, "postgres"), {
          text: "FALSE",
          params: [],
        });
        assert.deepStrictEqual(yield* render({ _tag: "Compare", column: "c", op: "Lt", value }, "postgres"), {
          text: "FALSE",
          params: [],
        });
      }
    }));

  // ticket 157 — the same guard above already excludes both `string` and
  // `boolean` alongside NaN, not merely non-finite numbers; this pins that
  // through the And/Negate composition path too, not only a bare Compare, so
  // the guard's placement inside renderNode's Compare case (reached once per
  // leaf regardless of nesting) cannot regress unnoticed.
  it.effect("a string or boolean Gte/Lt value renders FALSE even nested under And/Negate", () =>
    Effect.gen(function* () {
      const nested: Predicate = {
        _tag: "And",
        predicates: [
          { _tag: "Compare", column: "tenantId", op: "Eq", value: "t-1" },
          { _tag: "Negate", predicate: { _tag: "Compare", column: "score", op: "Gte", value: "10" } },
          { _tag: "Compare", column: "sealed", op: "Lt", value: true },
        ],
      };
      assert.deepStrictEqual(yield* render(nested, "postgres"), {
        text: '("tenantId" = $1 AND CASE WHEN (FALSE) THEN FALSE ELSE TRUE END AND FALSE)',
        params: ["t-1"],
      });
    }));

  it.effect("Gte/Lt with a genuine number still compiles to a real comparison", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(yield* render({ _tag: "Compare", column: "c", op: "Gte", value: 10 }, "postgres"), {
        text: '("c" >= $1 AND "c" - "c" = 0)',
        params: [10],
      });
      assert.deepStrictEqual(yield* render({ _tag: "Compare", column: "c", op: "Lt", value: 10 }, "postgres"), {
        text: '("c" < $1 AND "c" - "c" = 0)',
        params: [10],
      });
    }));

  // CCR-QD-172: a plain `>=`/`<` admits non-finite rows on PostgreSQL (`Infinity`,
  // and `NaN`, which it orders above every number) and SQLite (the infinities),
  // where `evaluatePredicate` admits none. MySQL's floating types cannot hold
  // them, so its text is unchanged.
  it.effect("a Range on postgres and sqlite excludes non-finite rows; mysql does not need to", () =>
    Effect.gen(function* () {
      const gte: Predicate = { _tag: "Compare", column: "score", op: "Gte", value: 3 };
      assert.deepStrictEqual(yield* render(gte, "postgres"), {
        text: '("score" >= $1 AND "score" - "score" = 0)',
        params: [3],
      });
      assert.deepStrictEqual(yield* render(gte, "sqlite"), {
        text: '("score" >= ? AND "score" - "score" = 0)',
        params: [3],
      });
      assert.deepStrictEqual(yield* render(gte, "mysql"), {
        text: "`score` >= ?",
        params: [3],
      });
      // Inside the CASE WHEN negation the guard is still a conjunct of the leaf.
      assert.deepStrictEqual(yield* render({ _tag: "Negate", predicate: gte }, "postgres"), {
        text: 'CASE WHEN (("score" >= $1 AND "score" - "score" = 0)) THEN FALSE ELSE TRUE END',
        params: [3],
      });
    }));

  it.effect("Neq against a non-null value also admits a NULL-valued column", () =>
    Effect.gen(function* () {
      // Plain "c" != $1 alone would exclude a NULL-valued row; `null !== 1`
      // is true in evaluatePredicate, so the compiled SQL must admit it too.
      const fragment = yield* render({ _tag: "Compare", column: "c", op: "Neq", value: 1 }, "postgres");
      assert.deepStrictEqual(fragment, { text: '("c" != $1 OR "c" IS NULL)', params: [1] });
    }));

  it.effect("a MemberOf holding only null renders IS NULL, with no IN clause at all", () =>
    Effect.gen(function* () {
      const fragment = yield* render({ _tag: "MemberOf", column: "c", values: [null] }, "postgres");
      assert.deepStrictEqual(fragment, { text: '"c" IS NULL', params: [] });
    }));

  it.effect("a MemberOf mixing null with real values ORs in IS NULL", () =>
    Effect.gen(function* () {
      const fragment = yield* render(
        { _tag: "MemberOf", column: "c", values: [null, "red", "blue"] },
        "postgres",
      );
      assert.deepStrictEqual(fragment, {
        text: '("c" IN ($1, $2) OR "c" IS NULL)',
        params: ["red", "blue"],
      });
    }));

  // A plain "NOT (...)" is not NULL-safe: `NOT ("status" = $1)` is UNKNOWN,
  // not TRUE, for a NULL-valued "status" column, and WHERE excludes UNKNOWN
  // the same as FALSE — dropping a row `evaluatePredicate`'s two-valued
  // negation admits (`null === 'archived'` is `false`, negated is `true`).
  // Fixed by rendering `CASE WHEN (<inner>) THEN FALSE ELSE TRUE END`, which
  // never evaluates to UNKNOWN: an UNKNOWN `WHEN` condition falls to `ELSE`
  // exactly as a `FALSE` one would. This is a golden-text assertion rather
  // than a property-test one on purpose — `interpretSqlFragment` re-derives
  // `compare`/`isNull` results straight from `row`, so it (and the property
  // test in `Agreement.test.ts` that drives it) would silently agree with the
  // old, wrong "NOT (...)" text too, exactly like `matchesPrismaWhere.ts` did
  // for the sibling Prisma defect (ticket 06) — only the exact rendered SQL
  // shape distinguishes NULL-safe from NULL-unsafe here.
  it.effect("Negate renders NULL-safe CASE WHEN, not a bare NOT", () =>
    Effect.gen(function* () {
      const negated: Predicate = {
        _tag: "Negate",
        predicate: { _tag: "Compare", column: "status", op: "Eq", value: "archived" },
      };
      const fragment = yield* render(negated, "postgres");
      assert.deepStrictEqual(fragment, {
        text: 'CASE WHEN ("status" = $1) THEN FALSE ELSE TRUE END',
        params: ["archived"],
      });
    }));
});

describe("compileSql — refusals", () => {
  it.effect("a Compare value outside the safe allowlist refuses, never stringifies", () =>
    Effect.gen(function* () {
      const predicate: Predicate = { _tag: "Compare", column: "x", op: "Eq", value: { foo: 1 } };
      const failure = yield* refusalOf(predicate, "postgres");
      assert.strictEqual(failure?._tag, "PredicateNotRenderable");
      assert.strictEqual(failure?.predicateTag, "Compare");
      assert.strictEqual(failure?.reason, "value for column 'x' is not a safe query parameter");
    }));

  it.effect("a MemberOf member outside the safe allowlist refuses, naming the column", () =>
    Effect.gen(function* () {
      const predicate: Predicate = { _tag: "MemberOf", column: "x", values: ["ok", { bad: true }] };
      const failure = yield* refusalOf(predicate, "postgres");
      assert.strictEqual(failure?._tag, "PredicateNotRenderable");
      assert.strictEqual(failure?.predicateTag, "MemberOf");
      assert.strictEqual(failure?.reason, "a value for column 'x' is not a safe query parameter");
    }));

  // CCR-QD-115 — isSafeValue's number branch requires Number.isFinite, not
  // bare typeof, catching this package up to @qadi/predicate-prisma's sibling.
  // NaN satisfies `typeof === "number"` and used to reach `params.push` for
  // Eq/Neq/MemberOf (only Gte/Lt had a NaN guard, and only there): the
  // compiled `col = $1` binds NaN, and PostgreSQL documents `NaN = NaN` as
  // TRUE while evaluatePredicate's `===` is false for every row — an
  // INV-QD-047 divergence in the admit-more direction. All four operators
  // refuse now, from the one gate.
  it.effect("a NaN value refuses on every operator, not only Gte/Lt", () =>
    Effect.gen(function* () {
      for (const op of ["Eq", "Neq", "Gte", "Lt"] as const) {
        const failure = yield* refusalOf(
          { _tag: "Compare", column: "score", op, value: Number.NaN },
          "postgres",
        );
        assert.strictEqual(failure?._tag, "PredicateNotRenderable", op);
        assert.strictEqual(failure?.predicateTag, "Compare");
        assert.strictEqual(failure?.reason, "value for column 'score' is not a safe query parameter");
      }

      const memberOf = yield* refusalOf(
        { _tag: "MemberOf", column: "score", values: [1, Number.NaN] },
        "postgres",
      );
      assert.strictEqual(memberOf?._tag, "PredicateNotRenderable");
      assert.strictEqual(memberOf?.predicateTag, "MemberOf");
      assert.strictEqual(
        memberOf?.reason,
        "a value for column 'score' is not a safe query parameter",
      );
    }));

  // Infinity/-Infinity are ordinary numbers to `>=`/`<` on both sides, so
  // whether they diverge would need a real engine to settle — refused ahead
  // of that question, exactly as the Date case is, and exactly as
  // @qadi/predicate-prisma refuses them. Without this, `M.gte(-Infinity)`
  // translated by toPredicate compiled to `"score" >= $1` with -Infinity
  // bound as a parameter.
  it.effect("Infinity and -Infinity refuse too, alongside NaN, on every dialect", () =>
    Effect.gen(function* () {
      for (const dialect of DIALECTS) {
        for (const value of [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
          const failure = yield* refusalOf(
            { _tag: "Compare", column: "score", op: "Gte", value },
            dialect,
          );
          assert.strictEqual(failure?._tag, "PredicateNotRenderable", dialect);
          assert.strictEqual(
            failure?.reason,
            "value for column 'score' is not a safe query parameter",
          );
        }
      }
    }));

  it.effect("MemberOf past maxInValues refuses rather than rendering an unbounded IN", () =>
    Effect.gen(function* () {
      const predicate: Predicate = {
        _tag: "MemberOf",
        column: "role",
        values: Array.from({ length: 1001 }, (_, i) => i),
      };
      const failure = yield* refusalOf(predicate, "postgres");
      assert.strictEqual(failure?._tag, "PredicateNotRenderable");
      assert.strictEqual(failure?.predicateTag, "MemberOf");
      assert.strictEqual(failure?.reason, "1001 values exceeds maxInValues (1000)");
    }));

  it.effect("maxInValues is configurable", () =>
    Effect.gen(function* () {
      const predicate: Predicate = { _tag: "MemberOf", column: "role", values: [1, 2, 3] };
      const failure = yield* refusalOf(predicate, "postgres", 2);
      assert.strictEqual(failure?._tag, "PredicateNotRenderable");
      const ok = yield* refusalOf(predicate, "postgres", 3);
      assert.strictEqual(ok, undefined);
    }));

  it.effect("a refusal deep in the tree fails the whole compilation", () =>
    Effect.gen(function* () {
      const predicate: Predicate = {
        _tag: "And",
        predicates: [
          { _tag: "Compare", column: "tenantId", op: "Eq", value: "t-1" },
          { _tag: "Negate", predicate: { _tag: "Compare", column: "x", op: "Eq", value: { bad: 1 } } },
        ],
      };
      const failure = yield* refusalOf(predicate, "postgres");
      assert.strictEqual(failure?._tag, "PredicateNotRenderable");
    }));

  it.effect("a Compare column carrying a quote character refuses, never renders unescaped", () =>
    Effect.gen(function* () {
      const predicate: Predicate = {
        _tag: "Compare",
        column: 'x" = $1 OR 1=1 --',
        op: "Eq",
        value: 1,
      };
      const failure = yield* refusalOf(predicate, "postgres");
      assert.strictEqual(failure?._tag, "PredicateNotRenderable");
      assert.strictEqual(failure?.predicateTag, "Compare");
      assert.strictEqual(failure?.reason, "column 'x\" = $1 OR 1=1 --' is not a safe identifier");
    }));

  it.effect("a MemberOf column carrying a backtick refuses under mysql too", () =>
    Effect.gen(function* () {
      const predicate: Predicate = { _tag: "MemberOf", column: "c`.`other", values: [1] };
      const failure = yield* refusalOf(predicate, "mysql");
      assert.strictEqual(failure?._tag, "PredicateNotRenderable");
      assert.strictEqual(failure?.predicateTag, "MemberOf");
      assert.strictEqual(failure?.reason, "column 'c`.`other' is not a safe identifier");
    }));

  it.effect("a Date value refuses rather than compiling to a query that disagrees with evaluatePredicate", () =>
    Effect.gen(function* () {
      // evaluatePredicate's Gte/Lt require typeof value === "number", so a
      // Date there is always false in the reference evaluator, while a real
      // SQL engine's >=/< performs a real comparison and would admit rows
      // the reference evaluator denies — INV-QD-047's own disagreement.
      const predicate: Predicate = {
        _tag: "Compare",
        column: "createdAt",
        op: "Gte",
        value: new Date("2026-01-01T00:00:00.000Z"),
      };
      const failure = yield* refusalOf(predicate, "postgres");
      assert.strictEqual(failure?._tag, "PredicateNotRenderable");
      assert.strictEqual(failure?.predicateTag, "Compare");
      assert.strictEqual(
        failure?.reason,
        "value for column 'createdAt' is not a safe query parameter",
      );
    }));

  it.effect("a column outside [A-Za-z_][A-Za-z0-9_]* refuses even with no special SQL characters", () =>
    Effect.gen(function* () {
      const predicate: Predicate = { _tag: "Compare", column: "1leadingDigit", op: "Eq", value: 1 };
      const failure = yield* refusalOf(predicate, "postgres");
      assert.strictEqual(failure?._tag, "PredicateNotRenderable");
    }));
});
