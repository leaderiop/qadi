/**
 * The dialect-free rules about what a `Predicate` may hold: which values a
 * renderer may bind, which numbers a range may compare against, and which
 * column names a renderer may interpolate.
 *
 * These are properties of `evaluatePredicate`'s semantics, not of SQL or Prisma,
 * which is why they live beside it (ADR-QD-077). Before this module each dialect
 * package kept its own copy, and the copies lagged: `@qadi/predicate-sql` admitted
 * `NaN` for a release after `@qadi/predicate-prisma` had learned to refuse it
 * (CCR-QD-120). `evaluatePredicate`'s `Gte`/`Lt` arms and `toRenderable`'s
 * classifier both call `isRangeBound`, so that rule has exactly one definition.
 *
 * Nothing here imports another core module: `Predicate.ts` imports this one.
 */

/**
 * A value every renderer can bind as a query parameter: a string, a finite
 * number, a boolean, or `null`.
 */
export type SafeLiteral = string | number | boolean | null;

/**
 * Whether `value` is a `SafeLiteral`.
 *
 * Deliberately excludes `Date`: `evaluatePredicate`'s `Gte`/`Lt` require
 * `typeof value === "number"`, so a `Date` is always `false` there, while a real
 * engine's `>=`/`<` performs a genuine date comparison, and two distinct `Date`
 * instances holding the same instant are never `===`, while an engine's `=`
 * matches them. Either way the rendered query disagrees with the reference
 * evaluator (INV-QD-047/048). Refusing is ADR-QD-024's "refuse rather than
 * approximate" one layer down.
 *
 * The `number` branch is *finite* numbers. `NaN`, `Infinity` and `-Infinity` all
 * satisfy `typeof value === "number"`, and `NaN` is unsound in both directions:
 * `NaN === NaN` is `false` in JavaScript while PostgreSQL documents `NaN = NaN`
 * as TRUE (CCR-QD-120). Refusing all three is the same answer applied before a
 * real engine has to settle each one. `Number.isFinite` does not coerce (unlike the
 * global `isFinite`), so it is already false for a non-number and needs no `typeof`
 * guard of its own.
 */
export const isSafeLiteral = (value: unknown): value is SafeLiteral =>
  value === null ||
  typeof value === "string" ||
  Number.isFinite(value) ||
  typeof value === "boolean";

/**
 * Whether `value` is a bound `evaluatePredicate`'s `Gte`/`Lt` can compare
 * against: a finite number.
 *
 * The bound is reachable from untrusted JSON (`1e400` decodes to `Infinity`), and
 * an unguarded `Infinity` bound dominates every finite attribute value
 * (CCR-QD-120). Only the bound needs the check: a non-finite *row* value already
 * agrees across interpreters, since `NaN >= x` is false in both and `Infinity >=
 * x` is true in both.
 */
export const isRangeBound = (value: unknown): value is number => Number.isFinite(value);

/**
 * How strictly a renderer constrains a column name it interpolates as text.
 *
 * - `"Ascii"`: `[A-Za-z_][A-Za-z0-9_]*`, the default.
 * - `"UnicodeBmp"`: letters, digits and `_` of any script, restricted to code
 *   points at or below U+FFFF (MySQL refuses supplementary-plane identifiers).
 *   Quoting such a name cannot break out of `"…"` or `` `…` ``, since neither
 *   delimiter is a letter or a digit.
 *
 * A closed union, so a third rule is a compile error at every renderer rather
 * than a boolean someone forgot to read.
 */
export type IdentifierRule = "Ascii" | "UnicodeBmp";

const IDENTIFIER_PATTERN: Record<IdentifierRule, RegExp> = {
  Ascii: /^[A-Za-z_][A-Za-z0-9_]*$/,
  UnicodeBmp: /^[\p{L}_][\p{L}\p{N}_]*$/u,
};

/** A code point above U+FFFF, which `UnicodeBmp` refuses. */
const SUPPLEMENTARY_PLANE = /[\u{10000}-\u{10FFFF}]/u;

/**
 * Whether `column` is a name a renderer may interpolate under `rule`.
 *
 * `Predicate.column` is a plain `string` on an AST that crosses a trust boundary
 * (AGENTS.md §7: policies are persisted and re-parsed from untrusted JSON). SQL
 * dialects wrap an identifier in a delimiter but never double an embedded one, so
 * a column like `x" = $1 OR 1=1 --` would escape the identifier and start
 * emitting SQL text. Values are parameterized; identifiers are interpolated and
 * are not, so they are refused rather than escaped.
 *
 * A *reserved* name (a target-syntax hazard, such as Prisma's `AND`/`OR`/`NOT`)
 * is a separate question, answered by `RenderRules.reservedColumns`: it is the
 * renderer's own vocabulary, where this regex guards against text injection.
 */
export const isRenderableIdentifier = (column: string, rule: IdentifierRule): boolean =>
  IDENTIFIER_PATTERN[rule].test(column) && !SUPPLEMENTARY_PLANE.test(column);
