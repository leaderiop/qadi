/**
 * Security labels and the dominance order over them.
 *
 * A label is `(level, compartments)`, ordered by **dominance**: `a` dominates
 * `b` when it is at least as high and at least as broad. That order is
 * *partial*, and the partiality is the whole point — `(Secret, {CRYPTO})` and
 * `(Secret, {BIO})` are incomparable, so neither may read the other.
 *
 * Read as scalars both labels are `2` and each reads the other. That is not an
 * approximation of dominance; it is a different relation, and it allows exactly
 * where dominance denies
 * ([ADR-QD-021](../../../spec/decisions/021-label-lattice.md)).
 *
 * A hand-written interface rather than a Schema, deliberately: a label never
 * appears *inside* a policy. The `Dominates` matcher carries a `ValueRef` and no
 * label, so both operands are read at evaluation time from subject or resource
 * data. Nothing here crosses the trust boundary that ADR-QD-002 exists for.
 */

export interface SecurityLabel {
  readonly level: number;
  /**
   * An array, not a `ReadonlySet`.
   *
   * Labels arrive as JSON, through a resolver or a resource field, and every
   * operation here is subset-based, so order is irrelevant. A set would buy
   * nothing and cost a canonical encoding — two spellings of one label that
   * compare unequal is the defect class this library was rewritten to prevent.
   */
  readonly compartments: ReadonlyArray<string>;
}

/** The four answers a partial order can give. */
export type LabelOrdering = "Equal" | "Dominates" | "DominatedBy" | "Incomparable";

const isStringArray = (value: unknown): value is ReadonlyArray<string> =>
  Array.isArray(value) && value.every((c) => typeof c === "string");

/**
 * Recognises a label in untrusted data.
 *
 * Total, like everything a matcher can reach: anything that is not a label is
 * simply not a label, and the caller decides what that means.
 */
export const isSecurityLabel = (value: unknown): value is SecurityLabel =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { level?: unknown }).level === "number" &&
  isStringArray((value as { compartments?: unknown }).compartments);

const covers = (
  wider: ReadonlyArray<string>,
  narrower: ReadonlyArray<string>,
): boolean => {
  if (narrower.length === 0) return true;
  const have = new Set(wider);
  return narrower.every((c) => have.has(c));
};

/**
 * Compares two labels in the dominance order.
 *
 * Four values rather than the boolean the matcher needs, because
 * `"Incomparable"` collapsing into `false` is right for a *test* and wrong for
 * an *explanation*. Qadi's answer to "why was this denied" is that the
 * information exists rather than has to be inferred, and this is where it exists
 * for labels.
 */
export const compareLabels = (a: SecurityLabel, b: SecurityLabel): LabelOrdering => {
  const aOverB = a.level >= b.level && covers(a.compartments, b.compartments);
  const bOverA = b.level >= a.level && covers(b.compartments, a.compartments);

  if (aOverB && bOverA) return "Equal";
  if (aOverB) return "Dominates";
  if (bOverA) return "DominatedBy";
  return "Incomparable";
};

/**
 * `a` dominates `b` — at least as high, at least as broad.
 *
 * Reflexive: a label dominates itself, so reading and writing at your own level
 * are both permitted, which is what Bell–LaPadula requires.
 */
export const labelDominates = (a: SecurityLabel, b: SecurityLabel): boolean => {
  const ordering = compareLabels(a, b);
  return ordering === "Equal" || ordering === "Dominates";
};
