/**
 * A real Prisma query engine as the oracle: Prisma Client 7.10 over an
 * in-memory SQLite database (`@prisma/adapter-better-sqlite3`), holding the
 * 48-row table `../prisma/schema.prisma` describes.
 *
 * The `matchesPrismaWhere*` readers this replaced (retired, ARCH-03 T7) were
 * JavaScript models of what Prisma does, written by the same people who wrote the
 * compiler, and a model shares its author's beliefs. Three defects (INV-QD-048's NULL handling,
 * the nested vacuous identities, and `Negate` dropping NULL rows) were each found
 * by running the compiled output through a real engine, not by a model. This is
 * that run, made permanent.
 */
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../prisma/generated/index.js";
import type { Prisma } from "../prisma/generated/index.js";

/** One row of the fixture table, as `evaluatePredicate` reads it. */
export type EngineRow = {
  readonly id: number;
  readonly tenantId: string;
  readonly level: number | null;
  readonly tag: string | null;
  readonly sealed: boolean;
  readonly score: number | null;
};

/**
 * `score`'s values: a `Float?` field, stored as SQLite `REAL`, the one column
 * type that can hold the infinities CCR-QD-172 found a plain range admits.
 * SQLite stores `NaN` as `NULL`, so there is none here.
 */
export const SCORES: ReadonlyArray<number | null> = [
  null,
  0,
  3,
  5,
  Number.POSITIVE_INFINITY,
  Number.NEGATIVE_INFINITY,
];

/**
 * The row universe: `tenantId` x `level` x `tag` x `sealed`, 2 x 4 x 3 x 2 = 48,
 * with `score` assigned cyclically from `SCORES` so the universe stays 48 rows.
 * `level`, `tag` and `score` are nullable; `tenantId` and `sealed` are not,
 * matching the schema.
 */
export const ROWS: ReadonlyArray<EngineRow> = (() => {
  const rows: Array<EngineRow> = [];
  for (const tenantId of ["t-1", "t-2"]) {
    for (const level of [null, 0, 3, 5]) {
      for (const tag of [null, "red", "blue"]) {
        for (const sealed of [false, true]) {
          const score = SCORES[rows.length % SCORES.length] ?? null;
          rows.push({ id: rows.length + 1, tenantId, level, tag, sealed, score });
        }
      }
    }
  }
  return rows;
})();

/** Prisma refused the query (a validation error, or an engine failure). */
export class EngineRefused extends Data.TaggedError("EngineRefused")<{
  readonly message: string;
}> {}

export interface PrismaEngineShape {
  /** The ids of the rows the engine returns for a compiled `where`, ascending. */
  readonly query: (where: unknown) => Effect.Effect<ReadonlyArray<number>, EngineRefused>;
}

export class PrismaEngine extends Context.Service<PrismaEngine, PrismaEngineShape>()(
  "qadi/test/PrismaEngine",
) {}

/**
 * Narrows a compiled `PrismaWhereInput` to the fixture model's `WhereInput`.
 *
 * `PrismaWhereInput` is `Record<string, unknown>` on purpose (this package never
 * sees a schema), so a caller narrows it at the call site, where the model is
 * known. This is that site. It checks only that the value is an object: whether
 * the *shape* is valid is exactly what the engine under test decides, and a
 * rejection surfaces as `EngineRefused`.
 */
const isRowWhereInput = (value: unknown): value is Prisma.RowWhereInput =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const DDL = `CREATE TABLE "Row" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "tenantId" TEXT NOT NULL,
  "level" INTEGER,
  "tag" TEXT,
  "sealed" BOOLEAN NOT NULL,
  "score" REAL
)`;

const acquire = Effect.tryPromise({
  try: async () => {
    const client = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: ":memory:" }) });
    await client.$executeRawUnsafe(DDL);
    // Prisma's `create` takes no non-finite number, so an infinite score is
    // written raw (`9e999` is how SQLite spells `Infinity`).
    await client.row.createMany({
      data: ROWS.map((row) => ({ ...row, score: Number.isFinite(row.score) ? row.score : null })),
    });
    for (const row of ROWS) {
      if (row.score === null || Number.isFinite(row.score)) continue;
      await client.$executeRawUnsafe(
        `UPDATE "Row" SET "score" = ${row.score > 0 ? "9e999" : "-9e999"} WHERE "id" = ${row.id}`,
      );
    }
    return client;
  },
  catch: (cause) => new EngineRefused({ message: String(cause) }),
});

/** A scoped, seeded Prisma client; `query` runs `findMany` and returns the ids. */
export const PrismaEngineTest: Layer.Layer<PrismaEngine, EngineRefused> = Layer.effect(
  PrismaEngine,
  Effect.acquireRelease(acquire, (client) => Effect.promise(() => client.$disconnect())).pipe(
    Effect.map(
      (client): PrismaEngineShape => ({
        query: (where) =>
          Effect.tryPromise({
            try: async () => {
              if (!isRowWhereInput(where)) throw new Error("a WhereInput must be an object");
              const found = await client.row.findMany({
                where,
                select: { id: true },
                orderBy: { id: "asc" },
              });
              return found.map((row) => row.id);
            },
            catch: (cause) => new EngineRefused({ message: String(cause) }),
          }),
      }),
    ),
  ),
);
