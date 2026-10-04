/**
 * Real SQL engines as the oracle: PostgreSQL through PGlite (WASM, the real
 * PostgreSQL query engine) and SQLite through `node:sqlite`, each holding the
 * 48-row table `ROWS` describes.
 *
 * `interpretSqlFragment` was a JavaScript re-implementation of the grammar
 * `compileSql` emits, written by the people who wrote the compiler, and a model
 * shares its author's beliefs: it agreed with the original NULL-handling defect
 * (INV-QD-047) and with the `NaN` one (CCR-QD-120), both of which a real engine
 * found. These are real engines, so a belief about SQL's three-valued logic or a
 * driver's binding rules is checked rather than assumed.
 *
 * MySQL has no embeddable Node engine and is covered structurally instead (see
 * `EngineAgreement.test.ts`).
 */
import { DatabaseSync } from "node:sqlite";
import type { SQLInputValue } from "node:sqlite";
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { PGlite } from "@electric-sql/pglite";
import type { SqlFragment, SqlSafeValue } from "../src/index.ts";

/** One row of the fixture table, as `evaluatePredicate` reads it. */
export type EngineRow = {
  readonly id: number;
  readonly tenantId: string;
  readonly level: number | null;
  readonly tag: string | null;
  readonly sealed: boolean;
};

/**
 * The row universe: `tenantId` x `level` x `tag` x `sealed`, 2 x 4 x 3 x 2 = 48.
 * `level` and `tag` may be NULL; `tenantId` and `sealed` may not.
 */
export const ROWS: ReadonlyArray<EngineRow> = (() => {
  const rows: Array<EngineRow> = [];
  for (const tenantId of ["t-1", "t-2"]) {
    for (const level of [null, 0, 3, 5]) {
      for (const tag of [null, "red", "blue"]) {
        for (const sealed of [false, true]) {
          rows.push({ id: rows.length + 1, tenantId, level, tag, sealed });
        }
      }
    }
  }
  return rows;
})();

/** The engine refused the query (a syntax, type or binding error). */
export class EngineRefused extends Data.TaggedError("EngineRefused")<{
  readonly message: string;
}> {}

export interface SqlEngineShape {
  /** The ids of the rows the engine returns for a compiled `WHERE` fragment, ascending. */
  readonly query: (fragment: SqlFragment) => Effect.Effect<ReadonlyArray<number>, EngineRefused>;
}

export class PgliteEngine extends Context.Service<PgliteEngine, SqlEngineShape>()(
  "qadi/test/PgliteEngine",
) {}

export class SqliteEngine extends Context.Service<SqliteEngine, SqlEngineShape>()(
  "qadi/test/SqliteEngine",
) {}

const isIdRow = (row: unknown): row is { readonly id: number } =>
  typeof row === "object" &&
  row !== null &&
  "id" in row &&
  typeof row.id === "number";

const refused = (cause: unknown): EngineRefused =>
  new EngineRefused({ message: cause instanceof Error ? cause.message : String(cause) });

const acquirePglite = Effect.tryPromise({
  try: async () => {
    const db = new PGlite();
    await db.exec(
      `CREATE TABLE r (id int PRIMARY KEY, "tenantId" text NOT NULL, level int, tag text, sealed boolean NOT NULL)`,
    );
    for (const row of ROWS) {
      await db.query(`INSERT INTO r VALUES ($1, $2, $3, $4, $5)`, [
        row.id,
        row.tenantId,
        row.level,
        row.tag,
        row.sealed,
      ]);
    }
    return db;
  },
  catch: refused,
});

/** A scoped, seeded PostgreSQL (PGlite). */
export const PgliteEngineTest: Layer.Layer<PgliteEngine, EngineRefused> = Layer.effect(
  PgliteEngine,
  Effect.acquireRelease(acquirePglite, (db) => Effect.promise(() => db.close())).pipe(
    Effect.map(
      (db): SqlEngineShape => ({
        query: (fragment) =>
          Effect.tryPromise({
            try: async () => {
              const result = await db.query(`SELECT id FROM r WHERE ${fragment.text} ORDER BY id`, [
                ...fragment.params,
              ]);
              return result.rows.filter(isIdRow).map((row) => row.id);
            },
            catch: refused,
          }),
      }),
    ),
  ),
);

/**
 * What the driver accepts as a parameter. Both Node SQLite drivers refuse a JS
 * boolean, so one reaching here is `compileSql`'s defect (ADR-QD-079, N3), not
 * something to coerce quietly.
 */
const toSqliteInput = (value: SqlSafeValue): SQLInputValue => {
  if (typeof value === "boolean") {
    throw new Error("Provided value cannot be bound to SQLite parameter: a boolean");
  }
  return value;
};

const acquireSqlite = Effect.try({
  try: () => {
    const db = new DatabaseSync(":memory:");
    db.exec(
      `CREATE TABLE r (id INTEGER PRIMARY KEY, "tenantId" TEXT NOT NULL, level INTEGER, tag TEXT, sealed INTEGER NOT NULL)`,
    );
    const insert = db.prepare(`INSERT INTO r VALUES (?, ?, ?, ?, ?)`);
    for (const row of ROWS) {
      // SQLite stores a boolean as 1/0 and neither Node driver binds a JS boolean.
      insert.run(row.id, row.tenantId, row.level, row.tag, row.sealed ? 1 : 0);
    }
    return db;
  },
  catch: refused,
});

/** A scoped, seeded SQLite (`node:sqlite`, which needs `--experimental-sqlite` on Node 22.12). */
export const SqliteEngineTest: Layer.Layer<SqliteEngine, EngineRefused> = Layer.effect(
  SqliteEngine,
  Effect.acquireRelease(acquireSqlite, (db) => Effect.sync(() => db.close())).pipe(
    Effect.map(
      (db): SqlEngineShape => ({
        query: (fragment) =>
          Effect.try({
            try: () =>
              db
                .prepare(`SELECT id FROM r WHERE ${fragment.text} ORDER BY id`)
                .all(...fragment.params.map(toSqliteInput))
                .filter(isIdRow)
                .map((row) => row.id),
            catch: refused,
          }),
      }),
    ),
  ),
);
