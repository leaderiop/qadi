/**
 * A test-only reader for the `WhereInput` shapes `compilePrismaWhere` renders
 * — nothing more. Understands exactly the subset `renderNode` in
 * `../src/index.ts` ever emits: `{AND: [...]}`, `{OR: [...]}`, `{NOT: ...}`,
 * `{[column]: value}`, `{[column]: {not|gte|lt|in: ...}}`.
 *
 * A stronger guarantee than the SQL interpreter's: `WhereInput` is a plain
 * object, so there is no serialization step to separately parse — this reads
 * the rendered structure directly.
 */
import type { PrismaWhereInput } from "../src/index.ts";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asWhere = (value: unknown, context: string): PrismaWhereInput => {
  if (!isRecord(value)) throw new Error(`${context} must be an object`);
  return value;
};

export const matchesPrismaWhere = (
  where: PrismaWhereInput,
  row: Readonly<Record<string, unknown>>,
): boolean => {
  if ("AND" in where) {
    const clauses = where.AND;
    if (!Array.isArray(clauses)) throw new Error("AND must be an array");
    return clauses.every((clause) => matchesPrismaWhere(asWhere(clause, "AND clause"), row));
  }
  if ("OR" in where) {
    const clauses = where.OR;
    if (!Array.isArray(clauses)) throw new Error("OR must be an array");
    return clauses.some((clause) => matchesPrismaWhere(asWhere(clause, "OR clause"), row));
  }
  if ("NOT" in where) {
    return !matchesPrismaWhere(asWhere(where.NOT, "NOT"), row);
  }

  const entries = Object.entries(where);
  if (entries.length !== 1) {
    throw new Error(`expected exactly one column filter, got ${entries.length}`);
  }
  const entry = entries[0];
  if (entry === undefined) throw new Error("unreachable: length checked above");
  const [column, filter] = entry;
  const value = row[column];

  if (isRecord(filter)) {
    if ("not" in filter) return value !== filter.not;
    if ("gte" in filter) return typeof value === "number" && typeof filter.gte === "number" && value >= filter.gte;
    if ("lt" in filter) return typeof value === "number" && typeof filter.lt === "number" && value < filter.lt;
    if ("in" in filter) {
      if (!Array.isArray(filter.in)) throw new Error("in must be an array");
      return filter.in.includes(value);
    }
    throw new Error(`unrecognized column filter: ${JSON.stringify(filter)}`);
  }
  return value === filter;
};
