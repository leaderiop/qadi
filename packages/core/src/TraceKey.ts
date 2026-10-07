/**
 * The canonical text address of a node in a `Trace` or in the explanation tree it
 * lines up with: `"$"` for the root, `"$.0.2"` for the third child of the first.
 *
 * Two forms of one address existed, `TracePath` (an array of indices, what
 * `diffTraces` reports) and the inspector's `"$.0.2"` text, and they disagreed at
 * the root and agreed below it only because both hand-wrote the same join
 * (ARCH-22 C6). This module owns the text; `tracePathKey` turns a `TracePath`
 * into it and `childKey` extends one by an index, which is how `foldAligned`
 * builds a key for every position in O(1) rather than rebuilding an array per
 * node (a per-node `number[]` is quadratic in depth: out of memory at 40k levels,
 * ARCH-22 N2).
 *
 * Package-private except for `tracePathKey`, which `TraceDiff.ts` re-exports
 * beside `TracePath` (AGENTS.md §9).
 */

/** The key of a path's node: `"$"` for `[]`, otherwise `"$."` and the indices joined by `"."`. */
export const tracePathKey = (path: ReadonlyArray<number>): string =>
  path.length === 0 ? "$" : `$.${path.join(".")}`;

/** The key of a node's `index`th child, given the node's own key. */
export const childKey = (parent: string, index: number): string => `${parent}.${index}`;
