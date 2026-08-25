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
      assert.deepStrictEqual(
        yield* compilePrismaWhere({ _tag: "Compare", column: "tenantId", op: "Neq", value: "t-1" }),
        { tenantId: { not: "t-1" } },
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
