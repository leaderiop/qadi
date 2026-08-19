/**
 * Arbitrary resource attributes a policy may inspect.
 *
 * Its own leaf file rather than `Evaluate.ts`, where it used to live:
 * `Decision.ts` needs it for `project`/`isFieldOf`, and `Evaluate.ts` needs
 * `Decision.ts`'s `Trace` — so defining it in `Evaluate.ts` made that a
 * type-only import cycle. Erased at compile time either way, but a leaf
 * module the evaluation engine doesn't own is the shape everything else in
 * this file's dependency graph already follows (`Identity.ts`,
 * `Permission.ts`, `Obligation.ts`).
 */
export type Resource = Readonly<Record<string, unknown>>;
