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
import * as Equal from "effect/Equal";
import type { Trace } from "./Decision.ts";
import type { Obligation } from "./Obligation.ts";

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

/** The node's own policy tag changed — a different kind of node sits here now. */
export interface PolicyTagChanged {
  readonly _tag: "PolicyTagChanged";
  readonly path: TracePath;
  readonly policyTag: Trace["policyTag"];
  readonly before: Trace["policyTag"];
  readonly after: Trace["policyTag"];
}

/** The label an author gave this node — present only on a `Labeled` node — changed. */
export interface LabelChanged {
  readonly _tag: "LabelChanged";
  readonly path: TracePath;
  readonly policyTag: Trace["policyTag"];
  readonly before: string | undefined;
  readonly after: string | undefined;
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

/**
 * The duties this node contributed changed — added, removed, or one kept its
 * `id` but changed underneath it.
 *
 * `before`/`after` carry the whole `Obligation`, not just `id`. `Obligation.ts`
 * is explicit that `id` is "not an identity: two duties may share one id", and
 * `unionObligations` already compares by the whole value for the same reason —
 * an id-only diff here would report no change when the same-named duty's
 * `attributes` or `advisory` flag moved underneath it, which is exactly the
 * kind of change a what-if or a replay exists to surface (issue 45).
 */
export interface ObligationsChanged {
  readonly _tag: "ObligationsChanged";
  readonly path: TracePath;
  readonly policyTag: Trace["policyTag"];
  readonly before: ReadonlyArray<Obligation>;
  readonly after: ReadonlyArray<Obligation>;
}

export type TraceDifference =
  | VerdictChanged
  | ReasonChanged
  | PolicyTagChanged
  | LabelChanged
  | ChildCountChanged
  | FieldsChanged
  | ObligationsChanged;

/**
 * Whether two string collections hold the same elements, ignoring order.
 *
 * `FieldsChanged` and `ObligationsChanged` both document SET semantics — "the
 * set of fields this node makes visible", "the duties this node contributed" —
 * but a positional array comparison reports a reorder as a change. Sorting a
 * copy of each side before comparing element-wise gives set equality (and,
 * incidentally, multiset equality, which is the stricter and still-correct
 * behavior if a caller's array ever carried a duplicate) without depending on
 * `effect/HashSet`, which buys nothing extra for elements that are already
 * primitive strings comparable with `===`.
 */
const sameStringSet = (a: ReadonlyArray<string>, b: ReadonlyArray<string>): boolean => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((f, i) => f === sortedB[i]);
};

const sameFields = (
  a: ReadonlyArray<string> | undefined,
  b: ReadonlyArray<string> | undefined,
): boolean => {
  // `undefined` and `[]` are opposite ends of the field lattice — all fields
  // versus none — so they must never compare equal here (INV-QD-004).
  if (a === undefined || b === undefined) return a === b;
  return sameStringSet(a, b);
};

/**
 * Whether two obligation multisets hold the same duties.
 *
 * Compared by the **whole value**, never by `id` alone — the same rule
 * `unionObligations` (`Obligation.ts`) already draws when it decides whether a
 * duty reached twice through a diamond is one duty or two. An id-only
 * comparison would treat `obligation("audit.log", { level: "info" })` and
 * `obligation("audit.log", { level: "warn" })` as identical, which is the
 * defect this function exists to not have.
 *
 * Order-insensitive for the same reason `sameStringSet` is — `unionObligations`'s
 * insertion order is not part of what a duty *is* — and, unlike
 * `sameStringSet`, cannot sort first: an `Obligation` has no total order, so
 * this consumes matches out of a mutable copy of `b` instead. Obligation lists
 * are short (a handful of duties per node at most), so the resulting O(n²) is
 * not a cost worth avoiding here.
 */
const sameObligationSet = (
  a: ReadonlyArray<Obligation>,
  b: ReadonlyArray<Obligation>,
): boolean => {
  if (a.length !== b.length) return false;
  const remaining = [...b];
  for (const candidate of a) {
    const index = remaining.findIndex((seen) => Equal.equals(seen, candidate));
    if (index === -1) return false;
    remaining.splice(index, 1);
  }
  return true;
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
    // The node's own identity, checked before anything about its outcome: a
    // node whose policy tag or label changed is a real difference even when
    // its verdict, reason, fields and obligations all happen to coincide —
    // the gap this pins. A label-only rename (`Labeled`'s `label`) or a node
    // swapped for a different kind that evaluates the same way both used to
    // vanish into an empty diff, contradicting "empty means the two
    // evaluations agree at every node".
    if (a.policyTag !== b.policyTag) {
      out.push({
        _tag: "PolicyTagChanged",
        path,
        policyTag: b.policyTag,
        before: a.policyTag,
        after: b.policyTag,
      });
    }
    if (a.label !== b.label) {
      out.push({
        _tag: "LabelChanged",
        path,
        policyTag: b.policyTag,
        before: a.label,
        after: b.label,
      });
    }

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

    if (!sameObligationSet(a.obligations, b.obligations)) {
      out.push({
        _tag: "ObligationsChanged",
        path,
        policyTag: b.policyTag,
        before: a.obligations,
        after: b.obligations,
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
