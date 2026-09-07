/**
 * A test-only reader for `WhereInput` shapes that models Prisma's *actual*
 * query engine behavior for a vacuous `{AND: []}`/`{OR: []}` reached below
 * the top level of the query — not the naive JS semantics `matchesPrismaWhere`
 * (this directory) implements.
 *
 * `matchesPrismaWhere` computes `.every`/`.some` recursively at every depth,
 * which is exactly `evaluatePredicate`'s own semantics — so it cannot
 * distinguish a correct `renderNode` output from the C1 defect (a nested
 * `{OR: []}`/`{AND: []}` silently admitting or denying the wrong rows): both
 * the compiler-under-test and that reader shared the same wrong belief,
 * which is why `Agreement.test.ts`'s FastCheck property passed against the
 * unfixed compiler. This reader instead applies Prisma's real, documented
 * stripping behavior — confirmed against two live-engine bug reports, not
 * merely reasoned about (see `isVacuousTrue`/`isVacuousFalse` in
 * `../src/index.ts`, which cites the same two):
 *
 * - A vacuous `{AND: []}`/`{OR: []}` reached below the top level of the
 *   query is `Filter::Empty` ("no restriction"), not its literal designed
 *   meaning, regardless of which of the two it is or which combinator
 *   contains it. Prisma issue #17367's own repro is `{AND: [{email: "…"},
 *   {OR: []}]}` returning the `email` row — the `{OR: []}` member is
 *   *dropped* from the `AND` list rather than forcing it false — and a
 *   comment on that issue confirms an empty `AND` array nested the same way
 *   is dropped identically.
 * - `NOT` wrapping a reached-below-top-level-vacuous operand does not
 *   invert: Prisma issue #21856's own repro shows `{NOT: {AND: []}}}`
 *   incorrectly returning every row instead of none, and `{AND: {OR: []}}}`
 *   (`AND` wrapping a single vacuous-false operand) incorrectly returning
 *   every row too.
 * - Only the entire `where` object being *itself* exactly `{AND: []}`/
 *   `{OR: []}` — the true top level of the compiled query, nothing
 *   containing it — gets the correct, designed answer: `{AND: []}` always
 *   matches, `{OR: []}` never does. Both of the above issues' own "correct"
 *   baseline cases confirm this: `{AND: []}`/`{OR: []}` alone, un-nested,
 *   both behave exactly as designed.
 *
 * Neither linked issue exercises a vacuous identity nested inside an `OR`
 * array specifically (only `AND` arrays and `NOT`), so this reader extends
 * the same "dropped from the list, and Empty propagates through whatever
 * contains it" rule to `OR` too, rather than inventing a second,
 * un-evidenced rule — `extract_filter` is one function applied uniformly
 * regardless of which combinator its result ends up feeding, per the engine
 * source citation in `../src/index.ts`.
 *
 * The correctness this reader exists to protect — `renderNode` never emits
 * a vacuous identity anywhere but the very top of the compiled query — makes
 * the distinction from `matchesPrismaWhere` unobservable on `renderNode`'s
 * own output going forward: the two readers can only disagree on a shape
 * `renderNode` no longer produces. Both are still checked together in
 * `Agreement.test.ts` for exactly that reason — agreement between them is
 * itself the regression signal for this class of bug.
 */
import type { PrismaWhereInput } from "../src/index.ts";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asWhere = (value: unknown, context: string): PrismaWhereInput => {
  if (!isRecord(value)) throw new Error(`${context} must be an object`);
  return value;
};

/** `where` is exactly `{AND: []}` or `{OR: []}` — Prisma's own vacuous shape, before any interpretation. */
const isVacuous = (where: PrismaWhereInput): boolean => {
  const keys = Object.keys(where);
  if (keys.length !== 1) return false;
  return (
    (Array.isArray(where.AND) && where.AND.length === 0) ||
    (Array.isArray(where.OR) && where.OR.length === 0)
  );
};

/**
 * `Filter::Empty`'s two-valued domain: either a real boolean result, or the
 * "no restriction" marker a below-top-level vacuous identity strips to. Kept
 * distinct from `boolean` rather than coerced immediately — a node that
 * reduces entirely to Empty must still propagate that (not just a truth
 * value) to whatever combinator contains it, since Empty is dropped from an
 * `AND`/`OR` list rather than counted as one of its members either way.
 */
type EngineResult = boolean | "empty";

const evalLeaf = (where: PrismaWhereInput, row: Readonly<Record<string, unknown>>): boolean => {
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
    if ("gte" in filter) {
      return typeof value === "number" && typeof filter.gte === "number" && value >= filter.gte;
    }
    if ("lt" in filter) {
      return typeof value === "number" && typeof filter.lt === "number" && value < filter.lt;
    }
    if ("in" in filter) {
      if (!Array.isArray(filter.in)) throw new Error("in must be an array");
      return filter.in.includes(value);
    }
    throw new Error(`unrecognized column filter: ${JSON.stringify(filter)}`);
  }
  return value === filter;
};

/**
 * Evaluates a node *reached below the top level* — every recursive call
 * this function makes into its own children is, by definition, another
 * below-top-level node, so the vacuous-strips-to-Empty rule applies
 * uniformly at every depth this function is entered at.
 */
const evalBelowTop = (where: PrismaWhereInput, row: Readonly<Record<string, unknown>>): EngineResult => {
  if (isVacuous(where)) return "empty";

  if ("AND" in where) {
    const clauses = where.AND;
    if (!Array.isArray(clauses)) throw new Error("AND must be an array");
    const real = clauses
      .map((clause) => evalBelowTop(asWhere(clause, "AND clause"), row))
      .filter((result): result is boolean => result !== "empty");
    return real.length === 0 ? "empty" : real.every(Boolean);
  }
  if ("OR" in where) {
    const clauses = where.OR;
    if (!Array.isArray(clauses)) throw new Error("OR must be an array");
    const real = clauses
      .map((clause) => evalBelowTop(asWhere(clause, "OR clause"), row))
      .filter((result): result is boolean => result !== "empty");
    return real.length === 0 ? "empty" : real.some(Boolean);
  }
  if ("NOT" in where) {
    const inner = evalBelowTop(asWhere(where.NOT, "NOT"), row);
    return inner === "empty" ? "empty" : !inner;
  }

  return evalLeaf(where, row);
};

/**
 * Interprets a `WhereInput` the way Prisma's real query engine does,
 * nested-vacuous-identity stripping bug included — see the module doc
 * comment above.
 */
export const matchesPrismaWhereEngine = (
  where: PrismaWhereInput,
  row: Readonly<Record<string, unknown>>,
): boolean => {
  // The one place a vacuous identity is not "reached below the top level":
  // the entire compiled query being exactly `{AND: []}`/`{OR: []}`. Every
  // other shape — including one whose outermost key is `AND`/`OR`/`NOT` —
  // hands its own children to `evalBelowTop`, because those children are
  // nested one level down from `where` regardless of how shallow `where`
  // itself is.
  if (isVacuous(where)) return "AND" in where;
  const result = evalBelowTop(where, row);
  return result === "empty" ? true : result;
};
