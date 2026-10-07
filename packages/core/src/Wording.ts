/**
 * The two pieces of English that `renderTrace` and `renderExplanation` share.
 *
 * Both renderers say which fields a node exposes, in the same words, and both
 * wrap a caller's names in backticks unless told otherwise. Each had written
 * that out for itself, byte for byte, with only one copy carrying the comment
 * that explains why `undefined` renders as nothing; `RenderTraceOptions.term`'s
 * doc said "as `renderExplanation` does", which stated the coupling in prose
 * rather than in code (ARCH-22 C3).
 *
 * Package-private (AGENTS.md §9): scaffolding, not vocabulary, so it stays out of
 * the barrel. Only what the two sentences have in common lives here; the
 * obligation clauses are different sentences on purpose (`, owing …` against
 * `, and owes …`) and stay with their renderers.
 */

/** Wraps a caller-supplied name for emphasis: backticks. */
export const defaultTerm = (text: string): string => `\`${text}\``;

/**
 * The clause saying which fields a node exposes, or `""` when it exposes all of them.
 *
 * `undefined` is the top of the visibility lattice — every field — so it renders
 * as nothing rather than as an empty list, which would invert the meaning
 * (INV-QD-004).
 */
export const fieldsClause = (
  fields: ReadonlyArray<string> | undefined,
  term: (text: string) => string,
): string => {
  if (fields === undefined) return "";
  // An empty array is the bottom of the lattice, not a missing list — say
  // so outright rather than joining zero terms into a dangling
  // ", exposing only ".
  if (fields.length === 0) return ", exposing no fields";
  return `, exposing only ${fields.map(term).join(", ")}`;
};
