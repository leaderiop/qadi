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
};

/**
 * The row universe: `tenantId` x `level` x `tag` x `sealed`, 2 x 4 x 3 x 2 = 48.
 * `level` and `tag` are nullable; `tenantId` and `sealed` are not, matching the
 * schema.
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
  "sealed" BOOLEAN NOT NULL
)`;

const acquire = Effect.tryPromise({
  try: async () => {
    const client = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: ":memory:" }) });
    await client.$executeRawUnsafe(DDL);
    await client.row.createMany({ data: ROWS.map((row) => ({ ...row })) });
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
