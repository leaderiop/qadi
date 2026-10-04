import { assert, layer } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";
import * as FastCheck from "fast-check";
import { evaluatePredicate, type Predicate } from "@qadi/core";
import { compileSql } from "../src/index.ts";
import { leaf, treeOf } from "./generators.ts";
import {
  EngineRefused,
  PgliteEngine,
  PgliteEngineTest,
  ROWS,
  SqliteEngine,
  SqliteEngineTest,
} from "./sqlEngines.ts";

/**
 * INV-QD-047, checked against real engines (CCR-QD-158): PostgreSQL through
 * PGlite and SQLite through `node:sqlite`, rather than against a JavaScript
 * model of either. MySQL has no embeddable Node engine, so S2 carries the
 * guarantee to it structurally. The row universe is the 48-row table
 * `sqlEngines.ts` seeds; every property samples 300 predicates at a fixed seed,
 * so a failure reproduces.
 */

const tree: FastCheck.Arbitrary<Predicate> = treeOf(leaf);
const predicates = FastCheck.sample(tree, { numRuns: 300, seed: 2048 });

const expected = (predicate: Predicate): ReadonlyArray<number> =>
  ROWS.filter((row) => evaluatePredicate(predicate, row)).map((row) => row.id);

const mapRefused =
  (context: unknown) =>
  (error: EngineRefused): EngineRefused =>
    new EngineRefused({ message: `${error.message}\n${JSON.stringify(context)}` });

layer(Layer.mergeAll(PgliteEngineTest, SqliteEngineTest))(
  "INV-QD-047 against real SQL engines",
  (it) => {
    it.effect("S1: postgres (PGlite) returns exactly the reference's rows", () =>
      Effect.gen(function* () {
        const engine = yield* PgliteEngine;
        for (const predicate of predicates) {
          const fragment = yield* compileSql(predicate, { dialect: "postgres" });
          const rows = yield* engine
            .query(fragment)
            .pipe(Effect.mapError(mapRefused({ predicate, fragment })));
          assert.deepStrictEqual(rows, expected(predicate), JSON.stringify({ predicate, fragment }));
        }
      }));

    it.effect("S1: sqlite (node:sqlite) returns exactly the reference's rows", () =>
      Effect.gen(function* () {
        const engine = yield* SqliteEngine;
        for (const predicate of predicates) {
          const fragment = yield* compileSql(predicate, { dialect: "sqlite" });
          const rows = yield* engine
            .query(fragment)
            .pipe(Effect.mapError(mapRefused({ predicate, fragment })));
          assert.deepStrictEqual(rows, expected(predicate), JSON.stringify({ predicate, fragment }));
        }
      }));

    // The sample reaches the shapes the three historical defects lived in.
    it("S1's sample is not vacuous: it contains NULL-sensitive Negate trees", () => {
      const negatedNullable = predicates.filter((predicate) => {
        const text = JSON.stringify(predicate);
        return text.includes('"Negate"') && (text.includes('"level"') || text.includes('"tag"'));
      });
      assert.isAbove(negatedNullable.length, 20);
    });

    it.effect("S2: mysql is sqlite's text modulo quote characters, with identical params", () =>
      Effect.gen(function* () {
        for (const predicate of predicates) {
          const sqlite = yield* compileSql(predicate, { dialect: "sqlite" });
          const mysql = yield* compileSql(predicate, { dialect: "mysql" });
          assert.strictEqual(
            mysql.text,
            sqlite.text.replaceAll('"', "`"),
            JSON.stringify({ predicate }),
          );
          // mysql2 binds a boolean itself; sqlite's table binds it as 1/0.
          assert.deepStrictEqual(
            mysql.params.map((value) => (typeof value === "boolean" ? (value ? 1 : 0) : value)),
            sqlite.params,
            JSON.stringify({ predicate }),
          );
        }
      }));

    // S3: a nullability declaration can only narrow or refuse (ADR-QD-079). The
    // table's truth is `level` and `tag` nullable, `tenantId` and `sealed` NOT NULL.
    const compileWith = (predicate: Predicate, dialect: "postgres" | "sqlite", nullable: ReadonlySet<string>) =>
      Effect.result(compileSql(predicate, { dialect, nullable }));

    const isSubset = (small: ReadonlyArray<number>, big: ReadonlyArray<number>): boolean =>
      small.every((id) => big.includes(id));

    it.effect("S3: under the true declaration both engines agree exactly, with fewer null guards", () =>
      Effect.gen(function* () {
        const pg = yield* PgliteEngine;
        const lite = yield* SqliteEngine;
        const declared: ReadonlySet<string> = new Set(["level", "tag"]);
        let shorter = 0;
        for (const predicate of predicates) {
          const unknown = yield* compileSql(predicate, { dialect: "postgres" });
          for (const [dialect, engine] of [
            ["postgres", pg],
            ["sqlite", lite],
          ] as const) {
            const fragment = yield* compileSql(predicate, { dialect, nullable: declared });
            const rows = yield* engine
              .query(fragment)
              .pipe(Effect.mapError(mapRefused({ predicate, fragment })));
            assert.deepStrictEqual(rows, expected(predicate), JSON.stringify({ dialect, predicate, fragment }));
            if (dialect === "postgres" && fragment.text.length < unknown.text.length) shorter += 1;
          }
        }
        // The declaration is worth something: it drops `OR col IS NULL` on required columns.
        assert.isAbove(shorter, 0);
      }));

    it.effect("S3: over-declared (everything nullable) is exact on both engines: IS NULL is valid on NOT NULL", () =>
      Effect.gen(function* () {
        const pg = yield* PgliteEngine;
        const lite = yield* SqliteEngine;
        const everything: ReadonlySet<string> = new Set(["tenantId", "level", "tag", "sealed"]);
        for (const predicate of predicates) {
          for (const [dialect, engine] of [
            ["postgres", pg],
            ["sqlite", lite],
          ] as const) {
            const fragment = yield* compileSql(predicate, { dialect, nullable: everything });
            const rows = yield* engine
              .query(fragment)
              .pipe(Effect.mapError(mapRefused({ predicate, fragment })));
            assert.deepStrictEqual(rows, expected(predicate), JSON.stringify({ dialect, predicate, fragment }));
          }
        }
      }));

    it.effect("S3: under-declared (nothing nullable) never admits a row the reference denies", () =>
      Effect.gen(function* () {
        const pg = yield* PgliteEngine;
        const lite = yield* SqliteEngine;
        let strictSubsets = 0;
        for (const predicate of predicates) {
          for (const [dialect, engine] of [
            ["postgres", pg],
            ["sqlite", lite],
          ] as const) {
            const compiled = yield* compileWith(predicate, dialect, new Set());
            // A null comparison on a column declared NOT NULL refuses at compile time.
            if (Result.isFailure(compiled)) {
              assert.strictEqual(compiled.failure._tag, "PredicateNotRenderable");
              continue;
            }
            const fragment = compiled.success;
            const rows = yield* engine
              .query(fragment)
              .pipe(Effect.mapError(mapRefused({ predicate, fragment })));
            const reference = expected(predicate);
            assert.isTrue(
              isSubset(rows, reference),
              JSON.stringify({ dialect, predicate, fragment, rows, reference }),
            );
            if (rows.length < reference.length) strictSubsets += 1;
          }
        }
        // Not vacuous: a wrong declaration really does lose rows, and that is all it can do.
        assert.isAbove(strictSubsets, 0);
      }));

    // S4 characterises an accepted limitation (N2, BEH-QD-244), it does not fix
    // one. A schema-blind compiler cannot know a column's type, so a literal
    // whose JS type differs from its column's is only as trustworthy as the
    // caller's column types. Both engines coerce the string `"3"` against an
    // INTEGER column and admit `level = 3`; `evaluatePredicate`'s `3 === "3"`
    // is false. Pinned here so a change in either engine's behavior surfaces as
    // a failure that prompts a spec update, not as silent drift.
    it.effect("S4: a string literal against an INTEGER column over-admits on both engines (N2)", () =>
      Effect.gen(function* () {
        const pg = yield* PgliteEngine;
        const lite = yield* SqliteEngine;
        const threes = ROWS.filter((row) => row.level === 3).map((row) => row.id);
        const mismatched: ReadonlyArray<Predicate> = [
          { _tag: "Compare", column: "level", op: "Eq", value: "3" },
          { _tag: "MemberOf", column: "level", values: ["3"] },
        ];
        for (const predicate of mismatched) {
          assert.deepStrictEqual(expected(predicate), []);
          const postgres = yield* compileSql(predicate, { dialect: "postgres" });
          assert.deepStrictEqual(yield* pg.query(postgres), threes, JSON.stringify(predicate));
          const sqlite = yield* compileSql(predicate, { dialect: "sqlite" });
          assert.deepStrictEqual(yield* lite.query(sqlite), threes, JSON.stringify(predicate));
        }
      }));

    it.effect("S4: a boolean literal against an INTEGER column is refused loudly by PostgreSQL", () =>
      Effect.gen(function* () {
        const pg = yield* PgliteEngine;
        const fragment = yield* compileSql(
          { _tag: "Compare", column: "level", op: "Eq", value: true },
          { dialect: "postgres" },
        );
        const result = yield* Effect.result(pg.query(fragment));
        assert.isTrue(Result.isFailure(result));
      }));
  },
);
