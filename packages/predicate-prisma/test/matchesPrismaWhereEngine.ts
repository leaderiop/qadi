/**
 * A test-only reader for `WhereInput` shapes that models Prisma's *actual*
 * query engine behavior — not the naive JS semantics `matchesPrismaWhere`
 * (this directory) implements. Two engine behaviors are modelled.
 *
 * **1. A vacuous `{AND: []}`/`{OR: []}` reached below the top level.**
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
 *   matches, `{OR: []}` never does.
 *
 * Neither linked issue exercises a vacuous identity nested inside an `OR`
 * array specifically (only `AND` arrays and `NOT`), so this reader extends
 * the same "dropped from the list, and Empty propagates through whatever
 * contains it" rule to `OR` too, rather than inventing a second,
 * un-evidenced rule.
 *
 * **2. SQL's three-valued logic, and Prisma's refusal of `null` on a required
 * column (CCR-QD-153).**
 *
 * `matchesPrismaWhere` and the first version of this reader both treated
 * `NOT` as a two-valued `!`, so neither could see that `{NOT: {level: {gte:
 * 3}}}` renders `WHERE (NOT level >= ?)`, which excludes a NULL-valued row
 * (`NOT UNKNOWN` is `UNKNOWN`) that `evaluatePredicate` admits. A real
 * Prisma 7.10 client over SQLite found it: 127 of 3000 random predicates
 * mismatched, every one under a `Negate`, none an over-admission. This
 * reader now evaluates under Kleene's logic — a comparison with a non-null
 * operand against a NULL-valued column is `unknown`, `AND`/`OR`/`NOT` follow
 * the strong Kleene tables, and the top level maps `unknown` to `false`
 * (`WHERE` excludes UNKNOWN). It also throws what Prisma's validator throws
 * (``Argument `col` is missing.``) for a `null` mention on a column the
 * caller did not declare nullable (N1).
 *
 * It is still a *model*: it shares this repository's belief about those
 * engines, and `EngineAgreement.test.ts` checks the same shapes against the
 * real thing.
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
 * A node's value: a real boolean, the "no restriction" marker a
 * below-top-level vacuous identity strips to, or `"unknown"` — what a
 * comparison against a NULL-valued column evaluates to under SQL's
 * three-valued logic.
 *
 * Kept distinct from `boolean` rather than coerced immediately. A node that
 * reduces entirely to Empty must still propagate that (not just a truth
 * value) to whatever combinator contains it, since Empty is dropped from an
 * `AND`/`OR` list rather than counted as one of its members either way. And
 * `"unknown"` must survive until `WHERE` itself, because `NOT unknown` is
 * `unknown`. A closed union of three cases, not widened with ad hoc checks.
 */
type EngineResult = boolean | "empty" | "unknown";
type Truth = boolean | "unknown";

/** Kleene's strong three-valued AND: a `false` anywhere wins, then `unknown`. */
const kleeneAnd = (results: ReadonlyArray<Truth>): Truth => {
  if (results.some((r) => r === false)) return false;
  return results.some((r) => r === "unknown") ? "unknown" : true;
};
/** Kleene's strong three-valued OR: a `true` anywhere wins, then `unknown`. */
const kleeneOr = (results: ReadonlyArray<Truth>): Truth => {
  if (results.some((r) => r === true)) return true;
  return results.some((r) => r === "unknown") ? "unknown" : false;
};
const kleeneNot = (result: Truth): Truth => (result === "unknown" ? "unknown" : !result);

/**
 * Prisma's own validation refusal, modelled (N1): a filter that mentions
 * `null` on a required (NOT NULL) column is rejected before it reaches the
 * database — ``Argument `col` is missing.``
 */
const requireNullable = (column: string, nullable: ReadonlySet<string>): void => {
  if (!nullable.has(column)) {
    throw new Error(`prisma validation: Argument \`${column}\` is missing.`);
  }
};

/**
 * One operator of a column filter, against a row value. A comparison with a
 * non-null operand against a NULL-valued column is `unknown`, never `false`.
 * The type-mismatch arms mirror `evaluatePredicate` (a string `level` never
 * satisfies a numeric bound), so the model stays a model of the *shape*, not
 * of a coercing engine (N2).
 */
const evalOperator = (
  column: string,
  operator: string,
  operand: unknown,
  value: unknown,
  nullable: ReadonlySet<string>,
): Truth => {
  if (operator === "in") {
    if (!Array.isArray(operand)) throw new Error("in must be an array");
    if (operand.includes(null)) throw new Error("prisma validation: `in` refuses a null member");
    return value === null ? "unknown" : operand.includes(value);
  }
  if (operand === null) {
    requireNullable(column, nullable);
    if (operator === "equals") return value === null;
    if (operator === "not") return value !== null;
    throw new Error(`prisma validation: ${operator} refuses null`);
  }
  if (value === null) return "unknown";
  if (operator === "equals") return value === operand;
  if (operator === "not") return value !== operand;
  if (operator === "gte") {
    return typeof value === "number" && typeof operand === "number" && value >= operand;
  }
  if (operator === "lt") {
    return typeof value === "number" && typeof operand === "number" && value < operand;
  }
  throw new Error(`unrecognized column filter operator: ${operator}`);
};

const evalLeaf = (
  where: PrismaWhereInput,
  row: Readonly<Record<string, unknown>>,
  nullable: ReadonlySet<string>,
): Truth => {
  const entries = Object.entries(where);
  if (entries.length !== 1) {
    throw new Error(`expected exactly one column filter, got ${entries.length}`);
  }
  const entry = entries[0];
  if (entry === undefined) throw new Error("unreachable: length checked above");
  const [column, filter] = entry;
  if (!(column in row)) throw new Error(`prisma validation: unknown field \`${column}\``);
  const value = row[column];

  if (isRecord(filter)) {
    const operators = Object.entries(filter);
    if (operators.length === 0) {
      throw new Error(`unrecognized column filter: ${JSON.stringify(filter)}`);
    }
    // Several operators in one filter object combine as a Kleene AND.
    return kleeneAnd(
      operators.map(([operator, operand]) =>
        evalOperator(column, operator, operand, value, nullable),
      ),
    );
  }
  return evalOperator(column, "equals", filter, value, nullable);
};

/**
 * Evaluates a node *reached below the top level* — every recursive call
 * this function makes into its own children is, by definition, another
 * below-top-level node, so the vacuous-strips-to-Empty rule applies
 * uniformly at every depth this function is entered at.
 */
const evalBelowTop = (
  where: PrismaWhereInput,
  row: Readonly<Record<string, unknown>>,
  nullable: ReadonlySet<string>,
): EngineResult => {
  if (isVacuous(where)) return "empty";

  const real = (clauses: unknown, context: string): ReadonlyArray<Truth> => {
    if (!Array.isArray(clauses)) throw new Error(`${context} must be an array`);
    return clauses
      .map((clause) => evalBelowTop(asWhere(clause, `${context} clause`), row, nullable))
      .filter((result): result is Truth => result !== "empty");
  };

  if ("AND" in where) {
    const parts = real(where.AND, "AND");
    return parts.length === 0 ? "empty" : kleeneAnd(parts);
  }
  if ("OR" in where) {
    const parts = real(where.OR, "OR");
    return parts.length === 0 ? "empty" : kleeneOr(parts);
  }
  if ("NOT" in where) {
    const inner = evalBelowTop(asWhere(where.NOT, "NOT"), row, nullable);
    return inner === "empty" ? "empty" : kleeneNot(inner);
  }

  return evalLeaf(where, row, nullable);
};

/**
 * Interprets a `WhereInput` the way Prisma's real query engine does,
 * nested-vacuous-identity stripping bug included, under SQL's three-valued
 * logic, and refusing a `null` mention on a column outside `nullable` the way
 * Prisma's validator does — see the module doc comment above.
 *
 * `nullable` is the caller's declaration of which columns accept NULL. The
 * top level maps `"unknown"` to `false`: `WHERE` excludes UNKNOWN exactly as
 * it excludes FALSE.
 */
export const matchesPrismaWhereEngine = (
  where: PrismaWhereInput,
  row: Readonly<Record<string, unknown>>,
  nullable: ReadonlySet<string>,
): boolean => {
  // The one place a vacuous identity is not "reached below the top level":
  // the entire compiled query being exactly `{AND: []}`/`{OR: []}`. Every
  // other shape — including one whose outermost key is `AND`/`OR`/`NOT` —
  // hands its own children to `evalBelowTop`, because those children are
  // nested one level down from `where` regardless of how shallow `where`
  // itself is.
  if (isVacuous(where)) return "AND" in where;
  const result = evalBelowTop(where, row, nullable);
  return result === "empty" ? true : result === "unknown" ? false : result;
};
