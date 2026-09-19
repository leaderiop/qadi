/**
 * An opt-in structural transform: the same rule, fewer nodes.
 *
 * Policies assembled from helpers accumulate structure that means nothing — an
 * `allOf` of one child, an `allOf` directly inside an `allOf`. This removes exactly
 * that and nothing else.
 *
 * Notably **not** double negation, which is unsound here. See the `Not` arm.
 *
 * **Nothing calls it.** Not `evaluate`, not `check`, not `toPredicate`, not
 * `explain`. A simplified policy produces a shallower **trace**, and the trace is
 * what a reviewer reads to see the rule an author wrote — so rewriting it silently
 * would make `explain` describe a policy nobody stored
 * ([ADR-QD-030](../../../spec/decisions/030-policy-simplification.md)).
 *
 * Verdict-preserving, field-preserving, obligation-preserving. Trace-changing, by
 * definition.
 */
import * as Match from "effect/Match";
import type { FieldStrategy, Policy } from "./Policy.ts";
import { childrenOf } from "./Policy.ts";

/**
 * Whether a composite's children can be absorbed into a parent of the same tag.
 *
 * **The condition is the whole correctness argument.** Consider
 * `allOf([a, allOf([b, c], { fieldStrategy: "Union" })], { fieldStrategy: "Intersection" })`:
 * the outer intersects `a`'s fields with the inner's result, and the inner *unions*
 * `b`'s and `c`'s. Flattened under `Intersection`, all three are intersected — the
 * same verdict and a **different field set**.
 *
 * So an unconditional flatten would be verdict-preserving and
 * *disclosure-changing*: it would widen or narrow what a caller may read while
 * every allow-or-deny assertion still passed. Field visibility is the reason this
 * library exists, which makes this the failure mode that matters most and the one
 * an "obviously safe" rewrite walks into.
 *
 * Equal strategies are safe because each merge is associative: intersection and
 * union both are, and `First` takes the first child's set either way.
 */
const absorbable = (
  child: Policy,
  tag: "AllOf" | "AnyOf",
  fieldStrategy: FieldStrategy,
): child is Extract<Policy, { _tag: "AllOf" | "AnyOf" }> =>
  child._tag === tag && child.fieldStrategy === fieldStrategy;

const flatten = (
  policies: ReadonlyArray<Policy>,
  tag: "AllOf" | "AnyOf",
  fieldStrategy: FieldStrategy,
): ReadonlyArray<Policy> =>
  policies.flatMap((child) =>
    absorbable(child, tag, fieldStrategy) ? child.policies : [child],
  );

/**
 * `childrenOf`'s single-child tags (`Not`/`Labeled`/`Obliged`) always produce
 * exactly one entry, by construction — but a generic `ReadonlyArray<Policy>`
 * parameter can't carry that in its type, and AGENTS.md §6 bans `children[0]!`
 * as the way around it. Failing loudly on the invariant instead (rather than
 * silently falling back to some other `Policy`) keeps a future bug in
 * `rebuild`'s wiring a thrown error, not a policy quietly rewritten wrong.
 */
const expectOne = (tag: string, children: ReadonlyArray<Policy>): Policy => {
  const [only, ...rest] = children;
  if (only === undefined || rest.length !== 0) {
    throw new Error(`simplify: ${tag} expected exactly one child, got ${children.length}`);
  }
  return only;
};

/**
 * Rebuilds one node from its own **already-simplified** children, supplied in
 * the same order `childrenOf` produced them — the one piece of state
 * `simplify`'s explicit-stack walk (below) passes in that this function's
 * previous native-recursion form got by calling itself directly instead.
 *
 * Two rewrites and nothing clever: single-child composites, and nesting of a
 * composite inside the same composite **under the same field strategy**.
 *
 * An **empty** `allOf` or `anyOf` is left alone. They are not redundant — one always
 * allows and the other never does — so "simplifying" them would be replacing them.
 *
 * `labeled` is never removed, which is what keeps a denial's attribution intact
 * through the transform.
 */
const rebuild: (node: Policy) => (children: ReadonlyArray<Policy>) => Policy = Match.type<Policy>().pipe(
  Match.tagsExhaustive({
    // Leaves have no structure to remove, and no children to rebuild from.
    HasPermission: (p) => () => p,
    HasRole: (p) => () => p,
    HasAttribute: (p) => () => p,
    HasResourceAttribute: (p) => () => p,
    HasRelationship: (p) => () => p,
    HasAction: (p) => () => p,
    HasActed: (p) => () => p,
    HasNotActed: (p) => () => p,
    HasCustom: (p) => () => p,
    HasSignature: (p) => () => p,

    AllOf: (p) => (simplifiedChildren: ReadonlyArray<Policy>) => {
      const children = flatten(simplifiedChildren, "AllOf", p.fieldStrategy);
      // One child means the merge has one input, so every strategy yields that
      // child's own field set and the wrapper carries nothing.
      //
      // Deliberately `[only, ...rest]`, not `children[0]` plus a length check:
      // TS can't correlate "`children.length === 1`" with "`children[0]` is
      // defined" (`noUncheckedIndexedAccess` types the latter as possibly
      // `undefined` regardless), so any form that re-derives "exactly one"
      // from a length comparison alone leaves one arm unreachable-but-not-
      // provably-so — which mutation testing confirmed twice, turning a real
      // check into dead code no test could distinguish from its mutant.
      // Destructuring keeps `only`'s definedness and "there was exactly one"
      // tied to the same fact, at the cost of one small discarded array.
      const [only, ...rest] = children;
      return only !== undefined && rest.length === 0
        ? only
        : { ...p, policies: children };
    },

    AnyOf: (p) => (simplifiedChildren: ReadonlyArray<Policy>) => {
      const children = flatten(simplifiedChildren, "AnyOf", p.fieldStrategy);
      const [only, ...rest] = children;
      return only !== undefined && rest.length === 0
        ? only
        : { ...p, policies: children };
    },

    /**
     * **Double negation is NOT eliminated, and that is a finding rather than an
     * omission.**
     *
     * `not(not(p))` is not `p` in this ADT. A negation carries
     * `visibleFields: undefined` — the top of the lattice, meaning *all* fields —
     * and no obligations, because knowing a policy did not hold says nothing about
     * which fields are safe to expose (ADR-QD-019). So:
     *
     *   - `not(not(hasPermission(read, { fields: ["id"] })))` allows with **every**
     *     field, where the inner policy allows with `["id"]`.
     *   - `not(not(obliged(audit, p)))` allows owing **nothing**, where the inner
     *     policy allows owing `audit`.
     *
     * Both differences are in the *safe* direction for the rewrite — it narrows
     * fields and adds duties — but they are differences, and this transform
     * promises to change neither. A property over generated policies and four
     * subjects caught it; the textbook rewrite is unsound here.
     */
    Not: (p) => (children: ReadonlyArray<Policy>) => ({ ...p, policy: expectOne("Not", children) }),

    // A label is the author's name for a branch and the only thing a denial can be
    // attributed to. Removing one would silently change what a trace can say.
    Labeled: (p) => (children: ReadonlyArray<Policy>) => ({
      ...p,
      policy: expectOne("Labeled", children),
    }),

    Obliged: (p) => (children: ReadonlyArray<Policy>) => ({
      ...p,
      policy: expectOne("Obliged", children),
    }),

    // Row order is semantic and the deciding row is chosen by index, so rows are
    // simplified individually and never reordered, merged or dropped.
    Rules: (p) => (children: ReadonlyArray<Policy>) => {
      if (children.length !== p.rules.length) {
        throw new Error(
          `simplify: Rules expected ${p.rules.length} children, got ${children.length}`,
        );
      }
      const rules: Array<(typeof p.rules)[number]> = [];
      for (let i = 0; i < p.rules.length; i++) {
        const rule = p.rules[i];
        const condition = children[i];
        // Both indices are in range by the length check above;
        // `noUncheckedIndexedAccess` still types each lookup as possibly
        // `undefined`, so this is that same check, not a new one.
        if (rule === undefined || condition === undefined) {
          throw new Error(`simplify: Rules children misaligned at index ${i}`);
        }
        rules.push({ ...rule, condition });
      }
      return { ...p, rules };
    },
  }),
);

/**
 * Rewrites a policy to an equivalent one with fewer nodes.
 *
 * Walks with an explicit array-backed stack — the same technique
 * `DecodeDepthGuard.ts`'s `exceedsJsonDepth` and `Policy.ts`'s `policyDepth`
 * use, via the same `childrenOf` — rather than native recursion. A decoded
 * policy's nesting is bounded by `MAX_DECODE_DEPTH`, but a policy assembled
 * programmatically never crosses that boundary: the smart constructors do not
 * depth-check, so a loop of `not()` builds a tree exactly as deep as the loop
 * runs, and this function is reachable directly on a caller-held `Policy`
 * with no prior decode step at all.
 */
export const simplify = (policy: Policy): Policy => {
  const results = new Map<Policy, Policy>();
  const stack: Array<{ readonly node: Policy; readonly expanded: boolean }> = [
    { node: policy, expanded: false },
  ];
  while (stack.length > 0) {
    const frame = stack.pop();
    if (frame === undefined) break;
    if (frame.expanded) {
      if (results.has(frame.node)) continue;
      const children = childrenOf(frame.node).map((child) => {
        const result = results.get(child);
        if (result === undefined) {
          throw new Error("simplify: child rewritten after its parent — traversal order bug");
        }
        return result;
      });
      results.set(frame.node, rebuild(frame.node)(children));
      continue;
    }
    if (results.has(frame.node)) continue;
    stack.push({ node: frame.node, expanded: true });
    for (const child of childrenOf(frame.node)) {
      stack.push({ node: child, expanded: false });
    }
  }
  const result = results.get(policy);
  if (result === undefined) {
    throw new Error("simplify: root never rewritten — traversal order bug");
  }
  return result;
};
