import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import * as FastCheck from "fast-check";
import { DEFAULT_MAX_IN_VALUES, evaluatePredicate, toRenderable } from "@qadi/core";
import { PredicateNotRenderable as CorePredicateNotRenderable } from "@qadi/core";
import type { Predicate, RenderRules } from "@qadi/core";
import {
  compilePrismaWhere,
  nullableFieldsOf,
  PredicateNotRenderable,
  type CompilePrismaWhereOptions,
} from "../src/index.ts";
import { compile } from "./fixture.ts";

const refusalOf = (predicate: Predicate) =>
  Effect.map(Effect.result(compile(predicate)), (r) =>
    Result.isFailure(r) ? r.failure : undefined,
  );

describe("compilePrismaWhere — golden shapes", () => {
  it.effect("True/False render to Prisma's own vacuous identities", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(yield* compile({ _tag: "True" }), { AND: [] });
      assert.deepStrictEqual(yield* compile({ _tag: "False" }), { OR: [] });
    }));

  it.effect("every CompareOp renders its own filter shape", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(
        yield* compile({ _tag: "Compare", column: "tenantId", op: "Eq", value: "t-1" }),
        { tenantId: "t-1" },
      );
      // `tenantId` is a required column in the fixture, so a plain `not` is
      // exact (N1). On a nullable column it is not `{ not: v }` alone — see the
      // dedicated NULL-handling describe block below for why.
      assert.deepStrictEqual(
        yield* compile({ _tag: "Compare", column: "tenantId", op: "Neq", value: "t-1" }),
        { tenantId: { not: "t-1" } },
      );
      assert.deepStrictEqual(
        yield* compile({ _tag: "Compare", column: "tag", op: "Neq", value: "red" }),
        { OR: [{ tag: { not: "red" } }, { tag: null }] },
      );
      assert.deepStrictEqual(
        yield* compile({ _tag: "Compare", column: "level", op: "Gte", value: 3 }),
        { level: { gte: 3 } },
      );
      assert.deepStrictEqual(
        yield* compile({ _tag: "Compare", column: "level", op: "Lt", value: 3 }),
        { level: { lt: 3 } },
      );
    }));

  it.effect("MemberOf renders an 'in' filter, empty renders False's identity", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(
        yield* compile({ _tag: "MemberOf", column: "tag", values: ["red", "blue"] }),
        { tag: { in: ["red", "blue"] } },
      );
      assert.deepStrictEqual(
        yield* compile({ _tag: "MemberOf", column: "tag", values: [] }),
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
      assert.deepStrictEqual(yield* compile(compound), {
        AND: [{ tenantId: "t-1" }, { tag: { in: ["red", "blue"] } }, { NOT: { sealed: true } }],
      });

      const anyOf: Predicate = {
        _tag: "Or",
        predicates: [
          { _tag: "Compare", column: "a", op: "Eq", value: 1 },
          { _tag: "Compare", column: "a", op: "Eq", value: 2 },
        ],
      };
      assert.deepStrictEqual(yield* compile(anyOf), {
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
      assert.deepStrictEqual(yield* compile(doubled), {
        NOT: { NOT: { tenantId: "t-1" } },
      });
    }));

  it.effect("a hand-constructed empty And/Or degrades to the vacuous identity", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(yield* compile({ _tag: "And", predicates: [] }), {
        AND: [],
      });
      assert.deepStrictEqual(yield* compile({ _tag: "Or", predicates: [] }), {
        OR: [],
      });
    }));

  it.effect("a null value is on the safe allowlist and compiles, rather than refusing", () =>
    Effect.gen(function* () {
      const where = yield* compile({
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
        yield* compile({ _tag: "Compare", column: "c", op: "Eq", value: null }),
        { c: null },
      );
      assert.deepStrictEqual(
        yield* compile({ _tag: "Compare", column: "c", op: "Neq", value: null }),
        { c: { not: null } },
      );
    }));

  it.effect("Gte/Lt against null render False's identity — Prisma refuses {gte: null}", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(
        yield* compile({ _tag: "Compare", column: "c", op: "Gte", value: null }),
        { OR: [] },
      );
      assert.deepStrictEqual(
        yield* compile({ _tag: "Compare", column: "c", op: "Lt", value: null }),
        { OR: [] },
      );
    }));

  it.effect("Neq against a non-null value also admits a NULL-valued column", () =>
    Effect.gen(function* () {
      const where = yield* compile({ _tag: "Compare", column: "c", op: "Neq", value: 1 });
      assert.deepStrictEqual(where, { OR: [{ c: { not: 1 } }, { c: null }] });
    }));

  // ticket 136(a) — mirrors @qadi/predicate-sql's identical guard (ticket
  // 157): evaluatePredicate's Gte/Lt require typeof === "number" on both
  // sides and are otherwise always False, but a string or boolean slips past
  // isSafeValue's allowlist straight into a real Prisma range filter
  // (`{gte: "10"}`/`{lt: true}`), admitting rows the reference evaluator
  // denies. NaN is covered separately, by isSafeValue itself refusing it
  // outright (ticket 138) before this Gte/Lt-specific guard is ever reached —
  // see the "refuses NaN" describe block below.
  it.effect("Gte/Lt with a non-number, non-null value renders False's identity, never a real filter", () =>
    Effect.gen(function* () {
      const nonNumberValues: ReadonlyArray<unknown> = ["10", true, false];
      for (const value of nonNumberValues) {
        assert.deepStrictEqual(
          yield* compile({ _tag: "Compare", column: "c", op: "Gte", value }),
          { OR: [] },
        );
        assert.deepStrictEqual(
          yield* compile({ _tag: "Compare", column: "c", op: "Lt", value }),
          { OR: [] },
        );
      }
    }));

  it.effect("Gte/Lt with a genuine number still compiles to a real filter", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(
        yield* compile({ _tag: "Compare", column: "c", op: "Gte", value: 10 }),
        { c: { gte: 10 } },
      );
      assert.deepStrictEqual(
        yield* compile({ _tag: "Compare", column: "c", op: "Lt", value: 10 }),
        { c: { lt: 10 } },
      );
    }));

  it.effect("a MemberOf holding only null renders {col: null}, no 'in' at all", () =>
    Effect.gen(function* () {
      const where = yield* compile({ _tag: "MemberOf", column: "c", values: [null] });
      assert.deepStrictEqual(where, { c: null });
    }));

  it.effect("a MemberOf mixing null with real values splits null out of 'in'", () =>
    Effect.gen(function* () {
      const where = yield* compile({
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
      const where = yield* compile({ _tag: "Negate", predicate: { _tag: "True" } });
      assert.deepStrictEqual(where, { OR: [] });
    }));

  it.effect("Negate(False) renders True's own identity, not {NOT: {OR: []}}", () =>
    Effect.gen(function* () {
      const where = yield* compile({ _tag: "Negate", predicate: { _tag: "False" } });
      assert.deepStrictEqual(where, { AND: [] });
    }));

  it.effect("Negate over a hand-built empty And/Or gets the same treatment", () =>
    Effect.gen(function* () {
      // Unreachable through toPredicate (negate() folds True/False before
      // building a Negate node), but Predicate is directly constructible —
      // an empty And/Or renders identically to True/False, so it hits the
      // exact same engine-folding bug.
      const negatedAnd = yield* compile({
        _tag: "Negate",
        predicate: { _tag: "And", predicates: [] },
      });
      assert.deepStrictEqual(negatedAnd, { OR: [] });

      const negatedOr = yield* compile({
        _tag: "Negate",
        predicate: { _tag: "Or", predicates: [] },
      });
      assert.deepStrictEqual(negatedOr, { AND: [] });
    }));

  it.effect("Negate over an empty MemberOf also gets the same treatment", () =>
    Effect.gen(function* () {
      // MemberOf's own empty-values case renders {OR: []} too (line 179 of
      // ../src/index.ts) — the same vacuous-false shape, same bug.
      const where = yield* compile({
        _tag: "Negate",
        predicate: { _tag: "MemberOf", column: "tag", values: [] },
      });
      assert.deepStrictEqual(where, { AND: [] });
    }));

  it.effect("Negate over a non-vacuous subtree still renders a plain NOT", () =>
    Effect.gen(function* () {
      const where = yield* compile({
        _tag: "Negate",
        predicate: { _tag: "Compare", column: "tenantId", op: "Eq", value: "t-1" },
      });
      assert.deepStrictEqual(where, { NOT: { tenantId: "t-1" } });
    }));
});

// C1 (issue 34, spot-verified in DASHBOARD.md's Critical finding): before
// this fix, `And`/`Or` nested a rendered `parts` array verbatim, so a
// `False`/empty-`MemberOf` child anywhere below the top rendered as a
// *nested* `{OR: []}` — which Prisma's real query engine silently drops
// from an `AND`/`OR` list rather than treating as always-false (Prisma
// issues #17367, #21856; see `isVacuousTrue`/`isVacuousFalse` in
// `../src/index.ts`). A policy meaning "deny role-less users" could compile
// to a query that admitted them instead. `renderNode` now constant-folds
// every `And`/`Or` child so a vacuous identity is never left nested — these
// assertions pin the exact shapes that guarantee, and `EngineAgreement.test.ts`
// (P4) proves the same shapes against a real Prisma engine rather than a
// JavaScript model of its nested-empty-array behavior.
describe("compilePrismaWhere — nested vacuous identities constant-fold (C1)", () => {
  it.effect("a False nested inside And folds to the top-level False identity, not a nested {OR: []}", () =>
    Effect.gen(function* () {
      const predicate: Predicate = {
        _tag: "And",
        predicates: [
          { _tag: "Compare", column: "tenantId", op: "Eq", value: "t-1" },
          { _tag: "False" },
        ],
      };
      assert.deepStrictEqual(yield* compile(predicate), { OR: [] });
    }));

  it.effect("a True nested inside Or folds to the top-level True identity, not a nested {AND: []}", () =>
    Effect.gen(function* () {
      const predicate: Predicate = {
        _tag: "Or",
        predicates: [
          { _tag: "Compare", column: "tenantId", op: "Eq", value: "t-1" },
          { _tag: "True" },
        ],
      };
      assert.deepStrictEqual(yield* compile(predicate), { AND: [] });
    }));

  it.effect("a True nested inside And is dropped, not left as a nested {AND: []}", () =>
    Effect.gen(function* () {
      const predicate: Predicate = {
        _tag: "And",
        predicates: [
          { _tag: "True" },
          { _tag: "Compare", column: "tenantId", op: "Eq", value: "t-1" },
        ],
      };
      assert.deepStrictEqual(yield* compile(predicate), { AND: [{ tenantId: "t-1" }] });
    }));

  it.effect("a False nested inside Or is dropped, not left as a nested {OR: []}", () =>
    Effect.gen(function* () {
      const predicate: Predicate = {
        _tag: "Or",
        predicates: [
          { _tag: "False" },
          { _tag: "Compare", column: "tenantId", op: "Eq", value: "t-1" },
        ],
      };
      assert.deepStrictEqual(yield* compile(predicate), { OR: [{ tenantId: "t-1" }] });
    }));

  it.effect("folding happens at every depth, not only directly under the outermost And/Or", () =>
    Effect.gen(function* () {
      // Or([And([False, X]), Y]) — the inner And must itself already have
      // collapsed to {OR: []} by the time the outer Or looks at its parts,
      // so the outer Or drops it rather than nesting {AND: [{OR: []}, ...]}.
      const predicate: Predicate = {
        _tag: "Or",
        predicates: [
          {
            _tag: "And",
            predicates: [
              { _tag: "False" },
              { _tag: "Compare", column: "sealed", op: "Eq", value: true },
            ],
          },
          { _tag: "Compare", column: "tenantId", op: "Eq", value: "t-1" },
        ],
      };
      assert.deepStrictEqual(yield* compile(predicate), { OR: [{ tenantId: "t-1" }] });
    }));

  it.effect("Negate over a nested-vacuous And still avoids the NOT-folding bug", () =>
    Effect.gen(function* () {
      // Negate(And([False, X])) — And([False, X]) folds to {OR: []} before
      // Negate ever sees it, so Negate's own isVacuousFalse check (not a
      // literal {NOT: {AND: [{OR: []}, ...]}}) is what fires.
      const predicate: Predicate = {
        _tag: "Negate",
        predicate: {
          _tag: "And",
          predicates: [
            { _tag: "False" },
            { _tag: "Compare", column: "sealed", op: "Eq", value: true },
          ],
        },
      };
      assert.deepStrictEqual(yield* compile(predicate), { AND: [] });
    }));

  it.effect(
    "the ticket's own example — an impossible role MemberOf inside an And — denies every row, verified against Prisma's real nested-empty-array behavior",
    () =>
      Effect.gen(function* () {
        // allOf([hasResourceAttribute("role", inArray([])), tenantEq]) —
        // "deny role-less users" — must render as unconditionally false,
        // never as a nested {OR: []} a real engine would silently drop from
        // the AND, admitting every tenant-matching row regardless of role.
        const predicate: Predicate = {
          _tag: "And",
          predicates: [
            { _tag: "MemberOf", column: "role", values: [] },
            { _tag: "Compare", column: "tenantId", op: "Eq", value: "t-1" },
          ],
        };
        const where = yield* compile(predicate);
        assert.deepStrictEqual(where, { OR: [] });

        const rows: ReadonlyArray<Record<string, unknown>> = [
          { role: "admin", tenantId: "t-1" },
          { role: "member", tenantId: "t-1" },
          { tenantId: "t-1" },
          { role: "admin", tenantId: "t-2" },
        ];
        for (const row of rows) {
          assert.strictEqual(evaluatePredicate(predicate, row), false, JSON.stringify(row));
        }
      }),
  );
});

// CCR-QD-153 (ARCH-03 C6). A plain `{NOT: {level: {gte: 3}}}` renders
// `WHERE (NOT level >= ?)`, and SQL's `NOT UNKNOWN` is `UNKNOWN`, which `WHERE`
// excludes — so a NULL-valued row, which `evaluatePredicate`'s two-valued `!`
// admits, silently went missing. Found by running the compiled shapes through
// a real Prisma 7.10 client over SQLite (127 of 3000 random predicates, every
// one under a `Negate`, none an over-admission), not by reading the code.
// `EngineAgreement.test.ts` checks these shapes against that real engine.
describe("compilePrismaWhere — Negate is NULL-safe on nullable columns (C6)", () => {
  const nullable: ReadonlySet<string> = new Set(["level", "tag"]);
  const gte3: Predicate = { _tag: "Compare", column: "level", op: "Gte", value: 3 };
  const tagRed: Predicate = { _tag: "Compare", column: "tag", op: "Eq", value: "red" };
  const tagIn: Predicate = { _tag: "MemberOf", column: "tag", values: ["red"] };

  it.effect("Negate(Gte) guards the leaf so a NULL-valued row is admitted", () =>
    Effect.gen(function* () {
      const where = yield* compilePrismaWhere({ _tag: "Negate", predicate: gte3 }, { nullable });
      assert.deepStrictEqual(where, { NOT: { level: { gte: 3, not: null } } });
    }));

  it.effect("Negate(Eq) guards the leaf", () =>
    Effect.gen(function* () {
      const where = yield* compilePrismaWhere({ _tag: "Negate", predicate: tagRed }, { nullable });
      assert.deepStrictEqual(where, { NOT: { tag: { equals: "red", not: null } } });
    }));

  it.effect("Negate(MemberOf) guards the leaf", () =>
    Effect.gen(function* () {
      const where = yield* compilePrismaWhere({ _tag: "Negate", predicate: tagIn }, { nullable });
      assert.deepStrictEqual(where, { NOT: { tag: { in: ["red"], not: null } } });
    }));

  it.effect("the guard follows polarity: an even number of Negates needs none, an odd number does", () =>
    Effect.gen(function* () {
      const twice = yield* compilePrismaWhere(
        { _tag: "Negate", predicate: { _tag: "Negate", predicate: gte3 } },
        { nullable },
      );
      assert.deepStrictEqual(twice, { NOT: { NOT: { level: { gte: 3 } } } });
      const underOr = yield* compilePrismaWhere(
        { _tag: "Negate", predicate: { _tag: "Or", predicates: [gte3, tagRed] } },
        { nullable },
      );
      assert.deepStrictEqual(underOr, {
        NOT: { OR: [{ level: { gte: 3, not: null } }, { tag: { equals: "red", not: null } }] },
      });
    }));

  it.effect("a leaf the reference admits on NULL is guarded with AdmitNull at either polarity", () =>
    Effect.gen(function* () {
      const neq: Predicate = { _tag: "Compare", column: "tag", op: "Neq", value: "red" };
      const admit = { OR: [{ tag: { not: "red" } }, { tag: null }] };
      assert.deepStrictEqual(yield* compilePrismaWhere(neq, { nullable }), admit);
      assert.deepStrictEqual(
        yield* compilePrismaWhere({ _tag: "Negate", predicate: neq }, { nullable }),
        { NOT: admit },
      );
      const withNull: Predicate = { _tag: "MemberOf", column: "tag", values: ["red", null] };
      assert.deepStrictEqual(
        yield* compilePrismaWhere({ _tag: "Negate", predicate: withNull }, { nullable }),
        { NOT: { OR: [{ tag: { in: ["red"] } }, { tag: null }] } },
      );
    }));

  it.effect("an un-negated leaf is byte-identical to the pre-C6 output", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(yield* compilePrismaWhere(gte3, { nullable }), { level: { gte: 3 } });
      assert.deepStrictEqual(yield* compilePrismaWhere(tagRed, { nullable }), { tag: "red" });
      assert.deepStrictEqual(yield* compilePrismaWhere(tagIn, { nullable }), { tag: { in: ["red"] } });
    }));

  it.effect("the declaration is the only thing guards read: no declaration, no guard", () =>
    Effect.gen(function* () {
      const where = yield* compilePrismaWhere(
        { _tag: "Negate", predicate: gte3 },
        { nullable: new Set() },
      );
      assert.deepStrictEqual(where, { NOT: { level: { gte: 3 } } });
    }));
});

// CCR-QD-153 (ARCH-03 N1). Prisma refuses every filter that mentions `null` on
// a required field — ``Argument `tenantId` is missing.`` — so the NULL-correct
// shape for `Neq` (`OR: [{not: v}, {c: null}]`) is a query-time failure on a
// NOT NULL column. A schema-blind renderer cannot emit one leaf valid on both
// kinds of column; a declared `nullable` set can.
describe("compilePrismaWhere — a required column never mentions null (N1)", () => {
  const nullable: ReadonlySet<string> = new Set(["level", "tag"]);

  it.effect("Neq on a required column is a plain {not: v}", () =>
    Effect.gen(function* () {
      const where = yield* compilePrismaWhere(
        { _tag: "Compare", column: "tenantId", op: "Neq", value: "t-1" },
        { nullable },
      );
      assert.deepStrictEqual(where, { tenantId: { not: "t-1" } });
    }));

  it.effect("a null comparison on a required column refuses, naming the declaration", () =>
    Effect.gen(function* () {
      for (const op of ["Eq", "Neq"] as const) {
        const result = yield* Effect.result(
          compilePrismaWhere({ _tag: "Compare", column: "tenantId", op, value: null }, { nullable }),
        );
        assert.isTrue(Result.isFailure(result));
        if (Result.isFailure(result)) {
          assert.strictEqual(result.failure._tag, "PredicateNotRenderable");
          assert.strictEqual(result.failure.predicateTag, "Compare");
          assert.strictEqual(
            result.failure.reason,
            "column 'tenantId' is declared NOT NULL; a null comparison is not renderable",
          );
        }
      }
    }));

  it.effect("a null member of a required column's MemberOf is dropped, never emitted", () =>
    Effect.gen(function* () {
      const where = yield* compilePrismaWhere(
        { _tag: "MemberOf", column: "tenantId", values: ["t-1", null] },
        { nullable },
      );
      assert.deepStrictEqual(where, { tenantId: { in: ["t-1"] } });
    }));

  it.effect("an all-null MemberOf on a required column refuses like a null Eq", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(
        compilePrismaWhere({ _tag: "MemberOf", column: "tenantId", values: [null] }, { nullable }),
      );
      assert.isTrue(Result.isFailure(result));
      if (Result.isFailure(result)) {
        assert.strictEqual(result.failure.predicateTag, "MemberOf");
        assert.strictEqual(
          result.failure.reason,
          "column 'tenantId' is declared NOT NULL; a null comparison is not renderable",
        );
      }
    }));

  it.effect("a nullable column still gets the null shapes", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(
        yield* compilePrismaWhere(
          { _tag: "Compare", column: "level", op: "Eq", value: null },
          { nullable },
        ),
        { level: null },
      );
      assert.deepStrictEqual(
        yield* compilePrismaWhere(
          { _tag: "Compare", column: "level", op: "Neq", value: null },
          { nullable },
        ),
        { level: { not: null } },
      );
    }));

  it("nullableFieldsOf reads a structural DMMF model: scalar and enum fields that are not required", () => {
    const model = {
      fields: [
        { name: "id", kind: "scalar", isRequired: true },
        { name: "level", kind: "scalar", isRequired: false },
        { name: "tag", kind: "enum", isRequired: false },
        // A relation field is never a column; `isRequired: false` on it must not count.
        { name: "owner", kind: "object", isRequired: false },
        { name: "tenantId", kind: "scalar", isRequired: true },
      ],
    };
    assert.deepStrictEqual([...nullableFieldsOf(model)].sort(), ["level", "tag"]);
  });
});

// ADR-QD-077: `maxInValues` and the identifier rule are core's, applied to this
// renderer too. Before, a 1001-member `MemberOf` and a column named `first name`
// compiled here and refused in `@qadi/predicate-sql`, against BEH-QD-238.
describe("compilePrismaWhere — the rules core owns (maxInValues, identifiers)", () => {
  const nullable: ReadonlySet<string> = new Set(["level"]);
  const values = (n: number): ReadonlyArray<number> => Array.from({ length: n }, (_, i) => i);

  it.effect("a MemberOf past maxInValues refuses, the default bound being 1000", () =>
    Effect.gen(function* () {
      const atBound = yield* compilePrismaWhere(
        { _tag: "MemberOf", column: "level", values: values(1000) },
        { nullable },
      );
      assert.deepStrictEqual(atBound, { level: { in: values(1000) } });
      const over = yield* Effect.flip(
        compilePrismaWhere({ _tag: "MemberOf", column: "level", values: values(1001) }, { nullable }),
      );
      assert.strictEqual(over.refusal, "TooManyValues");
      assert.strictEqual(over.predicateTag, "MemberOf");
      assert.strictEqual(over.reason, "1001 values exceeds maxInValues (1000)");
    }));

  it.effect("maxInValues is configurable", () =>
    Effect.gen(function* () {
      const failure = yield* Effect.flip(
        compilePrismaWhere(
          { _tag: "MemberOf", column: "level", values: values(4) },
          { nullable, maxInValues: 3 },
        ),
      );
      assert.strictEqual(failure.reason, "4 values exceeds maxInValues (3)");
    }));

  it.effect("a column outside the identifier rule refuses; UnicodeBmp opts a Prisma field like é in", () =>
    Effect.gen(function* () {
      const accented: Predicate = { _tag: "Compare", column: "é", op: "Eq", value: 1 };
      const refused = yield* Effect.flip(compilePrismaWhere(accented, { nullable }));
      assert.strictEqual(refused.refusal, "UnsafeColumn");
      assert.strictEqual(refused.reason, "column 'é' is not a safe identifier");
      assert.deepStrictEqual(
        yield* compilePrismaWhere(accented, { nullable, identifiers: "UnicodeBmp" }),
        { é: 1 },
      );
      for (const column of ["first name", "a.b"]) {
        const failure = yield* Effect.flip(
          compilePrismaWhere({ _tag: "Compare", column, op: "Eq", value: 1 }, { nullable }),
        );
        assert.strictEqual(failure.refusal, "UnsafeColumn", column);
      }
    }));

  it.effect("a Prisma operator keyword is a ReservedColumn refusal, not an UnsafeColumn one", () =>
    Effect.gen(function* () {
      const failure = yield* Effect.flip(
        compilePrismaWhere({ _tag: "Compare", column: "gte", op: "Eq", value: 1 }, { nullable }),
      );
      assert.strictEqual(failure.refusal, "ReservedColumn");
      assert.strictEqual(failure.reason, "column 'gte' is not a safe identifier");
    }));
});

// ADR-QD-077: one `PredicateNotRenderable`, declared in `@qadi/core`.
describe("compilePrismaWhere — the refusal is @qadi/core's PredicateNotRenderable", () => {
  const unsafe: Predicate = { _tag: "Compare", column: "x", op: "Eq", value: { foo: 1 } };

  it.effect("is an instance of the class @qadi/core exports, and the package re-exports that class", () =>
    Effect.gen(function* () {
      const failure = yield* Effect.flip(compilePrismaWhere(unsafe, { nullable: new Set() }));
      assert.instanceOf(failure, CorePredicateNotRenderable);
      assert.strictEqual(PredicateNotRenderable, CorePredicateNotRenderable);
      assert.strictEqual(failure.refusal, "UnsafeValue");
    }));

  it.effect("Effect.catchTag(\"PredicateNotRenderable\") catches it", () =>
    Effect.gen(function* () {
      const caught = yield* compilePrismaWhere(unsafe, { nullable: new Set() }).pipe(
        Effect.map(() => "compiled"),
        Effect.catchTag("PredicateNotRenderable", (error) => Effect.succeed(error.refusal)),
      );
      assert.strictEqual(caught, "UnsafeValue");
    }));
});

// ADR-QD-077: the compiler decides nothing about what is renderable. It refuses
// exactly when `toRenderable` does, under the rules it declares; the two
// renderers' rule sets differ only in `reservedColumns`.
describe("compilePrismaWhere — refusal parity with toRenderable", () => {
  const prismaRules = (options: CompilePrismaWhereOptions): RenderRules => ({
    identifiers: options.identifiers ?? "Ascii",
    reservedColumns: new Set([
      "AND", "OR", "NOT", "equals", "not", "in", "notIn", "lt", "lte", "gt", "gte", "is", "isNot",
    ]),
    maxInValues: options.maxInValues ?? DEFAULT_MAX_IN_VALUES,
    nullability: { _tag: "Declared", nullable: options.nullable },
    negation: "ThreeValued",
  });

  const columnArb = FastCheck.constantFrom("tenantId", "level", "a b", "é", "gte", "NOT", "Gte");
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

  const optionSets: ReadonlyArray<CompilePrismaWhereOptions> = [
    { nullable: new Set(["level"]) },
    { nullable: new Set() },
    { nullable: new Set(["level"]), maxInValues: 2 },
    { nullable: new Set(["tenantId", "level"]), identifiers: "UnicodeBmp", maxInValues: 3 },
  ];

  it.effect("PROPERTY: compilePrismaWhere fails exactly when toRenderable fails, with an equal refusal", () =>
    Effect.gen(function* () {
      const predicates = FastCheck.sample(treeArb, { numRuns: 300, seed: 99 });
      let refusals = 0;
      let compiled = 0;
      for (const options of optionSets) {
        for (const predicate of predicates) {
          const prisma = yield* Effect.result(compilePrismaWhere(predicate, options));
          const core = yield* Effect.result(toRenderable(predicate, prismaRules(options)));
          assert.strictEqual(Result.isFailure(prisma), Result.isFailure(core), JSON.stringify({ predicate, options }));
          if (Result.isFailure(prisma) && Result.isFailure(core)) {
            refusals += 1;
            assert.strictEqual(prisma.failure.refusal, core.failure.refusal);
            assert.strictEqual(prisma.failure.reason, core.failure.reason);
            assert.strictEqual(prisma.failure.predicateTag, core.failure.predicateTag);
          } else {
            compiled += 1;
          }
        }
      }
      assert.isAbove(refusals, 100);
      assert.isAbove(compiled, 100);
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

  // ticket 138 — isSafeValue's number branch now requires Number.isFinite,
  // not bare typeof. NaN satisfies `typeof === "number"` but `NaN === NaN`
  // is false in JS, so an Eq/MemberOf against NaN is reference-evaluator-false
  // for every row while Prisma's equality/`in` filters compile it into a
  // real, engine-dependent comparison — refused across Eq, MemberOf and Gte
  // alike, all from the same isSafeValue gate.
  it.effect("a NaN value refuses in Eq, MemberOf and Gte alike", () =>
    Effect.gen(function* () {
      const eq = yield* refusalOf({ _tag: "Compare", column: "score", op: "Eq", value: Number.NaN });
      assert.strictEqual(eq?._tag, "PredicateNotRenderable");
      assert.strictEqual(eq?.predicateTag, "Compare");
      assert.strictEqual(eq?.reason, "value for column 'score' is not a safe query parameter");

      const memberOf = yield* refusalOf({
        _tag: "MemberOf",
        column: "score",
        values: [1, Number.NaN],
      });
      assert.strictEqual(memberOf?._tag, "PredicateNotRenderable");
      assert.strictEqual(memberOf?.predicateTag, "MemberOf");
      assert.strictEqual(
        memberOf?.reason,
        "a value for column 'score' is not a safe query parameter",
      );

      const gte = yield* refusalOf({ _tag: "Compare", column: "score", op: "Gte", value: Number.NaN });
      assert.strictEqual(gte?._tag, "PredicateNotRenderable");
      assert.strictEqual(gte?.predicateTag, "Compare");
      assert.strictEqual(gte?.reason, "value for column 'score' is not a safe query parameter");
    }));

  it.effect("Infinity and -Infinity refuse too, alongside NaN", () =>
    Effect.gen(function* () {
      for (const value of [Infinity, -Infinity]) {
        const failure = yield* refusalOf({ _tag: "Compare", column: "score", op: "Eq", value });
        assert.strictEqual(failure?._tag, "PredicateNotRenderable");
        assert.strictEqual(failure?.reason, "value for column 'score' is not a safe query parameter");
      }
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

  // ticket 136(b) — RESERVED_PRISMA_KEYS widened past AND/OR/NOT to Prisma's
  // scalar-filter operator vocabulary. A column named one of these still
  // builds a structurally valid WhereInput (e.g. `{gte: {gte: value}}`), so
  // without this it would compile successfully and only fail — or silently
  // mean something else — at query time.
  it.effect("a column matching a Prisma scalar-filter operator keyword refuses", () =>
    Effect.gen(function* () {
      const gte = yield* refusalOf({ _tag: "Compare", column: "gte", op: "Eq", value: 1 });
      assert.strictEqual(gte?._tag, "PredicateNotRenderable");
      assert.strictEqual(gte?.reason, "column 'gte' is not a safe identifier");

      const not = yield* refusalOf({ _tag: "Compare", column: "not", op: "Eq", value: "t-1" });
      assert.strictEqual(not?._tag, "PredicateNotRenderable");
      assert.strictEqual(not?.reason, "column 'not' is not a safe identifier");

      const inCol = yield* refusalOf({ _tag: "MemberOf", column: "in", values: ["a", "b"] });
      assert.strictEqual(inCol?._tag, "PredicateNotRenderable");
      assert.strictEqual(inCol?.reason, "column 'in' is not a safe identifier");
    }));

  // RESERVED_PRISMA_KEYS lists 13 keys in total; the assertions above (plus
  // the dedicated AND/OR/NOT test) exercise only 6 of them. This loop covers
  // the remaining 7 — equals, notIn, lt, lte, gt, is, isNot — so every entry
  // in the set is actually pinned by a refusal, not merely declared in
  // ../src/index.ts.
  it.effect("every remaining Prisma scalar-filter operator keyword refuses too", () =>
    Effect.gen(function* () {
      const remainingKeys: ReadonlyArray<string> = [
        "equals",
        "notIn",
        "lt",
        "lte",
        "gt",
        "is",
        "isNot",
      ];
      for (const column of remainingKeys) {
        const failure = yield* refusalOf({ _tag: "Compare", column, op: "Eq", value: 1 });
        assert.strictEqual(failure?._tag, "PredicateNotRenderable", column);
        assert.strictEqual(failure?.predicateTag, "Compare", column);
        assert.strictEqual(failure?.reason, `column '${column}' is not a safe identifier`, column);
      }
    }));

  it.effect("matching is case-sensitive, same as the existing AND/OR/NOT check", () =>
    Effect.gen(function* () {
      // "Gte"/"In" are not reserved — only the exact-case Prisma keywords
      // are, matching the pre-existing AND/OR/NOT convention.
      const gte = yield* compile({ _tag: "Compare", column: "Gte", op: "Eq", value: 1 });
      assert.deepStrictEqual(gte, { Gte: 1 });
    }));
});
