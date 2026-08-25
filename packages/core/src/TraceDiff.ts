/**
 * What changed between two evaluations of the same policy.
 *
 * The question a what-if answers is not "did the verdict flip" — that is one
 * boolean the caller already has — but **which node flipped it**. Nothing in
 * this library could answer that. `isMismatch` compares two decisions by verdict
 * alone, returns a boolean, and names nothing; every other comparison a caller
 * might reach for is on the rendered string, which reports a difference without
 * locating one.
 *
 * The unit is a **path**: the indices walked from each root to the node, so a
 * caller can address the same node in either tree, or in the `Policy` beside it.
 *
 * **Structural divergence stops the walk.** Two traces of the same policy have
 * the same shape *unless* short-circuiting reached a different point — an
 * `anyOf` that stopped at its first child before and its third child now has
 * genuinely fewer children in one tree ([INV-QD-020] keeps the trace honest
 * about that). Where the shapes disagree, this reports one `ChildCount`
 * difference and does not descend, because "node 3 changed" is meaningless when
 * one side has no node 3. That is a real finding about the evaluation, not a
 * limitation to work around.
 */
import type { Trace } from "./Decision.ts";

/** Where a node sits: the child indices walked from the root, outermost first. */
export type TracePath = ReadonlyArray<number>;

/** The node allowed in one evaluation and denied in the other. */
export interface VerdictChanged {
  readonly _tag: "VerdictChanged";
  readonly path: TracePath;
  readonly policyTag: Trace["policyTag"];
  readonly label?: string | undefined;
  readonly before: boolean;
  readonly after: boolean;
  readonly beforeReason?: string | undefined;
  readonly afterReason?: string | undefined;
}

/** The node kept its verdict; the sentence explaining it changed. */
export interface ReasonChanged {
  readonly _tag: "ReasonChanged";
  readonly path: TracePath;
  readonly policyTag: Trace["policyTag"];
  readonly before?: string | undefined;
  readonly after?: string | undefined;
}

/** The two trees disagree in shape here, so neither side can be walked further. */
export interface ChildCountChanged {
  readonly _tag: "ChildCountChanged";
  readonly path: TracePath;
  readonly policyTag: Trace["policyTag"];
  readonly before: number;
  readonly after: number;
}

/** The set of fields this node makes visible changed. */
export interface FieldsChanged {
  readonly _tag: "FieldsChanged";
  readonly path: TracePath;
  readonly policyTag: Trace["policyTag"];
  /** `undefined` is the top of the lattice — all fields — not none (INV-QD-004). */
  readonly before: ReadonlyArray<string> | undefined;
  readonly after: ReadonlyArray<string> | undefined;
}

/** The duties this node contributed changed. */
export interface ObligationsChanged {
  readonly _tag: "ObligationsChanged";
  readonly path: TracePath;
  readonly policyTag: Trace["policyTag"];
  readonly before: ReadonlyArray<string>;
  readonly after: ReadonlyArray<string>;
}

export type TraceDifference =
  | VerdictChanged
  | ReasonChanged
  | ChildCountChanged
  | FieldsChanged
  | ObligationsChanged;

const sameFields = (
  a: ReadonlyArray<string> | undefined,
  b: ReadonlyArray<string> | undefined,
): boolean => {
  // `undefined` and `[]` are opposite ends of the field lattice — all fields
  // versus none — so they must never compare equal here (INV-QD-004).
  if (a === undefined || b === undefined) return a === b;
  return a.length === b.length && a.every((f, i) => f === b[i]);
};

/**
 * Every node that differs between two traces, outermost first.
 *
 * Empty means the two evaluations agree at every node — which is stronger than
 * "the verdicts match", and is the check a replay wants when asserting that a
 * logged decision still reproduces.
 *
 * Ordering is depth-first, parents before children, so the **first** element is
 * the outermost node that changed. For a what-if that is usually the one worth
 * showing: an inner leaf flipping is the cause, but the outermost changed node
 * is where the policy's answer actually turned.
 */
export const diffTraces = (before: Trace, after: Trace): ReadonlyArray<TraceDifference> => {
  const out: Array<TraceDifference> = [];

  const walk = (a: Trace, b: Trace, path: TracePath): void => {
    if (a.allowed !== b.allowed) {
      out.push({
        _tag: "VerdictChanged",
        path,
        policyTag: b.policyTag,
        label: b.label,
        before: a.allowed,
        after: b.allowed,
        beforeReason: a.reason,
        afterReason: b.reason,
      });
    } else if (a.reason !== b.reason) {
      out.push({
        _tag: "ReasonChanged",
        path,
        policyTag: b.policyTag,
        before: a.reason,
        after: b.reason,
      });
    }

    if (!sameFields(a.visibleFields, b.visibleFields)) {
      out.push({
        _tag: "FieldsChanged",
        path,
        policyTag: b.policyTag,
        before: a.visibleFields,
        after: b.visibleFields,
      });
    }

    const beforeObligations = a.obligations.map((o) => o.id);
    const afterObligations = b.obligations.map((o) => o.id);
    if (
      beforeObligations.length !== afterObligations.length ||
      beforeObligations.some((id, i) => id !== afterObligations[i])
    ) {
      out.push({
        _tag: "ObligationsChanged",
        path,
        policyTag: b.policyTag,
        before: beforeObligations,
        after: afterObligations,
      });
    }

    if (a.children.length !== b.children.length) {
      out.push({
        _tag: "ChildCountChanged",
        path,
        policyTag: b.policyTag,
        before: a.children.length,
        after: b.children.length,
      });
      return;
    }

    a.children.forEach((child, i) => {
      const other = b.children[i];
      // The guard is `noUncheckedIndexedAccess` satisfaction, not a real
      // branch: the child-count check above returned already if the lengths
      // differed, so `b.children[i]` is always present here. Mutation testing
      // reports it as a survivor for that reason, as it does the identical
      // guard in `DecisionCache`'s eviction loop.
      if (other !== undefined) walk(child, other, [...path, i]);
    });
  };

  walk(before, after, []);
  return out;
};

/**
 * The outermost node whose verdict changed, if any.
 *
 * The direct answer to "what flipped it", for a caller that wants one node
 * rather than the full difference list.
 */
export const flippedAt = (
  before: Trace,
  after: Trace,
): VerdictChanged | undefined =>
  diffTraces(before, after).find((d): d is VerdictChanged => d._tag === "VerdictChanged");
