import { assert, layer } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import * as FastCheck from "fast-check";
import { evaluatePredicate, type Predicate } from "@qadi/core";
import { compilePrismaWhere, floatingFieldsOf, nullableFieldsOf } from "../src/index.ts";
import { Prisma } from "../prisma/generated/index.js";
import { leaf, treeOf } from "./generators.ts";
import { EngineRefused, PrismaEngine, PrismaEngineTest, ROWS } from "./prismaEngine.ts";

/**
 * INV-QD-048, checked against a real Prisma 7.10 query engine over SQLite
 * (CCR-QD-157) rather than a JavaScript model of one. The row universe is the
 * 48-row table `prismaEngine.ts` seeds; every property samples 300 predicates
 * at a fixed seed, so a failure reproduces.
 */

const tree: FastCheck.Arbitrary<Predicate> = treeOf(leaf);
const predicates = FastCheck.sample(tree, { numRuns: 300, seed: 4096 });

/**
 * The fixture schema's truth: `level`, `tag` and `score` are optional, `tenantId`
 * and `sealed` are required.
 */
const TRUE_DECLARATION: ReadonlySet<string> = new Set(["level", "tag", "score"]);

/** The fixture schema's one `Float` field (CCR-QD-172). */
const TRUE_FLOATING: ReadonlySet<string> = new Set(["score"]);

const expected = (predicate: Predicate): ReadonlyArray<number> =>
  ROWS.filter((row) => evaluatePredicate(predicate, row)).map((row) => row.id);

const isSubset = (small: ReadonlyArray<number>, big: ReadonlyArray<number>): boolean =>
  small.every((id) => big.includes(id));

layer(PrismaEngineTest)("INV-QD-048 against a real Prisma engine over SQLite", (it) => {
  it.effect("P1: under the true declaration, the engine returns exactly the reference's rows", () =>
    Effect.gen(function* () {
      const engine = yield* PrismaEngine;
      for (const predicate of predicates) {
        const where = yield* compilePrismaWhere(predicate, { floating: TRUE_FLOATING, nullable: TRUE_DECLARATION });
        const rows = yield* engine
          .query(where)
          .pipe(
            Effect.mapError(
              (error) => new EngineRefused({ message: `${error.message}\n${JSON.stringify({ predicate, where })}` }),
            ),
          );
        assert.deepStrictEqual(rows, expected(predicate), JSON.stringify({ predicate, where }));
      }
      // The sample is not vacuous: it reaches the shapes this fix is about.
      assert.isAbove(predicates.length, 299);
    }));

  it.effect(
    "P2: under-declared (nothing nullable), the engine never returns a row the reference denies",
    () =>
      Effect.gen(function* () {
        const engine = yield* PrismaEngine;
        let strictSubsets = 0;
        for (const predicate of predicates) {
          const compiled = yield* Effect.result(
            compilePrismaWhere(predicate, { floating: TRUE_FLOATING, nullable: new Set() }),
          );
          // A null comparison on a column declared NOT NULL refuses at compile time.
          if (Result.isFailure(compiled)) {
            assert.strictEqual(compiled.failure._tag, "PredicateNotRenderable");
            continue;
          }
          const where = compiled.success;
          const rows = yield* engine
            .query(where)
            .pipe(
              Effect.mapError(
                (error) => new EngineRefused({ message: `${error.message}\n${JSON.stringify({ predicate, where })}` }),
              ),
            );
          const reference = expected(predicate);
          assert.isTrue(isSubset(rows, reference), JSON.stringify({ predicate, where, rows, reference }));
          if (rows.length < reference.length) strictSubsets += 1;
        }
        // Not vacuous: a wrong declaration really does lose rows, and that is all it can do.
        assert.isAbove(strictSubsets, 0);
      }),
  );

  it.effect(
    "P3: over-declared (everything nullable), every query equals the reference or is refused, never over-admits",
    () =>
      Effect.gen(function* () {
        const engine = yield* PrismaEngine;
        const everything = new Set(["tenantId", "level", "tag", "sealed", "score"]);
        let refusals = 0;
        for (const predicate of predicates) {
          const where = yield* compilePrismaWhere(predicate, { floating: TRUE_FLOATING, nullable: everything });
          const result = yield* Effect.result(engine.query(where));
          if (Result.isFailure(result)) {
            refusals += 1;
            continue;
          }
          assert.deepStrictEqual(
            result.success,
            expected(predicate),
            JSON.stringify({ predicate, where }),
          );
        }
        // Not vacuous: Prisma really does refuse a null mention on a required column.
        assert.isAbove(refusals, 0);
      }),
  );

  it.effect("P4: the vacuous-identity shapes (C1) give the reference's rows on the real engine", () =>
    Effect.gen(function* () {
      const engine = yield* PrismaEngine;
      const tenant: Predicate = { _tag: "Compare", column: "tenantId", op: "Eq", value: "t-1" };
      const sealed: Predicate = { _tag: "Compare", column: "sealed", op: "Eq", value: true };
      const shapes: ReadonlyArray<Predicate> = [
        { _tag: "True" },
        { _tag: "False" },
        { _tag: "And", predicates: [tenant, { _tag: "False" }] },
        { _tag: "Or", predicates: [tenant, { _tag: "True" }] },
        { _tag: "And", predicates: [{ _tag: "True" }, tenant] },
        { _tag: "Or", predicates: [{ _tag: "False" }, tenant] },
        {
          _tag: "Or",
          predicates: [{ _tag: "And", predicates: [{ _tag: "False" }, sealed] }, tenant],
        },
        { _tag: "Negate", predicate: { _tag: "And", predicates: [{ _tag: "False" }, sealed] } },
        { _tag: "Negate", predicate: { _tag: "True" } },
        { _tag: "Negate", predicate: { _tag: "False" } },
        { _tag: "Negate", predicate: { _tag: "MemberOf", column: "tag", values: [] } },
        { _tag: "And", predicates: [{ _tag: "MemberOf", column: "tag", values: [] }, tenant] },
        { _tag: "And", predicates: [] },
        { _tag: "Or", predicates: [] },
        { _tag: "Negate", predicate: { _tag: "And", predicates: [] } },
      ];
      for (const predicate of shapes) {
        const where = yield* compilePrismaWhere(predicate, { floating: TRUE_FLOATING, nullable: TRUE_DECLARATION });
        const rows = yield* engine.query(where);
        assert.deepStrictEqual(rows, expected(predicate), JSON.stringify({ predicate, where }));
      }
    }));

  it.effect("the C6 repro: Negate over a nullable column admits the NULL rows on the real engine", () =>
    Effect.gen(function* () {
      const engine = yield* PrismaEngine;
      const cases: ReadonlyArray<Predicate> = [
        {
          _tag: "Negate",
          predicate: { _tag: "Compare", column: "level", op: "Gte", value: 3 },
        },
        { _tag: "Negate", predicate: { _tag: "Compare", column: "tag", op: "Eq", value: "red" } },
        { _tag: "Negate", predicate: { _tag: "MemberOf", column: "tag", values: ["red"] } },
      ];
      for (const predicate of cases) {
        const where = yield* compilePrismaWhere(predicate, { floating: TRUE_FLOATING, nullable: TRUE_DECLARATION });
        const rows = yield* engine.query(where);
        assert.deepStrictEqual(rows, expected(predicate), JSON.stringify({ predicate, where }));
        // The rows the plain `{NOT: ...}` lost are the NULL-valued ones.
        const nullIds = ROWS.filter((row) => row.level === null || row.tag === null).map((row) => row.id);
        assert.isTrue(rows.some((id) => nullIds.includes(id)));
      }
    }));

  it.effect("the N1 repro: Neq on a required column is accepted by the engine, the NULL-shaped one is not", () =>
    Effect.gen(function* () {
      const engine = yield* PrismaEngine;
      const neq: Predicate = { _tag: "Compare", column: "tenantId", op: "Neq", value: "t-1" };
      const accepted = yield* compilePrismaWhere(neq, { floating: TRUE_FLOATING, nullable: TRUE_DECLARATION });
      assert.deepStrictEqual(yield* engine.query(accepted), expected(neq));

      const refused = yield* Effect.result(
        engine.query({ OR: [{ tenantId: { not: "t-1" } }, { tenantId: null }] }),
      );
      assert.isTrue(Result.isFailure(refused));
      if (Result.isFailure(refused)) {
        assert.include(refused.failure.message, "tenantId");
      }
    }));

  // Prisma 7's runtime `Prisma.dmmf` carries only `name`/`kind`/`type` per field —
  // `isRequired` is stripped from the generated client's data model, so it cannot
  // be the source of a nullability declaration. `nullableFieldsOf` needs a DMMF
  // that keeps it (`getDMMF` from `@prisma/internals`); this test pins both facts
  // so a Prisma upgrade that changes either surfaces here instead of silently
  // changing what a declaration derived from `Prisma.dmmf` means.
  it("P5: the runtime DMMF names the fixture's columns but carries no isRequired", () => {
    const model = Prisma.dmmf.datamodel.models.find((candidate) => candidate.name === "Row");
    assert.isDefined(model);
    if (model !== undefined) {
      assert.deepStrictEqual(
        model.fields.map((field) => field.name),
        ["id", "tenantId", "level", "tag", "sealed", "score"],
      );
      assert.isTrue(model.fields.every((field) => field.kind === "scalar"));
      assert.isTrue(model.fields.every((field) => !("isRequired" in field)));
    }
  });

  it("P5: nullableFieldsOf, given a DMMF that keeps isRequired, yields the fixture's declaration", () => {
    const parsed = {
      fields: [
        { name: "id", kind: "scalar", isRequired: true },
        { name: "tenantId", kind: "scalar", isRequired: true },
        { name: "level", kind: "scalar", isRequired: false },
        { name: "tag", kind: "scalar", isRequired: false },
        { name: "sealed", kind: "scalar", isRequired: true },
        { name: "score", kind: "scalar", isRequired: false },
      ],
    };
    assert.deepStrictEqual([...nullableFieldsOf(parsed)].sort(), [...TRUE_DECLARATION].sort());
  });

  // Unlike `isRequired`, the runtime DMMF keeps `type`, so the floating
  // declaration needs no `@prisma/internals`.
  it("P5: floatingFieldsOf reads the runtime DMMF and yields the fixture's floating declaration", () => {
    const model = Prisma.dmmf.datamodel.models.find((candidate) => candidate.name === "Row");
    assert.isDefined(model);
    if (model !== undefined) {
      assert.deepStrictEqual([...floatingFieldsOf(model)], [...TRUE_FLOATING]);
    }
  });

  // CCR-QD-172. A plain range on a `Float` field admits an infinite row that
  // `evaluatePredicate` denies, and Prisma has no filter that excludes it
  // (`lte: Number.MAX_VALUE` is bound as a decimal string SQLite reads back as
  // `Infinity`). So a range on a declared-floating column refuses; these pin
  // the refusal, both wrong-declaration directions, and the engine fact that
  // makes the refusal necessary.
  it.effect("P6: a range on a floating column refuses rather than admit an infinite row", () =>
    Effect.gen(function* () {
      const engine = yield* PrismaEngine;
      const gte: Predicate = { _tag: "Compare", column: "score", op: "Gte", value: 3 };
      const lt: Predicate = { _tag: "Compare", column: "score", op: "Lt", value: 3 };
      const infinite = ROWS.filter((row) => row.score !== null && !Number.isFinite(row.score));
      assert.isAbove(infinite.length, 0);

      for (const predicate of [gte, lt, { _tag: "Negate", predicate: gte } satisfies Predicate]) {
        const refused = yield* Effect.result(
          compilePrismaWhere(predicate, { floating: TRUE_FLOATING, nullable: TRUE_DECLARATION }),
        );
        assert.isTrue(Result.isFailure(refused), JSON.stringify(predicate));
        if (Result.isFailure(refused)) {
          assert.strictEqual(refused.failure.refusal, "NonFiniteColumn");
          assert.strictEqual(
            refused.failure.reason,
            "column 'score' may hold a non-finite number, and this target cannot exclude one from a range",
          );
        }
      }

      // Equality and membership on the same column still render, and agree.
      for (const predicate of [
        { _tag: "Compare", column: "score", op: "Neq", value: 3 },
        { _tag: "MemberOf", column: "score", values: [0, 5] },
      ] satisfies ReadonlyArray<Predicate>) {
        const where = yield* compilePrismaWhere(predicate, { floating: TRUE_FLOATING, nullable: TRUE_DECLARATION });
        assert.deepStrictEqual(yield* engine.query(where), expected(predicate), JSON.stringify(predicate));
      }

      // The non-lie-safe direction, pinned: a `Float` column left out of the
      // declaration renders a plain range, and the engine returns the infinite
      // rows `evaluatePredicate` denies. This is why `floating` is required.
      const undeclared = yield* compilePrismaWhere(gte, { floating: new Set(), nullable: TRUE_DECLARATION });
      const admitted = yield* engine.query(undeclared);
      const overAdmitted = admitted.filter((id) => !expected(gte).includes(id));
      assert.deepStrictEqual(
        overAdmitted,
        ROWS.filter((row) => row.score === Number.POSITIVE_INFINITY).map((row) => row.id),
      );

      // The loud direction: an `Int` column declared floating refuses its ranges.
      const intDeclaredFloating = yield* Effect.result(
        compilePrismaWhere(
          { _tag: "Compare", column: "level", op: "Gte", value: 3 },
          { floating: new Set(["level"]), nullable: TRUE_DECLARATION },
        ),
      );
      assert.isTrue(Result.isFailure(intDeclaredFloating));

      // The engine fact behind the refusal: the bounded filter a guard would
      // need still returns the `Infinity` rows.
      const bounded = yield* engine.query({ score: { gte: 3, lte: Number.MAX_VALUE } });
      assert.isTrue(
        ROWS.filter((row) => row.score === Number.POSITIVE_INFINITY).every((row) => bounded.includes(row.id)),
      );
    }));
});
