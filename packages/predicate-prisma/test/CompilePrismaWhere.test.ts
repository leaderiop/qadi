import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import type { Predicate } from "@qadi/core";
import { compilePrismaWhere } from "../src/index.ts";

const refusalOf = (predicate: Predicate) =>
  Effect.map(Effect.result(compilePrismaWhere(predicate)), (r) =>
    r._tag === "Failure" ? r.failure : undefined,
  );

describe("compilePrismaWhere — golden shapes", () => {
  it.effect("True/False render to Prisma's own vacuous identities", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(yield* compilePrismaWhere({ _tag: "True" }), { AND: [] });
      assert.deepStrictEqual(yield* compilePrismaWhere({ _tag: "False" }), { OR: [] });
    }));

  it.effect("every CompareOp renders its own filter shape", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(
        yield* compilePrismaWhere({ _tag: "Compare", column: "tenantId", op: "Eq", value: "t-1" }),
        { tenantId: "t-1" },
      );
      // Not `{ tenantId: { not: "t-1" } }` alone — see the dedicated
      // NULL-handling describe block below for why.
      assert.deepStrictEqual(
        yield* compilePrismaWhere({ _tag: "Compare", column: "tenantId", op: "Neq", value: "t-1" }),
        { OR: [{ tenantId: { not: "t-1" } }, { tenantId: null }] },
      );
      assert.deepStrictEqual(
        yield* compilePrismaWhere({ _tag: "Compare", column: "level", op: "Gte", value: 3 }),
        { level: { gte: 3 } },
      );
      assert.deepStrictEqual(
        yield* compilePrismaWhere({ _tag: "Compare", column: "level", op: "Lt", value: 3 }),
        { level: { lt: 3 } },
      );
    }));

  it.effect("MemberOf renders an 'in' filter, empty renders False's identity", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(
        yield* compilePrismaWhere({ _tag: "MemberOf", column: "tag", values: ["red", "blue"] }),
        { tag: { in: ["red", "blue"] } },
      );
      assert.deepStrictEqual(
        yield* compilePrismaWhere({ _tag: "MemberOf", column: "tag", values: [] }),
        { OR: [] },
      );
    }));

  it.effect("And/Or/Negate compose structurally", () =>
    Effect.gen(function* () {
      const compound: Predicate = {
        _tag: "And",
        predicates: [
          { _tag: "Compare", column: "tenantId", op: "Eq", value: "t-1" },
          { _tag: "MemberOf", column: "tag", values: ["red", "blue"] },
          { _tag: "Negate", predicate: { _tag: "Compare", column: "sealed", op: "Eq", value: true } },
        ],
      };
      assert.deepStrictEqual(yield* compilePrismaWhere(compound), {
        AND: [{ tenantId: "t-1" }, { tag: { in: ["red", "blue"] } }, { NOT: { sealed: true } }],
      });

      const anyOf: Predicate = {
        _tag: "Or",
        predicates: [
          { _tag: "Compare", column: "a", op: "Eq", value: 1 },
          { _tag: "Compare", column: "a", op: "Eq", value: 2 },
        ],
      };
      assert.deepStrictEqual(yield* compilePrismaWhere(anyOf), {
        OR: [{ a: 1 }, { a: 2 }],
      });
    }));

  it.effect("nested Negate renders exactly what the AST says, no elimination", () =>
    Effect.gen(function* () {
      const doubled: Predicate = {
        _tag: "Negate",
        predicate: {
          _tag: "Negate",
          predicate: { _tag: "Compare", column: "tenantId", op: "Eq", value: "t-1" },
        },
      };
      assert.deepStrictEqual(yield* compilePrismaWhere(doubled), {
        NOT: { NOT: { tenantId: "t-1" } },
      });
    }));

  it.effect("a hand-constructed empty And/Or degrades to the vacuous identity", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(yield* compilePrismaWhere({ _tag: "And", predicates: [] }), {
        AND: [],
      });
      assert.deepStrictEqual(yield* compilePrismaWhere({ _tag: "Or", predicates: [] }), {
        OR: [],
      });
    }));

  it.effect("a null value is on the safe allowlist and compiles, rather than refusing", () =>
    Effect.gen(function* () {
      const where = yield* compilePrismaWhere({
        _tag: "Compare",
        column: "deletedAt",
        op: "Eq",
        value: null,
      });
      assert.deepStrictEqual(where, { deletedAt: null });
    }));
});

// `{col: {not: value}}` alone excludes a row where `col IS NULL` — Prisma's
// `not` compiles to a standard SQL `!=`/`<>` underneath most connectors, and
// `evaluatePredicate`'s `!==` admits that row (`null !== value` is true for
// any non-null `value`). `{col: {in: [...]}}` is worse: Prisma's own
// validator REFUSES a `null` member outright rather than silently
// mishandling it. Both found by running a compiled `WhereInput` against a
// real, SQLite-backed Prisma client (`@prisma/adapter-better-sqlite3`) and
// comparing its result set to `evaluatePredicate`'s — not designed in from
// the start.
describe("compilePrismaWhere — NULL handling agrees with evaluatePredicate's ===/!==", () => {
  it.effect("Eq/Neq against null use Prisma's own null-equality filters, unchanged", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(
        yield* compilePrismaWhere({ _tag: "Compare", column: "c", op: "Eq", value: null }),
        { c: null },
      );
      assert.deepStrictEqual(
        yield* compilePrismaWhere({ _tag: "Compare", column: "c", op: "Neq", value: null }),
        { c: { not: null } },
      );
    }));

  it.effect("Gte/Lt against null render False's identity — Prisma refuses {gte: null}", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(
        yield* compilePrismaWhere({ _tag: "Compare", column: "c", op: "Gte", value: null }),
        { OR: [] },
      );
      assert.deepStrictEqual(
        yield* compilePrismaWhere({ _tag: "Compare", column: "c", op: "Lt", value: null }),
        { OR: [] },
      );
    }));

  it.effect("Neq against a non-null value also admits a NULL-valued column", () =>
    Effect.gen(function* () {
      const where = yield* compilePrismaWhere({ _tag: "Compare", column: "c", op: "Neq", value: 1 });
      assert.deepStrictEqual(where, { OR: [{ c: { not: 1 } }, { c: null }] });
    }));

  it.effect("a MemberOf holding only null renders {col: null}, no 'in' at all", () =>
    Effect.gen(function* () {
      const where = yield* compilePrismaWhere({ _tag: "MemberOf", column: "c", values: [null] });
      assert.deepStrictEqual(where, { c: null });
    }));

  it.effect("a MemberOf mixing null with real values splits null out of 'in'", () =>
    Effect.gen(function* () {
      const where = yield* compilePrismaWhere({
        _tag: "MemberOf",
        column: "c",
        values: [null, "red", "blue"],
      });
      assert.deepStrictEqual(where, { OR: [{ c: { in: ["red", "blue"] } }, { c: null }] });
    }));
});

// Prisma's query-compiler strips an empty `AND`/`OR` filter reached below the
// top level before `NOT` ever sees it (verified against Prisma 7.10's engine
// source — see `isVacuousTrue`/`isVacuousFalse` in `../src/index.ts`), so a
// bare `{NOT: {AND: []}}`/`{NOT: {OR: []}}` folds to "no WHERE restriction" —
// every row — inverting `evaluatePredicate(Negate(True/False), row)`, which
// is `false`/`true` for every row. This is a golden-shape assertion, not a
// `matchesPrismaWhere`-driven property one, on purpose: that reader computes
// `!matchesPrismaWhere({AND: []}, row)` as plain JS (`.every([])` is `true`,
// negated `false`), which already agrees with the *reference* semantics —
// exactly why it was structurally blind to the real engine's folding bug in
// the first place (ticket 06's own finding). Only the exact rendered
// `WhereInput` shape distinguishes the fix from the defect.
describe("compilePrismaWhere — Negate over a vacuous identity avoids the engine's NOT-folding bug", () => {
  it.effect("Negate(True) renders False's own identity, not {NOT: {AND: []}}", () =>
    Effect.gen(function* () {
      const where = yield* compilePrismaWhere({ _tag: "Negate", predicate: { _tag: "True" } });
      assert.deepStrictEqual(where, { OR: [] });
    }));

  it.effect("Negate(False) renders True's own identity, not {NOT: {OR: []}}", () =>
    Effect.gen(function* () {
      const where = yield* compilePrismaWhere({ _tag: "Negate", predicate: { _tag: "False" } });
      assert.deepStrictEqual(where, { AND: [] });
    }));

  it.effect("Negate over a hand-built empty And/Or gets the same treatment", () =>
    Effect.gen(function* () {
      // Unreachable through toPredicate (negate() folds True/False before
      // building a Negate node), but Predicate is directly constructible —
      // an empty And/Or renders identically to True/False, so it hits the
      // exact same engine-folding bug.
      const negatedAnd = yield* compilePrismaWhere({
        _tag: "Negate",
        predicate: { _tag: "And", predicates: [] },
      });
      assert.deepStrictEqual(negatedAnd, { OR: [] });

      const negatedOr = yield* compilePrismaWhere({
        _tag: "Negate",
        predicate: { _tag: "Or", predicates: [] },
      });
      assert.deepStrictEqual(negatedOr, { AND: [] });
    }));

  it.effect("Negate over an empty MemberOf also gets the same treatment", () =>
    Effect.gen(function* () {
      // MemberOf's own empty-values case renders {OR: []} too (line 179 of
      // ../src/index.ts) — the same vacuous-false shape, same bug.
      const where = yield* compilePrismaWhere({
        _tag: "Negate",
        predicate: { _tag: "MemberOf", column: "tag", values: [] },
      });
      assert.deepStrictEqual(where, { AND: [] });
    }));

  it.effect("Negate over a non-vacuous subtree still renders a plain NOT", () =>
    Effect.gen(function* () {
      const where = yield* compilePrismaWhere({
        _tag: "Negate",
        predicate: { _tag: "Compare", column: "tenantId", op: "Eq", value: "t-1" },
      });
      assert.deepStrictEqual(where, { NOT: { tenantId: "t-1" } });
    }));
});

describe("compilePrismaWhere — refusals", () => {
  it.effect("a Compare value outside the safe allowlist refuses, never binds it blind", () =>
    Effect.gen(function* () {
      const failure = yield* refusalOf({ _tag: "Compare", column: "x", op: "Eq", value: { foo: 1 } });
      assert.strictEqual(failure?._tag, "PredicateNotRenderable");
      assert.strictEqual(failure?.predicateTag, "Compare");
      assert.strictEqual(failure?.reason, "value for column 'x' is not a safe query parameter");
    }));

  it.effect("a MemberOf member outside the safe allowlist refuses, naming the column", () =>
    Effect.gen(function* () {
      const failure = yield* refusalOf({
        _tag: "MemberOf",
        column: "x",
        values: ["ok", { bad: true }],
      });
      assert.strictEqual(failure?._tag, "PredicateNotRenderable");
      assert.strictEqual(failure?.predicateTag, "MemberOf");
      assert.strictEqual(failure?.reason, "a value for column 'x' is not a safe query parameter");
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
      const failure = yield* refusalOf(predicate);
      assert.strictEqual(failure?._tag, "PredicateNotRenderable");
    }));

  it.effect("a Date value refuses rather than compiling to a query that disagrees with evaluatePredicate", () =>
    Effect.gen(function* () {
      // evaluatePredicate's Gte/Lt require typeof value === "number", so a
      // Date there is always false in the reference evaluator, while
      // Prisma's {gte: date} performs a real comparison and would admit rows
      // the reference evaluator denies — INV-QD-048's own disagreement.
      const failure = yield* refusalOf({
        _tag: "Compare",
        column: "createdAt",
        op: "Gte",
        value: new Date("2026-01-01T00:00:00.000Z"),
      });
      assert.strictEqual(failure?._tag, "PredicateNotRenderable");
      assert.strictEqual(failure?.predicateTag, "Compare");
      assert.strictEqual(
        failure?.reason,
        "value for column 'createdAt' is not a safe query parameter",
      );
    }));

  it.effect("a column named NOT refuses rather than silently negating the filter", () =>
    Effect.gen(function* () {
      const failure = yield* refusalOf({ _tag: "Compare", column: "NOT", op: "Eq", value: "t-1" });
      assert.strictEqual(failure?._tag, "PredicateNotRenderable");
      assert.strictEqual(failure?.predicateTag, "Compare");
      assert.strictEqual(failure?.reason, "column 'NOT' is not a safe identifier");
    }));

  it.effect("a column named AND or OR refuses too, for MemberOf as well as Compare", () =>
    Effect.gen(function* () {
      const and = yield* refusalOf({ _tag: "Compare", column: "AND", op: "Eq", value: 1 });
      const or = yield* refusalOf({ _tag: "MemberOf", column: "OR", values: ["a", "b"] });
      assert.strictEqual(and?._tag, "PredicateNotRenderable");
      assert.strictEqual(or?._tag, "PredicateNotRenderable");
      assert.strictEqual(or?.reason, "column 'OR' is not a safe identifier");
    }));
});
