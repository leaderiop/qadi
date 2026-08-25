import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import type { Predicate } from "@qadi/core";
import { compilePrismaWhere } from "../src/index.ts";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

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

  it.effect("a Date value passes through as a driver-native value, not stringified", () =>
    Effect.gen(function* () {
      const createdAt = new Date("2026-01-01T00:00:00.000Z");
      const where = yield* compilePrismaWhere({
        _tag: "Compare",
        column: "createdAt",
        op: "Gte",
        value: createdAt,
      });
      const filter = where.createdAt;
      assert.ok(isRecord(filter));
      if (isRecord(filter)) {
        assert.strictEqual(filter.gte, createdAt);
      }
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
});
