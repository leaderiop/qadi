import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import type { Predicate } from "@qadi/core";
import { compileSql, type SqlDialect } from "../src/index.ts";

const DIALECTS: ReadonlyArray<SqlDialect> = ["postgres", "mysql", "sqlite"];

const render = (predicate: Predicate, dialect: SqlDialect, maxInValues?: number) =>
  compileSql(predicate, { dialect, ...(maxInValues !== undefined ? { maxInValues } : {}) });

const refusalOf = (predicate: Predicate, dialect: SqlDialect, maxInValues?: number) =>
  Effect.map(Effect.result(render(predicate, dialect, maxInValues)), (r) =>
    r._tag === "Failure" ? r.failure : undefined,
  );

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
        [{ _tag: "Compare", column: "c", op: "Gte", value: 1 }, '"c" >= $1'],
        [{ _tag: "Compare", column: "c", op: "Lt", value: 1 }, '"c" < $1'],
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
        text: '("tenantId" = $1 AND "tag" IN ($2, $3) AND NOT ("sealed" = $4))',
        params: ["t-1", "red", "blue", true],
      });
      assert.deepStrictEqual(yield* render(compound, "sqlite"), {
        text: '("tenantId" = ? AND "tag" IN (?, ?) AND NOT ("sealed" = ?))',
        params: ["t-1", "red", "blue", true],
      });

      const anyOf: Predicate = { _tag: "Or", predicates: [eq, eq] };
      const orFragment = yield* render(anyOf, "postgres");
      assert.strictEqual(orFragment.text, '("tenantId" = $1 OR "tenantId" = $2)');
    }));

  it.effect("nested Negate renders exactly what the AST says, no elimination", () =>
    Effect.gen(function* () {
      // Reachable since Predicate.ts's negate() only inverts constants, not
      // arbitrary sub-trees. Simplify.ts never runs on a Predicate.
      const doubled: Predicate = {
        _tag: "Negate",
        predicate: { _tag: "Negate", predicate: eq },
      };
      const fragment = yield* render(doubled, "postgres");
      assert.strictEqual(fragment.text, 'NOT (NOT ("tenantId" = $1))');
    }));

  it.effect("a Date value binds as a driver-native parameter, not stringified", () =>
    Effect.gen(function* () {
      const createdAt = new Date("2026-01-01T00:00:00.000Z");
      const predicate: Predicate = { _tag: "Compare", column: "createdAt", op: "Gte", value: createdAt };
      const fragment = yield* render(predicate, "postgres");
      assert.strictEqual(fragment.params[0], createdAt);
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
});
