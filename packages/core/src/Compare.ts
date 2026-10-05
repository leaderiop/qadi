/**
 * What `Eq`, `Neq`, `Gte`, `Lt`, membership and dominance mean, stated once, as
 * a closed `Verdict` rather than a bare boolean.
 *
 * Every interpreter of a comparison reads its meaning from here:
 * `judgeMatcher`/`evaluateMatcher` (`Matcher.ts`) for a matcher against a
 * resolved value, `evaluatePredicate` (`Predicate.ts`) for a predicate leaf
 * against a row, the renderable classifier (`RenderablePredicate.ts`) through
 * `evaluatePredicate`, and the evaluator's denial reason (`Evaluate.ts`) through
 * the `Verdict` itself.
 *
 * Before this module the same rules lived in three hand-kept copies, each with
 * a comment claiming to mirror the others, and every repair was a patch to one
 * copy that the rest then had to follow: the absent-operand rule (CCR-QD-112),
 * the finite-value rule (CCR-QD-116), the finite-bound rule (CCR-QD-120). The
 * fourth repair was the one that had not been followed: `evaluatePredicate`
 * admitted a non-finite row that `evaluateMatcher` denied, a fail-open
 * (CCR-QD-172). `RenderablePredicate.ts`'s `nullGuardFor` was the precedent that
 * worked — it asks the reference instead of keeping a second belief — and this
 * module makes every comparison rule work that way (ADR-QD-091).
 *
 * Pure and synchronous, with no spans: a comparison runs once per matcher node
 * and once per row, the hot paths AGENTS.md §5 and §5a protect. The verdicts are
 * string literals, so returning one costs what returning a boolean does.
 * Internal: kept out of the barrel (AGENTS.md §9), reachable as
 * `@qadi/core/Compare`. `Verdict` reaches the public surface through
 * `Matcher.ts`, beside `judgeMatcher`.
 */
import { isSecurityLabel, labelDominates } from "./SecurityLabel.ts";

/**
 * How one comparison came out.
 *
 * - `Held`: the comparison ran and was true.
 * - `NotHeld`: the comparison ran and was false.
 * - `ValueAbsent`: the value being tested is `undefined` — nothing to compare.
 * - `ReferenceAbsent`: the value it is compared against (a resolved reference, a
 *   bound) is `undefined`.
 * - `Incomparable`: both are present, but at least one is not a value this
 *   comparison can compare — a non-number or non-finite number under a range, a
 *   non-label under dominance.
 *
 * **The order is part of the interface**: an absent value is reported before an
 * absent reference, and both before incomparability. Only `Held` holds; every
 * other verdict denies.
 */
export type Verdict = "Held" | "NotHeld" | "ValueAbsent" | "ReferenceAbsent" | "Incomparable";

/** Whether a verdict holds: `Held`, and nothing else. */
export const holds = (verdict: Verdict): boolean => verdict === "Held";

/**
 * A finite number. `Number.isFinite` does not coerce, so a non-number is false
 * too — which is why no `typeof` half is needed beside it.
 */
export const isFiniteNumber = (u: unknown): u is number => Number.isFinite(u);

/**
 * `value === reference`, on two present operands.
 *
 * Strict equality, so `NaN` never equals anything, itself included — pinned by
 * `Matcher.test.ts`'s "eq vs inArray" block, and the reason membership (which is
 * SameValueZero) is a separate function.
 */
export const equalsVerdict = (value: unknown, reference: unknown): Verdict =>
  value === undefined
    ? "ValueAbsent"
    : reference === undefined
      ? "ReferenceAbsent"
      : value === reference
        ? "Held"
        : "NotHeld";

/** `value !== reference`, on two present operands (CCR-QD-112): an absent one denies rather than differing. */
export const differsVerdict = (value: unknown, reference: unknown): Verdict =>
  value === undefined
    ? "ValueAbsent"
    : reference === undefined
      ? "ReferenceAbsent"
      : value !== reference
        ? "Held"
        : "NotHeld";

/**
 * `value >= bound`, on two finite numbers.
 *
 * Both operands must be finite (BEH-QD-027): the bound is reachable from
 * untrusted JSON, where `1e400` decodes to `Infinity` (CCR-QD-120), and the value
 * from a resolver or a float column, which can hold `±Infinity`/`NaN`
 * (CCR-QD-116, CCR-QD-172). `Infinity >= 3` is true, so without the value check
 * an infinite attribute satisfies every bound.
 */
export const atLeastVerdict = (value: unknown, bound: unknown): Verdict =>
  value === undefined
    ? "ValueAbsent"
    : bound === undefined
      ? "ReferenceAbsent"
      : !isFiniteNumber(value) || !isFiniteNumber(bound)
        ? "Incomparable"
        : value >= bound
          ? "Held"
          : "NotHeld";

/**
 * `value < bound`, on two finite numbers — `atLeastVerdict`'s mirror. Its
 * load-bearing non-finite value is `-Infinity`, which `-Infinity < 3` admits.
 */
export const belowVerdict = (value: unknown, bound: unknown): Verdict =>
  value === undefined
    ? "ValueAbsent"
    : bound === undefined
      ? "ReferenceAbsent"
      : !isFiniteNumber(value) || !isFiniteNumber(bound)
        ? "Incomparable"
        : value < bound
          ? "Held"
          : "NotHeld";

/**
 * Whether `value` is one of `values`, by SameValueZero (`Array.prototype.includes`),
 * so `NaN` is a member of `[NaN]`.
 */
export const memberVerdict = (value: unknown, values: ReadonlyArray<unknown>): Verdict =>
  values.includes(value) ? "Held" : value === undefined ? "ValueAbsent" : "NotHeld";

/**
 * Whether the label `value` dominates the label `reference`.
 *
 * A non-label on either side is `Incomparable`. Two labels the lattice cannot
 * order (disjoint compartments) are `NotHeld`: that is a comparison that ran and
 * came out false, which is what a dominance test means. The lattice itself stays
 * in `SecurityLabel.ts`; this only wraps it in a verdict.
 */
export const dominatesVerdict = (value: unknown, reference: unknown): Verdict =>
  value === undefined
    ? "ValueAbsent"
    : reference === undefined
      ? "ReferenceAbsent"
      : !isSecurityLabel(value) || !isSecurityLabel(reference)
        ? "Incomparable"
        : labelDominates(value, reference)
          ? "Held"
          : "NotHeld";

/** The comparison operators a `Predicate` leaf can carry. Re-exported by `Predicate.ts`, its public home. */
export type CompareOp = "Eq" | "Neq" | "Gte" | "Lt";

/**
 * `CompareOp` to its verdict function: a module-scope table of references, not a
 * `switch` and not a per-call `Match.value` (AGENTS.md §5a). The functions run at
 * call time, so their bodies stay in Stryker's mutated set under `ignoreStatic`
 * (ADR-QD-076).
 */
const VERDICT_OF: Record<CompareOp, (value: unknown, reference: unknown) => Verdict> = {
  Eq: equalsVerdict,
  Neq: differsVerdict,
  Gte: atLeastVerdict,
  Lt: belowVerdict,
};

/** The verdict of `value <op> reference`, for any `CompareOp`. */
export const compareVerdict = (op: CompareOp, value: unknown, reference: unknown): Verdict =>
  VERDICT_OF[op](value, reference);
